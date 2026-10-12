// sql-ddl adapter (CUST-02): CREATE TABLE statements -> entities with PKs, FKs and types, plus
// read-only SELECT operations. Hand-written tolerant parser (no SQL library, no new dependency).
// Only schema text is read. Data-changing statements are reported and ignored; their values are
// never kept. Anything ambiguous or unsupported becomes a Gap, never a guess.
import { gap } from '../diagnostics.js'
import { snake, serverSlug } from '../plan.js'
import type { Entity, Field, FieldType, Gap, GenerateOptions, InputAdapter, Operation, ParseResult, RawInput, SourceModel } from '../types.js'

const SAFE = /^[A-Za-z_][A-Za-z0-9_]*$/
const MAX_TABLES = 100
const MAX_COLUMNS = 200
const MAX_GAPS_PER_CODE = 25

/** Remove -- and block comments, keeping quoted text intact. */
function stripComments(sql: string): string {
  let out = ''
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    const two = sql.slice(i, i + 2)
    if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === close) {
          if (sql[j + 1] === close && ch !== '[') {
            j += 2
            continue
          }
          break
        }
        j++
      }
      out += sql.slice(i, j + 1)
      i = j + 1
    } else if (two === '--') {
      while (i < sql.length && sql[i] !== '\n') i++
    } else if (two === '/*') {
      const end = sql.indexOf('*/', i + 2)
      out += ' '
      i = end < 0 ? sql.length : end + 2
    } else {
      out += ch
      i++
    }
  }
  return out
}

/** Split on semicolons outside quotes. Trigger bodies (BEGIN ... END) stay one statement. */
function splitStatements(sql: string): string[] {
  const parts: string[] = []
  let cur = ''
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === close) {
          if (sql[j + 1] === close && ch !== '[') {
            j += 2
            continue
          }
          break
        }
        j++
      }
      cur += sql.slice(i, j + 1)
      i = j + 1
    } else if (ch === ';') {
      parts.push(cur)
      cur = ''
      i++
    } else {
      cur += ch
      i++
    }
  }
  parts.push(cur)
  const out: string[] = []
  let trigger: string | undefined
  for (const p of parts.map((x) => x.trim()).filter((x) => x !== '')) {
    if (trigger !== undefined) {
      trigger += `; ${p}`
      if (/^END\b/i.test(p)) {
        out.push(trigger)
        trigger = undefined
      }
    } else if (/^CREATE\s+(?:TEMP(?:ORARY)?\s+)?TRIGGER\b/i.test(p) && /\bBEGIN\b/i.test(p) && !/\bEND\s*$/i.test(p)) {
      trigger = p
    } else out.push(p)
  }
  if (trigger !== undefined) out.push(trigger)
  return out
}

/** Split on top-level commas (outside parentheses and quotes). */
function splitTop(body: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  let i = 0
  while (i < body.length) {
    const ch = body[i]
    if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch
      let j = i + 1
      while (j < body.length && body[j] !== close) j++
      cur += body.slice(i, j + 1)
      i = j + 1
      continue
    }
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
    i++
  }
  if (cur.trim() !== '') out.push(cur.trim())
  return out
}

/** Read one possibly quoted, possibly schema-qualified identifier. Returns the last part. */
function readIdent(s: string): { name: string; rest: string } | undefined {
  let rest = s.trimStart()
  let name: string | undefined
  for (let part = 0; part < 4; part++) {
    const m = /^(?:"((?:[^"]|"")+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_][A-Za-z0-9_$]*))/.exec(rest)
    if (!m) return name === undefined ? undefined : { name, rest }
    name = (m[1] ?? m[2] ?? m[3] ?? m[4]).replace(/""/g, '"')
    rest = rest.slice(m[0].length)
    const dot = /^\s*\.\s*/.exec(rest)
    if (!dot) return { name, rest }
    rest = rest.slice(dot[0].length)
  }
  return name === undefined ? undefined : { name, rest }
}

function identList(s: string): string[] | undefined {
  const names: string[] = []
  for (const item of splitTop(s)) {
    const id = readIdent(item)
    if (!id) return undefined
    names.push(id.name)
  }
  return names
}

