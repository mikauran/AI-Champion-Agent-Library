// ServerPlan -> server.py text. Plain template functions; nothing is executed or read from disk.
import type { Entity, NestedCollection, Operation, Param, PlannedTool, ServerPlan } from '../types.js'
import {
  DERIVED_MAX_PAGES,
  effectiveMaxPageSize,
  entityFieldNames,
  pathSegments,
  resolveAuth,
  resolveEnv,
  serverSlug,
  snake,
  toolKind,
} from '../plan.js'
import { cleanText, joinLines, pyLit, pyStr } from './pyutil.js'
import { RUNTIME_COMMON, RUNTIME_DATASET, RUNTIME_QUERY, RUNTIME_SQL, runtimeHttp } from './runtime.js'

const PYTYPE: Record<string, string> = { string: 'str', integer: 'int', number: 'float', boolean: 'bool', unknown: 'str' }
const I32_MIN = -2147483648
const I32_MAX = 2147483647

const FAIL_TAIL = ['    except _Fail as exc:', '        return _fail(exc)', '    except Exception:', '        return _err("internal", _INTERNAL_MESSAGE)']

function entityOf(plan: ServerPlan, id: string): Entity {
  return plan.model.entities.find((e) => e.id === id)!
}
function opOf(plan: ServerPlan, tool: PlannedTool): Operation | undefined {
  return plan.model.operations.find((o) => o.id === tool.operation)
}
const ind = (n: number, s: string) => '    '.repeat(n) + s

function sigParam(p: Param): string {
  const t = PYTYPE[p.type] ?? 'str'
  const required = p.required || p.in === 'path'
  return required ? `${p.name}: ${t}` : `${p.name}: Optional[${t}] = None`
}

function ceilingWarning(ceiling: number, hint: string): string {
  return `Result ceiling reached: results beyond position ${ceiling} are not available. Narrow the request with ${hint} instead of paging deeper.`
}

function partitionHint(op: Operation | undefined, params: Param[]): string {
  const p = params.find((x) => !x.required && x.in === 'query' && !/^(q|query|search|keyword|keywords|text|term)$/i.test(x.name))
  void op
  return p ? `the ${p.name} filter` : 'a more specific search term'
}

/** Validation lines for one argument (inside try, indent level 2). */
function paramChecks(p: Param): string[] {
  const out: string[] = []
  const required = p.required || p.in === 'path'
  const guard = required ? '' : `${p.name} is not None and `
  if (p.enum && p.enum.length > 0) {
    const vals = p.enum.map((e) => pyStr(String(e))).join(', ')
    const shown = p.enum.map((e) => cleanText(e, 40)).join(', ')
    out.push(ind(2, `if ${guard}str(${p.name}) not in (${vals},):`))
    out.push(ind(3, `return _err("invalid_argument", ${pyStr(`Invalid value for ${p.name}; allowed values: ${shown}.`)})`))
  } else if (p.type === 'integer' && (p.min !== undefined || p.max !== undefined)) {
    const call = `${p.name} = _clamp(${p.name}, ${p.min ?? I32_MIN}, ${p.max ?? I32_MAX})`
    out.push(required ? ind(2, call) : ind(2, `if ${p.name} is not None:`))
    if (!required) out.push(ind(3, call))
  } else if (p.type === 'number' && (p.min !== undefined || p.max !== undefined)) {
    const call = `${p.name} = _bound(${p.name}, ${p.min ?? 'None'}, ${p.max ?? 'None'})`
    out.push(required ? ind(2, call) : ind(2, `if ${p.name} is not None:`))
    if (!required) out.push(ind(3, call))
  } else if (p.type === 'string' || p.type === 'unknown') {
    out.push(ind(2, `if ${guard}len(str(${p.name})) > 256:`))
    out.push(ind(3, `return _err("invalid_argument", ${pyStr(`${p.name} is too long (at most 256 characters).`)})`))
  }
  return out
}

function queryLines(params: Param[], target = 'query'): string[] {
  const out: string[] = []
  for (const p of params.filter((x) => x.in === 'query')) {
    if (p.required) out.push(ind(2, `${target}[${pyStr(p.name)}] = _qv(${p.name})`))
    else {
      out.push(ind(2, `if ${p.name} is not None:`))
      out.push(ind(3, `${target}[${pyStr(p.name)}] = _qv(${p.name})`))
    }
  }
  return out
}

