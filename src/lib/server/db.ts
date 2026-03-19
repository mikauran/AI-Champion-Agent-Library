// src/lib/server/db.ts
// Server-only module — SvelteKit enforces that src/lib/server/ cannot be imported client-side.
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { agents } from '../../../drizzle/schema.js'

const DB_PATH = process.env.CATALOG_DB_PATH ?? './db/catalog.db'

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite)
export { agents }
