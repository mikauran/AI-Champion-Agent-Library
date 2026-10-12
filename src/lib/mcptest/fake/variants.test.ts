import { describe, it, expect } from 'vitest'
import { PassThrough } from 'node:stream'
import type { McpClient } from '../core/client'
import { leakReason } from '../core/leak'
import { AUTH_RE } from '../core/validators'
import { TOOL_NAMES } from '../mock/contract'
import { codesDataset, KNOWN_ITEM_ID, MISSING_ITEM_ID } from '../mock/datasets'
import { FakeError, serveStdio } from './fakeServer'
import { CANARY, FAKE_SPEC, withFake } from './testing'
import { getVariant, variantIds, VARIANTS } from './variants'

type Out = Awaited<ReturnType<McpClient['callTool']>>
const res = (o: Out) => {
  if (o.kind !== 'result') throw new Error(`not a result: ${o.kind}`)
  return o
}
const sc = (o: Out) => res(o).structured as Record<string, unknown>
const NO_CEILING = { ...FAKE_SPEC, ceiling: null }
const BEHAVIOUR_IDS = [
  'good', 'mirror', 'no-derived-tool', 'raw-passthrough', 'no-clamp', 'leaky-errors', 'bare-empty',
  'no-auth-message', 'write-tool', 'secret-echo', 'no-retry', 'confident-wrong', 'hallucinated-endpoint',
  'bad-code-accept', 'huge-payload', 'no-trunc-signal'
]

describe('registry', () => {
  it('has the 16 behaviour variants, each labelled a scorer fixture', () => {
    for (const id of BEHAVIOUR_IDS) expect(variantIds()).toContain(id)
    for (const v of Object.values(VARIANTS)) expect(v.description.startsWith('Scorer fixture:')).toBe(true)
    expect(VARIANTS.good.mustFail).toEqual([])
    expect(VARIANTS.good.flags).toEqual([])
  })

  it('carries the planned mustFail and flags', () => {
    expect(VARIANTS.mirror.mustFail).toEqual(
      expect.arrayContaining(['derived_filter', 'projection', 'pagesize_clamp', 'bad_input', 'empty_vs_error', 'auth_fail'])
    )
    expect(VARIANTS['leaky-errors'].flags).toEqual(['LEAK'])
    expect(VARIANTS['write-tool'].flags).toEqual(['WRITE_TOOL'])
    expect(VARIANTS['secret-echo'].flags).toEqual(['SECRET_ECHO'])
    expect(VARIANTS['no-retry']).toMatchObject({ mustFail: ['fault_retry'], flags: ['NO_RETRY'] })
    expect(VARIANTS['confident-wrong']).toMatchObject({ mustFail: ['fault_malformed'], flags: ['CONFIDENT_WRONG'] })
    expect(VARIANTS['hallucinated-endpoint'].mustFail).toEqual(['grounding'])
    expect(VARIANTS['bad-code-accept']).toMatchObject({ mustFail: ['i18n_codes'], flags: ['UNVALIDATED_CODE'] })
    expect(VARIANTS['huge-payload'].mustFail).toEqual(['large_response'])
    expect(VARIANTS['no-trunc-signal'].mustFail).toEqual(['large_response'])
  })

  it('getVariant does not resolve inherited property names', () => {
    expect(getVariant('constructor')).toBeUndefined()
    expect(getVariant('good')).toBeDefined()
  })

  it('an unknown variant makes serveStdio reject with a typed error', async () => {
    await expect(serveStdio(new PassThrough(), new PassThrough(), { variant: 'nope', env: {} })).rejects.toBeInstanceOf(FakeError)
  })
})

