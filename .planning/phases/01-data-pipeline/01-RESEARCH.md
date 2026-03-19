# Phase 1: Data Pipeline - Research

**Researched:** 2026-03-19
**Domain:** YAML ingestion, Zod validation, spec shim/adapter pattern, SQLite with Drizzle ORM, idempotent upsert, TypeScript build scripts
**Confidence:** HIGH (stack verified against npm registry and official docs; Oracle AgentSpec field structure verified against official PyAgentSpec API documentation)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | Ingest pipeline parses Oracle AgentSpec YAML/JSON files into structured records using Zod schema validation | Oracle AgentSpec field structure verified via official API docs; Zod 4 parse patterns documented with code examples |
| PIPE-02 | Canonical `AgentRecord` type decouples all UI components from Oracle AgentSpec field names (shim/adapter layer) | Adapter registry pattern documented; AgentSpec-to-AgentRecord field mapping table provided |
| PIPE-03 | Ingestion is idempotent — re-running produces the same result; each record carries `last_ingested_at` timestamp | Drizzle ORM `.onConflictDoUpdate()` with SQLite target column documented; upsert semantics verified |
| PIPE-04 | Ingestion script can be triggered at deploy time from structured agent files in the repository | Build-step integration pattern (`node scripts/ingest.ts && vite build`) documented; `tsx` runner for TypeScript scripts verified |
</phase_requirements>

---

## Summary

Phase 1 establishes the data foundation for the entire AIC Agent Library. Its three outputs — the canonical `AgentRecord` TypeScript type, the Oracle AgentSpec shim adapter, and the SQLite database with upsert ingestion — are the contract every subsequent phase builds against. Nothing in Phase 2, 3, or 4 can be built until this pipeline is working and stable.

The Oracle AgentSpec is a real, public, versioned specification maintained by Oracle at `github.com/oracle/agent-spec`. Its Python SDK (`PyAgentSpec`) serializes agents to JSON/YAML with a known field structure: top-level fields include `component_type`, `id`, `name`, `description`, `metadata`, `system_prompt`, `llm_config`, `tools`, `toolboxes`, `inputs`, `outputs`, `human_in_the_loop`, `transforms`, and version constraints. The `llm_config` object nests `name`, `description`, `metadata`, and `default_generation_parameters` (which holds `max_tokens`, `temperature`, `top_p`). This means the shim adapter has a concrete, known source schema to map from — not a speculative one.

The implementation pattern is: parse YAML with the `yaml` package, validate the raw parsed object against a Zod 4 schema that mirrors the Oracle AgentSpec structure, then run the validated object through the adapter function that maps to `AgentRecord`. The `AgentRecord` should be driven by what the UI and search need, not by what AgentSpec provides. Write the result to SQLite via Drizzle ORM using `onConflictDoUpdate()` keyed on the agent's slug (derived from `name`), updating `last_ingested_at` on every run. All five phase success criteria are achievable with this approach.

**Primary recommendation:** Use `yaml` + Zod 4 for parsing and validation, Drizzle ORM + better-sqlite3 for storage with upsert semantics, `tsx` to run TypeScript ingestion scripts directly, and an explicit `AgentRecord` type whose field names bear no resemblance to AgentSpec field names.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| yaml | 2.8.2 | Parse YAML files into JavaScript objects | Pure JS, YAML 1.2 compliant, no native bindings — safe for build scripts. Direct replacement for `js-yaml`. |
| zod | 4.3.6 | Runtime schema validation of parsed YAML | Validates Oracle AgentSpec structure at ingest time; `.safeParse()` returns errors without throwing, allowing valid records to continue while malformed ones fail cleanly (PIPE-01, PIPE-03 success criterion 3). |
| better-sqlite3 | 12.8.0 | SQLite driver | Synchronous API, fast, no separate process. Used server-side at build time only. |
| drizzle-orm | 0.45.1 | Type-safe SQL query builder for SQLite | `.onConflictDoUpdate()` implements upsert semantics natively; generates TypeScript types from schema definition (PIPE-03). |
| drizzle-kit | 0.31.10 | Drizzle migration tooling (devDependency) | Generates SQL migration files from Drizzle schema; `drizzle-kit push` initializes the SQLite file at build time. |
| tsx | 4.x | Run TypeScript files directly in Node.js (devDependency) | Zero-config TypeScript runner for `scripts/ingest.ts`; no `ts-node` configuration needed. Used in the `package.json` build script. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/better-sqlite3 | latest | TypeScript types for better-sqlite3 | Always — required for type-safe database calls in `.ts` ingestion scripts. |
| node:fs/promises | built-in | Read YAML files from disk | Use `fs.readdir()` and `fs.readFile()` from Node 22 built-ins; do not install `fs-extra`. |
| node:path | built-in | Construct file paths | Join `data/agents/` directory paths safely. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| yaml | js-yaml | `yaml` package is newer, more actively maintained, YAML 1.2 native. Both are fine for this use case. |
| drizzle-orm | Raw SQL strings (better-sqlite3 `.prepare().run()`) | Raw SQL is acceptable for a simple schema; Drizzle adds typed results and migration management. Worth the install. |
| tsx | ts-node | `tsx` has simpler zero-config setup and faster startup than `ts-node`. Both work; prefer `tsx`. |
| Zod 4 | Zod 3 | Zod 4 has breaking API changes (see Pitfalls section). Pin to one version. Do not mix. |

