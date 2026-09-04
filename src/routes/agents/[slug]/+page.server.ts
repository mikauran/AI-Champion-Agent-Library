import { db, agents } from '$lib/server/db.js'
import { eq } from 'drizzle-orm'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, url }) => {
  const row = db
    .select()
    .from(agents)
    .where(eq(agents.slug, params.slug))
    .get()

  if (!row) {
    error(404, 'Agent not found. It may have been removed or the URL is incorrect.')
  }

  return {
    agent: {
      ...row,
      toolNames: JSON.parse(row.toolNames) as string[],
      tags: JSON.parse(row.tags) as string[],
    },
    openTryOut: url?.searchParams.get('tryout') === '1',
  }
}
