// OpenAPI 3.x InputAdapter (design doc section 5, RESEARCH-SYNTHESIS 5.1).
//
// Reads schema only. The servers url, examples and defaults from the document are never copied; the
// model carries env-var NAMES. Only GET operations are modelled, every other method is listed in
// writeOperationsDropped. $ref resolution is local (#/...) only, cycle-safe, depth limited; an
// external $ref is reported, never fetched. Ambiguous constructs become gaps and the affected
// operation is omitted, never guessed. parse() never throws.
import { parse as parseYaml } from 'yaml'
import { MAX_INPUT_BYTES } from '../api-contract.js'
import { gap } from '../diagnostics.js'
import { snake } from '../plan.js'
import { redactSecrets } from '../redact.js'
import type {
  Entity,
  Field,
  FieldType,
  Gap,
  InputAdapter,
  NestedCollection,
  Operation,
  Param,
  ParseResult,
  RawInput,
  SourceModel,
} from '../types.js'

type Obj = Record<string, unknown>

const MAX_REF_DEPTH = 12
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const
const PAGE_NAMES = new Set(['page', 'pagenumber', 'page_number', 'pageno', 'page_no'])
const OFFSET_NAMES = new Set(['offset', 'skip', 'start'])
const SIZE_NAMES = new Set(['size', 'pagesize', 'page_size', 'limit', 'per_page', 'perpage'])
const FREE_TEXT = new Set(['q', 'query', 'search', 'keyword', 'keywords', 'text', 'term', 'free_text'])
const WRAPPER_NAMES = ['items', 'data', 'results', 'content', 'records', 'rows']

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const own = (o: Obj, k: string): unknown => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined)

/** Text copied from the spec: links, credential-like text and control characters removed, clipped. */
function clean(s: unknown, max = 200): string | undefined {
  if (typeof s !== 'string') return undefined
  const t = redactSecrets(
    s
      .slice(0, 8192)
      .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  ).trim()
  if (t === '') return undefined
  return t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t
}

class Unsupported extends Error {
  constructor(
    public readonly code: string,
    public readonly detail: string,
  ) {
    super(code)
  }
}

function pointer(root: Obj, ref: string): unknown {
  let cur: unknown = root
  for (const raw of ref.slice(2).split('/')) {
    let seg = raw
    try {
      seg = decodeURIComponent(raw)
    } catch {
      /* keep raw */
    }
    seg = seg.replace(/~1/g, '/').replace(/~0/g, '~')
    if (!isObj(cur)) throw new Unsupported('ref-unresolved', 'A local $ref does not resolve.')
    cur = own(cur, seg)
    if (cur === undefined) throw new Unsupported('ref-unresolved', 'A local $ref does not resolve.')
  }
  return cur
}

/** Follow $ref chains (local only). Returns the target and the last name segment of the first ref. */
function deref(root: Obj, node: unknown): { node: Obj; name?: string } {
  let cur = node
  let name: string | undefined
  let hops = 0
  while (isObj(cur) && typeof cur.$ref === 'string') {
    if (++hops > MAX_REF_DEPTH) throw new Unsupported('ref-depth-exceeded', 'A $ref chain is too deep or circular.')
    const ref = cur.$ref
    if (!ref.startsWith('#/')) throw new Unsupported('external-ref-unsupported', 'An external $ref was found; external references are never fetched.')
    if (name === undefined) name = ref.split('/').pop()
    cur = pointer(root, ref)
  }
  if (!isObj(cur)) throw new Unsupported('ref-unresolved', 'A schema is not an object.')
  return { node: cur, name }
}

/**
 * Work limits for schema composition (review CR-02). `memo` remembers the merged properties of every
 * resolved schema node, so a node reached through many allOf/oneOf paths is computed once; `calls`
 * counts every schemaProps call (hits included) so even a memoised fan-out stays bounded.
 */
interface SchemaCtx {
  memo: WeakMap<object, { props: Obj; merged: boolean }>
  /** calls left for the operation being read (reset per operation) */
  left: number
  /** calls left for the whole document */
  total: number
}
/** schemaProps calls one operation may spend, and the whole document. */
export const OPERATION_SCHEMA_BUDGET = 5000
export const DOCUMENT_SCHEMA_BUDGET = 200000