**Installation:**

```bash
# Runtime dependencies
npm install better-sqlite3 drizzle-orm yaml zod

# Dev dependencies
npm install -D drizzle-kit @types/better-sqlite3 tsx
```

**Version verification (confirmed via npm registry 2026-03-19):**
- `yaml@2.8.2` — current
- `zod@4.3.6` — current
- `better-sqlite3@12.8.0` — current
- `drizzle-orm@0.45.1` — current
- `drizzle-kit@0.31.10` — current

---

## Oracle AgentSpec Field Structure

This is the most critical gap from the prior project research. The Oracle AgentSpec is a real, public spec at `github.com/oracle/agent-spec`. The following field structure is verified against the official PyAgentSpec API reference (HIGH confidence):

### Agent (top-level serialized object)

| Field | Type | Required | Maps to AgentRecord as |
|-------|------|----------|------------------------|
| `component_type` | string literal `"Agent"` | Yes (at deserialization) | — (validation only, not stored) |
| `id` | string | No | `specId` |
| `name` | string | Yes | `slug` (normalized), `title` |
| `description` | string | No | `summary` |
| `metadata` | `Record<string, any>` | No | `tags`, `category`, `githubUrl`, `maturityStatus` (extracted by convention) |
| `system_prompt` | string | Yes | `systemPrompt` |
| `llm_config` | LlmConfig object | Yes | `llm` (nested AgentRecord sub-object) |
| `tools` | Tool[] | No | `toolNames` (array of strings) |
| `toolboxes` | ToolBox[] | No | `toolboxNames` |
| `inputs` | Property[] | No | `inputFields` |
| `outputs` | Property[] | No | `outputFields` |
| `human_in_the_loop` | boolean | No | `requiresHumanApproval` |
| `transforms` | MessageTransform[] | No | — (deferred; not needed for v1) |
| `min_agentspec_version` | string | No | — (validation only) |
| `max_agentspec_version` | string | No | — (validation only) |

### LlmConfig (nested in Agent)

| Field | Type | Required | Maps to AgentRecord as |
|-------|------|----------|------------------------|
| `name` | string | Yes | `llm.name` |
| `description` | string | No | — |
| `metadata` | `Record<string, any>` | No | — |
| `default_generation_parameters` | LlmGenerationConfig | No | `llm.temperature`, `llm.maxTokens`, `llm.topP` |

### LlmGenerationConfig (nested in LlmConfig)

| Field | Type | Purpose |
|-------|------|---------|
| `max_tokens` | integer | Max tokens per response |
| `temperature` | float | Sampling temperature |
| `top_p` | float | Top-P sampling |

### VllmConfig (subtype of LlmConfig for self-hosted models)

| Field | Type |
|-------|------|
| `url` | string |
| `model_id` | string |
| `api_type` | enum |
| `api_key` | string (optional) |

