# Phase 32 human UAT

## Agent 3 Clash prioritization (plan 32-01)
- [ ] Skim docs/ddc-alignment/clash-prioritization.md: are the priority rules (CRITICAL = hard clash with Rakenne; HIGH = hard overlap above 100 mm; MEDIUM = MEP-MEP or default; LOW = soft with structural/architectural) and the pair lookup acceptable defaults for Finnish MEP coordination?
- [ ] Decide on the live-run failure (4 runs, attempted-not-counted, see 32-VERIFICATION.md): accept a deterministic pre-step for the element index and patterns, or split into two Try It Out steps, or simplify the output columns.
- [ ] Confirm the replaced location_key approach (pattern groups from identical element text).

## Agent 4 RFI generation (plan 32-02)
- [ ] Skim the RFI drafts (job 8c98cb89, .tryitout-runs/8c98cb89-f805-44d4-9bfb-7e041406585e/result.md, local) and docs/ddc-alignment/rfi-generation-from-findings.md: does the block fit your RFI template (fields, impact assessment lines, placeholders for dates and deadlines)?
- [ ] Decide whether the specification section and drawing reference lines (always `not given in findings`) should be dropped or fed by an extra findings column.
- [ ] Confirm the fixed derived question for findings without an open question and the proposal wording lookup.
