// Tool binding: explicit name wins; otherwise tool_hint must match exactly one tool.
import type { ToolInfo } from './types'

export interface BindResult {
  tool?: string
  boundBy: 'explicit' | 'hint' | 'none'
  status: 'ok' | 'no_tool' | 'ambiguous'
  matches: string[]
}

export function bindTool(
  spec: { tool?: string; tool_hint?: string },
  tools: ToolInfo[],
  override?: { tool: string; args?: Record<string, unknown> }
): BindResult {
  const explicit = override?.tool ?? spec.tool
  if (explicit) {
    const found = tools.some((t) => t.name === explicit)
    return found
      ? { tool: explicit, boundBy: 'explicit', status: 'ok', matches: [explicit] }
      : { boundBy: 'none', status: 'no_tool', matches: [] }
  }
  if (!spec.tool_hint) return { boundBy: 'none', status: 'no_tool', matches: [] }
  let re: RegExp
  try {
    re = new RegExp(spec.tool_hint, 'i')
  } catch {
    return { boundBy: 'none', status: 'ambiguous', matches: [] }
  }
  let matches = tools.filter((t) => re.test(t.name)).map((t) => t.name)
  if (matches.length === 0) matches = tools.filter((t) => t.description && re.test(t.description)).map((t) => t.name)
  if (matches.length === 1) return { tool: matches[0], boundBy: 'hint', status: 'ok', matches }
  if (matches.length === 0) return { boundBy: 'none', status: 'no_tool', matches }
  return { boundBy: 'none', status: 'ambiguous', matches }
}