**Important:** The AIC consortium's actual agent YAML files have not been inspected. The `metadata` field is a free-form `Record<string, any>` — consortium-specific conventions (e.g., `metadata.category`, `metadata.github_url`, `metadata.maturity`) must be confirmed against real files before implementing the adapter. This is a LOW-confidence gap that must be resolved in Plan 01-01 before Plan 01-02 can begin.

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope only)

```
src/
└── lib/
    └── spec/
        ├── types.ts                # AgentRecord canonical type — NO AgentSpec names
        ├── oracle-agentspec.ts     # Zod schema + adapter: AgentSpec → AgentRecord
        └── index.ts                # Adapter registry: format detection + dispatch
scripts/
└── ingest.ts                       # CLI: reads data/agents/, runs adapter, writes SQLite
data/
└── agents/                         # Source-of-truth Oracle AgentSpec YAML files
    └── example-agent.yaml
drizzle/
└── schema.ts                       # Drizzle table definition (agents table)
migrations/
└── 0000_init.sql                   # Generated by drizzle-kit
db/
└── catalog.db                      # Output SQLite file (gitignored in dev, deployed artifact)
```

### Pattern 1: Zod Safeguarded Adapter

**What:** Parse raw YAML with the `yaml` package, validate the result with `.safeParse()` against a Zod schema, run the validated output through the adapter function only if validation succeeds.

**When to use:** Always — this is the only correct approach for ingesting user-managed files. Never call the adapter on unvalidated input.

**Example:**

```typescript
// src/lib/spec/oracle-agentspec.ts
import { z } from 'zod'
import type { AgentRecord } from './types.js'

// Zod schema mirrors AgentSpec structure exactly (using AgentSpec field names here only)
const LlmGenerationConfigSchema = z.object({
  max_tokens: z.number().int().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
})

const LlmConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  default_generation_parameters: LlmGenerationConfigSchema.optional(),
})

const OracleAgentSpecSchema = z.object({
  component_type: z.literal('Agent'),
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  system_prompt: z.string(),
  llm_config: LlmConfigSchema,
  tools: z.array(z.unknown()).optional(),
  toolboxes: z.array(z.unknown()).optional(),
  inputs: z.array(z.unknown()).optional(),
  outputs: z.array(z.unknown()).optional(),
  human_in_the_loop: z.boolean().optional(),
})

export type OracleAgentSpec = z.infer<typeof OracleAgentSpecSchema>

// Adapter: AgentSpec → AgentRecord (the ONLY place AgentSpec field names appear)
export function fromOracleAgentSpec(raw: OracleAgentSpec): AgentRecord {
  return {
    slug: slugify(raw.name),
    title: raw.name,
    summary: raw.description ?? '',
    systemPrompt: raw.system_prompt,
    llm: {
      name: raw.llm_config.name,
      temperature: raw.llm_config.default_generation_parameters?.temperature ?? null,
      maxTokens: raw.llm_config.default_generation_parameters?.max_tokens ?? null,
    },
    toolNames: (raw.tools ?? []).map(extractToolName),
    requiresHumanApproval: raw.human_in_the_loop ?? false,
    // metadata fields extracted by consortium convention — validate against real files
    category: extractMeta(raw.metadata, 'category'),
    githubUrl: extractMeta(raw.metadata, 'github_url'),
    maturityStatus: extractMeta(raw.metadata, 'maturity') ?? 'experimental',
    tags: extractMetaArray(raw.metadata, 'tags'),
    specId: raw.id ?? null,
    lastIngestedAt: new Date().toISOString(),
  }
}

export { OracleAgentSpecSchema }
```

### Pattern 2: Adapter Registry with Format Detection

**What:** A central registry dispatches to the correct adapter based on a format identifier. Callers never depend on format-specific modules directly.

**When to use:** Always — even though only Oracle AgentSpec is supported in Phase 1, the registry boundary prevents spec format details from leaking into the ingestion script.

**Example:**

