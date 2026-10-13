// Server-only. Executes one stored run. Default: in-process fake subjects and generator-side checks only
// (a generated Python server is NEVER executed in the web process; its server-side cells are PENDING_HUMAN).
// MCP_TESTER_RUNTIME=container (set by the operator, never by an agent) selects the Phase 8 container path.
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import type { StartRunRequest } from '$lib/mcptest/api-contract'
import { loadSuite, type SuiteCase } from '$lib/mcptest/core/suite'
import { runSuite } from '$lib/mcptest/core/runner'
import { listSubjects, resolveSubject } from '$lib/mcptest/core/subjects'
import { DRIVER_PKG_ROOT, KNOWN_CASE_IDS, type DriverRequest } from '$lib/mcptest/driverRequest'
import { createClientLimiter, type ClientLimiter } from '../tryitout/clientLimit'
import { publicErrorMessage, publicText } from '../tryitout/redact'
import type { ContainerRuntime, StagedFile } from '../tryitout/runtime'
import { mcpTestRunnerConfig, runInContainer, type PackageFile } from './containerRun'
import { runStore, type RunStore } from './jobs'

export type RuntimeFactory = () => ContainerRuntime | Promise<ContainerRuntime>
export type Executor = (runId: string, input: StartRunRequest) => Promise<void>

export interface ServiceDeps {
  store?: RunStore
  env?: Record<string, string | undefined>
  runtimeFactory?: RuntimeFactory
  driverTree?: StagedFile[]
}

/** Subjects the web API accepts: fake variants and generator samples only (no uploads, no cmd:). */
export function allowedSubjectIds(): string[] {
  return listSubjects()
    .filter((s) => s.kind === 'fake' || s.kind === 'generator')
    .map((s) => s.id)
}

export function isAllowedSubject(id: unknown): id is string {
  return typeof id === 'string' && allowedSubjectIds().includes(id)
}

export function isKnownCase(id: unknown): id is string {
  return typeof id === 'string' && (KNOWN_CASE_IDS as readonly string[]).includes(id)
}

export function containerModeSelected(env: Record<string, string | undefined> = process.env): boolean {
  return env.MCP_TESTER_RUNTIME?.trim().toLowerCase() === 'container'
}

const defaultRuntimeFactory: RuntimeFactory = async () => {
  const { createDockerodeRuntime } = await import('../tryitout/runtimeDockerode')
  return createDockerodeRuntime(mcpTestRunnerConfig(process.env), 'mcptest')
}

async function readPackage(dir: string): Promise<PackageFile[]> {
  const out: PackageFile[] = []
  const walk = async (abs: string): Promise<void> => {
    for (const ent of await readdir(abs, { withFileTypes: true })) {
      const p = join(abs, ent.name)
      if (ent.isSymbolicLink()) continue
      if (ent.isDirectory()) await walk(p)
      else if (ent.isFile()) out.push({ path: relative(dir, p).split(sep).join('/'), content: await readFile(p, 'utf8') })
    }
  }
  await walk(dir)
  return out
}

type Staged = Extract<DriverRequest['subject'], { kind: 'staged' }>

/** Generates the package in a temp dir (pure, in process; nothing is executed) and builds the staged subject. */
async function prepareGeneratorRequest(
  subjectId: string,
  suiteCases: SuiteCase[]
): Promise<{ subject: Staged; files: PackageFile[] } | { error: string }> {
  const subject = resolveSubject(subjectId)
  const probe = suiteCases.find((c) => c.def.id === 'T2-CATALOG-API')
  if (!subject || !probe) return { error: 'generator subject could not be resolved' }
  const work = await mkdtemp(join(tmpdir(), 'mcptest-pkg-'))
  try {
    const prep = await subject.prepare(probe.def, work)
    if (prep.status !== 'PASS' || !prep.launch || prep.launch.kind !== 'stdio') return { error: 'the generator did not produce a package' }
    const files = await readPackage(join(work, 'pkg'))
    const cwdRel = relative(join(work, 'pkg'), prep.launch.cwd ?? join(work, 'pkg')).split(sep).join('/')
    const staged: Staged = {
      kind: 'staged',
      command: prep.launch.command === 'node' ? 'node' : 'python3',
      args: prep.launch.args,
      cwd: cwdRel ? `${DRIVER_PKG_ROOT}/${cwdRel}` : DRIVER_PKG_ROOT,
      id: subjectId,
      ...(prep.binding ? { binding: prep.binding } : {}),
      ...(prep.envNames
        ? {
            envNames: {
              ...(prep.envNames.baseUrl ? { baseUrl: prep.envNames.baseUrl } : {}),
              ...(prep.envNames.apiKey ? { apiKey: prep.envNames.apiKey } : {}),
              ...(prep.envNames.baseUrlB ? { baseUrlB: prep.envNames.baseUrlB } : {})
            }
          }
        : {})
    }
    return { subject: staged, files }
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {})
  }
}

