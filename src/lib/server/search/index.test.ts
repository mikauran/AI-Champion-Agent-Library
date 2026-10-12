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

  it('requests the embedder once', async () => {
    const getEmbedder = vi.fn(async () => createFakeEmbedder())
    const { svc } = make({ getEmbedder })
    await svc.search('sql')
    await svc.search('hvac')
    expect(getEmbedder).toHaveBeenCalledTimes(1)
  })
})
