---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 06
current_phase_name: Runnable Try It Out Flow (mock-backed)
status: ready_for_verification
stopped_at: Completed 05-02-PLAN.md — Phase 5 complete (human checkpoint approved)
last_updated: "2026-08-19T14:18:09.281Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 11
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** Tech evaluators and executives can find the right AI agent for their use case within seconds — through semantic search or category browsing — and understand what it does, how it works, and how to get it.
**Current focus:** Phase 05 — add-an-optional-try-it-out-field-to-the-agent-catalog-shape

## Current Position

Phase: 06 — Runnable Try It Out Flow (mock-backed)
Plan: Not started

## Performance Metrics

**Velocity:**

- Total plans completed: 5
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 06 | 3 | - | - |
| 05 | 2 | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 01-data-pipeline P01 | 6 | 1 tasks | 13 files |
| Phase 01-data-pipeline P02 | 6min | 2 tasks | 6 files |
| Phase 02 P02 | 4 | 2 tasks | 7 files |
| Phase 02 P03 | 4min | 1 tasks | 8 files |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 06 P01 | 5min | 3 tasks | 6 files |
| Phase 06 P02 | 4min | 3 tasks | 2 files |
| Phase 06 P03 | 16min | 2 tasks | 1 files |
| Phase 05 P02 | 10min | 3 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: Oracle AgentSpec is the canonical source format; shim/adapter layer is mandatory before any UI work
- [Pre-Phase 1]: In-memory/SQLite search — no external vector DB at ~300 agents
- [Pre-Phase 1]: v1 = public catalog only, no auth, no deployment
- [Phase 01-01]: AgentRecord field names are driven by UI/search needs, not AgentSpec structure — enforced by types.test.ts PIPE-02 assertion
- [Phase 01-01]: z.record(z.string(), z.unknown()) is the correct Zod 4 API for open metadata fields — z.record(z.unknown()) is Zod 3 only
- [Phase 01-01]: Shim boundary: Oracle AgentSpec field names confined to oracle-agentspec.ts; never appear in consumers
- [Phase 01-02]: Build script uses echo placeholder for vite build — SvelteKit scaffold deferred to Phase 2
- [Phase 01-02]: Added baseUrl to tsconfig.json to fix drizzle-kit path resolution with paths config
- [Phase 01-02]: Drizzle upsert pattern: onConflictDoUpdate with excluded.* SQL templates — never plain INSERT for idempotent ingestion
- [Phase 02-01]: svelte.config.js not .ts — Node.js ESM loader cannot load .ts; SvelteKit requires .js extension for config
- [Phase 02-01]: Manual SvelteKit scaffold (deps + files) over npx sv create — interactive CLI blocked automation
- [Phase 02-01]: Kept baseUrl in tsconfig.json — required for drizzle-kit; SvelteKit warning is non-blocking
- [Phase 02-01]: Tailwind CSS v4 via @tailwindcss/vite plugin — no postcss config needed
- [Phase 02-02]: Client-side $derived.by() filtering avoids server round-trips; goto() replaceState:true updates URL for shareability
- [Phase 02-02]: vi.mock() with call counter for Drizzle chain mocking — two db.select() calls per load function need different return values
- [Phase 02-03]: svelteTesting() vite plugin required alongside sveltekit() for @testing-library/svelte to use browser Svelte (not SSR) in jsdom tests
- [Phase 02-03]: vitest.config.ts needs sveltekit() plugin to resolve $lib alias and transform .svelte files in tests
- [Phase 02-03]: Native <details>/<summary> for TechAccordion — no JS library, keyboard accessible by default, collapsed with no open attribute
- [Phase 06-01]: advanceTimersByTimeAsync + tick (imported from svelte) works cleanly for Svelte 5 rune components under vitest fake timers — no real-timer waitFor fallback needed
- [Phase 06-01]: Shipped exact contract regex /(^|\W)fail(\W|$)/i verbatim per D-06's authoritative clause; 'failure'/'failing' correctly do NOT trigger the fail path (D-06 prose was wrong on this point)
- [Phase 06]: Auto-scroll observation: Object.defineProperty accessor-pair recorder for scrollTop chosen directly over vi.spyOn(el, prop, 'set') for jsdom compatibility
- [Phase 06]: Cleanup-assertion variant: vi.getTimerCount() under fake timers worked cleanly with unmount(); no real-timer clearTimeout-spy fallback needed
- [Phase 06]: Task 3 required no production fix — 06-01's unsubscribe-on-terminal/unsubscribe-on-destroy logic already passed all four cleanup tests
- [Phase 06]: [Phase 06-03]: COVERAGE.md declares no external API integration (grep-verified); the future runtime phase owns the real API coverage matrix
- [Phase 06]: [Phase 06-03]: Human checkpoint approved all 10 verification steps with no defects, including both UI-SPEC backstop items (overflow, long-text) -- Phase 6 complete
- [Phase 05]: 05-02: flattenRecord() writes literal try_it_out defaults; onConflictDoUpdate deliberately omits the three try_it_out columns so re-ingestion never clobbers a manually-set value (D-06/D-07)
- [Phase 05]: 05-02: User decision — hvac-load-calculator stays try_it_out_mode='runnable' in the dev DB (not reset to 'none') so Phase 6's working TryItOutPanel demo remains live

### Pending Todos

None yet.

### Blockers/Concerns

- Oracle AgentSpec field structure not directly inspected — must obtain actual spec files or schema before implementing PIPE-01/PIPE-02 (research gap flagged)
- Embedding model selection (all-MiniLM-L6-v2 recommended) needs validation against real agent descriptions before Phase 3 commits to it

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260819-nsi | Hide the existing Try It Out panel behind a collapsible arrow control on the runnable agent detail page; clicking reveals it inline below the control. No changes to TryItOutPanel.svelte or tryItOut.ts. | 2026-08-19 | e5e4157 | [260819-nsi-hide-the-existing-try-it-out-panel-behin](./quick/260819-nsi-hide-the-existing-try-it-out-panel-behin/) |

### Roadmap Evolution

- Phase 5 added: Try It Out Field — optional try_it_out mode (none|external|runnable) on agent records, threaded through schema/ingest/detail page
- Phase 6 added: Runnable Try It Out Flow (mock-backed) — src/lib/tryItOut.ts (submitJob/subscribeProgress/downloadArtifact) + TryItOutPanel.svelte, shaped to docs/job-api-contract.md, no real backend
- Phase 7 added: No-Container Demo Backend for Try It Out — real (but no-Docker/no-pi) SvelteKit server routes that call an LLM with the agent's base prompt + skill.md, replacing tryItOut.ts's mock with real fetch() calls; UI unchanged

## Session Continuity

Last session: 2026-08-19T17:18:00.000Z
Stopped at: Completed quick task 260819-nsi: Hide the existing Try It Out panel behind a collapsible arrow control
Resume file: .planning/quick/260819-nsi-hide-the-existing-try-it-out-panel-behin/260819-nsi-SUMMARY.md
