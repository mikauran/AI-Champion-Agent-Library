# Phase 32 human UAT

## Agent 3 Clash prioritization (plan 32-01)
- [ ] Skim docs/ddc-alignment/clash-prioritization.md: are the priority rules (CRITICAL = hard clash with Rakenne; HIGH = hard overlap above 100 mm; MEDIUM = MEP-MEP or default; LOW = soft with structural/architectural) and the pair lookup acceptable defaults for Finnish MEP coordination?
- [ ] Decide on the live-run failure (4 runs, attempted-not-counted, see 32-VERIFICATION.md): accept a deterministic pre-step for the element index and patterns, or split into two Try It Out steps, or simplify the output columns.
- [ ] Confirm the replaced location_key approach (pattern groups from identical element text).

## Agent 4 RFI generation (plan 32-02)
- [ ] Skim the RFI drafts (job 8c98cb89, .tryitout-runs/8c98cb89-f805-44d4-9bfb-7e041406585e/result.md, local) and docs/ddc-alignment/rfi-generation-from-findings.md: does the block fit your RFI template (fields, impact assessment lines, placeholders for dates and deadlines)?
- [ ] Decide whether the specification section and drawing reference lines (always `not given in findings`) should be dropped or fed by an extra findings column.
- [ ] Confirm the fixed derived question for findings without an open question and the proposal wording lookup.

## Agent 6 Quote comparison (plan 32-03)
- [ ] Review docs/ddc-alignment/quote-comparison.md section 6 (skill weighting defects verified) and the sample criteria (price 50, delivery_time 20, technical_compliance 20, references 10): are these sensible default criteria and weights for Finnish MEP procurement, and should warranty be a default row?
- [ ] Run `npx tsx scripts/bid-weighted-score.ts` on the job output (job fb302e31, .tryitout-runs/fb302e31-f63a-442b-a9d7-e3b4d2c8cc9f/result.md, local): do the totals (B 7.20, A 6.60, C 6.30) and the draft recommendation wording (`pending tool totals`, eligible/excluded quotes, open scope gaps) suit your selection practice?
- [ ] Decide whether the totals step should move into the app (job post-processing) instead of the harness evidence step (A-02 kept it outside, no app change).
- [ ] Decide how to handle the unreliability of lowest_comparable on 6 lines (three failed runs before the 5-line retry): keep 5 lines per run, or add a deterministic pre-step.
