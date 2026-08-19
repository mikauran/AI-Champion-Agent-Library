---
phase: 06-runnable-try-it-out-flow-mock-backed
plan: 03
subsystem: ui
tags: [coverage-declaration, dev-db-staging, human-checkpoint]

requires:
  - phase: 06-runnable-try-it-out-flow-mock-backed
    provides: "06-01/06-02's complete TryItOutPanel.svelte (task textarea, file input, Run button, progress feed, Download results, Job failed block) and the frozen src/lib/tryItOut.ts mock client"
provides:
  - "COVERAGE.md — reasoned no-external-API declaration for the api-coverage detector false positive"
  - "Staged local dev DB: hvac-load-calculator=runnable, rfi-triage-assistant=external, all others=none"
affects: []

actuals:
  tokens: 0
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/06-runnable-try-it-out-flow-mock-backed/COVERAGE.md
  modified: []

key-decisions:
  - "COVERAGE.md written with only the required no-capability-matrix declaration content, per the plan's literal template — no fabricated auth/rate-limit sections"
  - "Dev DB re-staged via the exact Task 1 Part B UPDATE commands after npm run db:push + npm run ingest (both ran clean; ingest did not fail, so the plan's contingency note about a known Phase 5 ingest.test.ts regression did not need to be invoked here since only the ingest *script* was run, not the vitest suite)"
  - "Discovered and fixed an environmental issue (Rule 3 - blocking) unrelated to any plan file: a long-running dev server from a prior session (started 2026-08-18, PID 4996) held an open file descriptor to a deleted/replaced db/catalog.db inode and was serving stale data (tryItOutMode:none, lastIngestedAt from 2026-08-18) even after this plan's staging UPDATEs landed on disk. Killed the stale server and started a fresh npm run dev, confirmed via curl that http://localhost:5173 now serves the correct staged tryItOutMode for all three demo agents before presenting the checkpoint."

requirements-completed: []

coverage:
  - id: COVERAGE-DOC
    description: "COVERAGE.md exists, declares no external API integration, grep-verified"
    verification:
      - kind: other
        ref: "test -f COVERAGE.md && grep -q 'No external API integration' COVERAGE.md; grep -nE 'fetch\\(|EventSource|XMLHttpRequest|https?://' src/lib/tryItOut.ts returns no matches"
        status: pass
    human_judgment: false
  - id: DB-STAGING
    description: "Dev DB has one runnable agent (hvac-load-calculator) and the Phase 5 external example (rfi-triage-assistant) with a non-null URL"
    verification:
      - kind: other
        ref: "node -e select slug,try_it_out_mode,try_it_out_url from agents — confirmed hvac-load-calculator=runnable, rfi-triage-assistant=external+URL, all 5 others=none"
        status: pass
    human_judgment: false
  - id: SCOPE-LOCK
    description: "No changes under drizzle/, scripts/, src/lib/spec/, data/, db/ (db/ gitignored, mutated but not committed)"
    verification:
      - kind: other
        ref: "git status --porcelain | grep -E '^.. (drizzle/|scripts/|src/lib/spec/|data/|db/)' — no output"
        status: pass
    human_judgment: false
  - id: HUMAN-CHECKPOINT
    description: "A human runs the 10-step browser verification script and confirms both outcomes, both UI-SPEC backstop items, and Phase 5 regression-free behavior"
    verification:
      - kind: manual
        ref: "Checkpoint presented; awaiting human response (approved / defects)"
        status: pending
    human_judgment: true

duration: pending (checkpoint not yet resolved)
completed: pending
status: checkpoint-pending
---

# Phase 06 Plan 03: Coverage Declaration, Demo DB Staging, and Human Checkpoint Summary

**COVERAGE.md written and grep-verified, local dev DB staged with one `runnable` agent (`hvac-load-calculator`) and the Phase 5 `external` example (`rfi-triage-assistant`), a stale orphaned dev server replaced with a fresh one — checkpoint presented to the human, awaiting sign-off.**

## Status: IN PROGRESS — human checkpoint pending

This SUMMARY documents Task 1 (fully complete and committed) and the setup performed for Task 2's human-verification checkpoint (dev server prepared and confirmed serving correct data). Task 2 itself — the 10-step manual browser walkthrough — has NOT yet been approved by a human. This file will be updated/finalized by the continuation agent once the human responds "approved" or reports defects, per the plan's checkpoint protocol.

## Task 1: Write COVERAGE.md and stage a runnable agent in the dev DB — COMPLETE

### What was done
1. Ran all three prescribed greps against `src/lib/tryItOut.ts` (no `fetch`/`EventSource`/`XMLHttpRequest`/URL literal), confirming the declaration would be factually true before writing it.
2. Wrote `.planning/phases/06-runnable-try-it-out-flow-mock-backed/COVERAGE.md` verbatim per the plan's required template — verdict, why-the-detector-fired, evidence, the future-endpoints note, and the "when this changes" closing note. No capability matrix, auth section, or rate-limit table was fabricated.
3. Ran `npm run db:push` — applied the `try_it_out_*` columns (schema unchanged, confirmed via `PRAGMA table_info(agents)` before/after).
4. Ran `npm run ingest` — "Ingestion complete: 7 succeeded, 0 failed" (no ingest.test.ts regression was triggered — that pre-existing Phase 5 issue only affects the unexecuted vitest suite, not the ingest script itself, and the vitest suite was not run as part of this step).
5. Ran the exact staging UPDATE commands (see "Re-apply after DB reset" below) and confirmed via a read-only query.
6. Confirmed `git status --porcelain` shows no changes under `drizzle/`, `scripts/`, `src/lib/spec/`, or `data/` (D-15 scope lock held).