```typescript
// src/lib/spec/index.ts
import type { AgentRecord } from './types.js'
import { fromOracleAgentSpec, OracleAgentSpecSchema } from './oracle-agentspec.js'

type FormatId = 'oracle-agentspec'

export function detectFormat(raw: unknown): FormatId {
  // Oracle AgentSpec: component_type === 'Agent' is the discriminator
  if (
    typeof raw === 'object' &&
    raw !== null &&
    (raw as Record<string, unknown>).component_type === 'Agent'
  ) {
    return 'oracle-agentspec'
  }
  throw new Error(`Unrecognized agent spec format: no component_type === 'Agent' found`)
}

export function normalize(formatId: FormatId, raw: unknown): AgentRecord {
  if (formatId === 'oracle-agentspec') {
    const result = OracleAgentSpecSchema.safeParse(raw)
    if (!result.success) {
      throw new Error(`Oracle AgentSpec validation failed: ${result.error.message}`)
    }
    return fromOracleAgentSpec(result.data)
  }
  throw new Error(`No adapter registered for format: ${formatId}`)
}
```

### Pattern 3: Drizzle Upsert with `last_ingested_at`

**What:** Insert or update agent records using `onConflictDoUpdate()` keyed on `slug`. The `last_ingested_at` column is always set to the current timestamp, satisfying PIPE-03.

**When to use:** Always for the ingestion script — never use plain `INSERT` which creates duplicates on re-run.

**Example:**

```typescript
// drizzle/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const agents = sqliteTable('agents', {
  slug:                 text('slug').primaryKey(),
  title:                text('title').notNull(),
  summary:              text('summary').notNull(),
  systemPrompt:         text('system_prompt').notNull(),
  llmName:              text('llm_name').notNull(),
  llmTemperature:       real('llm_temperature'),
  llmMaxTokens:         integer('llm_max_tokens'),
  toolNames:            text('tool_names').notNull(), // JSON array serialized as text
  requiresHumanApproval: integer('requires_human_approval', { mode: 'boolean' }).notNull(),
  category:             text('category'),
  githubUrl:            text('github_url'),
  maturityStatus:       text('maturity_status').notNull().default('experimental'),
  tags:                 text('tags').notNull().default('[]'), // JSON array
  specId:               text('spec_id'),
  lastIngestedAt:       text('last_ingested_at').notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})
```

```typescript
// scripts/ingest.ts (run as: tsx scripts/ingest.ts)
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { parse as parseYaml } from 'yaml'
import { agents } from '../drizzle/schema.js'
import { detectFormat, normalize } from '../src/lib/spec/index.js'

const DATA_DIR = './data/agents'
const DB_PATH = './db/catalog.db'

async function ingest() {
  const sqlite = new Database(DB_PATH)
  const db = drizzle(sqlite)

  const files = (await readdir(DATA_DIR)).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
  let succeeded = 0
  let failed = 0

  for (const file of files) {
    const filePath = join(DATA_DIR, file)
    try {
      const raw = parseYaml(await readFile(filePath, 'utf-8'))
      const formatId = detectFormat(raw)
      const record = normalize(formatId, raw)

      await db
        .insert(agents)
        .values({
          ...flattenRecord(record),
          lastIngestedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: agents.slug,
          set: {
            title: record.title,
            summary: record.summary,
            systemPrompt: record.systemPrompt,
            llmName: record.llm.name,
            llmTemperature: record.llm.temperature,
            llmMaxTokens: record.llm.maxTokens,
            toolNames: JSON.stringify(record.toolNames),
            category: record.category,
            githubUrl: record.githubUrl,
            maturityStatus: record.maturityStatus,
            tags: JSON.stringify(record.tags),
            lastIngestedAt: new Date().toISOString(),
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
}

ingest().catch(err => { console.error(err); process.exit(1) })
```

### Pattern 4: Build-Step Integration

**What:** The ingestion script runs as part of the build command so no manual step is required (PIPE-04).

**Example in `package.json`:**

```json
{
  "scripts": {
    "ingest": "tsx scripts/ingest.ts",
    "db:push": "drizzle-kit push",
    "build": "npm run db:push && npm run ingest && vite build",
    "dev": "npm run db:push && npm run ingest && vite dev"
  }
}
```

### Anti-Patterns to Avoid