export async function executeRun(runId: string, input: StartRunRequest, deps: ServiceDeps = {}): Promise<void> {
  const store = deps.store ?? runStore
  const env = deps.env ?? process.env
  const fail = (msg: string) => store.setStatus(runId, 'failed', msg)
  try {
    store.setStatus(runId, 'running')
    const suite = await loadSuite()
    if (!suite.ok) return fail('the test suite could not be loaded')
    const wanted = input.cases
    const cases = wanted ? suite.cases.filter((c) => wanted.includes(c.def.id)) : suite.cases
    if (cases.length === 0) return fail('no matching cases')
    const reruns = input.reruns ?? 1
    store.setProgress(runId, { done: 0, total: cases.length * reruns })
    store.addEvent(runId, `run started: ${input.subject}, ${cases.length} case(s), ${reruns} rerun(s)`)

    if (containerModeSelected(env)) {
      store.addEvent(runId, 'runtime: container (sandboxed)')
      let request: DriverRequest
      let files: PackageFile[] = []
      if (input.subject.startsWith('fake:')) {
        request = { v: 1, subject: { kind: 'fake', variant: input.subject.slice('fake:'.length) }, reruns: reruns as 1 | 2 | 3 }
        if (wanted) request.cases = cases.map((c) => c.def.id as (typeof KNOWN_CASE_IDS)[number])
      } else {
        // The package is generated once from the primary sample; the partial-spec case needs its own input.
        const kept = cases.filter((c) => c.def.id !== 'T4-PARTIAL-SPEC')
        if (kept.length === 0) return fail('this case is not available in container mode')
        const prepared = await prepareGeneratorRequest(input.subject, suite.cases)
        if ('error' in prepared) return fail(prepared.error)
        files = prepared.files
        request = {
          v: 1,
          subject: prepared.subject,
          cases: kept.map((c) => c.def.id as (typeof KNOWN_CASE_IDS)[number]),
          reruns: reruns as 1 | 2 | 3
        }
      }
      const runtime = await (deps.runtimeFactory ?? defaultRuntimeFactory)()
      const res = await runInContainer(runtime, request, files, { ...(deps.driverTree ? { driverTree: deps.driverTree } : {}) })
      if (!res.ok) return fail(res.message)
      store.setProgress(runId, { done: cases.length * reruns, total: cases.length * reruns })
      store.setReport(runId, res.reportJson)
      store.addEvent(runId, 'run finished')
      return
    }

    const subject = resolveSubject(input.subject)
    if (!subject) return fail('unknown subject')
    let last = ''
    const report = await runSuite({
      subject,
      cases,
      reruns,
      runtime: 'fake',
      // Never true here: a generated server is not executed in the web process.
      allowStdioExec: false,
      onProgress: (p) => {
        store.setProgress(runId, { done: p.done, total: p.total, current: p.current ?? null })
        if (p.current && p.current !== last) {
          last = p.current
          store.addEvent(runId, `case ${p.current}`)
        }
      }
    })
    store.setReport(runId, JSON.stringify(report))
    if (store.getRun(runId)?.status === 'done') store.addEvent(runId, 'run finished')
  } catch (err) {
    store.setStatus(runId, 'failed', publicText(publicErrorMessage(err)))
  }
}

let executor: Executor = (id, input) => executeRun(id, input)

/** Test hook: replace the executor (null restores the default). */
export function __setExecutorForTests(fn: Executor | null): void {
  executor = fn ?? ((id, input) => executeRun(id, input))
}

/** Fire-and-forget: never awaited by the caller; failures are recorded on the run. */
export function startRun(runId: string, input: StartRunRequest, store: RunStore = runStore): void {
  void Promise.resolve()
    .then(() => executor(runId, input))
    .catch((err) => store.setStatus(runId, 'failed', publicText(publicErrorMessage(err))))
}

export const STARTS_PER_CLIENT = 10
export const START_WINDOW_MS = 10 * 60 * 1000
let startLimiter: ClientLimiter = createClientLimiter({ max: STARTS_PER_CLIENT, windowMs: START_WINDOW_MS })

/** Per-client start limiter (sliding window); records the admission when it returns true. */
export function admitStart(clientKey: string | undefined): boolean {
  return startLimiter.tryAdmit(clientKey ?? 'unknown')
}

/** Test hook: restore a fresh limiter, optionally with another cap. */
export function __resetStartLimiterForTests(max: number = STARTS_PER_CLIENT): void {
  startLimiter = createClientLimiter({ max, windowMs: START_WINDOW_MS })
}
