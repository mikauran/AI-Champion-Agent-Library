import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

// Hoisted so the vi.mock factory below (which itself is hoisted above all
// imports) can reference these.
const { mockCreate, OpenAICtorSpy } = vi.hoisted(() => {
  return { mockCreate: vi.fn(), OpenAICtorSpy: vi.fn() }
})

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      responses = { create: mockCreate }
      constructor(...args: unknown[]) {
        OpenAICtorSpy(...args)
      }
    },
  }
})

vi.mock('./tryItOutPrompts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./tryItOutPrompts')>()
  return {
    ...actual,
    loadPromptFor: vi.fn(async (agentId: string) => ({
      basePrompt: `BASE PROMPT for ${agentId}`,
      skill: `SKILL TEXT for ${agentId}`,
    })),
  }
})

// These are populated in beforeAll, AFTER TRYITOUT_WORK_DIR is pointed at a
// throwaway tmpdir — tryItOutJobs.ts reads that env var once at module load,
// so the module must be imported (dynamically) only after the env var is set.
let tmpDir: string
let jobsMod: typeof import('./tryItOutJobs')
let promptsMod: typeof import('./tryItOutPrompts')
let runJob: typeof import('./tryItOutRunner').runJob

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'tryitout-runner-test-'))
  process.env.TRYITOUT_WORK_DIR = tmpDir
  delete process.env.OPENAI_API_KEY // prove import-without-key never throws

  jobsMod = await import('./tryItOutJobs')
  promptsMod = await import('./tryItOutPrompts')
  ;({ runJob } = await import('./tryItOutRunner'))
})

afterAll(async () => {
  delete process.env.TRYITOUT_WORK_DIR
  await rm(tmpDir, { recursive: true, force: true })
})

beforeEach(() => {
  jobsMod.__resetJobs()
})

afterEach(() => {
  vi.clearAllMocks()
})

async function writeInputFile(jobId: string, content: string): Promise<void> {
  const path = jobsMod.inputFilePath(jobId)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf-8')
}

