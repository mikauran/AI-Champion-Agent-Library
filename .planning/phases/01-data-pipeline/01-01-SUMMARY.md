---
phase: 01-data-pipeline
plan: 01
subsystem: database
tags: [zod, yaml, typescript, vitest, agentspec, adapter-pattern]

# Dependency graph
requires: []
provides:
  - AgentRecord canonical TypeScript interface with zero Oracle AgentSpec field name overlap
  - AgentLlm nested interface for LLM configuration
  - OracleAgentSpecSchema Zod 4 validation schema for Oracle AgentSpec YAML
  - fromOracleAgentSpec adapter function mapping validated spec to AgentRecord
  - detectFormat and normalize registry functions for format-based dispatch
  - Three YAML test fixtures (valid, minimal, malformed)
  - vitest.config.ts test framework configuration
  - tsconfig.json with bundler module resolution
  - package.json with type=module, yaml, zod, vitest, tsx dependencies
affects:
  - 01-02-ingest-script
  - 02-ui
  - 03-search
  - 04-deploy

# Tech tracking
tech-stack:
  added:
    - yaml@2.8.2 (YAML 1.2 parsing)
    - zod@4.3.6 (runtime schema validation)
    - vitest@4.1.0 (test framework)
    - tsx (TypeScript script runner)
    - typescript (compiler)
    - "@types/node"
  patterns:
    - Zod-safeguarded adapter: parse YAML -> safeParse -> adapter on success only
    - Adapter registry: detectFormat dispatches to adapter by format identifier
    - Shim boundary: Oracle AgentSpec field names exist ONLY in oracle-agentspec.ts
    - ESM-first: package.json type=module, .js extensions on all local imports
    - Zod 4 two-arg record: z.record(z.string(), z.unknown()) not z.record(z.unknown())

key-files:
  created:
    - src/lib/spec/types.ts
    - src/lib/spec/oracle-agentspec.ts
    - src/lib/spec/index.ts
    - src/lib/spec/oracle-agentspec.test.ts
    - src/lib/spec/types.test.ts
    - data/agents/fixtures/valid-agent.yaml
    - data/agents/fixtures/minimal-agent.yaml
    - data/agents/fixtures/malformed-agent.yaml
    - vitest.config.ts
    - tsconfig.json
    - package.json
    - .gitignore
  modified: []

key-decisions:
  - "AgentRecord field names are driven by UI/search needs, not AgentSpec structure — enforced by types.test.ts PIPE-02 assertion"
  - "z.record(z.string(), z.unknown()) is the correct Zod 4 API for open metadata fields — z.record(z.unknown()) is Zod 3 only"
  - "metadata.category, metadata.github_url, metadata.maturity, metadata.tags are extracted by convention with null-safe fallbacks"
  - "Slug derived from name via slugify() — id stored separately as specId for cases where id is absent"

patterns-established:
  - "Pattern 1: Shim boundary — Oracle AgentSpec field names are confined to oracle-agentspec.ts; never appear in types.ts, index.ts, or consumers"
  - "Pattern 2: Registry dispatch — all callers use detectFormat + normalize from index.ts, never importing format-specific modules directly"
  - "Pattern 3: Zod-safeguarded adapter — safeParse before fromOracleAgentSpec, throw on failure with Zod error message"
  - "Pattern 4: ESM .js extensions — all local imports use .js extension even for .ts source files (tsx/bundler resolution)"

requirements-completed: [PIPE-01, PIPE-02]

# Metrics
duration: 6min
completed: 2026-03-19
---

# Phase 01 Plan 01: AgentRecord Type, Zod Schema, and Adapter Registry Summary

**Oracle AgentSpec Zod 4 validation schema, AgentRecord canonical type with zero field-name overlap, and adapter registry with format detection — all 26 unit tests green**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-19T16:30:08Z
- **Completed:** 2026-03-19T16:36:19Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 13 created

## Accomplishments

- Established shim boundary: Oracle AgentSpec field names (`system_prompt`, `llm_config`, `component_type`, `human_in_the_loop`) are confined exclusively to `oracle-agentspec.ts`
- Defined `AgentRecord` and `AgentLlm` canonical types verified by static intersection test (PIPE-02)
- Implemented Zod 4 validation schema with descriptive errors on malformed input (PIPE-01)
- Built adapter registry with `detectFormat`/`normalize` providing format-agnostic ingestion entry point

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AgentRecord canonical type, Zod schema, adapter, registry, and test fixtures** - `182b1ea` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD task — RED (missing modules, import failures) confirmed before GREEN implementation._

