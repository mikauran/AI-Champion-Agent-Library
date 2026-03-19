import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ingest } from './ingest.js'
import Database from 'better-sqlite3'
import { existsSync, rmSync } from 'node:fs'

const TEST_DB = './db/test-catalog.db'
const FIXTURES_DIR = './data/agents/fixtures'

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS agents (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL,
  llm_name TEXT NOT NULL,
  llm_temperature REAL,
  llm_max_tokens INTEGER,
  llm_top_p REAL,
  tool_names TEXT NOT NULL DEFAULT '[]',
  requires_human_approval INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  github_url TEXT,
  maturity_status TEXT NOT NULL DEFAULT 'experimental',
  tags TEXT NOT NULL DEFAULT '[]',
  spec_id TEXT,
  last_ingested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)
`

beforeEach(() => {
  if (existsSync(TEST_DB)) {
    rmSync(TEST_DB)
  }
  // Pre-create the table so the ingest script can run without drizzle-kit push
  const db = new Database(TEST_DB)
  db.exec(CREATE_TABLE_SQL)
  db.close()
})

afterEach(() => {
  if (existsSync(TEST_DB)) {
    rmSync(TEST_DB)
  }
})

describe('ingest', () => {
  it('ingests valid fixtures and skips malformed', async () => {
    const result = await ingest(FIXTURES_DIR, TEST_DB)
    const db = new Database(TEST_DB)
    const count = (db.prepare('SELECT count(*) as n FROM agents').get() as { n: number }).n
    db.close()
    expect(result.succeeded).toBe(2)
    expect(result.failed).toBe(1)
    expect(count).toBe(2)
  })

  it('is idempotent — re-running produces same row count', async () => {
    await ingest(FIXTURES_DIR, TEST_DB)
    await ingest(FIXTURES_DIR, TEST_DB)
    const db = new Database(TEST_DB)
    const count = (db.prepare('SELECT count(*) as n FROM agents').get() as { n: number }).n
    db.close()
    expect(count).toBe(2)
  })

  it('updates last_ingested_at on re-run', async () => {
    await ingest(FIXTURES_DIR, TEST_DB)
    const db1 = new Database(TEST_DB)
    const row1 = db1.prepare(`SELECT last_ingested_at FROM agents WHERE slug = 'customer-support-triager'`).get() as { last_ingested_at: string }
    db1.close()
    const ts1 = row1.last_ingested_at

    // Wait 50ms to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 50))

    await ingest(FIXTURES_DIR, TEST_DB)
    const db2 = new Database(TEST_DB)
    const row2 = db2.prepare(`SELECT last_ingested_at FROM agents WHERE slug = 'customer-support-triager'`).get() as { last_ingested_at: string }
    db2.close()
    const ts2 = row2.last_ingested_at

    expect(ts2 > ts1).toBe(true)
  })

  it('populates fields correctly from valid fixture', async () => {
    await ingest(FIXTURES_DIR, TEST_DB)
    const db = new Database(TEST_DB)
    const row = db.prepare(`SELECT * FROM agents WHERE slug = 'customer-support-triager'`).get() as Record<string, unknown>
    db.close()

    expect(row.title).toBe('Customer Support Triager')
    expect(row.category).toBe('customer-support')
    expect(row.llm_name).toBe('gpt-4o')
    expect(row.requires_human_approval).toBe(0)
    expect(JSON.parse(row.tool_names as string).length).toBe(2)
  })
})
