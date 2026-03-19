import { readdir, readFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import { parse as parseYaml } from 'yaml'
import { agents } from '../drizzle/schema.js'
import type { NewAgentRow } from '../drizzle/schema.js'
import { detectFormat, normalize } from '../src/lib/spec/index.js'
import type { AgentRecord } from '../src/lib/spec/types.js'

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
    requiresHumanApproval: record.requiresHumanApproval,
    category: record.category,
    githubUrl: record.githubUrl,
    maturityStatus: record.maturityStatus,
    tags: JSON.stringify(record.tags),
    specId: record.specId,
    lastIngestedAt: new Date().toISOString(),
  }
}

async function ingest(dataDir: string, dbPath: string): Promise<{ succeeded: number; failed: number }> {
  await mkdir(dirname(dbPath), { recursive: true })
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  const db = drizzle(sqlite)

  const files = (await readdir(dataDir)).filter(
    f => f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json')
  )

  let succeeded = 0
  let failed = 0

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
            requiresHumanApproval: sql`excluded.requires_human_approval`,
            category: sql`excluded.category`,
            githubUrl: sql`excluded.github_url`,
            maturityStatus: sql`excluded.maturity_status`,
            tags: sql`excluded.tags`,
            specId: sql`excluded.spec_id`,
            lastIngestedAt: sql`excluded.last_ingested_at`,
          },
        })

      succeeded++
    } catch (err) {
      console.error(`[SKIP] ${file}: ${(err as Error).message}`)
      failed++
    }
  }

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
