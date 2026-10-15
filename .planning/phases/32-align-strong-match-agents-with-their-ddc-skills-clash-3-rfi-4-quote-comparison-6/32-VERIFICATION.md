# Phase 32 verification

## Agent 3 Clash (plan 32-01)
ATTEMPTED-NOT-COUNTED (4 live runs, all FAIL; revision cap of 2 plus one scope-shrink retry reached). The aligned entry, SKILL.md, sample and spec stay in the repo, but agent 3 is NOT counted as verified against the aligned rubric. No evidence is claimed.

- Spec written from the full skill text before any agent change: docs/ddc-alignment/clash-prioritization.md (commit c7b3487). Answer key and rubric R1-R7 written before the runs; only the id set changed for the shrink retry (recorded in spec section 10).
- Option A, gpt-4.1-mini, Pi container, usage observed (countable by infrastructure), input label synthetic. Total spend 0.1203 USD (ledger rows after the fix-run marker).
- Run 1 (SKILL v1, 16 rows), job 4f18541b-1f25-416e-bef8-7ca3a0eed09a, 18796 tokens, 3 requests, est. 0.0301 USD: FAIL. others=none on every row, so no pattern groups at all (R3); T1 not Y for struct-hard rows (CL-002..005, CL-013 wrong); priority cell contradicts the fired text (CL-011, CL-014); 13 single-clash findings. R1/R2/R6/R7 format fine.
- Run 2 (revision 1: element index section, explicit T1 wording), job f4376fb6-83d6-4411-bfc0-51c09f719655, 18820 tokens, 3 requests, est. 0.0301 USD: FAIL. Element index fully correct, duct group found, but riser others=none, CL-012 pattern missing, CL-011 and CL-013 priority cells contradict the tests, findings wrong for ungrouped patterns.
- Run 3 (revision 2: idx_a/idx_b per-row lookup fields, first-Y rule, EX-7 worked row), job 977ecb72-fc36-44fb-9efb-06483b113da9, 20129 tokens, 3 requests, est. 0.0322 USD: FAIL. Index and idx_a/idx_b copied correctly and others right for the duct and riser, yet the pattern cell was `-` for riser and ceiling rows; priority cells contradict the fired text on CL-002, CL-003, CL-005, CL-013 (T1=Y rows ranked HIGH/MEDIUM, all-N rows ranked CRITICAL).
- Run 4 (scope-shrink retry, 8-row sample, SKILL unchanged), job bd86fcac-ed85-43dc-ae7e-3022c28caa9b, 17434 tokens, 3 requests, est. 0.0279 USD: FAIL. CL-002 HIGH instead of CRITICAL (its own T1=Y, fired CRITICAL), CL-004/CL-005 riser pattern missed (idx lists were right per row for the duct group but not for the riser; others=none), CL-007 MEDIUM despite struct hard (T1=N), CL-008 LOW with fired MEDIUM. R1, R2, R5 (lookup) and R7 format held; R3 and R4 failed.
- Reason: gpt-4.1-mini does not reliably (a) take the priority cell from its own fired text and (b) turn an index lookup into a pattern label in one pass over 8-16 rows with a 7-column row. The structured per-row checklist that passed in phase 25 (a single P1-P3 rule plus a hand-made location_key) became too heavy once the skill's four-level scale, pattern labels, resolution type and responsible discipline were added. Not a defect of the spec or the key (the key was verified by an independent derivation in scripts/ddc-alignment.clash-prioritization.test.ts).
- Excerpt of the last output (wrong cells marked):
  ```
  CL-002 | open | HIGH | PAT-CL-001 | ... | T1=Y T2=N T3=N T4=N; fired: CRITICAL because T1=Y   (priority cell should be CRITICAL)
  CL-004 | in_progress | MEDIUM | - | ...   (pattern should be PAT-CL-004; Riser RS-3 shared with CL-005)
  CL-007 | open | MEDIUM | ... struct=Y; type=hard ... T1=N   (T1 should be Y, priority CRITICAL)
  Draft for engineer review. Priorities, resolution types and responsible disciplines are proposals from the report columns only; the model was not consulted.
  ```
- Mitigation idea (not done, cap reached): a deterministic pre-step for the element index and pattern label (script), with the model writing only priority tests and prose; or two Try It Out steps (index, then rows).
- Teardown: stack down, `podman ps -a --filter label=aic.tryitout` empty (see below).
- Ledger: four 32-01 rows after the fix-run marker in .planning/spend-log.md.
- Phase 25 evidence for the previous (P1-P3, location_key) design stays valid for that design only; it no longer describes the entry.
