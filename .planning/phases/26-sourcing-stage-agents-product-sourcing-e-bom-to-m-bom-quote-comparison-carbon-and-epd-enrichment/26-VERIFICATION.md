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
