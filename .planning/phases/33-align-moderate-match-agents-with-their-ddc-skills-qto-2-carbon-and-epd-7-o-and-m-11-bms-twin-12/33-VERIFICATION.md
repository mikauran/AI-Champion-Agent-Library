# Phase 33 verification

## Agent 2 QTO (plan 33-01)

Status: COUNTED (first run, SKILL v1, no revision needed).

- Skill: primary `2_DDC_Book/3.2-QTO-Auto-Estimates/bim-qto`, secondary `qto-report` (quotes the DDC book: method ideas only, book-text exclusion recorded in docs/ddc-alignment/qto-normalization.md). Spec committed before any agent file (b384e8b).
- Run (Option A, compose stack with override.tryitout.yml, image tag tryitout): job `ab6e8dcd-04f0-46e0-94cf-e281eccf170a`, model gpt-4.1-mini, 11067 tokens, 3 requests, est. cost 0.0177 USD, input label synthetic (6 invented rows), countable true (Pi ran, usage observed, no direct-call fallback). Ledger row present in .planning/spend-log.md (after the fix-run marker). Local artifact: `.tryitout-runs/ab6e8dcd-04f0-46e0-94cf-e281eccf170a/result.md`.
- Key vs result: all 6 rows match the spec section 8 key (issue codes OK, NUMFMT, UNIT-CONV, UNRESOLVED-UNIT, DUPLICATE, MISSING-QTY; Q-03 qty stays 2400 with factor 0.001; Q-05 dup_of Q-01; Q-04 UNRESOLVED; Q-06 qty `-`). Rubric: R1 met (6 rows, input order, 8 cells), R2 met, R3 met, R4 met, R5 met (totals section is `to compute (tool)`, no numbers), R6 met, R7 met (format, draft caveat).
- Helper evidence: `npx tsx scripts/qto-group-totals.ts data/tryitout-prompts/qto-normalization/sample-qto-table.txt <result.md>` exit 0, "result table matches the helper on every cell". Totals by group: Ilmanvaihto m 36.4, Putkisto m 50.9; by level: Level 1 m 84.9, Level 2 m 2.4; excluded Q-04 (unresolved-unit), Q-05 (duplicate of Q-01), Q-06 (missing-quantity).
- Excerpt of result.md:

```
## Normalised rows
| row_id | group | level | qty | unit | factor | dup_of | issue |
| Q-01 | Putkisto | Level 1 | 48.5 | m | 1 | - | OK |
| Q-02 | Ilmanvaihto | Level 1 | 36.4 | m | 1 | - | NUMFMT |
| Q-03 | Putkisto | Level 2 | 2400 | m | 0.001 | - | UNIT-CONV |
| Q-04 | Sähkö | Level 1 | 3 | UNRESOLVED | - | - | UNRESOLVED-UNIT |
| Q-05 | Putkisto | Level 1 | 48.5 | m | 1 | Q-01 | DUPLICATE |
| Q-06 | Ilmanvaihto | Level 2 | - | pcs | 1 | - | MISSING-QTY |
## Grouped totals
to compute (tool): totals by group and by level and unit, from this table with scripts/qto-group-totals.ts. No sums were calculated by the model.
Draft for engineer review. Synthetic input; quantities were not checked against any model geometry.
```

- Caveat: draft for engineer review; synthetic input; quantities not checked against geometry. One passing run on 6 rows is evidence that the design is workable, not a reliability claim.
- Teardown: `podman-compose ... down` done, `podman ps -a --filter label=aic.tryitout -q` empty.
- Tests: src/lib/qto/groupTotals.test.ts (29 tests), scripts/ddc-alignment.qto-normalization.test.ts, validators, scripts/check-ddc-decoupling.sh clean, golden diff limited to this entry.
