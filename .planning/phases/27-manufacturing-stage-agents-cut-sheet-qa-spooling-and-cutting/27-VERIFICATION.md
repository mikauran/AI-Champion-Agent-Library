---
phase: 27
status: human_needed
---

# Phase 27 Verification

All outputs are drafts for engineer review. Inputs are synthetic or public only.

Harness, procedure and ledger as in Phases 25 and 26 (see ../26-*/26-VERIFICATION.md): Option A (compose stack, internal network `aic-pi-internal`, image `localhost/aic-agent-library:tryitout`, catalog and prompts bind-mounted), `scripts/tryout-run.ts`, model gpt-4.1-mini in the Pi container, ledger `.planning/spend-log.md`.

## Agent evidence

### Agent 8: Cut-sheet QA
COUNTED (SKILL v1, first run, rubric R1-R7 met).

- Entry: data/agents/cut-sheet-qa.yaml (validate-submission INGESTIBLE, validate-entries 0 errors; stage manufacturing, agent_no 8). Related existing entry data/agents/submittal-review-router.yaml is unchanged. Input label: synthetic (data/tryitout-prompts/cut-sheet-qa/sample-cutsheet-spec.txt: 10-line invented cut sheet, 6 requirements). Option A, gpt-4.1-mini, Pi container, 3 requests, usage observed (countable).
- Job fb46b86d-daa5-448e-83ad-77e4173e22ca, 10539 tokens, est. 0.0169 USD (ledger row 27-01). Single run, no failed runs.
- Answer key: S-01 compliant, S-02 compliant, S-03 deviation (110 < 120), S-04 deviation (compression vs press), S-05 deviation with unit-differs note (bar vs MPa, no conversion), S-06 not-stated (NONE).
- Verdict: R1 pass (one result.md; 6 check lines and 6 table rows, S-01..S-06 in input order); R2 pass (every non-NONE cut_sheet_line verbatim from the cut sheet); R3 pass (all six verdicts equal the key); R4 pass (S-05 note "unit differs MPa vs bar, not converted", no 0.16 or 160 anywhere, S-06 NONE, review NO only for S-01 and S-02); R5 pass (no rows for nominal_diameter_dn, seal_material, certification; open items S-03, S-04, S-05, S-06); R6 pass (no counts, totals, overall pass/fail, approval or rejection); R7 pass (draft caveat present).
- Excerpt of the counted output:
  ```
  S-03 key=max_temperature test=ge req=120 C | cs_line="max_temperature: 110 C" cs_val=110 cs_unit=C | unit_same=Y | flag=N | verdict=deviation
  S-05 key=test_pressure test=ge req=1.6 MPa | cs_line="test_pressure: 25 bar" cs_val=25 cs_unit=bar | unit_same=N | flag=- | verdict=deviation
  S-06 key=fire_class test=eq req=SYN-FR-1 - | cs_line=NONE cs_val=NONE cs_unit=- | unit_same=- | flag=- | verdict=not-stated
  S-05 | Test pressure | >= 1.6 MPa | test_pressure: 25 bar | deviation | YES | unit differs MPa vs bar, not converted
  S-06 | Fire class | = SYN-FR-1 | NONE | not-stated | YES | not stated on cut sheet
  Draft for engineer review. Verdicts come only from the supplied synthetic cut sheet and specification excerpt; no manufacturer data was looked up.
  ```
- Caveat: draft for engineer review; counted for the scoped step only (6 requirements, one synthetic sample, a single run). Text only.
- Teardown: stack down, `podman ps -a --filter label=aic.tryitout` empty.
- Ledger: one 27-01 row (0.0169 USD).