const INT_TYPES = new Set(['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'MEDIUMINT', 'SERIAL', 'BIGSERIAL', 'SMALLSERIAL', 'INT2', 'INT4', 'INT8'])
const NUM_TYPES = new Set(['REAL', 'FLOAT', 'FLOAT4', 'FLOAT8', 'DOUBLE', 'NUMERIC', 'DECIMAL', 'MONEY', 'NUMBER'])
const BOOL_TYPES = new Set(['BOOL', 'BOOLEAN', 'BIT'])
const TEXT_TYPES = new Set(['CHAR', 'VARCHAR', 'NCHAR', 'NVARCHAR', 'CHARACTER', 'VARYING', 'TEXT', 'STRING', 'CLOB', 'DATE', 'TIME', 'TIMESTAMP', 'DATETIME', 'TIMESTAMPTZ', 'UUID', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT', 'YEAR', 'INTERVAL'])

function mapType(raw: string): { type: FieldType; known: boolean; composite: boolean } {
  const t = raw.trim().toUpperCase()
  if (t === '') return { type: 'string', known: false, composite: false }
  if (/\[\s*\d*\s*\]\s*$/.test(t) || /\bARRAY\b/.test(t) || /^(JSON|JSONB|XML|HSTORE|STRUCT|MAP|ROW)\b/.test(t)) return { type: 'string', known: false, composite: true }
  const base = /^[A-Z0-9_]+/.exec(t)?.[0] ?? ''
  if (INT_TYPES.has(base)) return { type: 'integer', known: true, composite: false }
  if (NUM_TYPES.has(base)) return { type: 'number', known: true, composite: false }
  if (BOOL_TYPES.has(base)) return { type: 'boolean', known: true, composite: false }
  if (TEXT_TYPES.has(base)) return { type: 'string', known: true, composite: false }
  return { type: 'string', known: false, composite: false }
}

const CONSTRAINT_WORDS = /\b(NOT\s+NULL|NULL|PRIMARY\s+KEY|REFERENCES|DEFAULT|UNIQUE|CHECK|CONSTRAINT|COLLATE|GENERATED|AUTO_INCREMENT|AUTOINCREMENT|COMMENT|AS|IDENTITY)\b/i

interface Col {
  name: string
  type: FieldType
  nullable?: boolean
  pk: boolean
  ref?: { table: string; column?: string }
}
interface Table {
  name: string
  cols: Col[]
  pk: string[]
  fks: { column: string; table: string; ref?: string }[]
}

const title = (s: string) => s.replace(/[_-]+/g, ' ').trim()

export const sqlDdlAdapter: InputAdapter = {
  id: 'sql-ddl',
  label: 'SQL DDL (CREATE TABLE)',
  detect: (input: RawInput) => (/\bcreate\s+(?:\w+\s+){0,3}?table\b/i.test(typeof input.text === 'string' ? input.text : '') ? 0.9 : 0),
  parse(input: RawInput, options?: GenerateOptions): ParseResult {
    try {
      return parseDdl(input, options)
    } catch {
      return { rejected: [gap('adapter-failed', 'The SQL input could not be parsed.', { severity: 'error' })] }
    }
  },
}

function parseDdl(input: RawInput, options?: GenerateOptions): ParseResult {
  const text = typeof input.text === 'string' ? input.text : ''
  const gaps: Gap[] = []
  const counts = new Map<string, number>()
  const push = (g: Gap) => {
    const n = (counts.get(g.code) ?? 0) + 1
    counts.set(g.code, n)
    if (n <= MAX_GAPS_PER_CODE) gaps.push(g)
  }
  const tables: Table[] = []
  const dropped = new Set<string>()
  const ignoredWrites = new Map<string, { verb: string; table: string; n: number; severity: 'info' | 'warn' }>()

  for (const stmt of splitStatements(stripComments(text))) {
    const verb = /^[A-Za-z]+/.exec(stmt)?.[0].toUpperCase() ?? ''
    if (verb === 'CREATE' && /^CREATE\s+(?:(?:GLOBAL\s+|LOCAL\s+)?(?:TEMP|TEMPORARY)\s+|UNLOGGED\s+)?TABLE\b/i.test(stmt)) {
      if (tables.length >= MAX_TABLES) {
        push(gap('too-many-tables', `Only the first ${MAX_TABLES} tables are used.`, { severity: 'warn' }))
        continue
      }
      const t = parseCreateTable(stmt, push)
      if (!t) continue
      if (tables.some((x) => x.name === t.name)) {
        push(gap('duplicate-table', 'A table is defined twice; the later definition was ignored.', { path: t.name }))
        continue
      }
      tables.push(t)
      continue
    }
    if (['INSERT', 'UPDATE', 'DELETE', 'REPLACE', 'DROP', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE', 'MERGE'].includes(verb)) {
      let table = '*'
      const m =
        verb === 'INSERT' || verb === 'REPLACE'
          ? /^(?:INSERT|REPLACE)\s+(?:OR\s+\w+\s+)?(?:INTO\s+)?(.*)$/is.exec(stmt)
          : verb === 'UPDATE'
            ? /^UPDATE\s+(?:OR\s+\w+\s+)?(.*)$/is.exec(stmt)
            : verb === 'DELETE'
              ? /^DELETE\s+FROM\s+(.*)$/is.exec(stmt)
              : verb === 'DROP' || verb === 'TRUNCATE'
                ? /^(?:DROP|TRUNCATE)\s+(?:TABLE\s+|VIEW\s+|INDEX\s+|TRIGGER\s+)?(?:IF\s+EXISTS\s+)?(.*)$/is.exec(stmt)
                : verb === 'ALTER'
                  ? /^ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(.*)$/is.exec(stmt)
                  : null
      const id = m ? readIdent(m[1]) : undefined
      if (id && SAFE.test(id.name)) table = id.name
      const key = `${verb}:${table}`
      dropped.add(key.toLowerCase())
      const prev = ignoredWrites.get(key)
      if (prev) prev.n++
      else ignoredWrites.set(key, { verb, table, n: 1, severity: ['INSERT', 'UPDATE', 'DELETE', 'REPLACE'].includes(verb) ? 'info' : 'warn' })
      continue
    }
    if (['BEGIN', 'COMMIT', 'ROLLBACK', 'PRAGMA', 'SET', 'USE', 'START', 'END'].includes(verb)) {
      push(gap('unsupported-statement', `A ${verb} statement was ignored.`, { severity: 'info' }))
      continue
    }
    const what = /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:UNIQUE\s+)?(?:TEMP(?:ORARY)?\s+)?(?:MATERIALIZED\s+)?([A-Za-z]+)/i.exec(stmt)?.[1]?.toUpperCase()
    push(gap('unsupported-statement', `${what ? `CREATE ${what}` : verb || 'A'} statement is not supported and was ignored.`))
  }
  for (const w of [...ignoredWrites.values()].sort((a, b) => (a.verb + a.table < b.verb + b.table ? -1 : 1))) {
    push(gap('statement-ignored', `${w.verb} on ${w.table} was ignored (${w.n} statement${w.n === 1 ? '' : 's'}); the generated server is read-only and no values are kept.`, { severity: w.severity, path: `${w.verb.toLowerCase()}:${w.table}` }))
  }
  for (const [code, n] of counts) if (n > MAX_GAPS_PER_CODE) gaps.push(gap('gaps-truncated', `${n - MAX_GAPS_PER_CODE} more ${code} diagnostics were omitted.`, { severity: 'info' }))

  if (tables.length === 0) {
    return { rejected: [...gaps, gap('no-tables', 'No usable CREATE TABLE statement was found.', { severity: 'error' })] }
  }

  const name = (options?.serverName?.trim() || (input.filename ? title(input.filename.replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '')) : '') || 'Schema')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
  const slug = serverSlug({ name } as SourceModel).toUpperCase()

  const tableNames = new Set(tables.map((t) => t.name))
  const entities: Entity[] = []
  const operations: Operation[] = []
  const maxPage = options?.limits?.maxPageSize
  const pageMax = typeof maxPage === 'number' && Number.isInteger(maxPage) && maxPage >= 1 ? maxPage : 100
  if (!(typeof maxPage === 'number' && maxPage >= 1)) {
    push(gap('limit-default', `No page size is known from the schema; the default of ${pageMax} rows per call was used. Override it with options.limits.maxPageSize.`, { severity: 'info' }))
  }
  for (const t of tables) {
    const fields: Field[] = t.cols.map((c) => {
      const f: Field = { name: c.name, type: c.type }
      if (t.pk.includes(c.name)) f.identifier = true
      if (c.nullable === false) f.nullable = false
      if (c.ref) {
        f.description = `References ${c.ref.table}.${c.ref.column ?? '?'}`
        if (!tableNames.has(c.ref.table)) push(gap('fk-target-missing', 'A foreign key points to a table that is not in the input.', { severity: 'info', path: `${t.name}.${c.name}` }))
      }
      if (/name|title/i.test(c.name)) f.nameLike = true
      if (/status|type|category|segment|group|kind|class/i.test(c.name)) f.classLike = true
      return f
    })
    if (t.pk.length === 0) push(gap('no-identifier', 'The table has no primary key; only list and query access is generated, no lookup.', { path: t.name }))
    entities.push({ id: t.name, label: title(t.name), fields, identifierFields: [...t.pk], nested: [] })
    operations.push({
      id: `list_${t.name}`,
      kind: 'list',
      method: 'SELECT',
      entity: t.name,
      params: [
        { name: 'limit', in: 'query', type: 'integer', required: false, min: 1, max: pageMax },
        { name: 'offset', in: 'query', type: 'integer', required: false, min: 0 },
      ],
      pageParam: 'offset',
      pageSizeParam: 'limit',
      summary: `List rows of ${t.name}`,
    })
    if (t.pk.length > 0) {
      operations.push({
        id: `get_${t.name}`,
        kind: 'get',
        method: 'SELECT',
        entity: t.name,
        params: t.pk.map((k) => ({ name: k, in: 'column' as const, type: t.cols.find((c) => c.name === k)!.type, required: true })),
        summary: `Fetch one row of ${t.name} by primary key`,
      })
    }
  }

  const model: SourceModel = {
    name,
    backend: { kind: 'sql', dsnEnv: `${slug}_DB_PATH` },
    auth: { scheme: 'none' },
    entities,
    operations,
    limits: { maxPageSize: pageMax, maxResponseItems: 200, ...(options?.limits ?? {}) },
    gaps,
    writeOperationsDropped: [...dropped].sort(),
  }
  return { model, gaps }
}

function parseCreateTable(stmt: string, push: (g: Gap) => void): Table | undefined {
  const head = /^CREATE\s+(?:(?:GLOBAL\s+|LOCAL\s+)?(?:TEMP|TEMPORARY)\s+|UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i.exec(stmt)!
  const id = readIdent(stmt.slice(head[0].length))
  if (!id) {
    push(gap('unparsable-table', 'A CREATE TABLE statement has no readable table name and was skipped.'))
    return undefined
  }
  const tname = id.name
  if (!SAFE.test(tname)) {
    push(gap('unsafe-identifier', 'A table name has characters that cannot be used safely and the table was skipped.', { path: tname.slice(0, 40) }))
    return undefined
  }
  const open = id.rest.trimStart()
  if (!open.startsWith('(')) {
    push(gap('unparsable-table', 'CREATE TABLE without a column list (for example AS SELECT) is not supported; the table was skipped.', { path: tname }))
    return undefined
  }
  // Find the matching close parenthesis.
  let depth = 0
  let end = -1
  for (let i = 0; i < open.length; i++) {
    const ch = open[i]
    if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch
      let j = i + 1
      while (j < open.length && open[j] !== close) j++
      i = j
      continue
    }
    if (ch === '(') depth++
    else if (ch === ')') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end < 0) {
    push(gap('unparsable-table', 'The column list is not closed; the table was skipped.', { path: tname }))
    return undefined
  }
  const items = splitTop(open.slice(1, end))
  const cols: Col[] = []
  const tablePk: string[] = []
  const fks: Table['fks'] = []
  for (const item of items) {
    let s = item.replace(/^CONSTRAINT\s+(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|\w+)\s+/i, '')
    let m: RegExpExecArray | null
    if ((m = /^PRIMARY\s+KEY\s*\(([^)]*)\)/i.exec(s))) {
      const names = identList(m[1])
      if (names) tablePk.push(...names)
      else push(gap('unsupported-syntax', 'A table-level PRIMARY KEY could not be read.', { path: tname }))
      continue
    }
    if ((m = /^FOREIGN\s+KEY\s*\(([^)]*)\)\s*REFERENCES\s+(.+)$/is.exec(s))) {
      const local = identList(m[1])
      const target = readIdent(m[2])
      const refCols = target ? /^\s*\(([^)]*)\)/.exec(target.rest) : null
      const remote = refCols ? identList(refCols[1]) : undefined
      if (local && target) local.forEach((c, i) => fks.push({ column: c, table: target.name, ref: remote?.[i] }))
      else push(gap('unsupported-syntax', 'A FOREIGN KEY clause could not be read.', { path: tname }))
      continue
    }
    if (/^(UNIQUE|CHECK|INDEX|KEY|FULLTEXT|SPATIAL|EXCLUDE|PERIOD)\b\s*(?:\w+\s*)?\(/i.test(s)) continue
    const cid = readIdent(s)
    if (!cid || !/^\s+\S/.test(cid.rest) && cid.rest.trim() !== '') {
      push(gap('unsupported-syntax', 'A column definition was not recognised and was skipped.', { path: tname }))
      continue
    }
    s = cid.rest
    const cut = CONSTRAINT_WORDS.exec(s)
    const typeText = (cut ? s.slice(0, cut.index) : s).trim()
    const constraints = cut ? s.slice(cut.index) : ''
    const mt = mapType(typeText)
    if (!SAFE.test(cid.name)) {
      push(gap('unsafe-identifier', 'A column name has characters that cannot be used safely and the column was left out.', { path: `${tname}.${cid.name.slice(0, 40)}` }))
      continue
    }
    if (mt.composite) push(gap('unsupported-type', 'A composite or array type is not supported; the column is exposed as text.', { path: `${tname}.${cid.name}` }))
    else if (!mt.known) push(gap('unknown-type', 'A column type was not recognised; string was used.', { severity: 'info', path: `${tname}.${cid.name}` }))
    const col: Col = { name: cid.name, type: mt.type, pk: /\bPRIMARY\s+KEY\b/i.test(constraints) }
    if (/\bNOT\s+NULL\b/i.test(constraints)) col.nullable = false
    const r = /\bREFERENCES\s+(.+)$/is.exec(constraints)
    if (r) {
      const target = readIdent(r[1])
      const rc = target ? /^\s*\(([^)]*)\)/.exec(target.rest) : null
      if (target) col.ref = { table: target.name, column: rc ? identList(rc[1])?.[0] : undefined }
    }
    cols.push(col)
  }
  if (cols.length === 0) {
    push(gap('unparsable-table', 'No column could be read; the table was skipped.', { path: tname }))
    return undefined
  }
  if (cols.length > MAX_COLUMNS) {
    push(gap('unparsable-table', `The table has more than ${MAX_COLUMNS} columns and was skipped.`, { path: tname }))
    return undefined
  }
  const seen = new Set<string>()
  for (const c of cols) {
    if (seen.has(c.name.toLowerCase())) {
      push(gap('duplicate-column', 'A column name appears twice; the table was skipped.', { path: `${tname}.${c.name}` }))
      return undefined
    }
    seen.add(c.name.toLowerCase())
  }
  const pk = [...cols.filter((c) => c.pk).map((c) => c.name), ...tablePk].filter((n, i, a) => a.indexOf(n) === i)
  for (const n of pk) {
    if (!cols.some((c) => c.name === n)) {
      push(gap('unparsable-table', 'A primary key names a column that does not exist (or was left out); the table was skipped.', { path: tname }))
      return undefined
    }
  }
  for (const fk of fks) {
    const c = cols.find((x) => x.name === fk.column)
    if (c) c.ref = { table: fk.table, column: fk.ref }
  }
  return { name: tname, cols, pk, fks }
}
