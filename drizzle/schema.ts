// SOURCE: Drizzle ORM SQLite docs (orm.drizzle.team/docs/get-started-sqlite)
// Maps AgentRecord fields to SQLite columns for the agents catalog table.
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const agents = sqliteTable('agents', {
  slug:                  text('slug').primaryKey(),
  title:                 text('title').notNull(),
  summary:               text('summary').notNull().default(''),
  systemPrompt:          text('system_prompt').notNull(),
  llmName:               text('llm_name').notNull(),
  llmTemperature:        real('llm_temperature'),
  llmMaxTokens:          integer('llm_max_tokens'),
  llmTopP:               real('llm_top_p'),
  toolNames:             text('tool_names').notNull().default('[]'),  // JSON-serialized string[]
  inputSchema:           text('input_schema').notNull().default('[]'), // JSON-serialized AgentInputField[]
  requiresHumanApproval: integer('requires_human_approval', { mode: 'boolean' }).notNull().default(false),
  category:              text('category'),
  githubUrl:             text('github_url'),
  maturityStatus:        text('maturity_status').notNull().default('experimental'),
  tags:                  text('tags').notNull().default('[]'),        // JSON-serialized string[]
  specId:                text('spec_id'),
  lastIngestedAt:        text('last_ingested_at').notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export type AgentRow = typeof agents.$inferSelect
export type NewAgentRow = typeof agents.$inferInsert
