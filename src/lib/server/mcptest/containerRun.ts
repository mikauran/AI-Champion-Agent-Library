// Server-only. Runs the in-container driver (plan 15-10) through the Phase 8 ContainerRuntime contract.
// Flow: createAndStart -> putFiles (driver tree, request.json, package) -> exec the driver -> getFiles(/work/out)
// -> remove (always). The container is the isolation; the web process never runs a generated server.
// Verified only against createFakeRuntime; a real engine is a pending human check.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ReportSchema, MAX_REPORT_BYTES, type Report } from '$lib/mcptest/core/report'
import { DriverRequestSchema, type DriverRequest } from '$lib/mcptest/driverRequest'
import { parseRunnerConfig, type RunnerConfig } from '../tryitout/runnerConfig'
import { publicErrorMessage, publicText, redactSecrets } from '../tryitout/redact'
import {
  LABEL_INSTANCE,
  WORK_ROOT_IN_CONTAINER,
  isSafeRelativePath,
  isTryItOutRuntimeError,
  type ContainerRuntime,
  type StagedFile
} from '../tryitout/runtime'

export const LABEL_MCPTEST = 'aic.mcptest'
export const DRIVER_CMD = ['tsx', '/work/src/lib/mcptest/driver.ts']
export const MAX_PKG_FILES = 200
export const MAX_PKG_BYTES = 2_000_000
export const MAX_TREE_FILES = 800
export const MAX_TREE_BYTES = 6_000_000
const MAX_OUT_FILES = 10
const DEFAULT_TIMEOUT_MS = 120_000
const MESSAGE_CAP = 200

export type ContainerRunCode = 'engine_unavailable' | 'exec_failed' | 'output_invalid' | 'timeout'
export type ContainerRunResult =
  | { ok: true; report: Report; reportJson: string }
  | { ok: false; code: ContainerRunCode; message: string }

export interface PackageFile {
  path: string
  content: string
}

export interface ContainerRunOptions {
  timeoutMs?: number
  signal?: AbortSignal
  instanceId?: string
  /** Pre-read driver tree (tests); default reads src/lib/mcptest and src/lib/mcpgen from disk. */
  driverTree?: StagedFile[]
}

/** Runner configuration for the test runner image: internal network, no egress, no LLM proxy, no tools. */
export function mcpTestRunnerConfig(env: Record<string, string | undefined> = process.env): RunnerConfig {
  const open = env.MCPTEST_ALLOW_OPEN_EGRESS?.trim().toLowerCase()
  if (open === 'true' || open === '1') throw new Error('MCPTEST_ALLOW_OPEN_EGRESS is not supported: the test runner never gets egress')
  const cfg = parseRunnerConfig({
    PI_RUNNER_IMAGE: env.MCPTEST_RUNNER_IMAGE || 'localhost/mcp-test-runner:latest',
    PI_RUNNER_NETWORK: env.MCPTEST_NETWORK || 'aic-mcptest-internal',
    PI_RUNNER_SOCKET: env.PI_RUNNER_SOCKET,
    XDG_RUNTIME_DIR: env.XDG_RUNTIME_DIR,
    PI_RUNNER_ALLOW_OPEN_EGRESS: 'false',
    PI_RUNNER_FS_MODE: 'tmpfs',
    PI_RUNNER_JOB_TIMEOUT_MS: env.MCPTEST_JOB_TIMEOUT_MS,
    PI_RUNNER_MEMORY_MB: env.MCPTEST_MEMORY_MB,
    PI_RUNNER_MAX_OUTPUT_BYTES: String(MAX_REPORT_BYTES + 100_000),
    PI_RUNNER_MAX_OUTPUT_FILES: String(MAX_OUT_FILES)
  })
  const out: RunnerConfig = { ...cfg, proxyUrl: '', allowOpenEgress: false, tools: [], jobTokenBudget: 0, jobRequestBudget: 0, fallbackEnabled: false }
  if (out.allowOpenEgress) throw new Error('open egress is forbidden for the test runner')
  return out
}

