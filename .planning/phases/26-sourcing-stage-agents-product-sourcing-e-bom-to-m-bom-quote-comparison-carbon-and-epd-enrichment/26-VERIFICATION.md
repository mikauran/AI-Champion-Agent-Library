---
phase: 26
status: human_needed
---

# Phase 26 Verification

All outputs are drafts for engineer review. Inputs are synthetic or public only.

Harness, procedure and ledger as in Phase 25 (see ../25-*/25-VERIFICATION.md): Option A (compose stack, internal network `aic-pi-internal`, image `localhost/aic-agent-library:tryitout`, catalog and prompts bind-mounted), `scripts/tryout-run.ts`, model gpt-4.1-mini in the Pi container, ledger `.planning/spend-log.md`.

## Agent evidence

### Agent 5: Product sourcing (E-BOM to M-BOM)
ATTEMPTED-NOT-COUNTED (rubric not met after the SKILL v1 run and the two allowed revisions). No evidence is claimed.

- Entry: data/agents/product-sourcing-mbom.yaml (validate-submission INGESTIBLE, validate-entries 0 errors). Input label: synthetic (data/tryitout-prompts/product-sourcing-mbom/sample-ebom-catalog.txt, 12 E-BOM lines, 13 catalog rows, SYN- class codes). All three runs: Option A, gpt-4.1-mini, Pi container, 3 requests, usage observed (countable by infrastructure).
- Answer key: matched BL-01 (CP-01), BL-03 (CP-04), BL-04 (CP-05), BL-05 (CP-06), BL-06 (CP-07, empty req_dn = any), BL-09 (CP-11, unit_ok N: pcs vs pack10, review YES); ambiguous BL-02 (CP-02,CP-03), BL-07 (CP-08,CP-09), BL-12 (CP-01,CP-02,CP-03,CP-12, underspecified); no-match BL-08 (near CP-10), BL-10 (near CP-12 and the other same-class pipes), BL-11 (near CP-13).
- Run 1 (SKILL v1), job e4181f2f-0cf0-46ac-ad18-b003bb942e24, 12210 tokens, est. 0.0195 USD: 12 rows in order, qty/unit copied, but BL-09 got cand NONE (CP-11 missed), near_miss held class codes instead of product ids, BL-12 candidates included CP-06 (a different class), M-BOM supplier of BL-03 wrong (SynSupplier B, should be A). FAIL (R3, R4, R5, R6).
- Run 2 (revision 1: explicit `same_class` scan over all catalog rows, `cand` only from it, `sup`/`su` copied from the candidate row), job 24e650a3-53c0-4dbc-bef0-9c562ee9b110, 14436 tokens, est. 0.0231 USD: BL-12 and suppliers now correct, near_miss ids right for BL-09 and BL-10; but BL-09 still cand NONE although same_class=CP-11, BL-06 marked U=Y although req_mat is cast iron, near_miss column `-` for BL-08 and BL-11 (ids only in the reason). FAIL (R3, R4, R5).
- Run 3 (revision 2: per-id `tests` with dn_ok/mat_ok before `cand`, U wording fixed, near_miss filled from same_class), job 02bb5e13-759a-423a-a16e-93f2d674755c, 16754 tokens, est. 0.0268 USD: 12 rows in order, 11 of 12 lines correct including all ambiguous and near_miss columns, U right. But BL-09 shows `CP-11:dn=22,mat=steel,dn_ok=Y,mat_ok=Y` and then `cand=NONE`, so it is no-match: the unit-mismatch showcase line is missing from the M-BOM draft and unit_ok N is never shown; BL-08 reason says req_dn=15 (empty in the E-BOM). FAIL (R3, R4, R5).
- Verdict: R1 pass, R2 pass, R3 fail (BL-09), R4 fail (BL-09), R5 fail (M-BOM lacks BL-09), R6 pass, R7 pass. A matched line lost to a self-contradicting model step is exactly the failure a sourcing engineer cannot catch, so it is not counted. Revision cap (2) reached.
- Note on the key: BL-10 near_miss lists all four same-class ids (CP-01,CP-02,CP-03,CP-12) in run 3, which follows the SKILL (every same-class row) and is acceptable; the plan key named only CP-12.
- Excerpt of the last output (wrong row marked):
  ```
  BL-01 | Water pipe | 120 | m | CP-01 | matched | Y | - | NO | ...cand=CP-01; sup=SynSupplier A; su=m; fired: matched because cand=CP-01
  BL-07 | Radiator valve | 20 | pcs | CP-08,CP-09 | ambiguous | - | - | YES | ...fired: ambiguous because multiple candidates matched
  BL-09 | Pipe clamp | 100 | pcs | NONE | no-match | - | CP-11 | YES | ...tests=CP-11:dn=22,mat=steel,dn_ok=Y,mat_ok=Y; cand=NONE; fired: no-match because cand=NONE   <- wrong, should be matched, unit_ok N
  Draft for engineer review. Candidates come only from the supplied synthetic catalog excerpt; no catalog lookup was made.
  ```
