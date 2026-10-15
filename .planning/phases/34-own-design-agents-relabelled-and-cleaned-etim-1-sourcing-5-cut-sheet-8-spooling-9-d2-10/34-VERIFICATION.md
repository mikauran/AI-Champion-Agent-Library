# Phase 34 Verification

Procedure: docs/tryitout-live-run.md Option A (compose stack, internal network, tagged image), gpt-4.1-mini, Pi container, usage observed (countable), synthetic samples, draft for engineer review. Runs are one at a time. Labels (34-01): see 34-01-SUMMARY.md; test scripts/ddc-labels.own-design.test.ts.

## Agent 1: ETIM and classification repair
COUNTED (relabel rerun on the existing sample; SKILL change: footer wording only).

- Job 17137e7b-4fa0-442d-aa9c-71062ac6627b, 11545 tokens, 3 requests, est. 0.0185 USD, label synthetic, ledger row 34-02.
- Rubric (Phase 25-02 plan) and key: 14 rows for 14 CSV rows pass; all proposed codes in the excerpt or NONE pass; E-101..103 missing (SYN-EC001/002/003) pass; E-104, E-105 wrong (EC001, EC005) pass; E-106, E-107 unknown-code NONE pass; E-111, E-112 ambiguous review YES pass; E-113 no-match NONE pass; E-108/109/110/114 ok review NO pass; Counts line (3/2/2/4/2/1) equals the table; no lookup claim; draft caveat present pass.
- Quality note: confidence high on unknown-code and no-match rows (low in Phase 25); harmless, review is YES.

## Agent 5: Product sourcing (E-BOM to M-BOM)
COUNTED (relabel rerun on the existing 6 x 6 synthetic sample; SKILL change: footer wording only, now names cwicr-material-procurement, method only, no CWICR data).

- Job 7b1a2993-51f6-4952-a6fb-25a0b2ff447e, 15851 tokens, 3 requests, est. 0.0254 USD, label synthetic, ledger row 34-02.
- Key (Phase 26 run C) vs returned: BL-01 CP-01 matched; BL-02 CP-02,CP-03 ambiguous; BL-03 no-match near_miss CP-05 (steel vs stainless steel; empty dn counted as Y); BL-04 no-match, no near miss; BL-05 CP-04 matched, unit_same N (pcs vs pack10) review YES; BL-06 CP-06 matched, underspecified review YES. M-BOM lists exactly BL-01, BL-05 (pack10), BL-06. R1 one file, 6 rows in order; R2 qty/unit copied; R3 candidates and status equal the key; R4 flags equal the key; R5 M-BOM correct; R6 nothing invented, no totals; R7 caveat present. All pass. Catalog is generic synthetic; no MCP/LVI/STK/Prysmian/Rakennustieto framing (decoupling script clean).
- Caveat: scoped step only (about 6 x 6 per run); one passing run, not a reliability claim.

## Agent 8: Cut-sheet QA
COUNTED (relabel rerun on the existing synthetic sample; SKILL change: footer wording only).

- Job 8ae1ff62-af10-4c31-9941-cdfbed4d22d6, 10538 tokens, 3 requests, est. 0.0169 USD, label synthetic, ledger row 34-02.
- Key (Phase 27) vs returned: S-01 compliant, S-02 compliant, S-03 deviation (110 < 120), S-04 deviation (compression vs press), S-05 deviation with "unit differs MPa vs bar, not converted" (no 0.16 or 160 anywhere), S-06 not-stated (NONE). R1 pass (one file, 6 check lines, 6 rows in order); R2 cut_sheet_line verbatim; R3 all verdicts equal the key; R4 review NO only S-01, S-02; R5 no rows for unlisted keys; R6 no totals or approval; R7 caveat present. All pass. Quality note: S-03/S-04 open-item reasons are terse but correct.

## Agents 9 and 10
Labels only (34-01); no rerun required by the plan (no entry text beyond label/assumption wording changed).

## Spend
Three runs, 0.0608 USD (upper bound) for this plan; no failed runs, no revisions. Stack stopped, no aic.tryitout containers left.
