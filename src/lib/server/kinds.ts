// Tolerant reader of the agent_kinds sidecar. Never throws; empty Map when the table is missing.
// Must not import db.ts (it opens the DB at import); callers pass the drizzle db.
import { inArray } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { agentKinds } from '../../../drizzle/schema.js'
import { parseKindInfoRow, type KindInfo } from '../spec/kinds.js'

const CHUNK = 500

export function loadKindInfo(
  db: BetterSQLite3Database<Record<string, unknown>>,
  slugs: string[]
): Map<string, KindInfo> {
  const out = new Map<string, KindInfo>()
  if (slugs.length === 0) return out
  try {
    for (let i = 0; i < slugs.length; i += CHUNK) {
      const chunk = slugs.slice(i, i + CHUNK)
      const rows = db.select().from(agentKinds).where(inArray(agentKinds.slug, chunk)).all()
      for (const r of rows) out.set(r.slug, parseKindInfoRow(r))
    }
    return out
  } catch {
    return new Map()
  }
}
