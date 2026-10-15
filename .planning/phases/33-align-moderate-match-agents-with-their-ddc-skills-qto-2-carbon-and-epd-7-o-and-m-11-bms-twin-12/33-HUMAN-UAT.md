# Phase 33 human UAT

## Agent 2 QTO (plan 33-01)
- [ ] Skim docs/ddc-alignment/qto-normalization.md: is bim-qto (not qto-report) the right primary skill, and are the unit lookup table (mm/cm/l/t/g and spellings) and the groups (Ilmanvaihto, Putkisto, Sähkö) acceptable defaults for Finnish MEP take-offs?
- [ ] Run `npx tsx scripts/qto-group-totals.ts data/tryitout-prompts/qto-normalization/sample-qto-table.txt .tryitout-runs/ab6e8dcd-04f0-46e0-94cf-e281eccf170a/result.md` (local run output): do the totals by group and level and the excluded list suit your estimating practice?
- [ ] Decide whether the helper should be wired into the app (post-processing of the job result) or stay a harness/engineer step, and whether duplicates should be merged (summed) instead of excluded.
- [ ] Confirm the ambiguous-number rule (`1,250` is not guessed) and that imperial units stay UNRESOLVED.

## Agent 7 Carbon and EPD (plan 33-02)
- [ ] Skim docs/ddc-alignment/carbon-epd-enrichment.md: are the stage grouping (A1-A3, A4, A5, B, C, D), module D kept out of the A-C total, and the 12 listed skill defects with their fixes right for your carbon practice?
- [ ] Run `npx tsx scripts/carbon-lifecycle.ts data/tryitout-prompts/carbon-epd-enrichment/sample-products-epd.txt .tryitout-runs/83fc51d0-ad72-459b-b883-8a8eb838cf79/result.md` (add `--convert` to see the kg/t conversion): do the stage totals and the option comparison suit you?
- [ ] Decide whether the kg/t table should be the only conversion, whether comparison should default to A1-A3, and whether the helper should be wired into the app or stay an engineer step.
- [ ] Confirm that biogenic carbon, scenarios, intensity per area and benchmarks stay out of scope (listed gaps), and that real EPD data must come from a licensed or public register you choose (the sample values are invented).
