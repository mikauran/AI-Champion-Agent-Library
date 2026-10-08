// Server-only module — SvelteKit enforces that src/lib/server/ cannot be imported client-side.
// LLM proxy for Pi containers (D-17): per-lease bearer tokens, per-job budget, real key injected server-side.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export interface JobBudget {
  maxTotalTokens: number
  maxRequests: number
}

export interface JobUsage {
  jobId: string
  totalTokens: number
  requests: number
  budgetExceeded: boolean
}

export const MAX_PROXY_BODY_BYTES = 1_048_576
export const MAX_COMPLETION_TOKENS = 4096

const FINISHED_LIMIT = 200

interface TokenEntry {
  leaseId: string
  digest: Buffer
}

interface ActiveJob {
  jobId: string
  budget: JobBudget
  usage: JobUsage
}

const tokensByHex = new Map<string, TokenEntry>()
const hexByLease = new Map<string, string>()
const activeJobs = new Map<string, ActiveJob>()
const finishedUsage = new Map<string, JobUsage>()

function digestOf(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

function rememberFinished(usage: JobUsage): void {
  finishedUsage.delete(usage.jobId)
  finishedUsage.set(usage.jobId, usage)
  while (finishedUsage.size > FINISHED_LIMIT) {
    const oldest = finishedUsage.keys().next().value
    if (oldest === undefined) break
    finishedUsage.delete(oldest)
  }
}

export function registerLeaseToken(leaseId: string): string {
  revokeLeaseToken(leaseId)
  const token = randomBytes(32).toString('base64url')
  const digest = digestOf(token)
  const hex = digest.toString('hex')
  tokensByHex.set(hex, { leaseId, digest })
  hexByLease.set(leaseId, hex)
  return token
}

export function revokeLeaseToken(leaseId: string): void {
  const hex = hexByLease.get(leaseId)
  if (hex) {
    tokensByHex.delete(hex)
    hexByLease.delete(leaseId)
  }
  endJob(leaseId)
}

export function beginJob(leaseId: string, jobId: string, budget: JobBudget): void {
  const usage: JobUsage = { jobId, totalTokens: 0, requests: 0, budgetExceeded: false }
  activeJobs.set(leaseId, { jobId, budget, usage })
  rememberFinished(usage)
}

export function endJob(leaseId: string): JobUsage | null {
  const job = activeJobs.get(leaseId)
  if (!job) return null
  activeJobs.delete(leaseId)
  rememberFinished(job.usage)
  return job.usage
}

export function getJobUsage(jobId: string): JobUsage | null {
  for (const job of activeJobs.values()) {
    if (job.jobId === jobId) return job.usage
  }
  return finishedUsage.get(jobId) ?? null
}

export function authenticateBearer(header: string | null): { leaseId: string } | null {
  if (!header || !header.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  if (!token) return null
  const digest = digestOf(token)
  const entry = tokensByHex.get(digest.toString('hex'))
  if (!entry) return null
  if (entry.digest.length !== digest.length || !timingSafeEqual(entry.digest, digest)) return null
  return { leaseId: entry.leaseId }
}

const ALLOWED_KEYS = [
  'messages',
  'tools',
  'tool_choice',
  'stream',
  'stream_options',
  'temperature',
  'top_p',
  'parallel_tool_calls',
  'response_format',
  'max_tokens',
  'max_completion_tokens',
] as const

export function buildUpstreamBody(
  body: Record<string, unknown>,
  model: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) out[key] = body[key]
  }
  out.model = model
  out.store = false
  for (const key of ['max_tokens', 'max_completion_tokens'] as const) {
    const v = out[key]
    if (typeof v === 'number') out[key] = Math.min(v, MAX_COMPLETION_TOKENS)
  }
  if (out.stream === true) {
    const existing =
      out.stream_options && typeof out.stream_options === 'object'
        ? (out.stream_options as Record<string, unknown>)
        : {}
    out.stream_options = { ...existing, include_usage: true }
  }
  return out
}

function errorResponse(
  status: number,
  message: string,
  type = 'invalid_request_error',
): Response {
  return new Response(JSON.stringify({ error: { message, type } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function usageTotal(usage: unknown): number {
  if (!usage || typeof usage !== 'object') return 0
  const u = usage as Record<string, unknown>
  if (typeof u.total_tokens === 'number') return u.total_tokens
  const p = typeof u.prompt_tokens === 'number' ? u.prompt_tokens : 0
  const c = typeof u.completion_tokens === 'number' ? u.completion_tokens : 0
  return p + c
}

async function readCappedText(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > MAX_PROXY_BODY_BYTES) return null
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_PROXY_BODY_BYTES) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function meterStream(stream: ReadableStream<Uint8Array>, job: ActiveJob): Promise<void> {
  try {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let lastUsage: unknown = null
    const scan = (line: string) => {
      if (!line.startsWith('data:')) return
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') return
      try {
        const parsed = JSON.parse(payload) as { usage?: unknown }
        if (parsed.usage) lastUsage = parsed.usage
      } catch {
        // ignore malformed chunk
      }
    }
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      lines.forEach(scan)
    }
    if (buffer) scan(buffer)
    job.usage.totalTokens += usageTotal(lastUsage)
  } catch {
    // client aborted; usage unknown
  }
}

export async function handleChatCompletions(
  request: Request,
  deps: {
    apiKey: string | undefined
    upstreamBaseUrl: string
    model: string
    fetchImpl: typeof fetch
  },
): Promise<Response> {
  const auth = authenticateBearer(request.headers.get('authorization'))
  if (!auth) return errorResponse(401, 'invalid or missing token')

  const text = await readCappedText(request)
  if (text === null) return errorResponse(413, 'request body too large')

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return errorResponse(400, 'request body must be valid JSON')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return errorResponse(400, 'request body must be a JSON object')
  }

  const job = activeJobs.get(auth.leaseId)
  if (!job) return errorResponse(429, 'no active job for this token', 'rate_limit_error')

  if (
    job.usage.requests >= job.budget.maxRequests ||
    job.usage.totalTokens >= job.budget.maxTotalTokens
  ) {
    job.usage.budgetExceeded = true
    return errorResponse(429, 'job token budget exceeded', 'insufficient_quota')
  }

  if (!deps.apiKey) return errorResponse(500, 'LLM proxy is not configured', 'server_error')

  const upstreamBody = buildUpstreamBody(parsed as Record<string, unknown>, deps.model)
  job.usage.requests++

  try {
    const upstream = await deps.fetchImpl(`${deps.upstreamBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deps.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
      signal: request.signal,
    })

    if (!upstream.ok) {
      const errText = await upstream.text()
      return new Response(errText, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
        },
      })
    }

    if (upstreamBody.stream === true && upstream.body) {
      const [toClient, toMeter] = upstream.body.tee()
      void meterStream(toMeter, job)
      return new Response(toClient, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('content-type') ?? 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    }

    const payload = (await upstream.json()) as { usage?: unknown }
    job.usage.totalTokens += usageTotal(payload.usage)
    return new Response(JSON.stringify(payload), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('llm proxy failed', err instanceof Error ? err.message : 'unknown error')
    return errorResponse(502, 'upstream request failed', 'server_error')
  }
}

export function __resetProxy(): void {
  tokensByHex.clear()
  hexByLease.clear()
  activeJobs.clear()
  finishedUsage.clear()
}