- **AgentSpec field names in `AgentRecord`:** If `AgentRecord` has fields named `system_prompt`, `llm_config`, `component_type`, or `human_in_the_loop`, the shim boundary is not real. These names must only exist inside `oracle-agentspec.ts`.
- **Plain INSERT without conflict handling:** `db.insert(agents).values(...)` without `.onConflictDoUpdate()` duplicates records on re-run. Violates PIPE-03.
- **Throwing on first validation failure:** Throwing inside the per-file loop aborts ingestion of all subsequent files. Catch per-file, log the error, and continue. Matches success criterion 3.
- **Validating with TypeScript types only:** TypeScript interfaces are compile-time only. File content is runtime data. Zod is mandatory for PIPE-01.
- **Storing the raw AgentSpec document in the DB:** The database stores `AgentRecord` values only. The raw spec is read-once at ingest time and discarded.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | Custom regex or string splitting | `yaml` package | YAML has multiline strings, anchors, aliases, quoted scalars — hand-parsing breaks on any non-trivial spec |
| Schema validation | `typeof` checks and manual guards | Zod 4 `.safeParse()` | Edge cases: missing required fields, wrong types, nested null/undefined — Zod covers all of these; manual guards do not |
| Upsert logic | SELECT then INSERT/UPDATE in application code | Drizzle `.onConflictDoUpdate()` | Race conditions, multiple statements outside a transaction, code that doubles in size |
| Slug generation | `name.toLowerCase().replace(/ /g, '-')` | Implement once correctly | Unicode characters, special chars, leading/trailing dashes, collision handling — use a tested utility function |
| TypeScript execution for scripts | Compiling to JS first then running | `tsx` | Eliminates a build step for scripts; tsx strips types natively with no tsconfig required |
| SQLite schema migrations | Running raw SQL strings in code | `drizzle-kit push` | `push` generates and applies migrations from the Drizzle schema definition; raw strings diverge over time |

**Key insight:** YAML parsing and SQL upsert are both deceptively complex. The `yaml` package handles the full YAML 1.2 spec; `better-sqlite3` with Drizzle handles transaction safety and conflict resolution. Neither is worth implementing from scratch.

---

## Common Pitfalls

### Pitfall 1: Zod 4 API Differences from Zod 3

**What goes wrong:** Code written with Zod 3 patterns breaks silently or at compile time when using Zod 4. The most common breakages are string format validators (`.email()`, `.uuid()`) which moved from methods to top-level functions, and `.merge()` which is deprecated in favor of `.extend()`.

**Why it happens:** Documentation search results, blog posts, and AI training data frequently reference Zod 3. If a team member has prior Zod experience, their muscle memory uses Zod 3 patterns.

**How to avoid:** Use only Zod 4 patterns. Key differences:
- `z.string().email()` → `z.email()` (top-level, not a method)
- `z.string().uuid()` → `z.uuid()`
- `schemaA.merge(schemaB)` → `schemaA.extend(schemaB)` or `schemaB.extend(schemaA.shape)`
- `z.nativeEnum(MyEnum)` → `z.enum(MyEnum)`
- Error customization: unified `error` param instead of `message`/`invalid_type_error`/`required_error`

**Warning signs:** TypeScript errors about `.email is not a function` or unexpected union type behavior in `.optional()` fields.

### Pitfall 2: `metadata` Field is Free-Form — Extract by Convention, Not by Schema

**What goes wrong:** The Oracle AgentSpec `metadata` field is typed as `Record<string, any>`. Consortium-specific fields like `category`, `github_url`, and `maturity` stored inside `metadata` are not validated by the base AgentSpec Zod schema. If the adapter assumes these keys exist without checking, it silently produces `undefined` values in `AgentRecord`.

**Why it happens:** The spec schema is correct (metadata is genuinely open), but the consortium has conventions for how to use it that are not in the spec itself.

**How to avoid:** In Plan 01-01, inspect real agent YAML files before finalizing the `AgentRecord` type. Use Zod's `z.record(z.unknown())` for `metadata`, then extract specific keys with null-safe access and explicit fallbacks. If the real files don't have `metadata.category`, the adapter must handle `undefined` gracefully.

**Warning signs:** `AgentRecord` fields like `category` or `tags` are empty for all agents after ingestion.

### Pitfall 3: Non-Idempotent Ingestion Breaks Re-Run Confidence

**What goes wrong:** Ingestion script uses plain `INSERT` without conflict handling. Running it twice creates duplicate rows. Running it after fixing a YAML error creates a mix of old and new records. Engineers stop re-running because they're afraid of corruption.

