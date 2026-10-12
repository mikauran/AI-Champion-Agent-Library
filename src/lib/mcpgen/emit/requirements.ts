// requirements.txt for the generated package. The FastMCP pin is UNVERIFIED (design doc section 9,
// synthesis section 6 Q4): check it against the package index before shipping a generated server.
import type { ServerPlan } from '../types.js'

export const FASTMCP_PIN = 'fastmcp>=3.4,<4'
export const HTTPX_PIN = 'httpx>=0.27'
export const PYTEST_PIN = 'pytest>=8'

export function emitRequirements(plan: ServerPlan): string {
  const out = ['# Runtime dependencies. The fastmcp pin is unverified: confirm it before use.', FASTMCP_PIN]
  if (plan.model.backend.kind === 'http') out.push(HTTPX_PIN)
  out.push('', '# Development only (generated tests):', PYTEST_PIN)
  return out.join('\n') + '\n'
}
