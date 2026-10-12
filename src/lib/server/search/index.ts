// Server-only search service: lazy, refreshable BM25 index + optional semantic re-rank.
// Relative imports only; nothing is constructed at import time.
import { buildBm25Index, type Bm25Index } from './bm25.js'
import { hybridSearch } from './hybrid.js'
import { buildSearchText, rowToSearchable } from './documents.js'
import { blobToVector, createTransformersEmbedder, type Embedder } from './embedder.js'

export type SearchMode = 'hybrid' | 'bm25'

export interface AgentRowForSearch {
  slug: string
  title: string
  summary: string
  category: string | null
  tags: string
  toolNames: string
}

export interface SearchOptions {
  /** Max ranked results to return. Defaults to 50; pass Infinity to rank everything. */
  limit?: number
}

export interface SearchService {
  search(
    q: string,
    opts?: SearchOptions,
  ): Promise<{ results: { slug: string; score: number }[]; mode: SearchMode }>
  warmUp(): Promise<void>
}

export interface SearchServiceDeps {
  loadAgents: () => { rows: AgentRowForSearch[]; fingerprint: string }
  loadVectors: () => { model: string; slug: string; vector: Buffer }[]
  getEmbedder: () => Promise<Embedder | null>
  embedTimeoutMs?: number
  recheckMs?: number
  /** First retry delay after the embedder fails to load; doubles per failure up to embedderRetryMaxMs. */
  embedderRetryMs?: number
  embedderRetryMaxMs?: number
  now?: () => number
}

const TIMED_OUT = Symbol('timeout')

export function createSearchService(deps: SearchServiceDeps): SearchService {
  const embedTimeoutMs = deps.embedTimeoutMs ?? 1500
  const recheckMs = deps.recheckMs ?? 30000
  const now = deps.now ?? Date.now
  const embedderRetryMs = deps.embedderRetryMs ?? 60_000
  const embedderRetryMaxMs = deps.embedderRetryMaxMs ?? 15 * 60_000

  let bm25: Bm25Index | null = null
  let fingerprint: string | null = null
  let rowSlugs = new Set<string>()
  let lastCheck = -Infinity
  let vectorCache: { model: string; vectors: Map<string, Float32Array> } | null = null
  let embedderPromise: Promise<Embedder | null> | null = null
  let embedderFailures = 0
  let embedderRetryAt = -Infinity

  // A loaded embedder is memoised for the process lifetime. A failed load (null or
  // rejection, e.g. a transient download error) is NOT: it is retried with exponential
  // backoff so hybrid search can recover without a restart.
  function ensureEmbedder(): Promise<Embedder | null> {
    if (embedderPromise) return embedderPromise
    if (embedderFailures > 0 && now() < embedderRetryAt) return Promise.resolve(null)
    const attempt: Promise<Embedder | null> = Promise.resolve()
      .then(() => deps.getEmbedder())
      .catch(() => null)
      .then((e) => {
        if (e) {
          embedderFailures = 0
          return e
        }
        embedderFailures++
        embedderRetryAt = now() + Math.min(embedderRetryMs * 2 ** (embedderFailures - 1), embedderRetryMaxMs)
        embedderPromise = null
        return null
      })
    embedderPromise = attempt
    return attempt
  }

  function refresh(): Bm25Index {
    const t = now()
    if (bm25 && t - lastCheck < recheckMs) return bm25
    lastCheck = t
    const { rows, fingerprint: fp } = deps.loadAgents()
    if (bm25 && fp === fingerprint) return bm25
    const docs = rows.map((r) => {
      const s = rowToSearchable(r)
      return { slug: s.slug, title: s.title, tags: s.tags, text: buildSearchText(s) }
    })
    bm25 = buildBm25Index(docs)
    rowSlugs = new Set(rows.map((r) => r.slug))
    fingerprint = fp
    vectorCache = null
    return bm25
  }

  function vectorsFor(model: string): Map<string, Float32Array> {
    if (vectorCache && vectorCache.model === model) return vectorCache.vectors
    const vectors = new Map<string, Float32Array>()
    for (const v of deps.loadVectors()) {
      if (v.model !== model || !rowSlugs.has(v.slug)) continue
      vectors.set(v.slug, blobToVector(v.vector))
    }
    vectorCache = { model, vectors }
    return vectors
  }

  async function raceEmbedder(): Promise<Embedder | null> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), embedTimeoutMs)
    })
    try {
      const r = await Promise.race([ensureEmbedder(), timeout])
      return r === TIMED_OUT ? null : r
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  return {
    async warmUp() {
      await ensureEmbedder()
    },
    async search(q: string, opts?: SearchOptions) {
      const query = q.trim()
      if (!query) return { results: [], mode: 'bm25' }
      const index = refresh()
      let queryVector: Float32Array | null = null
      let vectors = new Map<string, Float32Array>()
      try {
        const embedder = await raceEmbedder()
        if (embedder) {
          vectors = vectorsFor(embedder.id)
          if (vectors.size > 0) {
            const [v] = await embedder.embed([query])
            queryVector = v ?? null
          }
        }
      } catch {
        queryVector = null
      }
      const { results, mode } = hybridSearch({ query, bm25: index, vectors, queryVector, limit: opts?.limit })
      return { results, mode }
    },
  }
}

type DbModule = typeof import('../db.js')

let singleton: SearchService | null = null
let cachedDb: DbModule | null = null

function dbModule(): DbModule {
  if (!cachedDb) throw new Error('search db not initialised')
  return cachedDb
}

function getSingleton(): SearchService {
  if (singleton) return singleton
  singleton = createSearchService({
    loadAgents() {
      const { db, agents } = dbModule()
      const rows = db.select().from(agents).all()
      const max = rows.reduce((m, r) => (r.lastIngestedAt > m ? r.lastIngestedAt : m), '')
      return { rows, fingerprint: `${rows.length}:${max}` }
    },
    loadVectors() {
      const { db, agentEmbeddings } = dbModule()
      try {
        return db.select().from(agentEmbeddings).all()
      } catch {
        return [] // old DB without the agent_embeddings table
      }
    },
    getEmbedder: async () =>
      process.env.SEARCH_EMBEDDINGS === 'off' ? null : createTransformersEmbedder(),
  })
  return singleton
}

export async function search(q: string, opts?: SearchOptions): ReturnType<SearchService['search']> {
  if (!cachedDb) cachedDb = await import('../db.js')
  return getSingleton().search(q, opts)
}

export async function warmUp(): Promise<void> {
  if (process.env.SEARCH_EMBEDDINGS === 'off') return
  if (!cachedDb) cachedDb = await import('../db.js')
  await getSingleton().warmUp()
}
