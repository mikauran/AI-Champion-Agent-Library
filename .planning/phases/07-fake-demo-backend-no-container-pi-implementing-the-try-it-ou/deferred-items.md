# Deferred Items

Out-of-scope discoveries logged during plan execution. Not fixed — logged only, per executor scope-boundary rule.

## 07-02: pre-existing `@testing-library/svelte` module resolution failure

- **Found during:** Plan 07-02, full-suite `npm test` verification step (unrelated to this plan's Task 1/Task 2 files).
- **Symptom:** 6 test files fail with `Error: Cannot find module '/@fs/.../node_modules/@testing-library/svelte/src/vitest.js'` — `src/lib/tryItOut.test.ts`, `src/lib/components/TryItOutPanel.test.ts`, `src/routes/agents/try-it-out.test.ts`, `src/lib/components/FilterBar.test.ts`, `src/lib/components/TechAccordion.test.ts`, `src/lib/components/CustomizationPanel.test.ts`.
- **Root cause:** `node_modules/@testing-library/` is entirely absent in this worktree's `node_modules`, even though `@testing-library/svelte` and `@testing-library/jest-dom` are listed in `package.json` devDependencies. Confirmed with `ls node_modules/@testing-library/` (no such directory). Pre-existing environment/install issue in this worktree, not caused by any file this plan touches (`data/agents/demo-rfi-triage.yaml`, `data/tryitout-prompts/demo-rfi-triage/*`, `scripts/set-try-it-out-mode.ts`, `scripts/set-try-it-out-mode.test.ts`, `.gitignore`).
- **Scope:** Out of scope for 07-02 — none of the failing test files are in this plan's `files_modified` list, and this plan's own new test (`scripts/set-try-it-out-mode.test.ts`) passes cleanly (4/4) along with all 48 other passing tests across the suite.
- **Action taken:** None — not fixed, not re-installed. Flagging for the orchestrator/next plan to run `npm install` (or otherwise reconcile this worktree's `node_modules`) before relying on the full Svelte-component test suite.