function newCtx(): SchemaCtx {
  return { memo: new WeakMap(), left: OPERATION_SCHEMA_BUDGET, total: DOCUMENT_SCHEMA_BUDGET }
}

const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)

/** Merged properties of a schema (allOf merged; oneOf/anyOf only with a discriminator). */
function schemaProps(root: Obj, schema: unknown, ctx: SchemaCtx, depth = 0, notes?: { merged: boolean }): Obj {
  if (depth > MAX_REF_DEPTH) throw new Unsupported('ref-depth-exceeded', 'Schema composition is too deep.')
  if (--ctx.left < 0 || --ctx.total < 0) {
    throw new Unsupported('schema-budget-exceeded', 'Schema composition (allOf, oneOf, anyOf) is too large to read.')
  }
  const { node } = deref(root, schema)
  const hit = ctx.memo.get(node)
  if (hit) {
    if (hit.merged && notes) notes.merged = true
    return hit.props
  }
  // A null-prototype object, so property names such as constructor or __proto__ are ordinary fields.
  const props: Obj = Object.create(null)
  const local = { merged: false }
  const merge = (from: Obj) => {
    for (const k of Object.keys(from)) if (!hasOwn(props, k)) props[k] = from[k]
  }
  if (Array.isArray(node.allOf)) {
    for (const part of node.allOf) {
      const sub = { merged: false }
      merge(schemaProps(root, part, ctx, depth + 1, sub))
      if (sub.merged) local.merged = true
    }
  }
  for (const key of ['oneOf', 'anyOf'] as const) {
    const variants = node[key]
    if (!Array.isArray(variants)) continue
    if (!isObj(node.discriminator)) throw new Unsupported('ambiguous-oneof', `${key} without a discriminator cannot be resolved to one shape.`)
    local.merged = true
    for (const v of variants) {
      const sub = { merged: false }
      merge(schemaProps(root, v, ctx, depth + 1, sub))
      if (sub.merged) local.merged = true
    }
  }
  if (isObj(node.properties)) {
    for (const k of Object.keys(node.properties)) props[k] = node.properties[k]
  }
  if (local.merged && notes) notes.merged = true
  ctx.memo.set(node, { props, merged: local.merged })
  return props
}

function typeOf(node: Obj): FieldType {
  let t = node.type
  if (Array.isArray(t)) t = t.find((x) => x !== 'null')
  switch (t) {
    case 'string':
    case 'integer':
    case 'number':
    case 'boolean':
    case 'array':
    case 'object':
      return t
  }
  if (isObj(node.properties) || Array.isArray(node.allOf)) return 'object'
  if (node.items !== undefined) return 'array'
  return 'unknown'
}

const isNullable = (node: Obj) => node.nullable === true || (Array.isArray(node.type) && node.type.includes('null'))

