// /compare (DISC-02, flag AGENT_COMPARE, default off): 404 when the flag is off, before anything is read.
// Only SvelteKit-recognised exports may live here (helpers are in $lib/compare).
import { error } from '@sveltejs/kit'
import { inArray } from 'drizzle-orm'
import type { PageServerLoad } from './$types'
import { agentKindsEnabled } from '$lib/flags.js'
import { agentCompareEnabled } from '$lib/compareFlag.js'
import { db, agents } from '$lib/server/db.js'
import { MAX_COMPARE, buildCompareRows, parseCompareSlugs, type CompareAgentInput } from '$lib/compare.js'

export const load: PageServerLoad = async ({ url }) => {
  if (!agentCompareEnabled()) error(404, 'Not found')
  const { slugs, invalidCount, truncated } = parseCompareSlugs(url.searchParams.getAll('agents'))

  const rows = slugs.length ? db.select().from(agents).where(inArray(agents.slug, slugs)).all() : []
  const bySlug = new Map(rows.map((r) => [r.slug, r]))
  const unknown = slugs.filter((s) => !bySlug.has(s))

  const kindsOn = agentKindsEnabled()
  const kindInfo =
    kindsOn && rows.length
      ? (await import('$lib/server/kinds.js')).loadKindInfo(db as never, rows.map((r) => r.slug))
      : null

  const found: CompareAgentInput[] = slugs.flatMap((s) => {
    const r = bySlug.get(s)
    if (!r) return []
    const k = kindInfo?.get(s)
    return [
      {
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        category: r.category,
        tags: JSON.parse(r.tags) as string[],
        llmName: r.llmName,
        llmTemperature: r.llmTemperature,
        toolNames: JSON.parse(r.toolNames) as string[],
        inputFields: JSON.parse(r.inputSchema ?? '[]'),
        requiresHumanApproval: r.requiresHumanApproval,
        maturityStatus: r.maturityStatus,
        tryItOutMode: r.tryItOutMode,
        githubUrl: r.githubUrl,
        linkLabel: r.linkLabel,
        customizableFields: r.customizableFields ? (JSON.parse(r.customizableFields) as string[]) : null,
        ...(kindsOn ? { kind: k?.kind ?? 'agent', framework: k?.framework ?? null } : {}),
      },
    ]
  })

  return {
    max: MAX_COMPARE,
    invalidCount,
    truncated,
    unknown,
    agents: found.map((a) => ({ slug: a.slug, title: a.title, kind: a.kind ?? null, framework: a.framework ?? null })),
    rows: buildCompareRows(found, { kinds: kindsOn }),
    kindsOn,
  }
}