function pathExpr(op: Operation): string {
  const segs = pathSegments(op)!
  return segs.map((s) => (typeof s === 'string' ? pyStr(s) : `_seg(${s.param})`)).join(' + ')
}

function doc(summary: string, args: [string, string][], notes: string[] = []): string[] {
  const out = [ind(1, `"""${cleanText(summary, 400)}`)]
  for (const n of notes) out.push('', ind(1, cleanText(n, 300)))
  if (args.length) {
    out.push('', ind(1, 'Args:'))
    for (const [k, v] of args) out.push(ind(2, `${k}: ${cleanText(v, 160)}`))
  }
  out.push(ind(1, '"""'))
  return out
}

function paramArgs(params: Param[]): [string, string][] {
  return params.map((p) => [p.name, p.description || (p.in === 'path' ? 'Identifier of the item.' : `Optional ${p.name} filter.`)] as [string, string])
}

const FIELDS_DOC = 'Optional list of field names to return (at most 12; unknown names are ignored).'

function httpListTool(plan: ServerPlan, tool: PlannedTool, kind: 'list' | 'search'): string[] {
  const op = opOf(plan, tool)!
  const m = plan.model
  const max = effectiveMaxPageSize(m, op)
  const ceiling = m.limits.resultCeiling
  const paged = !!op.pageParam
  const sized = !!op.pageSizeParam
  const required = tool.params.filter((p) => p.required || p.in === 'path')
  const optional = tool.params.filter((p) => !(p.required || p.in === 'path'))
  const sig = [...required.map(sigParam)]
  if (paged) sig.push('page: int = 1')
  if (sized) sig.push(`page_size: int = ${Math.min(20, max)}`)
  sig.push(...optional.map(sigParam), 'fields: Optional[list[str]] = None')
  const notes: string[] = []
  if (sized) notes.push(`page_size is clamped to the range 1 to ${max}; larger values are reduced, not rejected.`)
  if (ceiling !== undefined && paged) notes.push(`Results beyond position ${ceiling} are not available; a warning with advice is returned instead.`)
  const args: [string, string][] = [...paramArgs(required)]
  if (paged) args.push(['page', 'Page number, starting at 1.'])
  if (sized) args.push(['page_size', `Rows per page (1 to ${max}).`])
  args.push(...paramArgs(optional), ['fields', FIELDS_DOC])
  const body: string[] = []
  if (paged) body.push(ind(2, 'page = _clamp(page, 1, 1000000)'))
  if (sized) body.push(ind(2, `page_size = _clamp(page_size, 1, ${max})`))
  if (ceiling !== undefined && paged) {
    const size = sized ? 'page_size' : '1'
    const hint = partitionHint(op, tool.params)
    body.push(ind(2, `if page * ${size} > ${ceiling}:`))
    const extra = sized ? ', "page_size": page_size' : ''
    body.push(ind(3, `return {"ok": True, "results": [], "count": 0, "warning": ${pyStr(ceilingWarning(ceiling, hint))}, "page": page${extra}}`))
  }
  for (const p of tool.params) body.push(...paramChecks(p))
  const ent = pyStr(tool.entity)
  body.push(ind(2, `sel = _select_fields(fields, _ALLOWED[${ent}], _DEFAULT[${ent}])`))
  body.push(ind(2, 'query = {}'))
  if (paged) body.push(ind(2, `query[${pyStr(op.pageParam!)}] = page`))
  if (sized) body.push(ind(2, `query[${pyStr(op.pageSizeParam!)}] = page_size`))
  body.push(...queryLines(tool.params))
  body.push(ind(2, `data = _http_json(${pathExpr(op)}, query)`))
  body.push(ind(2, `rows = _rows(data)[: min(${sized ? 'page_size' : 'MAX_RESPONSE_ITEMS'}, MAX_RESPONSE_ITEMS)]`))
  body.push(ind(2, 'if not rows:'))
  body.push(ind(3, `return _no_results(${pyStr(snake(tool.entity))}, "Try fewer filters or a broader search term.")`))
  body.push(ind(2, 'results = [_project(row, sel) for row in rows]'))
  const tail = `${paged ? ', "page": page' : ''}${sized ? ', "page_size": page_size' : ''}`
  body.push(ind(2, `return {"ok": True, "results": results, "count": len(results)${tail}}`))
  void kind
  return [`def ${tool.name}(${sig.join(', ')}) -> dict:`, ...doc(tool.description, args, notes), ind(1, 'try:'), ...body, ...FAIL_TAIL]
}

