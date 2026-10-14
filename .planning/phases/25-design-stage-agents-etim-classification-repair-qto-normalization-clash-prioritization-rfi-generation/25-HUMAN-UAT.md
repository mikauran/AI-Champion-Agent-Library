# Phase 25 Human UAT

Items an engineer should confirm. All agent outputs are drafts for engineer review; inputs are synthetic or public.

## Pending on Ville

- Confirm the demo-rfi-triage output (job 1e15df20-234c-4c3f-9def-4b2417fe39ff, see 25-VERIFICATION.md) looks sensible.
- Confirm the spend in the OpenAI dashboard matches `.planning/spend-log.md` within a few cents.
- Skim the ETIM repair draft (job ca984d20-c703-4138-9b52-691d6c092add, see 25-VERIFICATION.md Agent 1) for plausibility; it uses only invented SYN- codes.
- Skim the QTO normalization draft (job af4663e3-f128-4272-9b77-e0eace2acc6c, see 25-VERIFICATION.md Agent 2) for plausibility; synthetic table, re-check the model-computed totals.
- Clash prioritization (25-04) was attempted-not-counted: three runs (jobs 57e5c2cc-f130-47b7-96af-755ece27e18c, ab20a259-c5c6-40c5-86fd-7406d918a43c, 2141f80e-2c6b-4b00-b48f-36bc84206bf4) all failed the rubric (lost clash CL-012, mis-ranked clusters). Decide whether to add a deterministic clustering tool or accept the agent as an entry without evidence; the findings format for Plan 25-05 is unaffected.
