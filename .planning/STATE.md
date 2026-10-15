---
gsd_state_version: "1.0"
milestone: v1.0
current_phase: 21
current_phase_name: Generator Stage 0
status: human_verification_pending
stopped_at: Phases 1-20 recorded; Phase 2 only needs human checkpoint 02-04; Phases 21-23 planned, not started; .planning made GSD-conformant 2026-10-14
last_updated: "2026-10-14T00:00:00.000Z"
last_activity: 2026-10-14
last_activity_desc: Recorded phases 16-20 (executed outside the GSD flow), planned phases 21-23, planning docs audited and synced
progress:
  total_phases: 25
  completed_phases: 21
  total_plans: 75
  completed_plans: 74
  percent: 99
milestone_name: milestone
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-14)

**Core value:** Tech evaluators and executives can find the right AI agent for their use case within seconds — through semantic search or category browsing — and understand what it does, how it works, and how to get it.
**Current focus:** Phases 1-20 are built and recorded (16-20 were executed outside the normal GSD flow, with SUMMARY and VERIFICATION files but no PLAN files). Next planned work: Phase 21 Generator Stage 0, Phase 22 Proposal Layer Follow-ups, Phase 23 Code Review of New Generator Code. Many human checks are pending: see "Pending on Ville".

## Current Position

Phase: 21 (Generator Stage 0) is the next phase to plan; Phases 21-23 are planned, not started. Of the 25 roadmap phases, 21 are built (1, 2.1, 2.2, 3-20); Phase 2 is the only earlier phase not closed (human checkpoint 02-04).
Plan: 02-04 (human checkpoint) not executed, not faked. Phases 21-23 have no PLAN files yet.
Status: Verification per phase: `passed` for 1, 2.1, 2.2, 5, 6, 7, 8, 12, 20; `human_needed` for 3, 4, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19 (automated evidence complete; browser, live-container, paid-key and real-service checks pending); Phase 2 has no VERIFICATION file (pending its checkpoint).
Final verified numbers on main (2026-10-14, after the last merge): `npm run check` (svelte-kit sync, tsc, vitest) twice exit 0: 269 test files passed (1 skipped), 3072 tests passed (1 skipped); `SEARCH_EMBEDDINGS=off npx vite build` exit 0; `npm run smoke` 104/104 (8 flag configurations). Generated packages' own pytest pass on FastMCP 3.4.8 and 4.1.0 (counts in `18-VERIFICATION.md`).
Last activity: 2026-10-14, phases 16-20 recorded, phases 21-23 planned, `.planning` audited.
Progress note: Phase 24 plans 24-01..24-03 executed on worktree branch; `npm run check` 2 failing golden ingest tests (B-004), see 24-VERIFICATION.md.