function enumOf(node: Obj): string[] | undefined {
  if (!Array.isArray(node.enum)) return undefined
  const vals = node.enum.filter((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean').map(String)
  return vals.length > 0 ? vals.slice(0, 50) : undefined
}

const idKey = (s: string) => snake(s)
const KEY_FIELD = /(^|_)(id|code|key|class|feature|attribute|attr|name)$/
const VALUE_FIELD = /(^|_)(value|unit|amount|qty|quantity|text)$/

function fieldFlags(name: string, entityId: string): Pick<Field, 'identifier' | 'nameLike' | 'classLike'> {
  const s = idKey(name)
  const out: Pick<Field, 'identifier' | 'nameLike' | 'classLike'> = {}
  if (s === 'id' || s === 'code' || s === 'sku' || s === `${entityId}_id` || s === `${entityId}_code`) out.identifier = true
  if (s === 'name' || s === 'title' || s === 'label' || s.endsWith('_name')) out.nameLike = true
  if (['category', 'class', 'type', 'kind', 'group'].includes(s) || /_(class|category|group|type)$/.test(s)) out.classLike = true
  return out
}

function buildField(root: Obj, ctx: SchemaCtx, name: string, schema: unknown, entityId: string): { field: Field; nested?: NestedCollection } {
  const { node } = deref(root, schema)
  const type = typeOf(node)
  const field: Field = { name, type, ...fieldFlags(name, entityId) }
  const description = clean(node.description)
  if (description) field.description = description
  if (isNullable(node)) field.nullable = true
  const en = enumOf(node)
  if (en && type !== 'array' && type !== 'object') field.enum = en
  let nested: NestedCollection | undefined
  if (type === 'array' && node.items !== undefined) {
    const item = deref(root, node.items)
    if (typeOf(item.node) === 'object') {
      const itemProps = schemaProps(root, item.node, ctx)
      const itemFields: Field[] = Object.keys(itemProps).map((k) => {
        const d = deref(root, itemProps[k]).node
        const f: Field = { name: k, type: typeOf(d) }
        const dd = clean(d.description)
        if (dd) f.description = dd
        return f
      })
      const valueFields = itemFields.filter((f) => VALUE_FIELD.test(idKey(f.name))).map((f) => f.name)
      const keyFields = itemFields.filter((f) => KEY_FIELD.test(idKey(f.name)) && !valueFields.includes(f.name)).map((f) => f.name)
      for (const f of itemFields) if (keyFields.includes(f.name) && /(class|feature|attribute|code|key)/.test(idKey(f.name))) f.classLike = true
      if (keyFields.length > 0 && valueFields.length > 0) nested = { field: name, itemFields, keyFields, valueFields }
    }
  }
  return { field, nested }
}

function paramType(node: Obj): FieldType {
  return typeOf(node)
}

function opIdFor(method: string, path: string, raw: unknown, used: Set<string>): string {
  let base = typeof raw === 'string' ? raw.replace(/Using(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\d*$/i, '').replace(/[^A-Za-z0-9_.-]+/g, '_').slice(0, 64) : ''
  if (base === '' || base === '_') {
    const parts = path
      .split('/')
      .filter(Boolean)
      .map((seg) => {
        const m = /^\{(.+)\}$/.exec(seg)
        const w = (m ? m[1] : seg).replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
        return (m ? ['By', ...w] : w).map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join('')
      })
    base = method.toLowerCase() + parts.join('')
  }
  let id = base
  let n = 2
  while (used.has(id)) id = `${base}_${n++}`
  used.add(id)
  return id
}

function singular(seg: string): string {
  if (/ies$/.test(seg)) return `${seg.slice(0, -3)}y`
  if (/(ss|us)$/.test(seg)) return seg
  if (/s$/.test(seg)) return seg.slice(0, -1)
  return seg
}

function envPrefix(name: string): string {
  let s = snake(name).slice(0, 32).replace(/_+$/, '')
  if (s.endsWith('_api') && s.length > 4) s = s.slice(0, -4)
  return s.toUpperCase()
}

interface Candidate {
  op: Operation
  entityId: string
  getParam?: string
}
interface EntityAcc {
  id: string
  label: string
  fields: Map<string, Field>
  nested: Map<string, NestedCollection>
}

function pickResponseSchema(root: Obj, responses: unknown): unknown {
  if (!isObj(responses)) return undefined
  const keys = Object.keys(responses)
    .filter((k) => /^2\d\d$/.test(k))
    .sort()
  for (const k of keys) {
    const { node } = deref(root, responses[k])
    if (!isObj(node.content)) continue
    const ctKeys = Object.keys(node.content).sort()
    const ct = ctKeys.find((c) => /^application\/(.+\+)?json/i.test(c)) ?? ctKeys.find((c) => c === '*/*')
    if (!ct) continue
    const media = node.content[ct]
    if (isObj(media) && media.schema !== undefined) return media.schema
  }
  return undefined
}

function detect(input: RawInput): number {
  try {
    const t = typeof input?.text === 'string' ? input.text.slice(0, 65536) : ''
    if (/^\s*\{[\s\S]*?"openapi"\s*:\s*"3\.\d+/.test(t) || /^openapi\s*:\s*["']?3\.\d+/m.test(t)) return 0.95
    if (/^\s*\{[\s\S]*?"swagger"\s*:\s*"2\./.test(t) || /^swagger\s*:\s*["']?2\./m.test(t)) return 0.1
    return 0
  } catch {
    return 0
  }
}

function reject(gaps: Gap[]): ParseResult {
  return { rejected: gaps.map((g) => ({ ...g, severity: 'error' as const })) }
}

function parseDoc(input: RawInput): ParseResult {
  const text = input.text
  if (Buffer.byteLength(text, 'utf8') > MAX_INPUT_BYTES) {
    return { rejected: [gap('input-too-large', `Input exceeds the ${MAX_INPUT_BYTES} byte limit.`, { severity: 'error' })] }
  }
  let doc: unknown
  try {
    doc = parseYaml(text, { maxAliasCount: 50 })
  } catch {
    return { rejected: [gap('parse-failed', 'The document could not be parsed as YAML or JSON.', { severity: 'error' })] }
  }
  if (!isObj(doc)) return { rejected: [gap('parse-failed', 'The document is not an OpenAPI object.', { severity: 'error' })] }
  if (doc.swagger !== undefined) {
    return { rejected: [gap('swagger-2-unsupported', 'Swagger 2.0 documents are not supported; convert to OpenAPI 3.x.', { severity: 'error' })] }
  }
  if (typeof doc.openapi !== 'string' || !/^3\./.test(doc.openapi)) {
    return { rejected: [gap('unsupported-version', 'Only OpenAPI 3.x documents are supported.', { severity: 'error' })] }
  }
  if (!isObj(doc.paths)) return { rejected: [gap('no-paths', 'The document has no paths object.', { severity: 'error' })] }
  const root = doc
  const paths: Obj = doc.paths
  const gaps: Gap[] = []

  const info = isObj(root.info) ? root.info : {}
  let name = clean(info.title, 80)
  if (!name) {
    name = 'Api'
    gaps.push(gap('no-title', 'info.title is missing; a generic server name was used.', { severity: 'info' }))
  }
  const prefix = envPrefix(name)

  // Authentication: names only. Supported schemes referenced by global security win.
  let auth: SourceModel['auth'] = { scheme: 'none' }
  const schemes = isObj(root.components) && isObj(root.components.securitySchemes) ? root.components.securitySchemes : {}
  const referenced = Array.isArray(root.security) ? root.security.flatMap((r) => (isObj(r) ? Object.keys(r) : [])) : []
  const schemeNames = (referenced.length > 0 ? referenced : Object.keys(schemes)).filter((k, i, a) => a.indexOf(k) === i).sort()
  let picked = false
  let unsupported = 0
  for (const sn of schemeNames) {
    let s: Obj
    try {
      s = deref(root, own(schemes, sn)).node
    } catch {
      continue
    }
    let candidate: SourceModel['auth'] | undefined
    if (s.type === 'apiKey' && s.in === 'header' && typeof s.name === 'string') candidate = { scheme: 'apiKeyHeader', paramName: s.name, envVar: `${prefix}_API_KEY` }
    else if (s.type === 'apiKey' && s.in === 'query' && typeof s.name === 'string') candidate = { scheme: 'apiKeyQuery', paramName: s.name, envVar: `${prefix}_API_KEY` }
    else if (s.type === 'http' && typeof s.scheme === 'string' && s.scheme.toLowerCase() === 'bearer') candidate = { scheme: 'bearer', envVar: `${prefix}_TOKEN` }
    if (!candidate) {
      unsupported++
      continue
    }
    if (picked) {
      gaps.push(gap('auth-multiple', 'More than one supported security scheme is declared; the first (by name) was used.', { severity: 'info' }))
      break
    }
    auth = candidate
    picked = true
  }
  if (!picked && unsupported > 0) {
    gaps.push(gap('auth-unsupported', 'The declared security scheme is not supported (only API key in header or query, and bearer); the server sends no credentials.'))
  }

  const ctx = newCtx()
  const usedIds = new Set<string>()
  const candidates: Candidate[] = []
  const entities = new Map<string, EntityAcc>()
  const dropped: string[] = []
  const pageSizeMax: number[] = []

  for (const path of Object.keys(paths).sort()) {
    const item = own(paths, path)
    if (!isObj(item)) continue
    for (const method of METHODS) {
      const opNode = own(item, method)
      if (!isObj(opNode)) continue
      const id = opIdFor(method, path, opNode.operationId, usedIds)
      if (method !== 'get') {
        dropped.push(id)
        continue
      }
      const where = `GET ${path.slice(0, 120)}`
      ctx.left = OPERATION_SCHEMA_BUDGET
      try {
        // Parameters: path-level first, operation-level overrides by (in, name).
        const merged = new Map<string, Obj>()
        for (const list of [item.parameters, opNode.parameters]) {
          if (!Array.isArray(list)) continue
          for (const p of list) {
            const d = deref(root, p).node
            if (typeof d.name === 'string' && typeof d.in === 'string') merged.set(`${d.in}:${d.name}`, d)
          }
        }
        const params: Param[] = []
        for (const d of merged.values()) {
          if (d.in !== 'query' && d.in !== 'path') continue
          const sch = d.schema !== undefined ? deref(root, d.schema).node : {}
          const p: Param = { name: String(d.name), in: d.in, type: paramType(sch), required: d.in === 'path' ? true : d.required === true }
          if (typeof sch.minimum === 'number' && Number.isFinite(sch.minimum)) p.min = sch.minimum
          if (typeof sch.maximum === 'number' && Number.isFinite(sch.maximum)) p.max = sch.maximum
          const en = enumOf(sch)
          if (en && p.type !== 'array' && p.type !== 'object') p.enum = en
          const pd = clean(d.description)
          if (pd) p.description = pd
          params.push(p)
        }
        const templ = [...path.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1])
        const missing = templ.filter((n) => !params.some((p) => p.in === 'path' && p.name === n))
        if (missing.length > 0) {
          gaps.push(gap('path-param-undocumented', `${where}: path parameter ${missing[0]} is not documented; the operation was omitted.`, { path: id }))
          continue
        }
        const lower = (p: Param) => p.name.toLowerCase()
        const q = params.filter((p) => p.in === 'query')
        const pageP = q.find((p) => PAGE_NAMES.has(lower(p)))
        const offsetP = q.find((p) => OFFSET_NAMES.has(lower(p)))
        const sizeP = q.find((p) => SIZE_NAMES.has(lower(p)))
        if (pageP && offsetP) {
          gaps.push(gap('pagination-conflict', `${where}: both page and offset style parameters are declared; the operation was omitted.`, { path: id }))
          continue
        }

        const responseSchema = pickResponseSchema(root, opNode.responses)
        if (responseSchema === undefined) {
          gaps.push(gap('missing-response-schema', `${where}: no JSON response schema for a success status; the operation was omitted.`, { path: id }))
          continue
        }

        const segs = path.split('/').filter(Boolean)
        const lastIsParam = segs.length > 0 && /^\{[^{}]+\}$/.test(segs[segs.length - 1])
        const freeText = q.some((p) => FREE_TEXT.has(lower(p)) && p.type !== 'array' && p.type !== 'object')
        const kind: Operation['kind'] = lastIsParam ? 'get' : freeText ? 'search' : 'list'

        // Locate the item schema: array, wrapper object with one array of objects, or the object itself.
        const top = deref(root, responseSchema)
        const notes = { merged: false }
        const topProps = schemaProps(root, top.node, ctx, 0, notes)
        let itemSchema: unknown = top.node
        let schemaName = top.name
        if (typeOf(top.node) === 'array' && top.node.items !== undefined) {
          const it = deref(root, top.node.items)
          itemSchema = it.node
          schemaName = it.name
          schemaProps(root, it.node, ctx, 0, notes)
        } else if (kind !== 'get') {
          const arrays: { key: string; items: { node: Obj; name?: string } }[] = []
          for (const k of Object.keys(topProps)) {
            const pd = deref(root, topProps[k]).node
            if (typeOf(pd) === 'array' && pd.items !== undefined) {
              const it = deref(root, pd.items)
              if (typeOf(it.node) === 'object') arrays.push({ key: k, items: it })
            }
          }
          if (arrays.length > 1) {
            const pref = arrays.filter((a) => WRAPPER_NAMES.includes(a.key.toLowerCase()))
            if (pref.length !== 1) {
              gaps.push(gap('ambiguous-response', `${where}: the response has several arrays of objects and none is the obvious result list; the operation was omitted.`, { path: id }))
              continue
            }
            arrays.splice(0, arrays.length, pref[0])
          }
          if (arrays.length === 1) {
            itemSchema = arrays[0].items.node
            schemaName = arrays[0].items.name
            schemaProps(root, itemSchema, ctx, 0, notes)
          }
        }
        if (notes.merged) gaps.push(gap('oneof-merged', `${where}: a oneOf with a discriminator was merged into one field set.`, { severity: 'info', path: id }))

        const lastStatic = [...segs].reverse().find((s) => !/[{}]/.test(s))
        const entityId = snake(schemaName ?? singular(lastStatic ?? 'item'))
        const props = schemaProps(root, itemSchema, ctx)
        let acc = entities.get(entityId)
        if (!acc) {
          acc = { id: entityId, label: clean(schemaName ?? entityId, 60) ?? entityId, fields: new Map(), nested: new Map() }
          entities.set(entityId, acc)
        }
        for (const k of Object.keys(props)) {
          const { field, nested } = buildField(root, ctx, k, props[k], entityId)
          if (!acc.fields.has(k)) acc.fields.set(k, field)
          if (nested && !acc.nested.has(k)) acc.nested.set(k, nested)
        }

        const op: Operation = { id, kind, method: 'GET', path, entity: entityId, params }
        if (pageP && pageP.type === 'integer') op.pageParam = pageP.name
        if (sizeP && sizeP.type === 'integer') {
          op.pageSizeParam = sizeP.name
          if (typeof sizeP.max === 'number' && Number.isInteger(sizeP.max) && sizeP.max >= 1) pageSizeMax.push(sizeP.max)
        }
        const summary = clean(opNode.summary) ?? clean(opNode.description)
        if (summary) op.summary = summary
        candidates.push({ op, entityId, getParam: kind === 'get' ? segs[segs.length - 1].slice(1, -1) : undefined })
      } catch (e) {
        if (e instanceof Unsupported) gaps.push(gap(e.code, `${where}: ${e.detail} The operation was omitted.`, { path: id }))
        else gaps.push(gap('operation-failed', `${where}: the operation could not be read and was omitted.`, { path: id }))
      }
    }
  }

  // Identifiers: name heuristics plus the path parameter of a lookup operation.
  const accs = [...entities.values()]
  for (const c of candidates) {
    if (!c.getParam) continue
    const acc = entities.get(c.entityId)!
    const match = [...acc.fields.values()].find((f) => idKey(f.name) === idKey(c.getParam!))
    if (match) match.identifier = true
  }
  const kept: Operation[] = []
  for (const c of candidates) {
    const acc = entities.get(c.entityId)!
    const hasId = [...acc.fields.values()].some((f) => f.identifier)
    if (c.op.kind === 'get' && !hasId) {
      gaps.push(gap('no-identifier', `Entity ${acc.id} has no identifiable id field; the lookup ${c.op.id} was omitted.`, { path: c.op.id }))
      continue
    }
    kept.push(c.op)
  }
  const usedEntities = new Set(kept.map((o) => o.entity))
  const outEntities: Entity[] = accs
    .filter((a) => usedEntities.has(a.id))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((a) => {
      const fields = [...a.fields.values()]
      if (!fields.some((f) => f.identifier)) gaps.push(gap('no-identifier', `Entity ${a.id} has no identifiable id field.`, { severity: 'info', path: a.id }))
      return {
        id: a.id,
        label: a.label,
        fields,
        identifierFields: fields.filter((f) => f.identifier).map((f) => f.name),
        nested: [...a.nested.values()],
      }
    })
  kept.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  if (kept.length === 0) {
    gaps.push(gap('no-operations', 'No GET operation could be turned into a model; nothing usable remains.', { severity: 'error' }))
    return reject(gaps)
  }

  const model: SourceModel = {
    name,
    backend: { kind: 'http', baseUrlEnv: `${prefix}_BASE_URL` },
    auth,
    entities: outEntities,
    operations: kept,
    limits: { maxResponseItems: 200, ...(pageSizeMax.length > 0 ? { maxPageSize: Math.min(...pageSizeMax) } : {}) },
    gaps: gaps.slice(), // carried in the model so the generation report shows them
    writeOperationsDropped: dropped.sort(),
  }
  return { model, gaps }
}

export const openApiAdapter: InputAdapter = {
  id: 'openapi',
  label: 'OpenAPI',
  detect,
  parse(input: RawInput): ParseResult {
    try {
      const text = typeof input?.text === 'string' ? input.text : ''
      return parseDoc({ ...input, text })
    } catch {
      return { rejected: [gap('parse-failed', 'The document could not be read.', { severity: 'error' })] }
    }
  },
}