**Why it happens:** The default `db.insert().values()` call in Drizzle (and every other ORM) is `INSERT` without conflict handling. Adding `.onConflictDoUpdate()` requires explicit intent.

**How to avoid:** The pattern is in the Code Examples section above. Key: upsert on `slug` (primary key), always set `lastIngestedAt` to current time in the `set` object.

**Warning signs:** Row count in the database grows with each ingestion run on unchanged data.

### Pitfall 4: `tsx` Module Resolution Requires `.js` Extensions in Imports

**What goes wrong:** TypeScript files in `scripts/` and `src/lib/spec/` import each other. When running with `tsx` in ESM mode, TypeScript requires `.js` extensions in import paths (e.g., `import { normalize } from '../src/lib/spec/index.js'`) even though the file is actually `.ts`. Omitting the extension causes a "Cannot find module" error at runtime.

**Why it happens:** ESM resolution rules require explicit extensions. TypeScript compiles `.ts` to `.js`, so imports must reference the compiled output extension.

**How to avoid:** Always use `.js` extensions in import paths within the `scripts/` directory and `lib/` directory. Verify the tsconfig has `"moduleResolution": "bundler"` or `"node16"`.

**Warning signs:** `tsx scripts/ingest.ts` fails with `ERR_MODULE_NOT_FOUND` for local imports.

### Pitfall 5: Oracle AgentSpec Field Names in `AgentRecord` (Structural Lock-In)

**What goes wrong:** Pressure to ship quickly leads to `AgentRecord` being a thin rename of AgentSpec: `agentRecord.system_prompt` instead of `agentRecord.systemPrompt`, `agentRecord.llm_config` instead of `agentRecord.llm`. Every UI component and query then has implicit AgentSpec knowledge. When the spec changes or a second format is added, every component must be updated.

**Why it happens:** It's faster to copy-paste the AgentSpec structure than to design a new type. The adapter then becomes trivial to write, reinforcing the shortcut.

**How to avoid:** The `AgentRecord` field naming convention must be established and enforced in Plan 01-01 before any adapter code is written. A type review — confirming that no `AgentRecord` field name matches an Oracle AgentSpec field name — is a required verification step for Plan 01-01.

**Warning signs:** `AgentRecord` has fields named `system_prompt`, `llm_config`, `component_type`, or `human_in_the_loop`.

---

## Code Examples

### Complete `AgentRecord` Canonical Type (starter — verify against real YAML files)

```typescript
// src/lib/spec/types.ts
// SOURCE: Derived from Oracle AgentSpec API reference (oracle.github.io/agent-spec)
// and AIC catalog UI needs. Field names are deliberately NOT Oracle AgentSpec names.

export interface AgentLlm {
  name: string          // e.g. "gpt-4o", "llama-3.1-70b" — from llm_config.name
  temperature: number | null
  maxTokens: number | null
  topP: number | null
}

export interface AgentRecord {
  // Identity
  slug: string          // URL-safe identifier derived from name; primary key
  title: string         // Human-readable name (from AgentSpec `name`)
  specId: string | null // Original AgentSpec `id` if present

  // Description (what the agent does — used for search embedding)
  summary: string       // From AgentSpec `description`
  systemPrompt: string  // From AgentSpec `system_prompt`

  // LLM configuration
  llm: AgentLlm

  // Capabilities
  toolNames: string[]   // Names of tools the agent uses
  requiresHumanApproval: boolean  // From `human_in_the_loop`

  // Catalog metadata (consortium conventions in AgentSpec `metadata`)
  category: string | null
  githubUrl: string | null
  maturityStatus: 'production' | 'beta' | 'experimental'
  tags: string[]

  // Pipeline metadata
  lastIngestedAt: string  // ISO-8601 timestamp; updated on every ingest run
}
```

### Zod Schema for YAML Validation