const TREE_ROOTS = ['src/lib/mcptest', 'src/lib/mcpgen']
const TEXT_EXT = new Set(['.ts', '.json', '.yaml', '.yml', '.md', '.mjs'])

function repoRoot(): string {
  return fileURLToPath(new URL('../../../../', import.meta.url))
}

/** Reads the driver source tree (text files only, no tests, goldens or testing dirs except the suite). */
export function readDriverTree(root: string = repoRoot()): StagedFile[] {
  const files: StagedFile[] = []
  let bytes = 0
  const walk = (abs: string) => {
    for (const ent of readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (ent.isSymbolicLink()) continue
      const p = join(abs, ent.name)
      if (ent.isDirectory()) {
        if (ent.name === '__golden__' || ent.name === 'testing' || ent.name === 'node_modules') continue
        walk(p)
      } else if (ent.isFile()) {
        const dot = ent.name.lastIndexOf('.')
        if (dot < 0 || !TEXT_EXT.has(ent.name.slice(dot))) continue
        if (ent.name.endsWith('.test.ts')) continue
        const size = statSync(p).size
        bytes += size
        if (files.length + 1 > MAX_TREE_FILES || bytes > MAX_TREE_BYTES) throw new Error('driver tree exceeds its caps')
        files.push({ path: relative(root, p).split(sep).join('/'), content: readFileSync(p, 'utf8') })
      }
    }
  }
  for (const r of TREE_ROOTS) walk(join(root, r))
  return files
}

function withDirs(prefix: string, files: { path: string; content: string }[]): StagedFile[] {
  const dirs = new Set<string>()
  const out: StagedFile[] = []
  for (const f of files) {
    const full = prefix ? `${prefix}/${f.path}` : f.path
    const parts = full.split('/')
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'))
    out.push({ path: full, content: f.content })
  }
  const dirEntries = [...dirs].sort().map((d): StagedFile => ({ path: d, type: 'dir' }))
  return [...dirEntries, ...out]
}

function checkPackage(files: PackageFile[]): string | null {
  if (files.length > MAX_PKG_FILES) return 'package has too many files'
  let bytes = 0
  for (const f of files) {
    if (typeof f.path !== 'string' || !isSafeRelativePath(f.path)) return 'package path rejected'
    bytes += Buffer.byteLength(f.content, 'utf8')
    if (bytes > MAX_PKG_BYTES) return 'package is too large'
  }
  return null
}

const fail = (code: ContainerRunCode, message: string): ContainerRunResult => ({
  ok: false,
  code,
  message: publicText(message).slice(0, MESSAGE_CAP)
})

function mapError(err: unknown): ContainerRunResult {
  if (isTryItOutRuntimeError(err)) {
    const msg = publicErrorMessage(err)
    switch (err.code) {
      case 'output_invalid':
        return fail('output_invalid', msg)
      case 'exec_failed':
        return fail('exec_failed', msg)
      default:
        return fail('engine_unavailable', msg)
    }
  }
  return fail('exec_failed', publicErrorMessage(err))
}

class RunTimeout extends Error {}
class RunAborted extends Error {}

function guard<T>(p: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new RunAborted('aborted'))
      return
    }
    const timer = setTimeout(() => reject(new RunTimeout('timeout')), ms)
    const onAbort = () => reject(new RunAborted('aborted'))
    signal?.addEventListener('abort', onAbort, { once: true })
    const done = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    p.then(
      (v) => {
        done()
        resolve(v)
      },
      (e) => {
        done()
        reject(e)
      }
    )
  })
}

