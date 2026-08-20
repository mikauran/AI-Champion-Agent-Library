import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { mkdtemp, rm, readdir, readFile as fsReadFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Hoisted so the vi.mock factory below (hoisted above all imports) can
// reference these — mirrors src/lib/server/tryItOutRunner.test.ts.
const { mockCreate } = vi.hoisted(() => {
  return { mockCreate: vi.fn() }
})

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      responses = { create: mockCreate }
    },
  }
})

// Partial mock: keep every real export, but wrap `createJob` in a spy so
// tests can assert "no job created" without needing to guess a jobId.
vi.mock('$lib/server/tryItOutJobs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/server/tryItOutJobs')>()
  return { ...actual, createJob: vi.fn(actual.createJob) }
})

// Populated in beforeAll, AFTER TRYITOUT_WORK_DIR is pointed at a throwaway
// tmpdir — tryItOutJobs.ts reads that env var once at module load, so every
// module under test must be imported (dynamically) only after the env var
// is set (07-03's established pattern).
let tmpDir: string
let jobsMod: typeof import('$lib/server/tryItOutJobs')
let POST: typeof import('./+server').POST
let GET_STATUS: typeof import('./[id]/+server').GET
let GET_ARTIFACT: typeof import('./[id]/artifact/+server').GET

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'tryitout-jobs-route-test-'))
  process.env.TRYITOUT_WORK_DIR = tmpDir

  jobsMod = await import('$lib/server/tryItOutJobs')
  ;({ POST } = await import('./+server'))
  ;({ GET: GET_STATUS } = await import('./[id]/+server'))
  ;({ GET: GET_ARTIFACT } = await import('./[id]/artifact/+server'))
})

afterAll(async () => {
  delete process.env.TRYITOUT_WORK_DIR
  await rm(tmpDir, { recursive: true, force: true })
})

beforeEach(() => {
  jobsMod.__resetJobs()
  vi.clearAllMocks()
  mockCreate.mockResolvedValue({ output_text: 'mock model output' })
})

function makeForm(fields: Record<string, string | File | undefined>): Request {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue
    form.set(key, value)
  }
  return new Request('http://localhost/api/tryitout/jobs', { method: 'POST', body: form })
}

function asPostEvent(request: Request): Parameters<typeof POST>[0] {
  return { request } as Parameters<typeof POST>[0]
}

// Loosely typed (`any`) on purpose: this same `{ params }` shape is passed
// to both GET handlers below (status and artifact), which SvelteKit types as
// two distinct, non-interchangeable `RequestEvent<..., RouteId>` types even
// though only `params.id` is ever read by either handler.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asGetEvent(id: string): any {
  return { params: { id } }
}

async function expectHttpError(fn: () => unknown, status: number): Promise<void> {
  try {
    await fn()
    throw new Error(`expected handler to throw an HTTP ${status} error, but it did not throw`)
  } catch (e) {
    expect((e as { status?: number }).status).toBe(status)
  }
}

