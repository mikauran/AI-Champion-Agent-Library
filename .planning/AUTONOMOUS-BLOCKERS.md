# Autonomous blockers

- B-001 (non-blocking, watch) - Phase 2.2 merge: one vitest test failed once on the first `npm run check` after merging (1 of 426), then passed in 4 consecutive reruns. Failing test name was not captured. Possible timing/contention flake (scale tests or tryItOut). If it recurs, capture with `npx vitest run 2>&1 | grep FAIL`.
- B-001 resolved: the recurring load flake (jobs.test.ts 409 + occasional jsdom/axe 5s timeouts) was fixed by generous vitest timeouts (see decision log).
