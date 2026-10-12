// Registry of fake MCP server variants. Every variant is a scorer fixture (it exists to prove the
// platform's scorer discriminates), never a tested real server. Consumed by 15-08's discrimination test.
import type { FlagId } from '../core/types'
import { GOOD, type Behaviour } from './behaviour'

export interface VariantDef {
  id: string
  description: string
  behaviour: Behaviour
  /** Check kinds (or dimension ids such as 'D1') this variant must fail. */
  mustFail: string[]
  /** Risk flags this variant must raise. */
  flags: FlagId[]
  expectScoreBand?: 'full' | 'partial' | 'low'
}

const def = (
  id: string,
  description: string,
  over: Partial<Behaviour>,
  mustFail: string[],
  flags: FlagId[] = [],
  expectScoreBand?: VariantDef['expectScoreBand']
): VariantDef => ({
  id,
  description: `Scorer fixture: ${description}`,
  behaviour: { ...GOOD, ...over },
  mustFail,
  flags,
  expectScoreBand
})

export const VARIANTS: Record<string, VariantDef> = {}
for (const v of [def('good', 'satisfies behaviour checks 1-9; expected full score and no flags.', {}, [], [], 'full')]) {
  VARIANTS[v.id] = v
}

export function variantIds(): string[] {
  return Object.keys(VARIANTS)
}
export function getVariant(id: string): VariantDef | undefined {
  return Object.prototype.hasOwnProperty.call(VARIANTS, id) ? VARIANTS[id] : undefined
}