- Mitigation idea (not done, cap reached): a deterministic matching tool (script) with the model only writing the reason text.
- Teardown: stack down, `podman ps -a --filter label=aic.tryitout` empty.
- Ledger: three 26-01 rows (0.0195, 0.0231, 0.0268; total 0.0694 USD, none counted).

### Agent 6: Quote comparison
COUNTED (SKILL revision 1, rubric R1-R7 met).

- Entry: data/agents/quote-comparison.yaml (validate-submission INGESTIBLE, validate-entries 0 errors; stage sourcing, agent_no 6). Input label: synthetic (data/tryitout-prompts/quote-comparison/sample-quotes.txt: 8 RFQ lines, three invented quotes, 23 offered prices). Option A, gpt-4.1-mini, Pi container, 3 requests per run, usage observed (countable).
- Answer key: basis A first, B same, C differs (currency, vat, delivery_terms); flags: B R-05 NOT-QUOTED, B R-07 UNIT-DIFF, C R-06 ITEM-SUBSTITUTE + BASIS-DIFF, C R-07 UNIT-DIFF + BASIS-DIFF, other C cells BASIS-DIFF, rest OK; lowest_comparable R-01 B, R-02 A, R-03 A, R-04 B, R-05 n/a, R-06 A, R-07 n/a, R-08 A.
- Run 1 (SKILL v1), job c1bb118d-2f2d-4cc3-87a4-d516f4bda4d7, 14976 tokens, est. 0.0240 USD: quote basis, 8 rows in order, all 23 prices copied right, C never ranked, no arithmetic. But R-05 A and C got ITEM-SUBSTITUTE with `code=22/22 code_same=N` (the model contradicted its own check) and R-07 lowest_comparable was A although only one offer was eligible. FAIL (R4, R5).
- Run 2 (revision 1: code_same agreement rule with examples, closing line per RFQ line `ok_letters=... lowest=...` so the table cell is a copy), job eaee09d8-0baf-4a01-b5fb-4911b8a0c984, 15555 tokens, est. 0.0249 USD (ledger total for 26-02 0.0489 USD).
- Verdict run 2: R1 pass (3 rows, copied fields right, basis_vs_first right); R2 pass (R-01..R-08 once each, in order); R3 pass (all 23 prices identical to input, B R-05 `-`/NOT-QUOTED, no conversion); R4 pass (all flags equal the key); R5 pass (all 8 lowest_comparable equal the key, C never named); R6 pass (no totals, conversions or recommendation; required sentence present); R7 pass. Cosmetic: the closing line for R-05 reads `ok_letters=A none lowest=n/a` (malformed list, value n/a correct).
- Design note: the output has an extra `## Line checks` section (one checklist line per RFQ line and quote) before the contract tables; the decisions are made there as equality tests and the contract tables copy from it.
- Excerpt of the counted output:
  ```
  R-05 | Mineral wool pipe insulation 22 mm | 120 | m | 3.10 | OK | - | NOT-QUOTED | 34.00 | BASIS-DIFF | n/a
  R-06 | Circulation pump 25-60 | 2 | pcs | 289.00 | OK | 301.00 | OK | 3350.00 | ITEM-SUBSTITUTE, BASIS-DIFF | A
  R-07 | Pipe clamp 22 | 100 | pcs | 0.85 | OK | 8.20 | UNIT-DIFF | 82.00 | UNIT-DIFF, BASIS-DIFF | n/a
  Totals and conversions are not computed here: recompute per quote after normalising basis, units and items (script or engineer).
  Draft for engineer review. Prices are copied from the supplied synthetic quotes; no calculation, conversion or supplier recommendation was made.
  ```
- Caveat: draft for engineer review; one sample of 8 lines and 3 quotes, synthetic, single run passing after one revision.
- Teardown: stack down, `podman ps -a --filter label=aic.tryitout` empty.
- Ledger: two 26-02 rows (0.0240, 0.0249).