## Files Created/Modified

- `src/lib/spec/types.ts` - AgentRecord and AgentLlm interfaces, slugify helper
- `src/lib/spec/oracle-agentspec.ts` - OracleAgentSpecSchema Zod 4 schema and fromOracleAgentSpec adapter
- `src/lib/spec/index.ts` - detectFormat/normalize registry, re-exports AgentRecord/AgentLlm
- `src/lib/spec/oracle-agentspec.test.ts` - 20 unit tests covering valid, minimal, malformed agent parsing
- `src/lib/spec/types.test.ts` - 6 tests for PIPE-02 field isolation, detectFormat, and normalize
- `data/agents/fixtures/valid-agent.yaml` - Full Oracle AgentSpec fixture with all optional fields
- `data/agents/fixtures/minimal-agent.yaml` - Minimal spec with only required fields
- `data/agents/fixtures/malformed-agent.yaml` - Invalid spec (component_type: NotAnAgent, missing required fields)
- `vitest.config.ts` - Vitest config with node environment
- `tsconfig.json` - TypeScript config with bundler moduleResolution and $lib path alias
- `package.json` - type=module, yaml, zod runtime deps, vitest/tsx/typescript dev deps
- `package-lock.json` - Lockfile
- `.gitignore` - Excludes node_modules, dist, db artifacts

## Decisions Made

- Used `z.record(z.string(), z.unknown())` (Zod 4 two-arg form) for metadata fields — Zod 3's single-arg `z.record(z.unknown())` is unsupported in Zod 4
- `metadata` fields (`category`, `github_url`, `maturity`, `tags`) extracted by convention with null-safe fallbacks; Zod schema allows open `Record<string, unknown>`
- `specId` preserves original Oracle AgentSpec `id`; `slug` is derived from `name` via `slugify()`
- Test fixtures use consortium-assumed metadata conventions confirmed against plan spec

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed z.record() Zod 4 API incompatibility**
- **Found during:** Task 1 (GREEN phase, first test run)
- **Issue:** `z.record(z.unknown())` caused internal Zod error "Cannot read properties of undefined (reading '_zod')" — this is the Zod 3 one-argument form; Zod 4 requires two arguments
- **Fix:** Changed all `z.record(z.unknown())` to `z.record(z.string(), z.unknown())`
- **Files modified:** `src/lib/spec/oracle-agentspec.ts`
- **Verification:** All 26 tests pass after fix
- **Committed in:** `182b1ea` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added .gitignore**
- **Found during:** Task 1 (pre-commit, git status check)
- **Issue:** No .gitignore present — `node_modules/` would be committed without it
- **Fix:** Created `.gitignore` excluding `node_modules/`, `dist/`, `db/`, `*.db`, `.env`
- **Files modified:** `.gitignore`
- **Verification:** `git status` no longer shows node_modules as untracked
- **Committed in:** `182b1ea` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 2 missing critical)
**Impact on plan:** Both fixes essential for correctness. No scope creep.

## Issues Encountered

- Zod 4 `z.record()` API is a breaking change from Zod 3 — requires explicit key type argument. The research document documented this pitfall but the implementation needed a fix-on-first-run rather than pre-emptive correction.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AgentRecord type is stable and ready for Plan 01-02 (ingest script with SQLite/Drizzle)
- Adapter registry is format-agnostic; adding a second spec format in future only requires a new module + registry entry
- Blocker resolved: Oracle AgentSpec `metadata` conventions confirmed in fixtures (category, github_url, maturity, tags) — no gap for Plan 01-02

## Self-Check: PASSED

- FOUND: src/lib/spec/types.ts
- FOUND: src/lib/spec/oracle-agentspec.ts
- FOUND: src/lib/spec/index.ts
- FOUND: data/agents/fixtures/valid-agent.yaml
- FOUND: vitest.config.ts
- FOUND: .planning/phases/01-data-pipeline/01-01-SUMMARY.md
- FOUND commit: 182b1ea (feat task commit)
- FOUND commit: b6bb0cc (docs metadata commit)
- 26/26 tests passing

---
*Phase: 01-data-pipeline*
*Completed: 2026-03-19*