describe('planted flaws are observable', () => {
  it('mirror: raw 20+ field item, no derived tool, leaky errors', async () => {
    await withFake('mirror', async (c) => {
      expect(c.tools.map((t) => t.name)).not.toContain(TOOL_NAMES.findByAttribute)
      const item = sc(await c.callTool(TOOL_NAMES.lookupItem, { id: KNOWN_ITEM_ID }))
      expect(Object.keys(item).length).toBeGreaterThanOrEqual(20)
      const miss = res(await c.callTool(TOOL_NAMES.lookupItem, { id: MISSING_ITEM_ID }))
      expect(miss.isError).toBe(true)
      expect(leakReason(miss.text)).not.toBeNull()
      const big = sc(await c.callTool(TOOL_NAMES.searchItems, { per_page: 250 }))
      expect((big.items as unknown[]).length).toBeGreaterThan(50)
    }, { spec: NO_CEILING })
  })

  it('no-derived-tool omits only the filter tool', async () => {
    await withFake('no-derived-tool', async (c) => {
      const names = c.tools.map((t) => t.name)
      expect(names).not.toContain(TOOL_NAMES.findByAttribute)
      expect(names).toContain(TOOL_NAMES.searchItems)
    })
  })

  it('raw-passthrough forwards 20+ fields', async () => {
    await withFake('raw-passthrough', async (c) => {
      const item = sc(await c.callTool(TOOL_NAMES.lookupItem, { id: KNOWN_ITEM_ID })).item as Record<string, unknown>
      expect(Object.keys(item).length).toBeGreaterThanOrEqual(20)
    })
  })

  it('no-clamp returns more than 50 items for per_page 250', async () => {
    await withFake('no-clamp', async (c) => {
      const o = sc(await c.callTool(TOOL_NAMES.searchItems, { per_page: 250 }))
      expect((o.items as unknown[]).length).toBeGreaterThan(50)
    }, { spec: NO_CEILING })
  })

  it('leaky-errors leak the upstream envelope or traceback', async () => {
    await withFake('leaky-errors', async (c) => {
      const miss = res(await c.callTool(TOOL_NAMES.lookupItem, { id: MISSING_ITEM_ID }))
      expect(miss.text).toMatch(/all shards failed|Traceback|timestamp/)
      expect(leakReason(miss.text)).not.toBeNull()
      const empty = res(await c.callTool(TOOL_NAMES.searchItems, { q: 'zzzzqqqq' }))
      expect(leakReason(empty.text)).not.toBeNull()
    })
    await withFake(
      'leaky-errors',
      async (c) => {
        const o = res(await c.callTool(TOOL_NAMES.searchItems, { q: 'bearing' }))
        expect(leakReason(o.text)).not.toBeNull()
      },
      { key: 'wrong-key-0000' }
    )
  })

  it('bare-empty returns an empty result without a message', async () => {
    await withFake('bare-empty', async (c) => {
      const o = sc(await c.callTool(TOOL_NAMES.searchItems, { q: 'zzzzqqqq' }))
      expect(o.items).toEqual([])
      expect(o.message).toBeUndefined()
    })
  })

  it('no-auth-message fails without naming auth', async () => {
    await withFake(
      'no-auth-message',
      async (c) => {
        const o = res(await c.callTool(TOOL_NAMES.searchItems, { q: 'bearing' }))
        expect(o.isError).toBe(true)
        expect(AUTH_RE.test(o.text)).toBe(false)
      },
      { key: 'wrong-key-0000' }
    )
  })

  it('write-tool lists delete_item and the mock sees a non-GET', async () => {
    await withFake('write-tool', async (c, mock) => {
      expect(c.tools.map((t) => t.name)).toContain('delete_item')
      await c.callTool('delete_item', { id: KNOWN_ITEM_ID })
      expect(mock.log().some((e) => e.method !== 'GET')).toBe(true)
    })
  })

  it('secret-echo shows the canary in output and on stderr', async () => {
    await withFake('secret-echo', async (c, _mock, stderr) => {
      const o = res(await c.callTool(TOOL_NAMES.lookupItem, { id: KNOWN_ITEM_ID }))
      expect(o.text).toContain(CANARY)
      expect(stderr.join('')).toContain(CANARY)
    })
  })

  it('no-retry makes a single attempt', async () => {
    await withFake('no-retry', async (c, mock) => {
      mock.inject({ route: '/items', fault: 'status', status: 429, times: 1 })
      const o = res(await c.callTool(TOOL_NAMES.searchItems, { q: 'bearing' }))
      expect(o.isError).toBe(true)
      expect(mock.hits('/items')).toBe(1)
    })
  })

  it('confident-wrong answers ok:true from a malformed body', async () => {
    await withFake('confident-wrong', async (c, mock) => {
      mock.inject({ route: '/items', fault: 'malformed', mode: 'truncated_json', times: 1 })
      const o = res(await c.callTool(TOOL_NAMES.searchItems, { q: 'bearing' }))
      expect(o.isError).toBe(false)
      expect(sc(await c.callTool(TOOL_NAMES.searchItems, { q: 'bearing' })).ok).toBe(true)
    })
  })

  it('hallucinated-endpoint hits an undocumented route in docs mode', async () => {
    const spec = { ...FAKE_SPEC, datasets: ['docs' as const], documentedRoutes: ['/widgets', '/widgets/:id'] }
    await withFake(
      'hallucinated-endpoint',
      async (c, mock) => {
        await c.callTool(TOOL_NAMES.listWidgets, {})
        expect(mock.log().some((e) => e.undocumented)).toBe(true)
      },
      { spec }
    )
    await withFake(
      'good',
      async (c, mock) => {
        await c.callTool(TOOL_NAMES.listWidgets, {})
        expect(mock.log().some((e) => e.undocumented)).toBe(false)
      },
      { spec }
    )
  })

  it('bad-code-accept forwards an invalid code upstream', async () => {
    await withFake('bad-code-accept', async (c, mock) => {
      await c.callTool(TOOL_NAMES.lookupByGtin, { gtin: codesDataset(1).invalid[0] })
      expect(mock.hits('/products')).toBe(1)
    })
  })

  it('huge-payload exceeds the byte cap; no-trunc-signal caps without any signal', { timeout: 30000 }, async () => {
    await withFake('huge-payload', async (c) => {
      const o = res(await c.callTool(TOOL_NAMES.listCategoryItems, { category: 'Bearings' }))
      expect(o.text.length).toBeGreaterThan(128 * 1024)
    })
    await withFake('no-trunc-signal', async (c) => {
      const s = sc(await c.callTool(TOOL_NAMES.listCategoryItems, { category: 'Bearings' }))
      expect((s.items as unknown[]).length).toBeLessThanOrEqual(100)
      expect(s.truncated).toBeUndefined()
      expect(s.shown).toBeUndefined()
      expect(s.total).toBeUndefined()
    })
  })
})
