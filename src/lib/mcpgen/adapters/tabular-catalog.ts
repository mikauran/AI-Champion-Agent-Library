// Stub adapter; replaced by a later Phase 14 plan.
import type { InputAdapter } from '../types.js'

export const tabularCatalogAdapter: InputAdapter = {
  id: 'tabular-catalog',
  label: 'Tabular catalog',
  detect: () => 0,
  parse: () => ({
    rejected: [
      {
        code: 'not-implemented',
        severity: 'error',
        message: 'The tabular-catalog adapter is not implemented yet.',
      },
    ],
  }),
}
