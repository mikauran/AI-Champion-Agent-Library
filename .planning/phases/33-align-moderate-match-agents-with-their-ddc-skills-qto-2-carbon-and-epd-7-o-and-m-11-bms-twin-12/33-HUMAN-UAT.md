# Phase 33 human UAT

## Agent 2 QTO (plan 33-01)
- [ ] Skim docs/ddc-alignment/qto-normalization.md: is bim-qto (not qto-report) the right primary skill, and are the unit lookup table (mm/cm/l/t/g and spellings) and the groups (Ilmanvaihto, Putkisto, Sähkö) acceptable defaults for Finnish MEP take-offs?
- [ ] Run `npx tsx scripts/qto-group-totals.ts data/tryitout-prompts/qto-normalization/sample-qto-table.txt .tryitout-runs/ab6e8dcd-04f0-46e0-94cf-e281eccf170a/result.md` (local run output): do the totals by group and level and the excluded list suit your estimating practice?
- [ ] Decide whether the helper should be wired into the app (post-processing of the job result) or stay a harness/engineer step, and whether duplicates should be merged (summed) instead of excluded.
- [ ] Confirm the ambiguous-number rule (`1,250` is not guessed) and that imperial units stay UNRESOLVED.
