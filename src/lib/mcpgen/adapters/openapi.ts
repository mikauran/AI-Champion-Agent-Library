// Stub adapter; replaced by a later Phase 14 plan.
import type { InputAdapter } from '../types.js'

export const openApiAdapter: InputAdapter = {
  id: 'openapi',
  label: 'OpenAPI',
  detect: () => 0,
  parse: () => ({
    rejected: [
      { code: 'not-implemented', severity: 'error', message: 'The openapi adapter is not implemented yet.' },
    ],
  }),
}