```typescript
// src/lib/spec/oracle-agentspec.ts — Zod 4 API
// SOURCE: Zod 4 official docs (zod.dev/v4) + Oracle AgentSpec API reference
import { z } from 'zod'

export const OracleAgentSpecSchema = z.object({
  component_type: z.literal('Agent'),
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  system_prompt: z.string().min(1),
  llm_config: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    default_generation_parameters: z.object({
      max_tokens: z.number().int().positive().optional(),
      temperature: z.number().min(0).max(2).optional(),
      top_p: z.number().min(0).max(1).optional(),
    }).optional(),
  }),
  tools: z.array(z.unknown()).optional(),
  toolboxes: z.array(z.unknown()).optional(),
  inputs: z.array(z.unknown()).optional(),
  outputs: z.array(z.unknown()).optional(),
  human_in_the_loop: z.boolean().optional(),
  min_agentspec_version: z.string().optional(),
  max_agentspec_version: z.string().optional(),
})
```

### Drizzle Table Schema

```typescript
// drizzle/schema.ts
// SOURCE: Drizzle ORM SQLite docs (orm.drizzle.team/docs/get-started-sqlite)
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
  toolNames:             text('tool_names').notNull().default('[]'),  // JSON
  requiresHumanApproval: integer('requires_human_approval', { mode: 'boolean' }).notNull().default(false),
  category:              text('category'),
  githubUrl:             text('github_url'),
  maturityStatus:        text('maturity_status').notNull().default('experimental'),
  tags:                  text('tags').notNull().default('[]'),        // JSON
  specId:                text('spec_id'),
  lastIngestedAt:        text('last_ingested_at').notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export type AgentRow = typeof agents.$inferSelect
export type NewAgentRow = typeof agents.$inferInsert
```

### Drizzle Upsert Call

```typescript
// SOURCE: Drizzle ORM upsert guide (orm.drizzle.team/docs/guides/upsert)
await db
  .insert(agents)
  .values(row)
  .onConflictDoUpdate({
    target: agents.slug,
    set: {
      title:                 sql`excluded.title`,
      summary:               sql`excluded.summary`,
      systemPrompt:          sql`excluded.system_prompt`,
      llmName:               sql`excluded.llm_name`,
      llmTemperature:        sql`excluded.llm_temperature`,
      llmMaxTokens:          sql`excluded.llm_max_tokens`,
      category:              sql`excluded.category`,
      githubUrl:             sql`excluded.github_url`,
      maturityStatus:        sql`excluded.maturity_status`,
      tags:                  sql`excluded.tags`,
      toolNames:             sql`excluded.tool_names`,
      lastIngestedAt:        new Date().toISOString(),
    },
  })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@xenova/transformers` | `@huggingface/transformers` | 2024 | Package renamed; v3 is the active release. Do NOT install `@xenova/transformers`. |
| Zod 3 `.email()` method | Zod 4 `z.email()` top-level | May 2025 | String format validators are now top-level functions, not methods on `z.string()` |
| Zod 3 `.merge()` | Zod 4 `.extend()` | May 2025 | `.merge()` deprecated; use `.extend()` |
| Prisma for SQLite | Drizzle ORM | 2024-2025 | Drizzle has no separate engine binary; simpler for single-file SQLite |
| PostCSS + tailwind.config.js | `@tailwindcss/vite` plugin only | Tailwind v4 | Eliminates PostCSS config entirely — not relevant to Phase 1 but matters for Phase 2 |
| `ts-node` for TypeScript scripts | `tsx` | 2023-2024 | Zero-config TypeScript runner; faster startup |

---

## Open Questions

1. **Oracle AgentSpec `metadata` conventions for the AIC consortium**
   - What we know: The spec defines `metadata` as `Record<string, any>`. The adapter needs to extract `category`, `github_url`, `maturity`, and `tags` from this field.
   - What's unclear: The exact key names used by AIC consortium agents. Are they `metadata.category`? `metadata.github_url`? `metadata.tags` (array) or `metadata.tag` (string)?
   - Recommendation: In Plan 01-01, obtain 3-5 real Oracle AgentSpec YAML files from the consortium before finalizing `AgentRecord` and the adapter. This is the single most important gap to close before writing code.

2. **Slug generation collision handling**
   - What we know: Agent names may not be globally unique or may contain special characters.
   - What's unclear: Whether the consortium ensures unique `name` values, or whether `id` is the reliable unique key.
   - Recommendation: If `id` is always present, use it as the primary key instead of a slugified `name`. If `id` is unreliable, implement slug deduplication (e.g., `my-agent`, `my-agent-2`) and log a warning.

