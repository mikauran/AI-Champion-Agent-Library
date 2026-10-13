// /mcp-test (Phase 15, flag MCP_TESTER, default off): 404 when the flag is off, before anything is read.
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { mcpTesterEnabled } from '$lib/flags.js'
import { FIDELITY } from '$lib/mcptest/core/fidelity.js'
import { listSubjects } from '$lib/mcptest/core/subjects.js'
import { caseBadge, type CaseInfo, type SubjectInfo } from '$lib/mcptest/uiModel.js'

/** Case list from the fidelity table (no suite or file access). */
export function listCases(): CaseInfo[] {
  return FIDELITY.filter((e) => e.group === 'case').map((e) => ({
    id: e.id,
    tier: e.tier ?? 1,
    title: e.note,
    badge: caseBadge(e)
  }))
}

/**
 * Fake variants and generator samples are runnable through the API (generated servers are scored in
 * process, server-side cells are pending human). A real runtime subject is listed but disabled.
 */
export function listPageSubjects(): SubjectInfo[] {
  const known: SubjectInfo[] = listSubjects().map((s) => ({
    id: s.id,
    kind: s.kind,
    label: s.label,
    runnable: s.kind === 'fake' || s.kind === 'generator',
    ...(s.note ? { note: s.note } : {})
  }))
  known.push({
    id: 'real:runtime',
    kind: 'submitted',
    label: 'Real server (container or command)',
    runnable: false,
    note: 'Needs a real runtime that is not configured here; run it from the command line (pending human).'
  })
  return known
}

export const load: PageServerLoad = () => {
  if (!mcpTesterEnabled()) error(404, 'Not found')
  return { subjects: listPageSubjects(), cases: listCases() }
}
