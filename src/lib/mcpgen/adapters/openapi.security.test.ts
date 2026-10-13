// Review fix WR-09: `security: []` is a public API, and operation level security is reported.
import { describe, expect, it } from 'vitest'
import { parseInput } from '../registry'
import { generate } from '../generate'

const op = (extra: Record<string, unknown> = {}) => ({
  get: {
    operationId: 'listParts',
    ...extra,
    responses: { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Part' } } } } } },
  },
})

function doc(root: Record<string, unknown>, operation: Record<string, unknown> = {}): string {
  return JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'Acme Parts' },
    paths: { '/parts': op(operation) },
    components: {
      schemas: { Part: { type: 'object', properties: { part_id: { type: 'string' }, name: { type: 'string' } } } },
      securitySchemes: { AcmeKey: { type: 'apiKey', in: 'header', name: 'X-Acme-Key' } },
    },
    ...root,
  })
}

function model(text: string) {
  const r = parseInput({ text })
  if (!r.ok) throw new Error(`fixture must parse: ${JSON.stringify(r.gaps)}`)
  return r
}

describe('document-level security', () => {
  it('an empty security list means no authentication, even with declared schemes', () => {
    const r = model(doc({ security: [] }))
    expect(r.model.auth.scheme).toBe('none')
    expect(r.gaps.some((g) => g.code === 'auth-public' && g.severity === 'info')).toBe(true)
    const server = generate(r.model).files.find((f) => f.path === 'server.py')!.content
    expect(server).not.toContain('X-Acme-Key')
    expect(server).not.toMatch(/AUTH_ENV = "/)
  })
  it('a referenced scheme is used', () => {
    const r = model(doc({ security: [{ AcmeKey: [] }] }))
    expect(r.model.auth).toMatchObject({ scheme: 'apiKeyHeader', paramName: 'X-Acme-Key' })
    expect(r.gaps.some((g) => g.code === 'auth-public')).toBe(false)
  })
  it('without a security entry the declared scheme is still used (unchanged behaviour)', () => {
    expect(model(doc({})).model.auth.scheme).toBe('apiKeyHeader')
  })
})

describe('operation-level security', () => {
  it('an operation that declares its own security is reported, naming the operation', () => {
    const r = model(doc({ security: [{ AcmeKey: [] }] }, { security: [] }))
    const g = r.gaps.find((x) => x.code === 'auth-operation-override')
    expect(g).toMatchObject({ severity: 'warn', path: 'listParts' })
    expect(r.model.gaps.some((x) => x.code === 'auth-operation-override')).toBe(true)
  })
  it('an operation that repeats the document-level requirement is not reported', () => {
    const r = model(doc({ security: [{ AcmeKey: [] }] }, { security: [{ AcmeKey: [] }] }))
    expect(r.gaps.some((g) => g.code === 'auth-operation-override')).toBe(false)
  })
  it('a different scheme set on the operation is reported', () => {
    const r = model(doc({ security: [{ AcmeKey: [] }] }, { security: [{ Other: [] }] }))
    expect(r.gaps.some((g) => g.code === 'auth-operation-override')).toBe(true)
  })
})
