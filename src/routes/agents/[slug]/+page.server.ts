import { db, agents } from '$lib/server/db.js'
import { eq } from 'drizzle-orm'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { warmForSession } from '$lib/server/tryitout/service'
import { sessionKey } from '$lib/server/tryitout/session'

export const load: PageServerLoad = async ({ params, url, locals, cookies }) => {
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
    void warmForSession(sessionKey({ locals, cookies, url }), row.slug).catch(() => {})
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
    openTryOut: url?.searchParams.get('tryout') === '1',
  }
}
