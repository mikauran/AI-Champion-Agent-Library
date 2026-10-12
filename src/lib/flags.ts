// Feature flags. Plain env access (no SvelteKit $env) so tsx scripts and vitest can import it.
// Read at call time so tests and processes can toggle without re-importing.
const TRUTHY = new Set(['1', 'true', 'on', 'yes'])

export function agentKindsEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  const v = env.AGENT_KINDS
  return typeof v === 'string' && TRUTHY.has(v.trim().toLowerCase())
}
