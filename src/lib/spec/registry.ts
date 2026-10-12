// Format registry (Phase 13): detect then parse, never throws. Pure over SubmissionFile[]
// (no fs). Only reachable from flag-gated code.
import type { DetectResult, FormatAdapter, ParseOutcome, SubmissionFile } from './kinds.js'
import { clampExtras } from './kinds.js'
import { ADAPTERS } from './formats/index.js'
import { unrecognizedOutcome } from './outcome.js'
import { redactSecrets, scanSecrets } from './security.js'

export { unrecognizedOutcome }

export function listAdapters(): FormatAdapter[] {
  return ADAPTERS.slice()
}

/** All adapters that detect, best first (confidence desc, then adapter order). */
export function detectFormats(
  files: SubmissionFile[],
): Array<{ adapter: FormatAdapter } & DetectResult> {
  const hits: Array<{ adapter: FormatAdapter; order: number } & DetectResult> = []
  ADAPTERS.forEach((adapter, order) => {
    try {
      const r = adapter.detect(files)
      if (r) hits.push({ adapter, order, format: r.format, confidence: r.confidence })
    } catch {
      /* a failing detector is a non-detect */
    }
  })
  hits.sort((a, b) => b.confidence - a.confidence || a.order - b.order)
  return hits.map(({ adapter, format, confidence }) => ({ adapter, format, confidence }))
}

export function parseSubmission(files: SubmissionFile[], ctx: { now: string }): ParseOutcome {
  try {
    const list = Array.isArray(files) ? files : []
    const best = detectFormats(list)[0]
    if (!best) return unrecognizedOutcome()
    let outcome: ParseOutcome
    try {
      outcome = best.adapter.parse(list, ctx)
    } catch (e) {
      return unrecognizedOutcome([
        `adapter ${best.adapter.id} failed: ${e instanceof Error ? e.message : 'error'}`,
      ])
    }
    if (outcome.kindInfo) {
      const found = [...scanSecrets(outcome.kindInfo.extras), ...scanSecrets(outcome.kindInfo.members)]
      if (found.length > 0) {
        outcome = {
          ...outcome,
          kindInfo: {
            ...outcome.kindInfo,
            members: redactSecrets(outcome.kindInfo.members),
            extras: clampExtras(redactSecrets(outcome.kindInfo.extras)),
          },
          warnings: [
            ...outcome.warnings,
            `secret-like values redacted (${found.length}): ${found.slice(0, 5).join(', ')}`,
          ],
        }
      }
    }
    return outcome
  } catch (e) {
    return unrecognizedOutcome([`registry error: ${e instanceof Error ? e.message : 'error'}`])
  }
}