function httpGetTool(plan: ServerPlan, tool: PlannedTool): string[] {
  const op = opOf(plan, tool)!
  const required = tool.params.filter((p) => p.required || p.in === 'path')
  const optional = tool.params.filter((p) => !(p.required || p.in === 'path'))
  const sig = [...required.map(sigParam), ...optional.map(sigParam), 'fields: Optional[list[str]] = None']
  const args: [string, string][] = [...paramArgs(required), ...paramArgs(optional), ['fields', FIELDS_DOC]]
  const idVar = required[0]?.name
  const ent = pyStr(tool.entity)
  const entName = pyStr(snake(tool.entity))
  const notFound = idVar ? `_not_found(${entName}, ${idVar})` : `_not_found(${entName}, "")`
  const body: string[] = []
  for (const p of tool.params) body.push(...paramChecks(p))
  body.push(ind(2, `sel = _select_fields(fields, _ALLOWED[${ent}], _DEFAULT[${ent}])`))
  body.push(ind(2, 'query = {}'))
  body.push(...queryLines(tool.params))
  body.push(ind(2, `data = _http_json(${pathExpr(op)}, query or None)`))
  body.push(ind(2, 'item = _item(data)'))
  body.push(ind(2, 'if not item:'))
  body.push(ind(3, `return ${notFound}`))
  body.push(ind(2, 'return {"ok": True, "result": _project(item, sel)}'))
  return [
    `def ${tool.name}(${sig.join(', ')}) -> dict:`,
    ...doc(tool.description, args),
    ind(1, 'try:'),
    ...body,
    ind(1, 'except _Fail as exc:'),
    ind(2, 'if exc.kind == "not_found":'),
    ind(3, `return ${notFound}`),
    ind(2, 'return _fail(exc)'),
    ind(1, 'except Exception:'),
    ind(2, 'return _err("internal", _INTERNAL_MESSAGE)'),
  ]
}

function nestedOf(plan: ServerPlan, tool: PlannedTool): NestedCollection {
  return entityOf(plan, tool.entity).nested.find((n) => n.field === tool.derived!.source)!
}

