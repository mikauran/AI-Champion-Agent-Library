// STUB (13-02): body is filled in by plan 13-04/13-05. detect() never matches yet.
import type { FormatAdapter } from '../kinds.js'
import { unrecognizedOutcome } from '../outcome.js'

export const crewaiAdapter: FormatAdapter = {
  id: 'crewai',
  detect: () => null,
  parse: () => unrecognizedOutcome(),
}
