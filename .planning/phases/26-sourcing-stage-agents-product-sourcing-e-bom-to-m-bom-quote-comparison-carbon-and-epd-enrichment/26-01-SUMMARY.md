---
phase: 26
plan: 01
status: attempted-not-counted
requirements: [CONS-A5]
---

# 26-01 Summary

Agent 5 (Product sourcing, E-BOM to M-BOM): entry, SKILL and sample built and validated; live run ATTEMPTED-NOT-COUNTED (rubric not met after SKILL v1 plus two revisions).

## Built
- data/agents/product-sourcing-mbom.yaml (stage sourcing, agent_no 5, DDC attribution), SKILL.md and a synthetic labelled sample (12 E-BOM lines, 13 catalog rows) in data/tryitout-prompts/product-sourcing-mbom/.
- Runnable flag in scripts/set-try-it-out-mode.ts; golden regenerated; set-try-it-out-mode gaps tests extended; Phase 15 guard passes without changes.
- Count derivation done: accuracy.test.ts and mcp-server-entries.test.ts now derive the agent count from top-level data/agents/*.yaml, so plans 26-02/03 need no count edit.
- Gaps G-030..G-036, inventory row 5 (missing, entry exists, attempted-not-counted), third-party notice.

## Live runs (Option A, gpt-4.1-mini, Pi container)
| Run | Job | Tokens | Est. USD | Verdict |
|---|---|---|---|---|
| SKILL v1 | e4181f2f-0cf0-46ac-ad18-b003bb942e24 | 12210 | 0.0195 | FAIL (BL-09 missed, wrong near_miss, BL-12 extra id, wrong supplier) |
| Revision 1 | 24e650a3-53c0-4dbc-bef0-9c562ee9b110 | 14436 | 0.0231 | FAIL (BL-09 still missed, BL-06 U, near_miss column) |
| Revision 2 | 02bb5e13-759a-423a-a16e-93f2d674755c | 16754 | 0.0268 | FAIL (BL-09 cand NONE despite dn_ok=Y,mat_ok=Y; 11 of 12 lines right) |

Total 0.0694 USD. Stack torn down, no aic.tryitout containers.

## Deviations
- Entry `name` is "Product Sourcing MBOM" (not "Product Sourcing (E-BOM to M-BOM)"): the catalog slug is derived from the name and must equal product-sourcing-mbom for UPDATES, the prompt directory and the harness.
- Three runs (cap of two revisions). Suggested follow-up: deterministic matching tool, model writes the reason only.