### Re-apply after DB reset

`db/` is gitignored. If `db/catalog.db` is ever reset/reingested, re-run exactly:

```bash
npm run db:push
npm run ingest
node -e "const D=require('better-sqlite3');const d=new D('db/catalog.db');d.prepare(\"UPDATE agents SET try_it_out_mode='runnable' WHERE slug='hvac-load-calculator'\").run();d.prepare(\"UPDATE agents SET try_it_out_mode='external', try_it_out_url='https://example.com/try/rfi-triage-assistant' WHERE slug='rfi-triage-assistant'\").run();d.close()"
```

Confirm with:
```bash
node -e "const D=require('better-sqlite3');const d=new D('db/catalog.db',{readonly:true});console.log(d.prepare('select slug,try_it_out_mode,try_it_out_url from agents order by slug').all())"
```

Expected: `hvac-load-calculator` -> `runnable`, `rfi-triage-assistant` -> `external` with the placeholder URL, all 5 remaining agents (`electrical-panel-scheduler`, `energy-model-data-sync`, `mep-scope-planner`, `mep-submittal-review-router`, `plumbing-fixture-unit-counter`) -> `none`.

### Task 1 Commit
- `adccc22` (docs) — `COVERAGE.md` created; dev DB staged (DB mutation not committed — `db/` is gitignored)

## Pre-checkpoint automation (Task 2 setup)

Before presenting the checkpoint, per the plan's "Automation is already complete — do NOT ask the human to do anything Claude can do":

1. **Automated baseline confirmed green:**
   - `npx vitest run src/lib/tryItOut.test.ts src/lib/components/TryItOutPanel.test.ts src/routes/agents/try-it-out.test.ts src/routes/agents/detail.test.ts` -> **4 files, 48 tests, 0 failures**.
   - `npx vite build` -> succeeded (client + server bundles built, no errors).
2. **Dev DB re-confirmed staged** (see Task 1 above) after `npm run db:push` + `npm run ingest` ran again as part of `npm run dev`'s startup script — the staged `try_it_out_mode` values survived re-ingestion (ingest's `onConflictDoUpdate` does not touch `try_it_out_*` columns, per the Phase 5 D-07 decision).
3. **Dev server started and verified.**

### Deviation: stale orphaned dev server (Rule 3 — blocking, auto-fixed)

**Found during:** Task 2 setup, verifying the dev server serves the newly staged data.

**Issue:** A `vite dev` process (PID 4996) had been running since 2026-08-18 (a prior session), bound to port 5173. `/proc/4996/fd` showed its open file handles to `db/catalog.db`, `db/catalog.db-shm`, and `db/catalog.db-wal` all marked `(deleted)` — the file had been unlinked and recreated (by an earlier `drizzle-kit push --force` or similar) since that server started, so the process held a stale, disconnected inode. `curl`-ing the runnable agent's page through this server returned `tryItOutMode:"none"` and `lastIngestedAt:"2026-08-18T10:17:32.017Z"`, even though a direct `better-sqlite3` read-only query against the actual on-disk file correctly showed `tryItOutMode:'runnable'` and today's `last_ingested_at`. This would have caused the human checkpoint to fail immediately at step 1 through no fault of any code in this phase.

**Fix:** Killed the stale process (and its parent shell), then started a fresh `npm run dev`. Confirmed via `curl` that `http://localhost:5173` now serves `tryItOutMode:"runnable"` for `hvac-load-calculator`, `tryItOutMode:"external"` + the correct URL for `rfi-triage-assistant`, and `tryItOutMode:"none"` for a third agent (`mep-scope-planner`), and that the runnable page's HTML contains the panel's "Try it out" / "Task" / "Attach a file" / "Run" markup.

**Files modified:** None — process management only, no source or config change.

**Verification:** `curl -s http://localhost:5173/agents/hvac-load-calculator` and `.../rfi-triage-assistant` and `.../mep-scope-planner`, each grepped for `tryItOutMode:"..."`, confirmed correct per-agent values.

## Checkpoint Presented

The human-verification checkpoint (Task 2, the 10-step browser walkthrough) has been presented. See the orchestrator/executor's "## CHECKPOINT" message for the exact steps, URLs (`http://localhost:5173/agents/hvac-load-calculator`, `http://localhost:5173/agents/rfi-triage-assistant`), and resume signal. This SUMMARY will be completed with the human's verdict per step (especially steps 6 and 7, the UI-SPEC overflow/long-text backstops), any defects found and how they were fixed or deferred, any scope-expansion follow-ups, and the closing runtime-swap note once the checkpoint resolves.

## Files Created/Modified (Task 1 only; Task 2 file changes, if any, will be added when the checkpoint resolves)
- `.planning/phases/06-runnable-try-it-out-flow-mock-backed/COVERAGE.md` (new) - reasoned no-external-API declaration

## Issues Encountered
- Stale orphaned dev server serving a deleted DB inode — see deviation above. Resolved before presenting the checkpoint; no code was broken or handed to the human in a bad state.

## User Setup Required
None yet — the human's only remaining action is to complete the browser checkpoint walkthrough and report the verdict.

---
*Phase: 06-runnable-try-it-out-flow-mock-backed*
*Status: checkpoint-pending as of 2026-08-19*
