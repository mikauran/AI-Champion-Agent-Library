import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { ingest } from '../../../scripts/ingest.js'
import { createScaleDb, type ScaleDb } from '../../../scripts/fixtures/scale-test-helpers.js'
import { generateAgents } from '../../../scripts/fixtures/generate-scale.js'

// Unmocked catalog load() against a 150-row temp DB (no vi.mock of db/drizzle).
type CatalogData = Exclude<Awaited<ReturnType<typeof import('./+page.server.js').load>>, void>

const PAGE_SIZE = 24
const expected = generateAgents(150).map(a => {
  const s = parseYaml(a.yaml) as Record<string, any>
  return {
    slug: a.slug,
    title: s.name as string,
    category: s.metadata.category as string,
    llm: s.llm_config.name as string,
    maturity: s.metadata.maturity as string,
  }
})
const distinct = (f: (e: (typeof expected)[number]) => string) => [...new Set(expected.map(f))].sort()

let scale: ScaleDb
let load: (typeof import('./+page.server.js'))['load']
let prevEnv: string | undefined

async function run(query = ''): Promise<CatalogData> {
  const url = new URL(`http://localhost/catalog${query}`)
  return (await load({ url } as Parameters<typeof load>[0])) as CatalogData
}

beforeAll(async () => {
  scale = createScaleDb(150)
  await ingest(scale.dataDir, scale.dbPath)
  prevEnv = process.env.CATALOG_DB_PATH
  process.env.CATALOG_DB_PATH = scale.dbPath
  vi.resetModules()
  load = (await import('./+page.server.js')).load
}, 60000)

afterAll(() => {
  if (prevEnv === undefined) delete process.env.CATALOG_DB_PATH
  else process.env.CATALOG_DB_PATH = prevEnv
  scale?.cleanup()
})

describe('catalog load() at scale (150 agents)', () => {
  it('paginates 24 per page across 7 pages without overlap or gaps', async () => {
    const t0 = performance.now()
    const p1 = await run()
    const ms = performance.now() - t0
    console.log(`[scale] catalog load: ${ms.toFixed(0)}ms`)
    expect(ms).toBeLessThan(5000)

    expect(p1.agents).toHaveLength(24)
    expect(p1.total).toBe(150)
    expect(p1.totalPages).toBe(7)
    expect(p1.pageSize).toBe(24)

    const slugs: string[] = []
    const titles: string[] = []
    for (let p = 1; p <= 7; p++) {
      const d = await run(`?page=${p}`)
      expect(d.agents).toHaveLength(p === 7 ? 6 : 24)
      slugs.push(...d.agents.map(a => a.slug))
      titles.push(...d.agents.map(a => a.title))
    }
    expect(new Set(slugs).size).toBe(150)
    expect([...slugs].sort()).toEqual(expected.map(e => e.slug).sort())
    expect(titles).toEqual([...titles].sort())

    const p8 = await run('?page=8')
    expect(p8.agents).toHaveLength(0)
  })

  it('exposes distinct filter options matching the generated data', async () => {
    const d = await run()
    expect([...d.categories].sort()).toEqual(distinct(e => e.category))
    expect([...d.llms].sort()).toEqual(distinct(e => e.llm))
    expect([...d.maturityStatuses].sort()).toEqual(distinct(e => e.maturity))
  })

  const cases: Array<[string, string, (e: (typeof expected)[number]) => string, (a: any) => string]> = [
    ['category', 'category', e => e.category, a => a.category],
    ['llm', 'llm', e => e.llm, a => a.llmName],
    ['maturity', 'maturity', e => e.maturity, a => a.maturityStatus],
  ]

  for (const [param, label, get, fromRow] of cases) {
    it(`filters by ${label} with exact subsets`, async () => {
      for (const value of distinct(get)) {
        const want = expected.filter(e => get(e) === value).length
        const d = await run(`?${param}=${encodeURIComponent(value)}`)
        expect(d.total, `${param}=${value}`).toBe(want)
        expect(d.totalPages).toBe(Math.ceil(want / PAGE_SIZE))
        expect(d.agents.length).toBe(Math.min(want, PAGE_SIZE))
        for (const a of d.agents) expect(fromRow(a)).toBe(value)
      }
    })
  }

  it('combined category+llm filter equals the independent intersection', async () => {
    for (const category of distinct(e => e.category)) {
      for (const llm of distinct(e => e.llm)) {
        const want = expected.filter(e => e.category === category && e.llm === llm).length
        const d = await run(`?category=${encodeURIComponent(category)}&llm=${encodeURIComponent(llm)}`)
        expect(d.total, `${category}+${llm}`).toBe(want)
        for (const a of d.agents) {
          expect(a.category).toBe(category)
          expect(a.llmName).toBe(llm)
        }
      }
    }
  })
})
