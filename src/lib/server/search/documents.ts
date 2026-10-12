// Single source of truth for the text used by BOTH BM25 and embeddings.
// Relative imports only; must not import db.ts (it opens the DB at import).
import { createHash } from 'node:crypto'
import type { AgentRecord } from '../../spec/types.js'

export interface Searchable {
  slug: string
  title: string
  summary: string
  category: string | null
  tags: string[]
  toolNames: string[]
}

export function buildSearchText(a: Searchable): string {
  const parts = [
    a.title,
    a.summary,
    a.category ?? '',
    a.tags.join(' '),
    a.toolNames.map(t => t.replace(/_/g, ' ')).join(' '),
  ]
  return parts.map(p => p.trim()).filter(p => p.length > 0).join('. ')
}

export function contentHash(modelId: string, text: string): string {
  return createHash('sha256').update(modelId).update('\u0000').update(text).digest('hex')
}

function parseList(json: string): string[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

export function rowToSearchable(row: {
  slug: string
  title: string
  summary: string
  category: string | null
  tags: string
  toolNames: string
}): Searchable {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    tags: parseList(row.tags),
    toolNames: parseList(row.toolNames),
  }
}

export function recordToSearchable(r: AgentRecord): Searchable {
  return {
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    category: r.category,
    tags: [...r.tags],
    toolNames: [...r.toolNames],
  }
}
