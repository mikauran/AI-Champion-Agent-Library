# Deferred Items — Phase 07 Plan 01

Out-of-scope discoveries logged per the executor's scope-boundary rule. Not fixed here.

## Pre-existing `npx tsc --noEmit` errors (unrelated to this plan)

Found while running Task 3's `npx tsc --noEmit` acceptance check. All errors are in
`src/routes/catalog/+page.server.ts` and `src/routes/catalog/catalog.test.ts` (missing
`$lib/server/db.js` module resolution, implicit-any params, `PageData` type mismatches)
plus two pre-existing errors in `src/routes/agents/try-it-out.test.ts`. Confirmed
pre-existing by stashing this plan's changes (`git stash -u`) and re-running
`npx tsc --noEmit` — the identical error set appears with none of this plan's files
present. None of the errors reference `tryItOutModel.ts` or `tryItOutModel.test.ts`.

Out of scope for 07-01 (Model Probe and Constants Freeze) — left for whichever phase
next touches `src/routes/catalog/`.

## Pre-existing `npm test` failure: `scripts/ingest.test.ts` (unrelated to this plan)

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
