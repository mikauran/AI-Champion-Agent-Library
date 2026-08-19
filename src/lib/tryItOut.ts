// src/lib/tryItOut.ts
// Client API for the runnable "Try it out" flow.
// Signatures and types are FROZEN by docs/job-api-contract.md — do not change them.
// Currently mock-backed. Swapping mock -> real backend replaces ONLY the bodies of the
// three exported functions plus everything below the MOCK IMPLEMENTATION banner.

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface JobEvent {
  ts: string // "10:46:48"
  type: 'tool_start' | 'tool_end' | 'info'
  tool?: string // "read" | "write" | "grep"
  summary: string // the line the feed renders
}

export interface JobUpdate {
  status: JobStatus
  events: JobEvent[]
  error: string | null
}

export interface SubmitResult {
  jobId: string
  status: JobStatus
}

export async function submitJob(
  agentId: string,
  task: string,
  file?: File | null
): Promise<SubmitResult> {
  await delay(SUBMIT_DELAY_MS)
  const jobId = nextJobId()
  mockJobs.set(jobId, { agentId, task, fileName: file?.name ?? null })
  return { jobId, status: 'queued' }
}

export function subscribeProgress(
  jobId: string,
  onUpdate: (u: JobUpdate) => void
): () => void {
  return runMockScript(jobId, onUpdate)
}

export async function downloadArtifact(jobId: string): Promise<void> {
  const job = mockJobs.get(jobId)
  if (!job) throw new Error(`unknown job: ${jobId}`)
  triggerTextDownload(mockArtifactText(jobId, job), `aic-job-${safeFileToken(jobId)}.txt`)
}

// ────────────────────────────────────────────────────────────────────────────
// MOCK IMPLEMENTATION — DELETE WHOLESALE WHEN THE REAL BACKEND LANDS (D-08)
// Everything below this banner is mock-only: the in-memory job store, the
// timer-driven event script, and the synthetic artifact text. Nothing outside
// this file references any of it.
// ────────────────────────────────────────────────────────────────────────────

const SUBMIT_DELAY_MS = 400
const TERMINAL_AT_MS = 4000
const FAIL_PATTERN = /(^|\W)fail(\W|$)/i // EXACT regex from docs/job-api-contract.md
const MOCK_ERROR = 'pi exited non-zero: required input file missing'

interface MockJob {
  agentId: string
  task: string
  fileName: string | null
}
const mockJobs = new Map<string, MockJob>()
let mockJobCounter = 0

function nextJobId(): string {
  return `mock-${++mockJobCounter}-${Date.now().toString(36)}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// "10:46:48" — built from Date parts, NOT toLocaleTimeString (no ICU/locale dependency)
function nowTs(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// Summaries are the real observed pi tool_execution lines from the contract doc — verbatim.
const SUCCESS_SCRIPT: Array<{ at: number; event: Omit<JobEvent, 'ts'> }> = [
  { at: 600, event: { type: 'tool_start', tool: 'read', summary: 'read data/sample.csv' } },
  { at: 1400, event: { type: 'tool_end', tool: 'read', summary: 'read data/sample.csv (12 lines)' } },
  { at: 2200, event: { type: 'tool_start', tool: 'grep', summary: 'count rows in data/sample.csv' } },
  { at: 3000, event: { type: 'tool_end', tool: 'write', summary: 'write output/result.txt' } },
]

const FAIL_SCRIPT = SUCCESS_SCRIPT.slice(0, 2)

// D-09: succeeded == pi `agent_settled` + clean exit (NOT `agent_end`, which can fire mid-retry).
const SETTLED_EVENT: Omit<JobEvent, 'ts'> = { type: 'info', summary: 'agent settled (clean exit)' }
const FAILED_EVENT: Omit<JobEvent, 'ts'> = { type: 'info', summary: 'agent failed (exit 1)' }

function runMockScript(jobId: string, onUpdate: (u: JobUpdate) => void): () => void {
  const job = mockJobs.get(jobId)
  if (!job) {
    onUpdate({ status: 'failed', events: [], error: `unknown job: ${jobId}` })
    return () => {}
  }

  const willFail = FAIL_PATTERN.test(job.task)
  const script = willFail ? FAIL_SCRIPT : SUCCESS_SCRIPT
  const terminalEvent = willFail ? FAILED_EVENT : SETTLED_EVENT
  const terminalError = willFail ? MOCK_ERROR : null

  let cancelled = false
  const timers: ReturnType<typeof setTimeout>[] = []
  const events: JobEvent[] = []

  const emit = (status: JobStatus, error: string | null = null) => {
    if (!cancelled) onUpdate({ status, events: [...events], error })
  }

  // emit `running` immediately (contract requirement)
  emit('running')

  for (const step of script) {
    timers.push(
      setTimeout(() => {
        if (cancelled) return
        events.push({ ts: nowTs(), ...step.event })
        emit('running')
      }, step.at)
    )
  }

  timers.push(
    setTimeout(() => {
      if (cancelled) return
      events.push({ ts: nowTs(), ...terminalEvent })
      emit(willFail ? 'failed' : 'succeeded', terminalError)
    }, TERMINAL_AT_MS)
  )

  return () => {
    cancelled = true
    while (timers.length) clearTimeout(timers.pop()!)
  }
}

function triggerTextDownload(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url) // threat T3 — no object-URL leak
}

function safeFileToken(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function mockArtifactText(jobId: string, job: MockJob): string {
  return `AIC Agent Library — mock run artifact
job: ${jobId}
agent: ${job.agentId}
task: ${job.task}
attached file: ${job.fileName ?? '(none)'}

--- output/result.txt ---
12 rows counted in data/sample.csv
`
}
