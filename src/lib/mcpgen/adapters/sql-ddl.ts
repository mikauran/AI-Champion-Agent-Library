// Stub adapter; replaced by a later Phase 14 plan.
import type { InputAdapter } from '../types.js'

export const sqlDdlAdapter: InputAdapter = {
  id: 'sql-ddl',
  label: 'SQL DDL',
  detect: () => 0,
  parse: () => ({
    rejected: [
      { code: 'not-implemented', severity: 'error', message: 'The sql-ddl adapter is not implemented yet.' },
    ],
  }),
}