function httpFilterTool(plan: ServerPlan, tool: PlannedTool): string[] {
  const op = opOf(plan, tool)!
  const m = plan.model
  const nested = nestedOf(plan, tool)
  const max = effectiveMaxPageSize(m, op)
  const ceiling = m.limits.resultCeiling
  const paged = !!op.pageParam
  const sized = !!op.pageSizeParam
  const required = tool.params.filter((p) => p.required || p.in === 'path')
  const optional = tool.params.filter((p) => !(p.required || p.in === 'path'))
  const sig = [...required.map(sigParam), 'key: str', 'value: Optional[str] = None', ...optional.map(sigParam), `max_pages: int = ${Math.min(5, DERIVED_MAX_PAGES)}`, 'fields: Optional[list[str]] = None']
  const keyDesc = nested.keyFields.length ? nested.keyFields.join(' or ') : nested.valueFields.join(' or ')
  const args: [string, string][] = [
    ...paramArgs(required),
    ['key', `Key to look for in ${snake(nested.field)} (matches ${keyDesc}).`],
    ['value', nested.keyFields.length && nested.valueFields.length ? `Optional value the entry must also have (matches ${nested.valueFields.join(' or ')}).` : 'Not used for this collection.'],
    ...paramArgs(optional),
    ['max_pages', `Candidate pages to scan, 1 to ${DERIVED_MAX_PAGES}. The tool fetches the pages itself.`],
    ['fields', FIELDS_DOC],
  ]
  const notes = [`Scans up to max_pages pages in memory and reports coverage (pages_scanned, truncated). A truncated scan means more candidates exist than were checked.`]
  const ent = pyStr(tool.entity)
  const body: string[] = []
  body.push(ind(2, `max_pages = _clamp(max_pages, 1, ${DERIVED_MAX_PAGES})`))
  body.push(ind(2, 'needle = str(key).strip()'))
  body.push(ind(2, 'if not needle or len(needle) > 256:'))
  body.push(ind(3, 'return _err("invalid_argument", "A key of 1 to 256 characters is required.")'))
  body.push(ind(2, 'if value is not None and len(str(value)) > 256:'))
  body.push(ind(3, 'return _err("invalid_argument", "value is too long (at most 256 characters).")'))
  for (const p of tool.params) body.push(...paramChecks(p))
  body.push(ind(2, `sel = _select_fields(fields, _ALLOWED[${ent}], _DEFAULT[${ent}])`))
  body.push(ind(2, 'base_query = {}'))
  body.push(...queryLines(tool.params, 'base_query'))
  body.push(ind(2, 'matches = []'))
  body.push(ind(2, 'scanned = 0'))
  body.push(ind(2, 'truncated = False'))
  body.push(ind(2, `for page in range(1, ${paged ? 'max_pages + 1' : '2'}):`))
  body.push(ind(3, 'query = dict(base_query)'))
  if (paged) body.push(ind(3, `query[${pyStr(op.pageParam!)}] = page`))
  if (sized) body.push(ind(3, `query[${pyStr(op.pageSizeParam!)}] = ${max}`))
  body.push(ind(3, `rows = _rows(_http_json(${pathExpr(op)}, query))`))
  body.push(ind(3, 'scanned += 1'))
  body.push(ind(3, 'for row in rows:'))
  body.push(
    ind(4, `hits = _nested_hits(row.get(${pyStr(nested.field)}), ${pyLit(nested.keyFields)}, ${pyLit(nested.valueFields)}, needle, value)`),
  )
  body.push(ind(4, 'if hits:'))
  body.push(ind(5, 'item = _project(row, sel)'))
  body.push(ind(5, `item[${pyStr(nested.field)}] = hits`))
  body.push(ind(5, 'matches.append(item)'))
  body.push(ind(5, 'if len(matches) >= MAX_RESPONSE_ITEMS:'))
  body.push(ind(6, 'truncated = True'))
  body.push(ind(6, 'break'))
  body.push(ind(3, 'if truncated:'))
  body.push(ind(4, 'break'))
  if (paged) {
    body.push(ind(3, sized ? `if len(rows) < ${max}:` : 'if not rows:'))
    body.push(ind(4, 'break'))
    if (ceiling !== undefined && sized) {
      body.push(ind(3, `if page * ${max} >= ${ceiling}:`))
      body.push(ind(4, 'truncated = True'))
      body.push(ind(4, 'break'))
    }
    body.push(ind(2, 'else:'))
    body.push(ind(3, 'truncated = True'))
  }
  body.push(
    ind(
      2,
      `coverage = {"pages_scanned": scanned, "truncated": truncated, "note": ${pyStr('The scan stopped before every candidate page was checked; matching items may be missing. Narrow the request or raise max_pages.')} if truncated else ${pyStr('Every candidate page was checked.')}}`,
    ),
  )
  body.push(ind(2, 'out = {"ok": True, "results": matches, "count": len(matches), "coverage": coverage}'))
  body.push(ind(2, 'if not matches:'))
  body.push(ind(3, `out["message"] = ${pyStr('No matches found among the scanned candidates.')}${paged ? ` + (${pyStr(' The scan was incomplete, so a match may exist further on.')} if truncated else "")` : ''}`))
  body.push(ind(2, 'elif truncated:'))
  body.push(ind(3, `out["message"] = ${pyStr('Results may be incomplete: the scan stopped before every page was checked.')}`))
  body.push(ind(2, 'return out'))
  return [`def ${tool.name}(${sig.join(', ')}) -> dict:`, ...doc(tool.description, args, notes), ind(1, 'try:'), ...body, ...FAIL_TAIL]
}

