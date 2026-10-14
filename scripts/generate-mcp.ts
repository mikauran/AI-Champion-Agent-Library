// Author-facing MCP generator CLI (Phase 14). Like validate-submission it is an author tool and
// works regardless of the MCP_GENERATOR flag (mcpGeneratorEnabled is never called). It reads
// exactly one file (the given input path), never env files, never the network, and writes only
// under --out. The generated Python is never executed.
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { MAX_INPUT_BYTES } from '../src/lib/mcpgen/api-contract.js'
import { validPath } from '../src/lib/mcpgen/bundle.js'
import { formatGaps } from '../src/lib/mcpgen/diagnostics.js'
import { runPipeline } from '../src/lib/mcpgen/pipeline.js'
import type { GenerateOptions } from '../src/lib/mcpgen/types.js'

export interface CliIo {
  readFile: (path: string) => Promise<string>
  /** Size in bytes of the input file (checked before reading). */
  fileSize: (path: string) => Promise<number>
  /** Entries of a directory; resolves [] when it does not exist. */
  readdir: (path: string) => Promise<string[]>
  writeFile: (path: string, content: string) => Promise<void>
  mkdir: (path: string) => Promise<void>
  log: (s: string) => void
  error: (s: string) => void
}

const USAGE =
  'Usage: npm run generate-mcp -- --adapter <openapi|tabular-catalog|sql-ddl|prisma|auto> <input-file> --out <dir> [--force] [--server-name N] [--max-page-size N] [--result-ceiling N]'

const MAX_STR = 300
/** C0 and C1 control characters (the C1 range includes the 8-bit CSI) are never printed (review IN-06). */
export function clean(s: unknown): string {
  const t = (typeof s === 'string' ? s : String(s)).replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ')
  return t.length > MAX_STR ? `${t.slice(0, MAX_STR)}...` : t
}

export const defaultIo: CliIo = {
  readFile: (p) => readFile(p, 'utf8'),
  fileSize: async (p) => (await stat(p)).size,
  readdir: async (p) => {
    try {
      return await readdir(p)
    } catch (e) {
      if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') return []
      throw e
    }
  },
  writeFile: (p, c) => writeFile(p, c, 'utf8'),
  mkdir: async (p) => {
    await mkdir(p, { recursive: true })
  },
  log: (s) => console.log(s),
  error: (s) => console.error(s),
}

interface Parsed {
  adapter: string
  input?: string
  out?: string
  force: boolean
  options: GenerateOptions
}

function posInt(v: string | undefined): number | undefined {
  if (v === undefined || !/^\d{1,7}$/.test(v)) return undefined
  const n = Number(v)
  return n >= 1 ? n : undefined
}

function parseArgs(argv: string[]): Parsed | null {
  const p: Parsed = { adapter: 'auto', force: false, options: {} }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--force') p.force = true
    else if (a === '--adapter' || a === '--out' || a === '--server-name' || a === '--max-page-size' || a === '--result-ceiling') {
      const v = argv[++i]
      if (v === undefined || v.startsWith('--')) return null
      if (a === '--adapter') p.adapter = v
      else if (a === '--out') p.out = v
      else if (a === '--server-name') p.options.serverName = v.slice(0, 80)
      else {
        const n = posInt(v)
        if (n === undefined) return null
        p.options.limits = { ...p.options.limits, [a === '--max-page-size' ? 'maxPageSize' : 'resultCeiling']: n }
      }
    } else if (a.startsWith('--')) return null
    else if (p.input === undefined) p.input = a
    else return null
  }
  return p.input && p.out ? p : null
}

/** Returns 0 ok, 2 rejected or failed, 64 usage error. Never throws. */
export async function main(argv: string[], io: CliIo = defaultIo): Promise<number> {
  const args = parseArgs(argv)
  if (!args || !args.input || !args.out) {
    io.error(USAGE)
    return 64
  }
  try {
    if (basename(args.input).toLowerCase().startsWith('.env')) {
      io.error('generate-mcp: refusing to read environment files.')
      return 2
    }
    if ((await io.fileSize(args.input)) > MAX_INPUT_BYTES) {
      io.error(`generate-mcp: input exceeds the ${MAX_INPUT_BYTES} byte limit.`)
      return 2
    }
    const text = await io.readFile(args.input)
    const result = runPipeline(text, {
      adapterId: args.adapter,
      options: args.options,
      filename: basename(args.input),
    })
    if (!result.ok) {
      io.error(formatGaps(result.gaps))
      return 2
    }
    if (!args.force && (await io.readdir(args.out)).length > 0) {
      io.error('generate-mcp: output directory is not empty (use --force to write into it).')
      return 2
    }
    if (!result.files.every((f) => validPath(f.path))) {
      io.error('generate-mcp: generated file path rejected.')
      return 2
    }
    await io.mkdir(args.out)
    for (const f of result.files) {
      const target = join(args.out, f.path)
      const dir = target.slice(0, Math.max(0, target.length - basename(target).length - 1))
      if (dir && dir !== args.out) await io.mkdir(dir)
      await io.writeFile(target, f.content)
    }
    const r = result.report
    io.log(`Generated ${result.files.length} files in ${args.out} (adapter: ${clean(result.adapterId)}).`)
    io.log(`Tools: ${r.toolsEmitted.map(clean).join(', ') || '(none)'}`)
    if (r.toolsDropped.length > 0) {
      io.log('Dropped:')
      for (const d of r.toolsDropped) io.log(`  - ${clean(d.id)}: ${clean(d.reason)}`)
    }
    if (r.gaps.length > 0) io.log(formatGaps(r.gaps))
    if (r.assumptions.length > 0) {
      io.log('Assumptions:')
      for (const a of r.assumptions) io.log(`  - ${clean(a)}`)
    }
    if (r.envVars.length > 0) {
      io.log('Environment variables:')
      for (const v of r.envVars) io.log(`  ${clean(v.name)}  ${clean(v.purpose)}`)
    }
    return 0
  } catch (e) {
    io.error(`generate-mcp: ${e instanceof Error ? clean(e.message) : 'error'}`)
    return 2
  }
}

/** True when this module is the program entry. Compares file URLs, so spaces and non-ASCII paths work. */
export function isMainModule(metaUrl: string, argv1: string | undefined): boolean {
  if (!argv1) return false
  try {
    return metaUrl === pathToFileURL(resolve(argv1)).href
  } catch {
    return false
  }
}

if (isMainModule(import.meta.url, process.argv[1])) {
  process.exitCode = await main(process.argv.slice(2))
}
