// Gap helpers (design doc section 4). Messages are clipped and control characters stripped,
// mirroring `clean` in scripts/validate-submission.ts.
import type { Gap, Severity } from './types.js'

const MAX_MESSAGE = 300
const RANK: Record<Severity, number> = { error: 0, warn: 1, info: 2 }

function clean(s: unknown): string {
  const t = (typeof s === 'string' ? s : String(s)).replace(/[\u0000-\u001f\u007f]+/g, ' ')
  return t.length > MAX_MESSAGE ? `${t.slice(0, MAX_MESSAGE)}...` : t
}

export function gap(
  code: string,
  message: string,
  opts: { severity?: Severity; path?: string } = {},
): Gap {
  const g: Gap = { code, message: clean(message), severity: opts.severity ?? 'warn' }
  if (opts.path !== undefined) g.path = clean(opts.path)
  return g
}

function sorted(gaps: Gap[]): Gap[] {
  return gaps
    .slice()
    .sort(
      (a, b) =>
        RANK[a.severity] - RANK[b.severity] ||
        a.code.localeCompare(b.code) ||
        (a.path ?? '').localeCompare(b.path ?? ''),
    )
}

export function formatGaps(gaps: Gap[]): string {
  return sorted(gaps)
    .map((g) => `[${g.severity}] ${g.code}${g.path ? ` (${clean(g.path)})` : ''}: ${clean(g.message)}`)
    .join('\n')
}

export function summarizeGaps(gaps: Gap[]): { errors: number; warnings: number; infos: number } {
  return {
    errors: gaps.filter((g) => g.severity === 'error').length,
    warnings: gaps.filter((g) => g.severity === 'warn').length,
    infos: gaps.filter((g) => g.severity === 'info').length,
  }
}
