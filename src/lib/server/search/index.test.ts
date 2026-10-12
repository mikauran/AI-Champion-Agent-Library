import { describe, it, expect, vi } from 'vitest'
import { createSearchService, type AgentRowForSearch } from './index.js'
import { createFakeEmbedder } from './embedder.fake.js'
import { buildSearchText, rowToSearchable } from './documents.js'
import { vectorToBlob } from './embedder.js'

const rows: AgentRowForSearch[] = [
  { slug: 'sql-helper', title: 'SQL Helper', summary: 'Writes sql queries', category: 'data', tags: '["sql"]', toolNames: '[]' },
  { slug: 'hvac', title: 'HVAC Sizer', summary: 'Sizes heating systems', category: 'mep', tags: '["hvac"]', toolNames: '[]' },
]

async function vectorsFor(model: string) {
  const e = createFakeEmbedder()
  const out: { model: string; slug: string; vector: Buffer }[] = []
  for (const r of rows) {
    const [v] = await e.embed([buildSearchText(rowToSearchable(r))])
    out.push({ model, slug: r.slug, vector: vectorToBlob(v) })
  }
  return out
}

function make(over: Partial<Parameters<typeof createSearchService>[0]> = {}) {
  const loadAgents = vi.fn(() => ({ rows, fingerprint: 'a' }))
  const svc = createSearchService({
    loadAgents,
    loadVectors: () => [],
    getEmbedder: async () => null,
    ...over,
  })
  return { svc, loadAgents }
}

describe('createSearchService', () => {
  it('returns bm25 results without an embedder', async () => {
    const { svc } = make()
    const r = await svc.search('sql')
    expect(r.mode).toBe('bm25')
    expect(r.results[0].slug).toBe('sql-helper')
  })

  it('uses hybrid when vectors match the embedder model', async () => {
    const vecs = await vectorsFor('fake-hash')
    const { svc } = make({ getEmbedder: async () => createFakeEmbedder(), loadVectors: () => vecs })
    expect((await svc.search('sql')).mode).toBe('hybrid')
  })

  it('ignores vectors from a stale model', async () => {
    const vecs = await vectorsFor('old-model')
    const { svc } = make({ getEmbedder: async () => createFakeEmbedder(), loadVectors: () => vecs })
    expect((await svc.search('sql')).mode).toBe('bm25')
  })

  it('does not wait for a never-resolving embedder', async () => {
    const { svc } = make({ getEmbedder: () => new Promise(() => {}), embedTimeoutMs: 20 })
    const start = Date.now()
    const r = await svc.search('sql')
    expect(Date.now() - start).toBeLessThan(1000)
    expect(r.mode).toBe('bm25')
    expect(r.results.length).toBeGreaterThan(0)
  })

  it('falls back when the embedder rejects', async () => {
    const { svc } = make({
      getEmbedder: async () => {
        throw new Error('boom')
      },
    })
    expect((await svc.search('sql')).mode).toBe('bm25')
  })

  it('returns empty for blank q without touching loaders', async () => {
    const { svc, loadAgents } = make()
    expect(await svc.search('   ')).toEqual({ results: [], mode: 'bm25' })
    expect(loadAgents).not.toHaveBeenCalled()
  })

  it('rebuilds on fingerprint change, at most every recheckMs', async () => {
    let t = 0
    let fp = 'a'
    const loadAgents = vi.fn(() => ({ rows, fingerprint: fp }))
    const svc = createSearchService({
      loadAgents,
      loadVectors: () => [],
      getEmbedder: async () => null,
      now: () => t,
      recheckMs: 1000,
    })
    await svc.search('sql')
    await svc.search('sql')
    expect(loadAgents).toHaveBeenCalledTimes(1)
    t = 1500
    fp = 'b'
    await svc.search('sql')
    expect(loadAgents).toHaveBeenCalledTimes(2)
  })

  it('honours opts.limit: default top 50, Infinity returns every match (CR-01)', async () => {
    const many: AgentRowForSearch[] = Array.from({ length: 120 }, (_, i) => ({
      slug: `agent-${String(i).padStart(3, '0')}`,
      title: `Reporting agent ${i}`,
      summary: 'Builds reporting',
      category: 'data',
      tags: '[]',
      toolNames: '[]',
    }))
    const { svc } = make({ loadAgents: () => ({ rows: many, fingerprint: 'many' }) })
    expect((await svc.search('reporting')).results).toHaveLength(50)
    expect((await svc.search('reporting', { limit: 10 })).results).toHaveLength(10)
    expect((await svc.search('reporting', { limit: Infinity })).results).toHaveLength(120)
  })

  it('does not cache a failed embedder forever: retries with backoff and recovers (WR-02)', async () => {
    let t = 0
    let attempts = 0
    const vecs = await vectorsFor('fake-hash')
    const getEmbedder = vi.fn(async () => {
      attempts++
      return attempts < 3 ? null : createFakeEmbedder()
    })
    const { svc } = make({
      getEmbedder,
      loadVectors: () => vecs,
      now: () => t,
      recheckMs: 1e9,
      embedderRetryMs: 1000,
      embedderRetryMaxMs: 8000,
    })
    expect((await svc.search('sql')).mode).toBe('bm25') // attempt 1 fails
    expect(getEmbedder).toHaveBeenCalledTimes(1)

    t = 500 // still inside the backoff window: no new attempt
    expect((await svc.search('sql')).mode).toBe('bm25')
    expect(getEmbedder).toHaveBeenCalledTimes(1)

    t = 1000 // first backoff elapsed -> attempt 2 (fails, backoff doubles to 2000)
    expect((await svc.search('sql')).mode).toBe('bm25')
    expect(getEmbedder).toHaveBeenCalledTimes(2)
    t = 2500
    expect((await svc.search('sql')).mode).toBe('bm25')
    expect(getEmbedder).toHaveBeenCalledTimes(2)

    t = 3000 // second backoff elapsed -> attempt 3 succeeds
    expect((await svc.search('sql')).mode).toBe('hybrid')
    expect(getEmbedder).toHaveBeenCalledTimes(3)

    t = 99999 // loaded embedder is memoised
    await svc.search('hvac')
    expect(getEmbedder).toHaveBeenCalledTimes(3)
  })

  it('retries after a rejecting getEmbedder too, and backoff is capped (WR-02)', async () => {
    let t = 0
    const getEmbedder = vi.fn(async () => {
      throw new Error('network')
    })
    const { svc } = make({ getEmbedder, now: () => t, embedderRetryMs: 100, embedderRetryMaxMs: 300, recheckMs: 1e9 })
    await svc.search('sql') // fail 1 -> next at 100
    t = 100
    await svc.search('sql') // fail 2 -> next at 300
    t = 300
    await svc.search('sql') // fail 3 -> 400 capped to 300 -> next at 600
    t = 599
    await svc.search('sql')
    expect(getEmbedder).toHaveBeenCalledTimes(3)
    t = 600
    await svc.search('sql')
    expect(getEmbedder).toHaveBeenCalledTimes(4)
  })

  it('requests the embedder once', async () => {
    const getEmbedder = vi.fn(async () => createFakeEmbedder())
    const { svc } = make({ getEmbedder })
    await svc.search('sql')
    await svc.search('hvac')
    expect(getEmbedder).toHaveBeenCalledTimes(1)
  })
})
