import { mcpGeneratorEnabled, mcpTesterEnabled } from '$lib/flags.js'

// SvelteKit only allows load/actions/etc. to be exported from +page.server.ts, so these
// load helpers live here (a vite build fails on any other export).

/** Phase 14: the key exists only when MCP_GENERATOR is on, so flag-off data is unchanged. */
export function mcpGeneratorData(
  env: Record<string, string | undefined> = process.env
): { mcpGeneratorEnabled?: true } {
  return mcpGeneratorEnabled(env) ? { mcpGeneratorEnabled: true } : {}
}

/** Phase 15: the key exists only when MCP_TESTER is on, so flag-off data is unchanged. */
export function mcpTesterData(
  env: Record<string, string | undefined> = process.env
): { mcpTesterEnabled?: true } {
  return mcpTesterEnabled(env) ? { mcpTesterEnabled: true } : {}
}