function queryTool(plan: ServerPlan, tool: PlannedTool): string[] {
  const m = plan.model
  const isSql = m.backend.kind === 'sql'
  const max = effectiveMaxPageSize(m)
  const ceiling = m.limits.resultCeiling
  const ent = pyStr(tool.entity)
  const describe = plan.tools.find((t) => t.derived?.kind === 'schemaDiscovery')!.name
  const sig = ['field: Optional[str] = None', 'value: Optional[str] = None', 'match: str = "equals"', 'fields: Optional[list[str]] = None', `limit: int = ${Math.min(20, max)}`, 'offset: int = 0']
  const notes = [
    `limit is clamped to the range 1 to ${max}; larger values are reduced, not rejected.`,
    'Give both field and value to filter; give neither to list rows. Call the describe tool to see the fields.',
  ]
  if (ceiling !== undefined) notes.push(`Results beyond position ${ceiling} are not available; a warning with advice is returned instead.`)
  const args: [string, string][] = [
    ['field', 'Field to filter on.'],
    ['value', 'Value to match (text or number).'],
    ['match', 'equals, contains or startsWith (case-insensitive).'],
    ['fields', FIELDS_DOC],
    ['limit', `Rows to return (1 to ${max}).`],
    ['offset', 'Rows to skip, for paging.'],
  ]
  const body: string[] = [
    ind(2, `problem = _query_problem(_ALLOWED[${ent}], ${pyStr(describe)}, field, value, match)`),
    ind(2, 'if problem is not None:'),
    ind(3, 'return problem'),
    ind(2, `sel = _select_fields(fields, _ALLOWED[${ent}], _DEFAULT[${ent}])`),
    ind(2, `limit = _clamp(limit, 1, ${max})`),
    ind(2, 'offset = _clamp(offset, 0, 1000000000)'),
  ]
  if (ceiling !== undefined) {
    body.push(ind(2, `if offset + limit > ${ceiling}:`))
    body.push(ind(3, `return {"ok": True, "results": [], "count": 0, "warning": ${pyStr(ceilingWarning(ceiling, 'a field filter'))}, "offset": offset, "limit": limit}`))
  }
  if (isSql) {
    body.push(ind(2, `rows = _sql_query(${ent}, sel, field, match, value, min(limit, MAX_RESPONSE_ITEMS), offset)`))
    body.push(ind(2, 'if not rows:'))
    body.push(ind(3, `return _no_results(${pyStr(snake(tool.entity))}, "Try a broader value or another match mode.")`))
    body.push(ind(2, 'results = rows'))
    body.push(ind(2, 'return {"ok": True, "results": results, "count": len(results), "offset": offset, "limit": limit}'))
  } else {
    body.push(ind(2, 'rows = _load_rows()'))
    body.push(ind(2, 'if field is not None:'))
    body.push(ind(3, 'rows = [row for row in rows if _match(row.get(field), match, value)]'))
    body.push(ind(2, 'total = len(rows)'))
    body.push(ind(2, 'rows = rows[offset : offset + min(limit, MAX_RESPONSE_ITEMS)]'))
    body.push(ind(2, 'if not rows:'))
    body.push(ind(3, `return _no_results(${pyStr(snake(tool.entity))}, "Try a broader value or another match mode.")`))
    body.push(ind(2, 'results = [_project(row, sel) for row in rows]'))
    body.push(ind(2, 'return {"ok": True, "results": results, "count": len(results), "total_matches": total, "offset": offset, "limit": limit}'))
  }
  return [`def ${tool.name}(${sig.join(', ')}) -> dict:`, ...doc(tool.description, args, notes), ind(1, 'try:'), ...body, ...FAIL_TAIL]
}

function describeTool(plan: ServerPlan, tool: PlannedTool): string[] {
  return [
    `def ${tool.name}() -> dict:`,
    ...doc(tool.description, []),
    ind(1, 'result = dict(_SCHEMA)'),
    ind(1, 'result["ok"] = True'),
    ind(1, 'return result'),
  ]
}

function schemaLiteral(plan: ServerPlan): unknown {
  const m = plan.model
  const max = effectiveMaxPageSize(m)
  const entities = plan.tools
    .filter((t) => toolKind(plan, t) === 'query')
    .map((t) => {
      const e = entityOf(plan, t.entity)
      return {
        name: e.id,
        label: cleanText(e.label, 80),
        query_tool: t.name,
        default_fields: t.projection,
        fields: e.fields.map((f) => {
          const o: Record<string, unknown> = { name: f.name, type: f.type }
          if (f.label) o.label = cleanText(f.label, 80)
          return o
        }),
      }
    })
  return { server: cleanText(m.name, 80), entities, match_modes: ['equals', 'contains', 'startsWith'], max_limit: max, max_rows_per_call: m.limits.maxResponseItems }
}

