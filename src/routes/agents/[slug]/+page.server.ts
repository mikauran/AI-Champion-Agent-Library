import { db, agents } from '$lib/server/db.js'
import { eq, inArray } from 'drizzle-orm'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { warmForSession } from '$lib/server/tryitout/service'
import { related } from '$lib/server/search/index.js'
import { sessionKey } from '$lib/server/tryitout/session'

export const load: PageServerLoad = async ({ params, url, locals, cookies, getClientAddress }) => {
  const row = db
    .select()
    .from(agents)
    .where(eq(agents.slug, params.slug))
    .get()

  if (!row) {
    error(404, 'Agent not found. It may have been removed or the URL is incorrect.')
  }

  // D-05: warm the visitor's container in the background; never awaited, never fatal.
  if (row.tryItOutMode === 'runnable') {
    let clientKey: string | undefined
    try {
      clientKey = getClientAddress?.()
    } catch {
      clientKey = undefined
    }
    // WR-07: warmForSession caps new anonymous sessions per client address.
    void warmForSession(sessionKey({ locals, cookies, url }), row.slug, clientKey).catch(() => {})
  }

  // DISC-01: up to 4 related agents. Best effort; a failure must never break the detail page.
  let relatedAgents: { slug: string; title: string; summary: string; category: string | null }[] = []
  try {
    const hits = await related(row.slug, 4)
    const ids = hits.map((h) => h.slug).filter((s) => s !== row.slug)
    if (ids.length > 0) {
      const found = db
        .select({ slug: agents.slug, title: agents.title, summary: agents.summary, category: agents.category })
        .from(agents)
        .where(inArray(agents.slug, ids))
        .all()
      const bySlug = new Map(found.map((f) => [f.slug, f]))
      relatedAgents = ids.flatMap((id) => bySlug.get(id) ?? []).slice(0, 4)
    }
  } catch {
    relatedAgents = []
  }

  const { inputSchema, ...agentRow } = row

  return {
    agent: {
      ...agentRow,
      toolNames: JSON.parse(row.toolNames) as string[],
      inputFields: JSON.parse(inputSchema ?? '[]'),
      tags: JSON.parse(row.tags) as string[],
      fixedFields: JSON.parse(row.fixedFields ?? '[]') as string[],
      customizableFields: row.customizableFields ? (JSON.parse(row.customizableFields) as string[]) : null,
    },
    related: relatedAgents,
    openTryOut: url?.searchParams.get('tryout') === '1',
  }
}