3. **VllmConfig vs base LlmConfig in practice**
   - What we know: Oracle AgentSpec supports multiple LlmConfig subtypes (`VllmConfig` with `model_id` and `url`). The base `LlmConfig` has only `name` and `default_generation_parameters`.
   - What's unclear: Which subtype the AIC consortium agents actually use in their YAML files.
   - Recommendation: Make the Zod schema permissive for `llm_config` initially (use `.passthrough()` or `z.unknown()` for subtype-specific fields), then tighten after inspecting real files.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` — does not exist yet (Wave 0 gap) |
| Quick run command | `npx vitest run src/lib/spec/ scripts/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | Valid AgentSpec YAML parses to AgentRecord without error | unit | `npx vitest run src/lib/spec/oracle-agentspec.test.ts` | Wave 0 |
| PIPE-01 | Malformed YAML (missing `name`, wrong `component_type`) produces Zod error with clear message | unit | `npx vitest run src/lib/spec/oracle-agentspec.test.ts` | Wave 0 |
| PIPE-02 | No AgentRecord field name matches any Oracle AgentSpec field name | unit | `npx vitest run src/lib/spec/types.test.ts` | Wave 0 |
| PIPE-03 | Running ingestion twice on same files produces identical row count and updated `last_ingested_at` | integration | `npx vitest run scripts/ingest.test.ts` | Wave 0 |
| PIPE-04 | `npm run build` script executes ingest step before `vite build` | smoke | manual `npm run build` verification | manual |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/spec/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — framework config; `environment: 'node'`, no jsdom needed for data pipeline tests
- [ ] `src/lib/spec/oracle-agentspec.test.ts` — covers PIPE-01: valid parse, malformed YAML, missing required fields, Zod error messages
- [ ] `src/lib/spec/types.test.ts` — covers PIPE-02: static assertion that no AgentRecord key appears in OracleAgentSpecSchema key set
- [ ] `scripts/ingest.test.ts` — covers PIPE-03: runs ingest twice against fixture YAMLs, asserts row count stability and `last_ingested_at` update
- [ ] `data/agents/fixtures/` — 2-3 sample AgentSpec YAML files used by tests; should cover: valid agent, agent with minimal fields, malformed agent

---

## Sources

### Primary (HIGH confidence)

- Oracle AgentSpec API Reference — `oracle.github.io/agent-spec/development/api/agent.html` — Agent class field names, types, and descriptions
- Oracle AgentSpec API Reference — `oracle.github.io/agent-spec/development/api/llmmodels.html` — LlmConfig and LlmGenerationConfig fields
- Oracle AgentSpec Reference Sheet — `oracle.github.io/agent-spec/development/misc/reference_sheet.html` — component structure summary
- npm registry — version verification for yaml, zod, better-sqlite3, drizzle-orm, drizzle-kit, tsx
- Zod v4 changelog — `zod.dev/v4/changelog` — breaking changes from v3 to v4 verified
- Drizzle ORM upsert guide — `orm.drizzle.team/docs/guides/upsert` — `.onConflictDoUpdate()` with `excluded` pattern

### Secondary (MEDIUM confidence)

- Drizzle ORM SQLite getting started — `orm.drizzle.team/docs/get-started-sqlite` — table definition patterns
- Vitest getting started — `vitest.dev/guide/` — config and test runner patterns
- WebSearch: Zod 4 migration breaking changes (verified against zod.dev/v4/changelog)

### Tertiary (LOW confidence)

- Oracle AgentSpec `metadata` key conventions for AIC consortium — INFERRED from spec structure; not verified against real AIC agent files. Must be confirmed before Plan 01-02 implementation.
- VllmConfig usage prevalence in AIC consortium agents — unknown; assume base LlmConfig until files are inspected.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — versions verified from npm registry; library APIs verified from official docs
- Oracle AgentSpec field structure: HIGH for base Agent and LlmConfig fields (verified from official API docs); LOW for consortium `metadata` conventions (not verified)
- Architecture: HIGH — adapter/shim pattern is well-established; Drizzle upsert pattern verified from official docs
- Pitfalls: HIGH for Zod v4 API (verified from changelog); HIGH for upsert pattern; MEDIUM for metadata convention gap

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable libraries; Oracle AgentSpec may add fields in minor releases)
