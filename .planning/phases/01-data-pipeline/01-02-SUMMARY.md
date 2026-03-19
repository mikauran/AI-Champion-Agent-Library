---
phase: 01-data-pipeline
plan: 02
subsystem: database
tags: [drizzle-orm, better-sqlite3, drizzle-kit, sqlite, ingestion, upsert, yaml]

requires:
  - phase: 01-data-pipeline/01-01
    provides: detectFormat and normalize functions from src/lib/spec/index.ts, AgentRecord type from src/lib/spec/types.ts

provides:
  - Drizzle ORM agents table schema (drizzle/schema.ts) with AgentRow and NewAgentRow types
  - drizzle-kit configuration for SQLite at db/catalog.db
  - Idempotent ingestion script (scripts/ingest.ts) with upsert semantics keyed on slug
  - Integration test suite (scripts/ingest.test.ts) covering idempotency and field correctness
  - npm run build pipeline: db:push && ingest && echo placeholder

affects: [02-search, 03-ui, 04-deploy]

tech-stack:
  added: [better-sqlite3@12.8.0, drizzle-orm@0.45.1, drizzle-kit@0.31.10, "@types/better-sqlite3"]
  patterns:
    - Drizzle ORM upsert with onConflictDoUpdate keyed on slug primary key
    - excluded.* SQL template literals for all updated columns
    - Per-file try/catch with [SKIP] error logging and continuation
    - INGEST_DATA_DIR and INGEST_DB_PATH env var overrides with fallback defaults
    - TDD: failing tests committed before implementation

key-files:
  created:
    - drizzle/schema.ts
    - drizzle.config.ts
    - scripts/ingest.ts
    - scripts/ingest.test.ts
  modified:
    - package.json
    - tsconfig.json

key-decisions:
  - "Build script uses echo placeholder for vite build — SvelteKit scaffold deferred to Phase 2"
  - "Added baseUrl to tsconfig.json to fix drizzle-kit non-relative path error with paths config"
  - "Test setup creates agents table directly via raw SQL in beforeEach to avoid drizzle-kit dependency in tests"
  - "ingest() function is exported for testability; main guard (import.meta.url check) prevents auto-execution on import"

patterns-established:
  - "Pattern: Drizzle upsert — always use onConflictDoUpdate with excluded.* for idempotent ingestion"
  - "Pattern: Per-file error isolation — catch per file, log [SKIP], continue; never abort entire ingestion on single bad file"
  - "Pattern: Env var overrides — INGEST_DATA_DIR and INGEST_DB_PATH allow tests and CI to use different paths"

requirements-completed: [PIPE-03, PIPE-04]

duration: 6min
completed: 2026-03-19
---

# Phase 01 Plan 02: Drizzle ORM Schema and Idempotent SQLite Ingestion Pipeline Summary

**Drizzle ORM agents table, idempotent YAML-to-SQLite ingestion via excluded.* upsert, and npm run build pipeline wiring all AgentRecord fields**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-19T16:39:47Z
- **Completed:** 2026-03-19T16:45:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Drizzle schema defines agents table with all 16 AgentRecord columns mapped to correct SQLite types
- Ingestion script reads YAML files, validates via spec adapter, upserts using excluded.* SQL pattern — idempotent on repeated runs with updated timestamps
- 4 integration tests pass: malformed skipped (2 succeed, 1 fails), idempotency (same row count on re-run), timestamp update (last_ingested_at increases), field correctness (title, category, llm_name, tool count)
- Full test suite: 30 tests across 3 files, all green

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Drizzle ORM schema and configuration** - `b7191d4` (feat)
2. **Task 2 RED: Failing integration tests** - `fe29ff0` (test)
3. **Task 2 GREEN: Ingestion script implementation** - `0525216` (feat)

_Note: TDD task has separate test (RED) and implementation (GREEN) commits_

## Files Created/Modified

- `drizzle/schema.ts` - Drizzle agents table with 16 columns; exports AgentRow and NewAgentRow types
- `drizzle.config.ts` - Drizzle Kit config: sqlite dialect, db/catalog.db, migrations/ output
- `scripts/ingest.ts` - CLI and library: reads YAML, normalizes via spec adapter, upserts to SQLite
- `scripts/ingest.test.ts` - Integration tests: idempotency, timestamp update, field correctness, skip malformed
- `package.json` - Build script updated to placeholder (vite build deferred to Phase 2)
- `tsconfig.json` - Added baseUrl to fix drizzle-kit path resolution

## Decisions Made

- Build script uses `echo` placeholder instead of `vite build` — SvelteKit scaffold happens in Phase 2, not Phase 1
- Added `baseUrl: "."` to tsconfig.json — required for drizzle-kit to resolve non-relative paths when `paths` is configured
- Test setup creates agents table with raw SQL `CREATE TABLE IF NOT EXISTS` in beforeEach — avoids drizzle-kit dependency inside the test suite
- `ingest()` is exported as a named function; `if (isMain)` guard at module bottom allows both CLI execution and unit import

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added baseUrl to tsconfig.json for drizzle-kit compatibility**
- **Found during:** Task 1 (drizzle-kit push)
- **Issue:** drizzle-kit threw "Non-relative paths are not allowed when 'baseUrl' is not set" due to `paths` config in tsconfig.json
- **Fix:** Added `"baseUrl": "."` to tsconfig compilerOptions
- **Files modified:** tsconfig.json
- **Verification:** `npx drizzle-kit push` completed with "Changes applied"
- **Committed in:** b7191d4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix necessary for drizzle-kit to read the Drizzle schema. No scope creep.

## Issues Encountered

None beyond the tsconfig baseUrl fix documented above.

## User Setup Required

None - no external service configuration required. SQLite database is created locally via `npm run db:push`.

## Next Phase Readiness

- Data pipeline complete: YAML agent files flow through spec adapter into queryable SQLite database
- `npm run build` runs db:push + ingest in sequence without manual intervention
- db/catalog.db is gitignored (correct) — rebuilt on each deploy via build script
- Phase 2 (SvelteKit scaffold) can replace the echo placeholder in build script with `vite build`
- Phase 3 (search) can query the agents table using Drizzle ORM with AgentRow types

---
*Phase: 01-data-pipeline*
*Completed: 2026-03-19*
