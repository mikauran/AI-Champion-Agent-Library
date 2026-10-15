import Database from 'better-sqlite3'

const DB_PATH = process.env.CATALOG_DB_PATH ?? './db/catalog.db'

// One-off, idempotent try_it_out_mode UPDATE (D-13 mechanism from
// scripts/ingest.test.ts). This sets ABSOLUTE values, never deltas, so
// re-running it any number of times converges on the same end state —
// no locking needed even if two runs overlap.
//
// - demo-rfi-triage    -> 'runnable' (this phase's one demo-only agent)
// - hvac-load-calculator -> 'none'   (D-03: reverting Phase 6's temporary flag)
const UPDATES: Array<{ slug: string; mode: string; url: string | null; taskTemplate: string | null }> = [
  { slug: 'demo-rfi-triage', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'hvac-load-calculator', mode: 'none', url: null, taskTemplate: null },
  { slug: 'etim-classification-repair', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'qto-normalization', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'clash-prioritization', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'rfi-generation-from-findings', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'product-sourcing-mbom', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'quote-comparison', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'carbon-epd-enrichment', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'cut-sheet-qa', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'spooling-and-cutting', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'd2-code-validation', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'om-completeness', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'bms-digital-twin', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'daily-report-cross-check', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'punch-list-closure-check', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'change-order-consistency-check', mode: 'runnable', url: null, taskTemplate: null },
  { slug: 'safety-observation-classification', mode: 'runnable', url: null, taskTemplate: null },
]

export function setTryItOutMode(dbPath: string): Array<{ slug: string; mode: string; changes: number }> {
  const db = new Database(dbPath)
  const stmt = db.prepare(
    `UPDATE agents SET try_it_out_mode = ?, try_it_out_url = ?, try_it_out_task_template = ? WHERE slug = ?`
  )

  const results: Array<{ slug: string; mode: string; changes: number }> = []

  try {
    for (const update of UPDATES) {
      const result = stmt.run(update.mode, update.url, update.taskTemplate, update.slug)
      if (result.changes === 0) {
        throw new Error(
          `setTryItOutMode: no row matched slug '${update.slug}' — run ingest before this script`
        )
      }
      results.push({ slug: update.slug, mode: update.mode, changes: result.changes })
    }
  } finally {
    db.close()
  }

  return results
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  try {
    const results = setTryItOutMode(DB_PATH)
    for (const r of results) {
      console.log(`${r.slug} -> try_it_out_mode = '${r.mode}' (${r.changes} row updated)`)
    }
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