export async function runInContainer(
  runtime: ContainerRuntime,
  request: DriverRequest,
  packageFiles: PackageFile[],
  opts: ContainerRunOptions = {}
): Promise<ContainerRunResult> {
  // Everything is validated before the engine is touched.
  const parsed = DriverRequestSchema.safeParse(request)
  if (!parsed.success) return fail('exec_failed', 'invalid driver request')
  const bad = checkPackage(packageFiles)
  if (bad) return fail('exec_failed', bad)
  if (request.subject.kind === 'fake' && packageFiles.length > 0) return fail('exec_failed', 'a fake subject takes no package')
  let tree: StagedFile[]
  try {
    tree = opts.driverTree ?? readDriverTree()
  } catch {
    return fail('exec_failed', 'driver sources could not be read')
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let containerId: string | null = null
  const stderrTail: string[] = []
  try {
    const run = async (): Promise<ContainerRunResult> => {
      await runtime.ensureNetwork()
      containerId = await runtime.createAndStart({
        name: `mcptest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        labels: { [LABEL_MCPTEST]: '1', [LABEL_INSTANCE]: opts.instanceId ?? 'mcptest' },
        env: []
      })
      const id = containerId
      const staged: StagedFile[] = [
        { path: 'in', type: 'dir' },
        { path: 'out', type: 'dir', mode: 0o777 },
        { path: 'in/request.json', content: JSON.stringify(parsed.data) },
        ...withDirs('', tree.map((f) => ({ path: f.path, content: String(f.content ?? '') }))),
        ...(packageFiles.length > 0 ? withDirs('pkg', packageFiles) : [])
      ]
      await runtime.putFiles(id, WORK_ROOT_IN_CONTAINER, dedupeDirs(staged))
      const { exitCode } = await runtime.exec(id, {
        cmd: DRIVER_CMD,
        workingDir: WORK_ROOT_IN_CONTAINER,
        onStdout: () => {},
        onStderr: (c) => {
          stderrTail.push(c.toString('utf8'))
          if (stderrTail.length > 20) stderrTail.shift()
        }
      })
      const files = await runtime.getFiles(id, `${WORK_ROOT_IN_CONTAINER}/out`, {
        maxBytes: MAX_REPORT_BYTES + 100_000,
        maxFiles: MAX_OUT_FILES
      })
      const rep = files['report.json']
      if (!rep) {
        const errFile = files['error.json']
        if (errFile) {
          let msg = 'driver reported an error'
          try {
            const j = JSON.parse(Buffer.from(errFile).toString('utf8')) as { error?: unknown }
            if (typeof j.error === 'string') msg = j.error
          } catch {
            /* keep the generic text */
          }
          return fail('output_invalid', msg)
        }
        if (exitCode !== 0) {
          const tail = redactSecrets(stderrTail.join('')).slice(-100).replace(/\s+/g, ' ').trim()
          return fail('exec_failed', `driver exited with code ${exitCode ?? 'null'}${tail ? `: ${tail}` : ''}`)
        }
        return fail('output_invalid', 'no report was produced')
      }
      if (rep.byteLength > MAX_REPORT_BYTES) return fail('output_invalid', 'report exceeds the size cap')
      let json: unknown
      const text = Buffer.from(rep).toString('utf8')
      try {
        json = JSON.parse(text)
      } catch {
        return fail('output_invalid', 'report is not valid JSON')
      }
      const checked = ReportSchema.safeParse(json)
      if (!checked.success) return fail('output_invalid', 'report does not match the schema')
      return { ok: true, report: checked.data, reportJson: text }
    }
    return await guard(run(), timeoutMs, opts.signal)
  } catch (err) {
    if (err instanceof RunTimeout) return fail('timeout', 'the container run timed out')
    if (err instanceof RunAborted) return fail('exec_failed', 'the run was cancelled')
    return mapError(err)
  } finally {
    const id = containerId
    if (id) {
      try {
        await runtime.remove(id)
      } catch {
        /* cleanup is best effort; the orphan sweep labels (aic.mcptest) cover leftovers */
      }
    }
  }
}

function dedupeDirs(files: StagedFile[]): StagedFile[] {
  const seen = new Set<string>()
  return files.filter((f) => {
    if (f.type !== 'dir') return true
    if (seen.has(f.path)) return false
    seen.add(f.path)
    return true
  })
}
