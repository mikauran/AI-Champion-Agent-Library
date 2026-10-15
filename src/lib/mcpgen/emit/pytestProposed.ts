// test_server.py of a proposal-assisted package. The baseline tests name tools by role and call them
// with the baseline argument names, which a proposal may have renamed, merged or split, so this file
// checks what stays true whatever the proposal did: the tool surface, the signatures the plan
// promises, read-only names, no private function exposed, and for merge tools the structured error
// for a bad dispatch value (answered before any upstream call). The package ships it; this
// repository never runs it.
import type { ServerPlan } from '../types.js'
import { finalSignature } from '../proposals/signature.js'
import { joinLines, pyLit, pyStr } from './pyutil.js'

/**
 * Test asserting the annotations of every registered tool. Lists tools through the in-memory fastmcp
 * Client (same on 3.4.x and 4.x); annotations are read as an attribute or a dict key so a model
 * class or a plain mapping both work. Needs EXPECTED_TOOLS in the module.
 */
export function annotationTests(openWorld: boolean): string[] {
  return [
    `OPEN_WORLD = ${openWorld ? 'True' : 'False'}`,
    '',
    '',
    'def _hint(annotations, key):',
    '    if isinstance(annotations, dict):',
    '        return annotations.get(key)',
    '    return getattr(annotations, key, None)',
    '',
    '',
    'def test_every_tool_declares_read_only_annotations():',
    '    import asyncio',
    '',
    '    from fastmcp import Client',
    '',
    '    async def list_tools():',
    '        async with Client(server.mcp) as client:',
    '            return await client.list_tools()',
    '',
    '    tools = asyncio.run(list_tools())',
    '    assert sorted(t.name for t in tools) == sorted(EXPECTED_TOOLS)',
    '    for tool in tools:',
    '        assert _hint(tool.annotations, "readOnlyHint") is True, tool.name',
    '        assert _hint(tool.annotations, "destructiveHint") is False, tool.name',
    '        assert _hint(tool.annotations, "idempotentHint") is True, tool.name',
    '        assert _hint(tool.annotations, "openWorldHint") is OPEN_WORLD, tool.name',
    '',
    '',
  ]
}

export function emitProposedPytest(plan: ServerPlan): string {
  const exposed = plan.tools.map((t) => t.name)
  const signatures = Object.fromEntries(plan.tools.map((t) => [t.name, finalSignature(plan, t).map((a) => a.name)]))
  const internal = (plan.internal ?? []).map((t) => t.name)
  const merges = plan.tools.flatMap((t) => {
    const w = t.proposed?.wrapper
    return w && w.kind === 'merge' && w.mode === 'dispatch' ? [[t.name, w.dispatchArg] as const] : []
  })
  const out: string[] = [
    `# Generated tests for ${plan.model.name.replace(/[^A-Za-z0-9 _.-]/g, ' ')} (proposal-assisted package).`,
    '# They do not call any upstream service. Run with: pytest test_server.py',
    'import inspect',
    'import re',
    '',
    'import server',
    '',
    `EXPECTED_TOOLS = ${pyLit(exposed)}`,
    `SIGNATURES = ${pyLit(signatures)}`,
    `PRIVATE_FUNCTIONS = ${pyLit(internal)}`,
    `DISPATCH_TOOLS = ${pyLit(merges.map((m) => [m[0], m[1]]))}`,
    'ERROR_KEYS = {"ok", "kind", "message", "hint"}',
    '',
    '',
    'def test_tools_exist_with_valid_names():',
    '    for name in EXPECTED_TOOLS:',
    '        assert callable(getattr(server, name))',
    '        assert re.match(r"^[a-z][a-z0-9_]{2,47}$", name)',
    '',
    '',
    'def test_only_read_tools_exist():',
    '    public = [n for n in dir(server) if callable(getattr(server, n)) and not n.startswith("_")]',
    '    assert not [n for n in public if re.match(r"^(create|update|delete|post|put|patch|remove|write)_", n)]',
    '',
    '',
    'def test_signatures_match_the_plan():',
    '    for name, params in SIGNATURES.items():',
    '        assert list(inspect.signature(getattr(server, name)).parameters) == params',
    '',
    '',
    'def test_private_functions_are_not_registered_names():',
    '    for name in PRIVATE_FUNCTIONS:',
    '        assert name.startswith("_op_")',
    '',
    '',
    'def test_a_bad_dispatch_value_is_a_structured_error():',
    '    for name, arg in DISPATCH_TOOLS:',
    '        out = getattr(server, name)(**{arg: "no-such-operation"})',
    '        assert out["ok"] is False and out["kind"] == "invalid_argument"',
    '        assert set(out) == ERROR_KEYS',
    '',
    '',
    ...annotationTests(plan.model.backend.kind === 'http'),
    `# Proposal provenance: ${pyStr(plan.proposals?.sha256 ?? '')}`,
  ]
  return joinLines(out)
}
