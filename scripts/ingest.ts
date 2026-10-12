import { readdir, readFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import { parse as parseYaml } from 'yaml'
import { agents, agentEmbeddings } from '../drizzle/schema.js'
import type { NewAgentRow } from '../drizzle/schema.js'
import { detectFormat, normalize } from '../src/lib/spec/index.js'
import type { AgentRecord } from '../src/lib/spec/types.js'
import { buildSearchText, contentHash, recordToSearchable } from '../src/lib/server/search/documents.js'
import type { Searchable } from '../src/lib/server/search/documents.js'
import { createTransformersEmbedder, vectorToBlob } from '../src/lib/server/search/embedder.js'
import type { Embedder } from '../src/lib/server/search/embedder.js'

const DATA_DIR = process.env.INGEST_DATA_DIR ?? './data/agents'
const DB_PATH = process.env.INGEST_DB_PATH ?? './db/catalog.db'

function flattenRecord(record: AgentRecord): NewAgentRow {
  return {
    slug: record.slug,
    title: record.title,
    summary: record.summary,
    systemPrompt: record.systemPrompt,
    llmName: record.llm.name,
    llmTemperature: record.llm.temperature,
    llmMaxTokens: record.llm.maxTokens,
    llmTopP: record.llm.topP,
    toolNames: JSON.stringify(record.toolNames),
    inputSchema: JSON.stringify(record.inputFields),
    requiresHumanApproval: record.requiresHumanApproval,
    category: record.category,
    githubUrl: record.githubUrl,
    linkLabel: record.linkLabel,
    maturityStatus: record.maturityStatus,
    tags: JSON.stringify(record.tags),
    customizableFields: record.customizableFields ? JSON.stringify(record.customizableFields) : null,
    fixedFields: JSON.stringify(record.fixedFields),
    fixedNote: record.fixedNote,
    specId: record.specId,
    // try_it_out_* mirror the drizzle/schema.ts column defaults and are
    // intentionally NOT read from AgentRecord (D-05/D-06) — try_it_out is
    // not sourced from Oracle AgentSpec YAML in this phase; the DB row is
    // the system of record.
    tryItOutMode: 'none',
    tryItOutUrl: null,
    tryItOutTaskTemplate: null,
    lastIngestedAt: new Date().toISOString(),
  }
}

type Db = ReturnType<typeof drizzle>

// Embedding step: never throws, never changes ingest counts.
async function embedAgents(
  sqlite: Database.Database,
  db: Db,
  searchables: Searchable[],
  opts?: { embedder?: Embedder | null },
): Promise<void> {
  try {
    const hasTable = sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='agent_embeddings'`)
      .get()
    if (!hasTable) return

    let embedder: Embedder | null
    if (opts?.embedder !== undefined) {
      embedder = opts.embedder
      if (!embedder) console.warn('[search] no embedder available; skipping embeddings (BM25-only)')
    } else if (process.env.SEARCH_EMBEDDINGS === 'off') {
      return
    } else {
      embedder = await createTransformersEmbedder()
      if (!embedder) console.warn('[search] no embedder available; skipping embeddings (BM25-only)')
    }
    if (!embedder) return

    const existing = new Map<string, { model: string; hash: string }>()
    for (const r of sqlite
      .prepare('SELECT slug, model, content_hash FROM agent_embeddings')
      .all() as { slug: string; model: string; content_hash: string }[]) {
      existing.set(r.slug, { model: r.model, hash: r.content_hash })
    }

    const unique = new Map<string, Searchable>()
    for (const s of searchables) unique.set(s.slug, s)

    const stale: { slug: string; text: string; hash: string }[] = []
    for (const s of unique.values()) {
      const text = buildSearchText(s)
      const hash = contentHash(embedder.id, text)
      const prev = existing.get(s.slug)
      if (!prev || prev.model !== embedder.id || prev.hash !== hash) {
        stale.push({ slug: s.slug, text, hash })
      }
    }

    if (stale.length > 0) {
      const vectors = await embedder.embed(stale.map(x => x.text))
      for (let i = 0; i < stale.length; i++) {
        const row = {
          slug: stale[i].slug,
          model: embedder.id,
          contentHash: stale[i].hash,
          vector: vectorToBlob(vectors[i]),
          updatedAt: new Date().toISOString(),
        }
        await db
          .insert(agentEmbeddings)
          .values(row)
          .onConflictDoUpdate({
            target: agentEmbeddings.slug,
            set: {
              model: sql`excluded.model`,
              contentHash: sql`excluded.content_hash`,
              vector: sql`excluded.vector`,
              updatedAt: sql`excluded.updated_at`,
            },
          })
      }
    }

    sqlite.prepare('DELETE FROM agent_embeddings WHERE slug NOT IN (SELECT slug FROM agents)').run()
  } catch (err) {
    console.warn(`[search] embedding step failed: ${(err as Error).message}`)
  }
}

async function ingest( dataDir: string, dbPath: string, opts?: { embedder?: Embedder | null }): Promise<{ succeeded: number; failed: number }> {
  await mkdir(dirname(dbPath), { recursive: true })
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  const db = drizzle(sqlite)

  const files = (await readdir(dataDir)).filter(
    f => f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json')
  )

  let succeeded = 0
  let failed = 0
  const searchables: Searchable[] = []

  for (const file of files) {
    const content = await readFile(join(dataDir, file), 'utf-8')
    try {
      const raw = parseYaml(content)
      const formatId = detectFormat(raw)
      const record = normalize(formatId, raw)
      const row = flattenRecord(record)

      await db
        .insert(agents)
        .values(row)
        .onConflictDoUpdate({
          target: agents.slug,
          set: {
            title: sql`excluded.title`,
            summary: sql`excluded.summary`,
            systemPrompt: sql`excluded.system_prompt`,
            llmName: sql`excluded.llm_name`,
            llmTemperature: sql`excluded.llm_temperature`,
            llmMaxTokens: sql`excluded.llm_max_tokens`,
            llmTopP: sql`excluded.llm_top_p`,
            toolNames: sql`excluded.tool_names`,
            inputSchema: sql`excluded.input_schema`,
            requiresHumanApproval: sql`excluded.requires_human_approval`,
            category: sql`excluded.category`,
            githubUrl: sql`excluded.github_url`,
            linkLabel: sql`excluded.link_label`,
            maturityStatus: sql`excluded.maturity_status`,
            tags: sql`excluded.tags`,
            customizableFields: sql`excluded.customizable_fields`,
            fixedFields: sql`excluded.fixed_fields`,
            fixedNote: sql`excluded.fixed_note`,
            specId: sql`excluded.spec_id`,
            // tryItOutMode / tryItOutUrl / tryItOutTaskTemplate are
            // deliberately OMITTED from this set block (D-07): try_it_out
            // is not sourced from AgentSpec YAML, so the DB is the system
            // of record for it. Re-ingestion must never clobber a
            // manually-set value. Every other column above keeps updating
            // from excluded.* as before — do not "fix" this omission.
            lastIngestedAt: sql`excluded.last_ingested_at`,
          },
        })

      searchables.push(recordToSearchable(record))
      succeeded++
    } catch (err) {
      console.error(`[SKIP] ${file}: ${(err as Error).message}`)
      failed++
    }
  }

  await embedAgents(sqlite, db, searchables, opts)

  console.log(`Ingestion complete: ${succeeded} succeeded, ${failed} failed`)
  sqlite.close()

  return { succeeded, failed }
}

export { ingest }

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  ingest(DATA_DIR, DB_PATH).catch(err => {
    console.error(err)
    process.exit(1)
  })
}