Progress: [##########] 74/75 planned plans (the missing plan is 02-04, pending human); phases 16-20 have no plans by design.

## Missing / Open Work

- **Phase 2: only 02-04 remains (pending human).** Do not mark Phase 2 complete until it runs or is waived (D-001). 02-04-PLAN.md has no SUMMARY.md (health I001, expected).
- **Pending human items** are consolidated in "Pending on Ville" below; per-phase lists are the `*-HUMAN-UAT.md` files and `docs/human-verification-guide.md`.
- **Planned phases:** 21 Generator Stage 0 (description cleanup, tool annotations, outputSchema/structuredContent, deterministic order; goldens will churn), 22 Proposal Layer Follow-ups, 23 Code Review of New Generator Code. See ROADMAP.md.
- **Deferred v2 (no phase):** GraphQL (introspection JSON only), core POST-for-reads transport, gRPC/OpenRPC (REQUIREMENTS CUST-04..CUST-06).
- **Known health items (`/gsd:health`):** W009 for Phases 12 and 15 (RESEARCH.md has a Validation Architecture but no VALIDATION.md; not fabricated); W019 for the five non-canonical `AUTONOMOUS-*.md` root files (referenced by many docs and tests; not moved).
- **Non-registry directory:** `.planning/exploration/` (notes E1..E14 for Phases 16-20; referenced, not moved).
- Run-time facts that are still unknown: real MCP calls against a live OData service; OData with filter/split proposal ops; the `auth_failure` wrong-key relaunch ERROR inside the container (unanalysed, Phase 18).

## Performance Metrics

**Velocity:**

- Total plans completed (timed rows below, up to Phase 8): 15; all phases: 74 of 75
- Average duration: ~11 min
- Total execution time: ~2.7 hours

**By Phase:**

| Phase | Plans | Total Duration | Avg/Plan |
|-------|-------|-----------------|----------|
| 01 — Data Pipeline | 2/2 | 12 min | 6 min |
| 02 — Catalog and Detail | 3/4 | 14 min | ~4.7 min |
| 05 — Try It Out Field | 2/2 | ~25 min | ~12.5 min |
| 06 — Runnable Try It Out Flow (mock) | 3/3 | 25 min | ~8.3 min |
| 07 — No-Container Demo Backend | 5/5 | ~88 min | ~17.6 min |

Phases 8 onward (and the inserted and autonomous-run phases) are not timed here; plan counts per phase: 08: 8/8, 09: 4/4, 10: 3/3, 11: 2/2, 12: 3/3, 13: 9/9, 14: 7/7, 15: 13/13, 2.1: 2/2, 2.2: 2/2, 03: 5/5, 04: 1/1.

**Recent Trend:**

- Last 5 plans (07-01 → 07-05): 16min, 6min, 20min, 24min, ~22min
- Trend: Stable-to-increasing — later Phase 7 plans (server routes, live-API wiring) took longer than the earlier scaffolding/preflight plans, consistent with increasing integration surface per plan.

**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 01-01 | 6 min | 1 | 13 |
| 01-02 | 6 min | 2 | 6 |
| 02-01 | 6 min | 3 | 18 |
| 02-02 | 4 min | 2 | 7 |
| 02-03 | 4 min | 1 | 8 |
| 05-01 | ~15 min | 2 | 4 |
| 05-02 | 10 min | 3 | 2 |
| 06-01 | 5 min | 3 | 6 |
| 06-02 | 4 min | 3 | 2 |
| 06-03 | 16 min | 2 | 1 |
| 07-01 | 16 min | 4 | 6 |
| 07-02 | 6 min | 2 | 6 |
| 07-03 | 20 min | 3 | 7 |
| 07-04 | 24 min | 3 | 9 |
| 07-05 | ~22 min | 3 | 5 |
| Phase 08 P01 | 10 min | 2 tasks | 10 files |
| Phase 08 P03 | 6 min | 3 tasks | 6 files |
| Phase 08 P04 | 8 min | 2 tasks | 10 files |
| Phase 08 P05 | 20 min | 3 tasks | 6 files |
| Phase 08 P06 | 25 min | 3 tasks | 6 files |
| Phase 08 P07 | 6 min | 2 tasks | 5 files |

*Updated after each plan completion. 02-04 has no row — it was never executed (see "Missing / Open Work").*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Autonomous-run decisions (D-001 onward, each with revert steps) are in `.planning/AUTONOMOUS-DECISIONS.md`.
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
- [Phase 05]: 05-02: flattenRecord() writes literal try_it_out defaults; onConflictDoUpdate deliberately omits the three try_it_out columns so re-ingestion never clobbers a manually-set value (D-06/D-07)
- [Phase 05]: 05-02: User decision — hvac-load-calculator stays try_it_out_mode='runnable' in the dev DB (not reset to 'none') so Phase 6's working TryItOutPanel demo remains live
- [Phase 06-01]: advanceTimersByTimeAsync + tick (imported from svelte) works cleanly for Svelte 5 rune components under vitest fake timers — no real-timer waitFor fallback needed
- [Phase 06-01]: Shipped exact contract regex /(^|\W)fail(\W|$)/i verbatim per D-06's authoritative clause; 'failure'/'failing' correctly do NOT trigger the fail path (D-06 prose was wrong on this point)
- [Phase 06]: Auto-scroll observation: Object.defineProperty accessor-pair recorder for scrollTop chosen directly over vi.spyOn(el, prop, 'set') for jsdom compatibility
- [Phase 06]: Cleanup-assertion variant: vi.getTimerCount() under fake timers worked cleanly with unmount(); no real-timer clearTimeout-spy fallback needed
- [Phase 06]: Task 3 required no production fix — 06-01's unsubscribe-on-terminal/unsubscribe-on-destroy logic already passed all four cleanup tests
- [Phase 06-03]: COVERAGE.md declares no external API integration (grep-verified); the future runtime phase owns the real API coverage matrix
- [Phase 06-03]: Human checkpoint approved all 10 verification steps with no defects, including both UI-SPEC backstop items (overflow, long-text) — Phase 6 complete
- [Phase 07-01]: `gpt-4.1-mini` at `temperature: 0.2` chosen as the single fixed model/temperature pair after a live `models.list()` + temperature probe against the deployed key (MODEL-PROBE.md); no fallback branch needed
- [Phase 07-02]: `demo-rfi-triage` flipped to `try_it_out_mode: 'runnable'`, `hvac-load-calculator` reverted to `'none'` via the existing one-off `scripts/set-try-it-out-mode.ts` (D-13 pattern, never via ingest)
- [Phase 07-04]: POST handler captures `job.status` immediately after `createJob` (before firing the fire-and-forget `runJob`) — reading it after would observe `'running'`, not the SC-01-mandated `'queued'`, since `runJob`'s first statement runs synchronously before its first `await`
- [Phase 07-05]: `writeJobIdToUrl`/`clearJobIdFromUrl` kept synchronous per the frozen `?job=` helper signatures by importing `$app/navigation`'s `replaceState` statically and wrapping only the call site in try/catch (never the import) — preserves SSR/router-optional safety without forcing an async signature
- [Phase 07-05]: `fakeJobApi.ts`'s test-stub jobId generation switched from an arbitrary `"fake-job-N"` string to `crypto.randomUUID()` to match the real backend's actual ID scheme — required for the UUID-validated `?job=` write path to be testable at all
- [Post-Phase 7 housekeeping]: Fixed a latent bug in `.claude/get-shit-done/bin/lib/state.cjs`'s `cmdStateUpdateProgress` — its plain `Progress:` regex was unanchored to the document body and could match this file's own YAML frontmatter `progress:` key, clobbering it on write. Now scoped to the body only.
- [Phase 08]: Runtime exec drains demuxed streams before reading exit code; builtin networks treated non-internal for egress guard — Avoid lost output; enforce D-19 uniformly

### Pending Todos

None yet.

### Blockers/Concerns

- B-001 (test flake) and B-002 (build failure on route-module exports) are resolved; B-003 (intermittent `jobs.test.ts` 409) is likely fixed (root cause found, D-443; unproven because the failure was intermittent; reopen if it recurs). Full list: `.planning/AUTONOMOUS-BLOCKERS.md`.
- Phase 2's 02-04 human-verification checkpoint was never executed; Phase 2 cannot be marked fully complete until it runs (or is explicitly waived).
- RETIRED: "Oracle AgentSpec field structure not inspected", "embedding model validation before Phase 3" (real-model run done in Phase 18, MiniLM kept), and the `fastmcp` pin concern (verified live, D-479).
- The new generator code (Phases 19-20) has had no code review yet: Phase 23.
- This machine has 3.7 GB RAM: do not run Podman checks alongside heavy agents or full test runs.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260819-nsi | Hide the existing Try It Out panel behind a collapsible arrow control on the runnable agent detail page; clicking reveals it inline below the control. No changes to TryItOutPanel.svelte or tryItOut.ts. | 2026-08-19 | e5e4157 | [260819-nsi-hide-the-existing-try-it-out-panel-behin](./quick/260819-nsi-hide-the-existing-try-it-out-panel-behin/) |

### Roadmap Evolution

- Phase 5 added: Try It Out Field — optional try_it_out mode (none|external|runnable) on agent records, threaded through schema/ingest/detail page
- Phase 6 added: Runnable Try It Out Flow (mock-backed) — src/lib/tryItOut.ts (submitJob/subscribeProgress/downloadArtifact) + TryItOutPanel.svelte, shaped to docs/job-api-contract.md, no real backend
- Phase 7 added: No-Container Demo Backend for Try It Out — real (but no-Docker/no-pi) SvelteKit server routes that call an LLM with the agent's base prompt + skill.md, replacing tryItOut.ts's mock with real fetch() calls; UI unchanged
- Phase 8 added: Container-backed Try It Out (warm on visit) — when a user opens an agent page, warm a container with Pi and that agent's skill; Try It Out runs in it behind the existing job API. Inspired by GAISE26_tool_building_pi_agents (idea only, not code). Delegated by Jussi.
- Phases 2.1 and 2.2 inserted (2026-10-12, autonomous run planning): Green Baseline (fix 22 tsc errors and 3 failing tests) and Scale and Seed Data (synthetic 150-agent fixtures); both run before Phase 3
- Phases 9-11 added: Try It Out Hardening (adversarial review + chaos tests of Phase 8 code), Accessibility (UI-03), Related Agents (DISC-01)
- Phases 12-13 added: Agent Types and Intake Research (taxonomy, capability matrix, intake guide), then Multi-Agent and Multi-Format Hosting behind a feature flag
- Phases 14-15 added: MCP Generator (research synthesis first; DB schema/CUST-02 is one adapter) and MCP Test Platform (ports the benchmark harness from ~/projects/mcp-gen-comparison); both flagged, default off
- Phase 2.1 and 2.2 done (D-005, D-007); Phases 3, 4, 9, 10, 11 built by the autonomous run; Phases 12-15 built (12 docs only; 13-15 behind flags `AGENT_KINDS`, `MCP_GENERATOR`, `MCP_TESTER`, all default off). Post-queue review/fix passes for 13, 14, 15 (D-200..D-259).
- Phases 5, 6, and 7 together form one continuous "Try It Out" initiative, executed as a self-contained branch off Phase 2 — independent of, and completed ahead of, Phases 3 and 4.

- Phases 16-20 added after the fact (2026-10-14) and **executed outside the normal GSD flow**: the work was done by directly launched agents (reviewers, fixers, exploration agents in worktrees, a human-supervised live session) under an autonomous run and then at Ville's decisions, so there is no discuss/plan/execute cycle and no PLAN files by design; each phase has `NN-01-SUMMARY.md` (marked `execution: outside-gsd-flow`) and `NN-VERIFICATION.md`, and the exploration notes remain in `.planning/exploration/`. 16 Review and Hardening Pass, 17 Optional UI Features (flagged), 18 Live Verification and Container-Path Fixes, 19 Generator Input Kinds, 20 Proposal Layer and Context Pack.
- Phases 21-23 added (2026-10-14, planned, not started): 21 Generator Stage 0, 22 Proposal Layer Follow-ups, 23 Code Review of New Generator Code.

## Session Continuity

Last session: 2026-10-14 (documentation sync; `.planning` made GSD-conformant; pause handoff written by the orchestrator)
Stopped at: all work committed on `autonomous/overnight-improvements`; nothing pushed; no phase in progress
Resume file: None (see `.continue-here.md` if the orchestrator's pause-work created one)

**How to resume:** run `/gsd:resume-work`. Read order: this file (STATE.md, especially "Pending on Ville"), ROADMAP.md (Progress table and Phases 21-23), `.planning/v1.0-MILESTONE-AUDIT.md`, the index at the top of `.planning/AUTONOMOUS-DECISIONS.md`, `.planning/AUTONOMOUS-BLOCKERS.md`, `docs/human-verification-guide.md`. Then pick: do the human checks, or `/gsd:discuss-phase 21`.

## Deferred Verification

| Phase | State | Resume |
|-------|-------|--------|
| 2 | checkpoint 02-04 pending human | execute `.planning/phases/02-catalog-and-detail/02-04-PLAN.md` |
| 3 | verification_deferred_human | /gsd-verify-work 3 (`03-HUMAN-UAT.md`) |
| 4 | verification_deferred_human | /gsd-verify-work 4 (`04-HUMAN-UAT.md`) |
| 9 | verification_deferred_human | /gsd-verify-work 9 (`09-HUMAN-UAT.md`) |
| 10 | verification_deferred_human | /gsd-verify-work 10 (`10-HUMAN-UAT.md`) |
| 11 | verification_deferred_human | /gsd-verify-work 11 (`11-HUMAN-UAT.md`) |
| 13 | verification_deferred_human | /gsd-verify-work 13 (`13-HUMAN-UAT.md`) |
| 14 | verification_deferred_human | /gsd-verify-work 14 (`14-HUMAN-UAT.md`) |
| 15 | verification_deferred_human | /gsd-verify-work 15 (pending-human list: `.planning/phases/15-mcp-test-platform-flagged/15-HUMAN-UAT.md`; decisions D-164..D-181 in AUTONOMOUS-DECISIONS.md) |
| 16 | verification_deferred_human | `16-VERIFICATION.md`: `/health` 503, error-page reference id and 401 `{message}` with `AUTH_ENABLED=true` (guide) |
| 17 | verification_deferred_human | `17-VERIFICATION.md`: browser checks of spec viewer, compare and dark mode (guide sections 6-7) |
| 18 | verification_deferred_human | `18-VERIFICATION.md`: check 7 (paid key), check 9 re-run, cancel path, `/catalog` UI (guide section 8) |
| 19 | verification_deferred_human | `19-VERIFICATION.md`: no live OData service run; code review is Phase 23 |
| 20 | passed | `20-VERIFICATION.md`; real proposal review and side-by-side run are Phase 22 |

## Pending on Ville

Environment constraint: this machine has 3.7 GB RAM. Do not run Podman checks alongside heavy agents or a full test run.

**Live and paid checks**
1. **Check 7** (Phase 9): the budget run with a real, paid OpenAI key (needs your key and budget). `09-HUMAN-UAT.md`.
2. **Re-run Phase 9 check 9** (compose down), after the wording fix. `docs/human-verification-guide.md` section 8.
3. **Phase 15 browser, cancel and auth-enabled items**: `15-HUMAN-UAT.md` (cancel path, sweep-vs-run-in-flight, `AUTH_ENABLED=true` 401 on `/api/mcp-generate` and `/api/mcp-test/*`).
4. **Phase 15 container run**: steps in `docs/human-verification-guide.md` section 8 ("Phase 15 container run"); includes the unanalysed `auth_failure` ERROR inside the container.

**Browser checks** (`docs/human-verification-guide.md`, sections 1-7): Phase 2 checkpoint **02-04** (the only thing blocking Phase 2); Phase 3 `/catalog` UI items 3 and 4 (`03-HUMAN-UAT.md`); Phase 4 Customize menu; Phase 10 keyboard/screen-reader/zoom/contrast; Phase 11 related agents; Phase 13 system detail and Type filter; Phase 14 Generate MCP panel and zip; Phase 17 spec viewer, compare and dark mode; flags-off check.

**Still-unanswered questions** (from AUTONOMOUS-SUMMARY "Questions for Ville", minus everything answered by decisions D-445, D-460..D-479; the defaults apply until you answer):
- Phase 10: control borders now use gray-500; is the darker look acceptable?
- Should job-route 404 messages stop echoing the id?
- Phase 12 question 4: which frameworks do AIC authors actually use (a survey of the 100+ agents would re-weight the adapter ranking)?
- Phase 14 questions 6 and 8: ask the study author why openapi-mcp-generator scored 0 of 5 and whether the `combined` arm was benchmarked; the reference repos had uncommitted changes when the synthesis was written.
- Phase 15 question 6: are the re-authored synthetic Acme cases faithful enough to the study's case structure?
- Phase 15 question 8: real partner profile text for the profile case (never to be committed) and who owns the runner image tag.
- Phase 15 question 9: calibration runs against the study's legacy arms? Question 10: should uploaded servers ever be run (default: no, only fake variants and generator samples)?
- Phase 14 question 1 (zip download vs platform-hosted output) and the tabular 5-row limit were covered by D-478 (all remaining defaults confirmed).

**Next planned work (needs a go from you):** Phases 21, 22, 23 (ROADMAP.md). Phase 22 starts with a first real proposal from an agent session for you to review.


## Autonomous run 2026-10-14 (phases 24-30, then 21-23)

Order: 24 -> 30, then 21 -> 23. Cap: $0.50 per agent run, $10 total.

### Spend log (OpenAI real-model runs)
| Run | Agent | Est. cost USD | Running total |
|-----|-------|---------------|---------------|

### Progress
- Phase 24: done, verification passed (3099 tests). Inventory: 0 full, 2 partial (RFI generation, Cut-sheet QA), 10 missing. 3 MCP-server entries added.
- Phase 25 / Agent 1 ETIM & classification repair: COUNTED (live run job ca984d20…, gpt-4.1-mini, 10568 tokens, ~$0.017). Spend total so far ~$0.045 (see .planning/spend-log.md). Harness: scripts/tryout-run.ts, procedure docs/tryitout-live-run.md.
- Phase 25 / Agent 2 QTO normalization: COUNTED (job af4663e3…, 11384 tokens, ~$0.018; run 1 failed rubric, SKILL revised). Running spend ~$0.08.
- Phase 25 / Agent 3 Clash prioritization: ATTEMPTED, NOT COUNTED (3 live runs failed rubric: lost clash id, mis-ranking; ~$0.057). Entry exists in data/agents. RETRY LATER (blocker B-clash): simplify the step (e.g. model only clusters, or split input) once other agents are done. Release (Phase 30) must decide whether non-counted entries ship / count them. Running spend ~$0.14.
- Phase 25 COMPLETE: 4/4 agents counted (agent 3 passed after redesign; run 5 job 1aa6f1be…). Agent 4 RFI generation counted (job a5ef49db…). Spend total ~$0.20 of $10. Next: Phase 26 (agents 5-7).
- Phase 26 / Agent 5 Product sourcing: COUNTED on third attempt (scoped to 6 lines x 6 rows, job 41f820ae; earlier 12 x 13 attempts failed). Limit recorded as G-037.
- Phase 26 / Agent 6 Quote comparison: COUNTED (job eaee09d8…, ~$0.025). Spend ~$0.32.
- Phase 26 COMPLETE: agents 5 (scoped, 1/3 runs passed), 6, 7 counted. Next: Phase 27 (agents 8, 9).
- Phase 27 / Agent 8 Cut-sheet QA: COUNTED (job fb46b86d…, first run).
- Phase 27 COMPLETE: agents 8, 9 counted (first run each). Next: Phase 28 (agents 10-12).
- Phase 28 / Agent 10 D2 code validation: COUNTED (job 2231091f…, rev 1).
