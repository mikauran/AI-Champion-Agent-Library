// Single library entry point: credential scan -> registry parse -> generate. Pure: no fs, no
// network, no logging. Never throws; every failure becomes gaps. The input text is never kept.
import { MAX_OUTPUT_BYTES } from './api-contract.js'
import { gap } from './diagnostics.js'
import { generate } from './generate.js'
import { serverSlug } from './plan.js'
import { parseInput } from './registry.js'
import type { GenerateOptions, GeneratedFile, GenerationReport, Gap } from './types.js'

export interface PipelineOptions {
  adapterId?: string
  options?: GenerateOptions
  filename?: string
}

export type PipelineResult =
  | { ok: true; files: GeneratedFile[]; report: GenerationReport; serverName: string; adapterId: string }
  | { ok: false; gaps: Gap[] }

export function runPipeline(rawInput: string, opts: PipelineOptions = {}): PipelineResult {
  try {
    const adapterId = opts.adapterId === 'auto' ? undefined : opts.adapterId
    const parsed = parseInput(
      { text: typeof rawInput === 'string' ? rawInput : '', filename: opts.filename },
      { adapterId, options: opts.options },
    )
    if (!parsed.ok) return { ok: false, gaps: parsed.gaps }
    const result = generate(parsed.model, opts.options ?? {})
    if (result.files.length === 0) {
      const errs = result.report.gaps.filter((g) => g.severity === 'error')
      return {
        ok: false,
        gaps: errs.length > 0 ? errs : [gap('no-tools', 'Nothing could be generated from this input.', { severity: 'error' })],
      }
    }
    const bytes = result.files.reduce((n, f) => n + Buffer.byteLength(f.content, 'utf8'), 0)
    if (bytes > MAX_OUTPUT_BYTES) {
      return {
        ok: false,
        gaps: [gap('output-too-large', `Generated package exceeds the ${MAX_OUTPUT_BYTES} byte limit.`, { severity: 'error' })],
      }
    }
    return {
      ok: true,
      files: result.files,
      report: result.report,
      serverName: serverSlug(parsed.model),
      adapterId: parsed.adapterId,
    }
  } catch {
    return { ok: false, gaps: [gap('pipeline-failed', 'Generation failed unexpectedly.', { severity: 'error' })] }
  }
}