async function waitForStatus(
  jobId: string,
  terminal: Array<'queued' | 'running' | 'succeeded' | 'failed'>,
  maxMs = 3000
) {
  const start = Date.now()
  for (;;) {
    const job = jobsMod.getJob(jobId)
    if (job && terminal.includes(job.status)) return job
    if (Date.now() - start > maxMs) {
      throw new Error(`timed out waiting for status in [${terminal.join(', ')}] on job ${jobId}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

async function listAllFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listAllFiles(p)))
    else out.push(p)
  }
  return out
}

const AGENT_ID = 'demo-rfi-triage'

describe('POST /api/tryitout/jobs', () => {
  it('valid agentId + task + file resolves to { jobId, status: queued } immediately, and writes the file before returning', async () => {
    const file = new File(['hello world'], 'note.txt', { type: 'text/plain' })
    const res = await POST(asPostEvent(makeForm({ agentId: AGENT_ID, task: 'triage this', file })))
    const body = await res.json()

    expect(body.status).toBe('queued')
    expect(body.jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

    const written = await fsReadFile(jobsMod.inputFilePath(body.jobId), 'utf-8')
    expect(written).toBe('hello world')

    // The response did not wait for the model call.
    expect(mockCreate).not.toHaveBeenCalled()

    // Drain the fire-and-forget background run so it cannot bleed a
    // `mockCreate` call into a later test.
    await waitForStatus(body.jobId, ['succeeded', 'failed'])
  })

  it('missing/non-string agentId -> 400, no job created', async () => {
    const req = makeForm({ task: 'triage this' })
    await expectHttpError(() => POST(asPostEvent(req)), 400)
    expect(jobsMod.createJob).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('missing/non-string task -> 400, no job created', async () => {
    const req = makeForm({ agentId: AGENT_ID })
    await expectHttpError(() => POST(asPostEvent(req)), 400)
    expect(jobsMod.createJob).not.toHaveBeenCalled()
  })

  it('agentId failing the slug regex -> 400, no job created, no filesystem access', async () => {
    const before = await readdir(tmpDir).catch(() => [])
    const req = makeForm({ agentId: 'Not Valid!!', task: 'triage this' })
    await expectHttpError(() => POST(asPostEvent(req)), 400)
    expect(jobsMod.createJob).not.toHaveBeenCalled()
    const after = await readdir(tmpDir).catch(() => [])
    expect(after).toEqual(before)
  })

  it('a zero-byte, empty-named File is treated as NO file: fileName null, nothing written, run uses task text', async () => {
    const emptyFile = new File([], '')
    const res = await POST(
      asPostEvent(makeForm({ agentId: AGENT_ID, task: 'triage this without a file', file: emptyFile }))
    )
    const body = await res.json()

    const job = jobsMod.getJob(body.jobId)!
    expect(job.fileName).toBeNull()

    await expect(fsReadFile(jobsMod.inputFilePath(body.jobId), 'utf-8')).rejects.toThrow()

    await waitForStatus(body.jobId, ['succeeded', 'failed'])
    const updated = jobsMod.getJob(body.jobId)!
    expect(updated.events.some((e) => e.summary === 'using task text as input…')).toBe(true)
  })

  it('a 201 KB file -> 413, no job created, nothing written', async () => {
    const before = await readdir(tmpDir).catch(() => [])
    const bigFile = new File([new Uint8Array(201 * 1024)], 'big.bin')
    const req = makeForm({ agentId: AGENT_ID, task: 'triage this', file: bigFile })
    await expectHttpError(() => POST(asPostEvent(req)), 413)
    expect(jobsMod.createJob).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
    const after = await readdir(tmpDir).catch(() => [])
    expect(after).toEqual(before)
  })

  it('an oversized task string alone (no file) -> 413, no job created', async () => {
    const before = await readdir(tmpDir).catch(() => [])
    const req = makeForm({ agentId: AGENT_ID, task: 'x'.repeat(201 * 1024) })
    await expectHttpError(() => POST(asPostEvent(req)), 413)
    expect(jobsMod.createJob).not.toHaveBeenCalled()
    const after = await readdir(tmpDir).catch(() => [])
    expect(after).toEqual(before)
  })

  it('a file named ../../escape.txt lands at input/input.txt; nothing exists outside workDir', async () => {
    const traversalFile = new File(['payload'], '../../escape.txt')
    const res = await POST(
      asPostEvent(makeForm({ agentId: AGENT_ID, task: 'triage this', file: traversalFile }))
    )
    const body = await res.json()

    const written = await fsReadFile(jobsMod.inputFilePath(body.jobId), 'utf-8')
    expect(written).toBe('payload')

    const files = await listAllFiles(jobsMod.workDir(body.jobId))
    expect(files.some((f) => f.includes('escape.txt'))).toBe(false)
    expect(files).toContain(jobsMod.inputFilePath(body.jobId))

    // Drain the fire-and-forget background run before the next test starts.
    await waitForStatus(body.jobId, ['succeeded', 'failed'])
  })

  it('two sequential POSTs produce two distinct jobIds; each job\'s artifact reflects only its own task', async () => {
    mockCreate.mockImplementation(async (args: { input: string }) => ({
      output_text: args.input.includes('JOB_A') ? 'result for A' : 'result for B',
    }))

    const res1 = await POST(asPostEvent(makeForm({ agentId: AGENT_ID, task: 'JOB_A task' })))
    const body1 = await res1.json()
    const res2 = await POST(asPostEvent(makeForm({ agentId: AGENT_ID, task: 'JOB_B task' })))
    const body2 = await res2.json()

    expect(body1.jobId).not.toBe(body2.jobId)

    await waitForStatus(body1.jobId, ['succeeded', 'failed'])
    await waitForStatus(body2.jobId, ['succeeded', 'failed'])

    const status1 = await (await GET_STATUS(asGetEvent(body1.jobId))).json()
    const status2 = await (await GET_STATUS(asGetEvent(body2.jobId))).json()
    expect(status1.status).toBe('succeeded')
    expect(status2.status).toBe('succeeded')

    const artifact1 = await (await GET_ARTIFACT(asGetEvent(body1.jobId))).text()
    const artifact2 = await (await GET_ARTIFACT(asGetEvent(body2.jobId))).text()
    expect(artifact1).toBe('result for A')
    expect(artifact2).toBe('result for B')
  })
})

describe('GET /api/tryitout/jobs/[id]', () => {
  it('returns a body with exactly { status, events, error } — no agentId/task/fileName leakage', async () => {
    const res = await POST(asPostEvent(makeForm({ agentId: AGENT_ID, task: 'triage this' })))
    const { jobId } = await res.json()

    const statusRes = await GET_STATUS(asGetEvent(jobId))
    const body = await statusRes.json()

    expect(Object.keys(body).sort()).toEqual(['error', 'events', 'status'])
    expect(['queued', 'running', 'succeeded', 'failed']).toContain(body.status)

    // Drain the fire-and-forget background run before the next test starts.
    await waitForStatus(jobId, ['succeeded', 'failed'])
  })

  it('returns 404 for an unknown UUID', async () => {
    await expectHttpError(() => GET_STATUS(asGetEvent('00000000-0000-0000-0000-000000000000')), 404)
  })

  it.each(['../etc', 'abc', ''])('returns 404 for a malformed id %j', async (id) => {
    await expectHttpError(() => GET_STATUS(asGetEvent(id)), 404)
  })
})

describe('GET /api/tryitout/jobs/[id]/artifact', () => {
  it('returns 200 with the exact bytes and correct headers for a succeeded job', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'artifact content here' })
    const res = await POST(asPostEvent(makeForm({ agentId: AGENT_ID, task: 'triage this' })))
    const { jobId } = await res.json()
    await waitForStatus(jobId, ['succeeded', 'failed'])
    expect(jobsMod.getJob(jobId)!.status).toBe('succeeded')

    const artifactRes = await GET_ARTIFACT(asGetEvent(jobId))
    expect(artifactRes.status).toBe(200)
    expect(artifactRes.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(artifactRes.headers.get('Content-Disposition')).toBe(`attachment; filename="aic-job-${jobId}.txt"`)
    const text = await artifactRes.text()
    expect(text).toBe('artifact content here')
  })

  it('returns 409 for a running job', async () => {
    mockCreate.mockImplementationOnce(() => new Promise(() => {})) // never resolves -> stays running
    const res = await POST(asPostEvent(makeForm({ agentId: AGENT_ID, task: 'triage this' })))
    const { jobId } = await res.json()
    await waitForStatus(jobId, ['running'])
    await expectHttpError(() => GET_ARTIFACT(asGetEvent(jobId)), 409)
  })

  it('returns 409 for a failed job', async () => {
    mockCreate.mockRejectedValueOnce(new Error('boom'))
    const res = await POST(asPostEvent(makeForm({ agentId: AGENT_ID, task: 'triage this' })))
    const { jobId } = await res.json()
    await waitForStatus(jobId, ['succeeded', 'failed'])
    expect(jobsMod.getJob(jobId)!.status).toBe('failed')
    await expectHttpError(() => GET_ARTIFACT(asGetEvent(jobId)), 409)
  })

  it('returns 404 for an unknown id', async () => {
    await expectHttpError(() => GET_ARTIFACT(asGetEvent('00000000-0000-0000-0000-000000000000')), 404)
  })

  it('returns 404, not an unhandled ENOENT, for a succeeded job whose output file was deleted', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'will be deleted' })
    const res = await POST(asPostEvent(makeForm({ agentId: AGENT_ID, task: 'triage this' })))
    const { jobId } = await res.json()
    await waitForStatus(jobId, ['succeeded', 'failed'])
    await rm(jobsMod.outputFilePath(jobId))
    await expectHttpError(() => GET_ARTIFACT(asGetEvent(jobId)), 404)
  })
})
