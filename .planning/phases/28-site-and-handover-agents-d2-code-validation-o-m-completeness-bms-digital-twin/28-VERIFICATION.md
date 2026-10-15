---
phase: 28
status: human_needed
---

# Phase 28 Verification

All outputs are drafts for engineer review. Inputs are synthetic or public only.

Harness, procedure and ledger as in Phases 25-27 (see ../27-*/27-VERIFICATION.md): Option A (compose stack, internal network `aic-pi-internal`, image `localhost/aic-agent-library:tryitout`, catalog and prompts bind-mounted), `scripts/tryout-run.ts`, model gpt-4.1-mini in the Pi container, ledger `.planning/spend-log.md`.

## Agent evidence

### Agent 10: D2 code validation
COUNTED (SKILL revision 1, second run, rubric R1-R7 met).

- Entry: data/agents/d2-code-validation.yaml (validate-submission INGESTIBLE, validate-entries 0 errors; stage site-handover, agent_no 10; name "D2 Code Validation" so the slug is d2-code-validation). Input label: synthetic (data/tryitout-prompts/d2-code-validation/sample-ventilation-requirements.txt: 8-line invented design extract, 6 requirement rows with PLACEHOLDER SYN-REQ values, not regulation values). Option A, gpt-4.1-mini, Pi container, 3 requests per run, usage observed (countable).
- Runs:
  - Job 86ff272e-d557-4ca9-9bed-2f80236e0c11, SKILL v1, 12035 tokens, est. 0.0193 USD: FAIL. Q-04 design line R102,co2_design,0.09,% was missed (dx_line NONE, verdict not-stated) instead of unit-differs deviation. Not counted; led to revision 1.
  - Job 2231091f-d63b-490a-99ef-d36a885674fe, SKILL revision 1 (scan rule: unit and value play no role in finding the line; one more literal worked line for same room and key with another unit), 12719 tokens, est. 0.0204 USD: PASS, counted.
- Answer key vs result: Q-01 compliant, Q-02 compliant, Q-03 deviation, Q-04 deviation (unit differs ppm vs %, not converted), Q-05 compliant, Q-06 not-stated (NONE): all six match.
- Verdict: R1 pass (one result.md; 6 check lines and 6 table rows Q-01..Q-06 in input order); R2 pass (every non-NONE design_line verbatim from the extract); R3 pass (all six verdicts equal the key); R4 pass (Q-04 note "unit differs ppm vs %, not converted", no conversion; Q-06 NONE, R104 line unused; review NO only for Q-01, Q-02, Q-05); R5 pass (no rows for room_type, extract_air, R104 supply_air; open items Q-03, Q-04, Q-06); R6 pass (no counts, totals, overall compliance or approval, no regulation claim); R7 pass (draft caveat present).
- Excerpt of the counted output:
  ```
  Q-03 room=R102 key=supply_air test=ge req=15 l/s | dx_line="R102,supply_air,12,l/s" dx_val=12 dx_unit=l/s | unit_same=Y | flag=N | verdict=deviation
  Q-04 room=R102 key=co2_design test=le req=900 ppm | dx_line="R102,co2_design,0.09,%" dx_val=0.09 dx_unit=% | unit_same=N | flag=- | verdict=deviation
  Q-06 room=R103 key=noise_level test=le req=35 dB | dx_line=NONE dx_val=NONE dx_unit=- | unit_same=- | flag=- | verdict=not-stated
  Q-04 | R102 | SYN-REQ CO2 design level | <= 900 ppm | R102,co2_design,0.09,% | deviation | YES | unit differs ppm vs %, not converted
  Q-06 | R103 | SYN-REQ Noise level | <= 35 dB | NONE | not-stated | YES | not stated in design extract
  Open items: Q-03 deviation; Q-04 deviation, unit differs ppm vs %, not converted; Q-06 not-stated
  Draft for engineer review. Verdicts come only from the supplied extract and requirement rows (placeholders in the sample); no regulation text was looked up.
  ```
- Caveat: draft for engineer review; counted for the scoped step only (6 requirement rows, one synthetic sample, second run after one revision). Requirement values are invented placeholders; no real regulation values were used or looked up; the D2 interpretation (Finnish code part D2, indoor climate and ventilation) is an assumption.
- Teardown: stack down, `podman ps -a --filter label=aic.tryitout` empty.
- Ledger: two 28-01 rows (0.0193 and 0.0204 USD).