export function emitPython(plan: ServerPlan): string {
  const m = plan.model
  const env = resolveEnv(m)
  const auth = resolveAuth(m)
  const kind = m.backend.kind
  const out: string[] = []
  const envRows: string[] = []
  if (env.baseUrl) envRows.push(`#   ${env.baseUrl}  base address of the upstream service`)
  if (env.auth) envRows.push(`#   ${env.auth}  API key for the upstream service`)
  if (env.dataFile) envRows.push(`#   ${env.dataFile}  location of the data file (CSV)`)
  if (env.dsn) envRows.push(`#   ${env.dsn}  location of the database file (SQLite)`)
  out.push(
    '# Generated by the MCP generator. Deterministic output; regenerate instead of editing.',
    `# Read-only MCP server for ${cleanText(m.name, 80)} (stdio transport).`,
    '# Configuration is read from environment variables only. Set:',
    ...envRows,
    '',
  )
  const std = ['math', 'os']
  if (kind === 'http') std.push('json', 'time', 'urllib.parse')
  if (kind === 'dataset') std.push('csv')
  if (kind === 'sql') std.push('pathlib', 'sqlite3')
  out.push(...std.sort().map((x) => `import ${x}`), 'from typing import Optional', '')
  if (kind === 'http') out.push('import httpx')
  out.push('from fastmcp import FastMCP', '', `mcp = FastMCP(${pyStr(cleanText(m.name, 80) || 'server')})`, '')
  out.push('# Configuration (names only; values come from the environment).')
  out.push(`SERVER_NAME = ${pyStr(cleanText(m.name, 80))}`)
  out.push(`MAX_RESPONSE_ITEMS = ${m.limits.maxResponseItems}`)
  if (kind === 'http') {
    out.push(`BASE_URL_ENV = ${pyStr(env.baseUrl!)}`)
    out.push(`AUTH_ENV = ${env.auth ? pyStr(env.auth) : 'None'}`)
    out.push(`AUTH_NAME = ${pyStr(auth.name)}`)
    out.push('MAX_RETRIES = 2')
    out.push('MAX_RESPONSE_CHARS = 2000000')
    out.push(`_AUTH_MESSAGE = ${pyStr(env.auth ? `Authentication failed: check the API key configured in ${env.auth}` : 'Authentication failed: the upstream service refused the request.')}`)
    out.push(`_UPSTREAM_MESSAGE = ${pyStr('The upstream service is unavailable; try again later.')}`)
  }
  if (kind === 'dataset') out.push(`DATA_FILE_ENV = ${pyStr(env.dataFile!)}`)
  if (kind === 'sql') out.push(`DSN_ENV = ${pyStr(env.dsn!)}`)
  out.push('', '')
  out.push(RUNTIME_COMMON.trimEnd())
  if (kind === 'http') out.push(runtimeHttp(auth.scheme).replace(/\n+$/, ''))
  if (kind === 'dataset') out.push(RUNTIME_QUERY.replace(/\n+$/, ''), RUNTIME_DATASET.replace(/\n+$/, ''))
  if (kind === 'sql') out.push(RUNTIME_QUERY.replace(/\n+$/, ''), RUNTIME_SQL.replace(/\n+$/, ''))
  out.push('', '')

  // Data tables: per-entity allow-list and default projection.
  const ents = [...new Set(plan.tools.filter((t) => t.entity !== '*').map((t) => t.entity))].sort()
  const allowed: Record<string, string[]> = {}
  const dflt: Record<string, string[]> = {}
  for (const id of ents) {
    allowed[id] = entityFieldNames(entityOf(plan, id))
    dflt[id] = plan.tools.find((t) => t.entity === id)!.projection
  }
  out.push(`_ALLOWED = ${pyLit(allowed)}`, '', `_DEFAULT = ${pyLit(dflt)}`, '')
  if (kind !== 'http') out.push(`_SCHEMA = ${pyLit(schemaLiteral(plan))}`, '')
  if (kind === 'sql') {
    const tables: Record<string, unknown> = {}
    for (const id of ents) {
      const e = entityOf(plan, id)
      const columns: Record<string, string> = {}
      for (const f of e.fields) columns[f.name] = `"${f.name}"`
      tables[id] = { table: `"${e.id}"`, columns, order: e.identifierFields[0] ? `"${e.identifierFields[0]}"` : '' }
    }
    out.push('# Table and column names are quoted allow-list entries; tool arguments never reach the SQL text.', `_TABLES = ${pyLit(tables)}`, '')
  }

  // Tools.
  const names: string[] = []
  for (const [i, tool] of plan.tools.entries()) {
    const k = toolKind(plan, tool)
    out.push(...(i === 0 ? [''] : ['', '']))
    const body =
      k === 'list' || k === 'search'
        ? httpListTool(plan, tool, k)
        : k === 'get'
          ? httpGetTool(plan, tool)
          : k === 'filter'
            ? httpFilterTool(plan, tool)
            : k === 'query'
              ? queryTool(plan, tool)
              : describeTool(plan, tool)
    out.push(...body)
    names.push(tool.name)
  }
  out.push('', '', '# Register every tool with the server (read-only tools only).', 'for _tool in (')
  for (const n of names) out.push(`    ${n},`)
  out.push('):', '    mcp.tool(_tool)', '', '', 'if __name__ == "__main__":', '    mcp.run()')
  void serverSlug
  return joinLines(out)
}