async function waitForEvent(jobId: string, summary: string, maxMs = 2000): Promise<void> {
  const start = Date.now()
  for (;;) {
    const job = jobsMod.getJob(jobId)
    if (job?.events.some((e) => e.summary === summary)) return
    if (Date.now() - start > maxMs) {
      throw new Error(`timed out waiting for event "${summary}" on job ${jobId}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

describe('module import / lazy client construction (SC-09)', () => {
  it('constructs the OpenAI client lazily — importing the module without OPENAI_API_KEY never throws and never constructs the client', () => {
    expect(typeof runJob).toBe('function')
    expect(OpenAICtorSpy).not.toHaveBeenCalled()
  })
})

describe('runJob happy path', () => {
  it('succeeds with an uploaded file: status ends succeeded, error is null, result.txt holds the mocked output_text', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'triage result: high urgency, structural' })
    const job = jobsMod.createJob(
      'demo-rfi-triage',
      'triage this',
      new File(['ignored — runner reads from disk'], 'sample-rfi.txt')
    )
    await writeInputFile(job.jobId, 'RFI: beam clash with ductwork, urgent')

    await runJob(job.jobId)

    const updated = jobsMod.getJob(job.jobId)!
    expect(updated.status).toBe('succeeded')
    expect(updated.error).toBeNull()
    const output = await readFile(jobsMod.outputFilePath(job.jobId), 'utf-8')
    expect(output).toBe('triage result: high urgency, structural')
  })

  it('emits event summaries in order: reading input, calling model, writing output, agent settled', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'result text' })
    const job = jobsMod.createJob('demo-rfi-triage', 'task', new File(['x'], 'in.txt'))
    await writeInputFile(job.jobId, 'input content')

    await runJob(job.jobId)

    const updated = jobsMod.getJob(job.jobId)!
    expect(updated.events.map((e) => e.summary)).toEqual([
      'reading input…',
      'calling model…',
      'writing output…',
      'agent settled (clean exit)',
    ])
  })

  it('every event has type "info" — no tool_start/tool_end (D-11/SC-05)', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'result text' })
    const job = jobsMod.createJob('demo-rfi-triage', 'task', new File(['x'], 'in.txt'))
    await writeInputFile(job.jobId, 'input content')

    await runJob(job.jobId)

    const updated = jobsMod.getJob(job.jobId)!
    expect(updated.events.length).toBeGreaterThan(0)
    for (const event of updated.events) {
      expect(event.type).toBe('info')
    }
  })

  it('no-file fallback: uses task text as input, succeeds, and the first stage line does not claim a file was read', async () => {
    mockCreate.mockResolvedValueOnce({ output_text: 'result from task text' })
    const job = jobsMod.createJob('demo-rfi-triage', 'triage this task text directly', null)

    await runJob(job.jobId)

    const updated = jobsMod.getJob(job.jobId)!
    expect(updated.status).toBe('succeeded')
    expect(updated.events[0].summary).toBe('using task text as input…')
    expect(updated.events[0].summary).not.toMatch(/reading input/)
  })
})

describe('D-12: real-phase staged ordering', () => {
  it('the calling-model event exists in the store BEFORE the model call resolves; the writing-output event does not yet exist', async () => {
    const job = jobsMod.createJob('demo-rfi-triage', 'triage this task text', null)

    let resolveCreate!: (v: { output_text: string }) => void
    const pending = new Promise<{ output_text: string }>((resolve) => {
      resolveCreate = resolve
    })
    mockCreate.mockImplementationOnce(() => pending)

    const runPromise = runJob(job.jobId)

    await waitForEvent(job.jobId, 'calling model…')
    const midFlight = jobsMod.getJob(job.jobId)!
    expect(midFlight.status).toBe('running')
    expect(midFlight.events.some((e) => e.summary === 'calling model…')).toBe(true)
    expect(midFlight.events.some((e) => e.summary === 'writing output…')).toBe(false)

    resolveCreate({ output_text: 'settled output' })
    await runPromise

    const done = jobsMod.getJob(job.jobId)!
    expect(done.status).toBe('succeeded')
    expect(done.events.some((e) => e.summary === 'writing output…')).toBe(true)
  })
})

describe('runJob failure paths', () => {
  it('model error: status ends failed with the REAL error message, never a fabricated "pi exited" string', async () => {
    mockCreate.mockRejectedValueOnce(new Error('rate limit exceeded'))
    const job = jobsMod.createJob('demo-rfi-triage', 'task', null)

    await runJob(job.jobId)

    const updated = jobsMod.getJob(job.jobId)!
    expect(updated.status).toBe('failed')
    expect(updated.error).toBe('rate limit exceeded')
    expect(updated.error).not.toMatch(/pi exited/)
  })

  it('missing skill file: status ends failed with the loader\'s message naming the missing path', async () => {
    vi.mocked(promptsMod.loadPromptFor).mockRejectedValueOnce(
      new Error('missing skill file for agent demo-rfi-triage: /fake/data/tryitout-prompts/demo-rfi-triage/skill.md')
    )
    const job = jobsMod.createJob('demo-rfi-triage', 'task', null)

    await runJob(job.jobId)

    const updated = jobsMod.getJob(job.jobId)!
    expect(updated.status).toBe('failed')
    expect(updated.error).toMatch(/missing skill file/)
  })

  it('runJob never rethrows even on failure', async () => {
    mockCreate.mockRejectedValueOnce(new Error('boom'))
    const job = jobsMod.createJob('demo-rfi-triage', 'task', null)

    await expect(runJob(job.jobId)).resolves.toBeUndefined()
  })

  it('runJob on an unknown jobId resolves without throwing and mutates nothing', async () => {
    await expect(runJob('00000000-0000-0000-0000-000000000000')).resolves.toBeUndefined()
    expect(jobsMod.getJob('00000000-0000-0000-0000-000000000000')).toBeUndefined()
  })
})

describe('concurrency (A-1)', () => {
  it('two interleaved runJob calls for two different jobIds produce independent output files and event arrays', async () => {
    mockCreate.mockImplementation(async (args: { input: string }) => ({
      output_text: `output for: ${args.input.includes('JOB_A') ? 'A' : 'B'}`,
    }))

    const jobA = jobsMod.createJob('demo-rfi-triage', 'JOB_A task', null)
    const jobB = jobsMod.createJob('demo-rfi-triage', 'JOB_B task', null)

    await Promise.all([runJob(jobA.jobId), runJob(jobB.jobId)])

    const doneA = jobsMod.getJob(jobA.jobId)!
    const doneB = jobsMod.getJob(jobB.jobId)!
    expect(doneA.status).toBe('succeeded')
    expect(doneB.status).toBe('succeeded')

    const outputA = await readFile(jobsMod.outputFilePath(jobA.jobId), 'utf-8')
    const outputB = await readFile(jobsMod.outputFilePath(jobB.jobId), 'utf-8')
    expect(outputA).toContain('A')
    expect(outputB).toContain('B')
    expect(outputA).not.toBe(outputB)
    expect(jobsMod.outputFilePath(jobA.jobId)).not.toBe(jobsMod.outputFilePath(jobB.jobId))
  })
})
