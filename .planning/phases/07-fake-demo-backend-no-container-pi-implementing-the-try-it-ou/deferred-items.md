# Deferred Items — Phase 07

Out-of-scope discoveries logged during plan execution, per the executor's scope-boundary rule. Not fixed here.

## 07-01: Pre-existing `npx tsc --noEmit` errors (unrelated to this plan)

Found while running Task 3's `npx tsc --noEmit` acceptance check. All errors are in
`src/routes/catalog/+page.server.ts` and `src/routes/catalog/catalog.test.ts` (missing
`$lib/server/db.js` module resolution, implicit-any params, `PageData` type mismatches)
plus two pre-existing errors in `src/routes/agents/try-it-out.test.ts`. Confirmed
pre-existing by stashing this plan's changes (`git stash -u`) and re-running
`npx tsc --noEmit` — the identical error set appears with none of this plan's files
present. None of the errors reference `tryItOutModel.ts` or `tryItOutModel.test.ts`.

Out of scope for 07-01 (Model Probe and Constants Freeze) — left for whichever phase
next touches `src/routes/catalog/`.

## 07-01: Pre-existing `npm test` failure: `scripts/ingest.test.ts` (unrelated to this plan)

`npm test` shows 6 failing tests in `scripts/ingest.test.ts`, all with
`TypeError: Cannot open database because the directory does not exist` at
`new Database(TEST_DB)` — a missing `db/` (or equivalent tmp) directory in this
worktree's checkout, not something this plan's task touched. Confirmed
pre-existing: `git stash -u` (removing all of this plan's new/modified files)
then `npx vitest run scripts/ingest.test.ts` reproduces the identical 6
failures. All other 104 tests (11 of 12 test files, including the new
`src/lib/server/tryItOutModel.test.ts`) pass.

Out of scope for 07-01 — pre-existing environment/fixture issue in the ingest
test suite, unrelated to `tryItOutModel.ts`/`probe-openai-model.ts`.

## 07-02: pre-existing `@testing-library/svelte` module resolution failure

- **Found during:** Plan 07-02, full-suite `npm test` verification step (unrelated to this plan's Task 1/Task 2 files).
- **Symptom:** 6 test files fail with `Error: Cannot find module '/@fs/.../node_modules/@testing-library/svelte/src/vitest.js'` — `src/lib/tryItOut.test.ts`, `src/lib/components/TryItOutPanel.test.ts`, `src/routes/agents/try-it-out.test.ts`, `src/lib/components/FilterBar.test.ts`, `src/lib/components/TechAccordion.test.ts`, `src/lib/components/CustomizationPanel.test.ts`.
- **Root cause:** `node_modules/@testing-library/` is entirely absent in this worktree's `node_modules`, even though `@testing-library/svelte` and `@testing-library/jest-dom` are listed in `package.json` devDependencies. Confirmed with `ls node_modules/@testing-library/` (no such directory). Pre-existing environment/install issue in this worktree, not caused by any file this plan touches (`data/agents/demo-rfi-triage.yaml`, `data/tryitout-prompts/demo-rfi-triage/*`, `scripts/set-try-it-out-mode.ts`, `scripts/set-try-it-out-mode.test.ts`, `.gitignore`).
- **Scope:** Out of scope for 07-02 — none of the failing test files are in this plan's `files_modified` list, and this plan's own new test (`scripts/set-try-it-out-mode.test.ts`) passes cleanly (4/4) along with all 48 other passing tests across the suite.
- **Action taken:** None — not fixed, not re-installed. Flagging for the orchestrator/next plan to run `npm install` (or otherwise reconcile this worktree's `node_modules`) before relying on the full Svelte-component test suite. **Relevant to Wave 3/4 (07-04, 07-05):** those plans touch `TryItOutPanel.test.ts`/`tryItOut.test.ts` directly — verify `node_modules/@testing-library/` is present in their worktree before trusting a green full-suite run.
