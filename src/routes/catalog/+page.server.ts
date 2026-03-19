import { db, agents } from '$lib/server/db.js'
import { eq, and, asc } from 'drizzle-orm'
import type { PageServerLoad } from './$types'

const PAGE_SIZE = 24

export const load: PageServerLoad = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const category = url.searchParams.get('category') ?? null
  const llm = url.searchParams.get('llm') ?? null
  const maturity = url.searchParams.get('maturity') ?? null

  const conditions = []
  if (category) conditions.push(eq(agents.category, category))
  if (llm) conditions.push(eq(agents.llmName, llm))
  if (maturity) conditions.push(eq(agents.maturityStatus, maturity))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

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

  // Deserialize JSON arrays stored as text columns
  const agentList = rows.map(row => ({
    ...row,
    toolNames: JSON.parse(row.toolNames) as string[],
    tags: JSON.parse(row.tags) as string[],
  }))

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
    total: totalRows.length,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(totalRows.length / PAGE_SIZE),
    categories: allCategories,
    llms: allLlms,
    maturityStatuses: allMaturityStatuses,
    filters: { category, llm, maturity },
  }
}
