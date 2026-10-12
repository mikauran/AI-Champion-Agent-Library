import { db, agents } from '$lib/server/db.js'
import { eq, and, asc, inArray } from 'drizzle-orm'
import { search } from '$lib/server/search/index.js'
import { parsePage } from '$lib/catalogUrl'
import type { PageServerLoad } from './$types'

const PAGE_SIZE = 24
const SLUG_CHUNK = 500

export const load: PageServerLoad = async ({ url }) => {
  const page = parsePage(url.searchParams.get('page'))
  const category = url.searchParams.get('category') ?? null
  const llm = url.searchParams.get('llm') ?? null
  const maturity = url.searchParams.get('maturity') ?? null
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 200) || null

  const conditions = []
  if (category) conditions.push(eq(agents.category, category))
  if (llm) conditions.push(eq(agents.llmName, llm))
  if (maturity) conditions.push(eq(agents.maturityStatus, maturity))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Deserialize JSON arrays stored as text columns
  const toAgent = (row: typeof agents.$inferSelect) => {
    const { inputSchema, ...agentRow } = row
    return {
      ...agentRow,
      toolNames: JSON.parse(row.toolNames) as string[],
      inputFields: JSON.parse(inputSchema ?? '[]'),
      tags: JSON.parse(row.tags) as string[],
    }
  }

  let agentList: ReturnType<typeof toAgent>[]
  let total: number

  if (q) {
    // Rank everything (no top-N cut): filters and pagination happen afterwards, so
    // a filtered query must not lose matches that rank below the default cut-off.
    const { results } = await search(q, { limit: Infinity })
    const slugs = results.map((r) => r.slug)
    if (slugs.length === 0) {
      agentList = []
      total = 0
    } else {
      // Chunk the IN list to stay far below SQLite's bound-variable limit.
      const matched: (typeof agents.$inferSelect)[] = []
      for (let i = 0; i < slugs.length; i += SLUG_CHUNK) {
        matched.push(
          ...db
            .select()
            .from(agents)
            .where(and(inArray(agents.slug, slugs.slice(i, i + SLUG_CHUNK)), ...conditions))
            .all(),
        )
      }
      const rank = new Map(slugs.map((s, i) => [s, i]))
      matched.sort((a, b) => (rank.get(a.slug) ?? 0) - (rank.get(b.slug) ?? 0))
      total = matched.length
      agentList = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(toAgent)
    }
  } else {
    const rows = db
      .select()
      .from(agents)
      .where(whereClause)
      .orderBy(asc(agents.title))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
      .all()

    const totalRows = db
      .select({ slug: agents.slug })
      .from(agents)
      .where(whereClause)
      .all()

    agentList = rows.map(toAgent)
    total = totalRows.length
  }

  // Distinct filter options from actual data
  const allCategories = db
    .selectDistinct({ category: agents.category })
    .from(agents)
    .all()
    .map(r => r.category)
    .filter((c): c is string => c !== null)

  const allLlms = db
    .selectDistinct({ llmName: agents.llmName })
    .from(agents)
    .all()
    .map(r => r.llmName)
    .filter(Boolean) as string[]

  const allMaturityStatuses = db
    .selectDistinct({ maturityStatus: agents.maturityStatus })
    .from(agents)
    .all()
    .map(r => r.maturityStatus)
    .filter(Boolean) as string[]

  return {
    agents: agentList,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    categories: allCategories,
    llms: allLlms,
    maturityStatuses: allMaturityStatuses,
    filters: { category, llm, maturity, q },
  }
}
