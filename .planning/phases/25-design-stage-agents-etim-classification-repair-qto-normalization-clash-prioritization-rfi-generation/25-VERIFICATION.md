---
phase: 25
status: in_progress
---

# Phase 25 Verification

All outputs are drafts for engineer review. Inputs are synthetic or public only.

## Live run harness

- Option used: A (compose stack, internal network `aic-pi-internal`, image `localhost/aic-agent-library:tryitout` built from this checkout, catalog and prompts bind-mounted)
- Agent: demo-rfi-triage (existing demo entry)
- Job id: 1e15df20-234c-4c3f-9def-4b2417fe39ff
- Model: gpt-4.1-mini
- Total tokens: 7652, requests: 3 (proxy-observed, so the Pi container path was used, not the direct-call fallback)
- Estimated cost: 0.0122 USD (upper bound, all tokens at output rate); duration 10.5 s
- Input label: synthetic (data/tryitout-prompts/demo-rfi-triage/sample-rfi.txt)
- Output excerpt (result.txt):
  ```
  Urgency: high
  Discipline: structural
  Routing: structural engineer of record
  Rationale: The RFI concerns a conflict between ceiling-mounted ductwork and a structural beam with only 3 inches clearance, requiring prompt resolution to avoid delaying scheduled drywall ceiling work and sequencing.
  ```
- Caveat: draft for engineer review
- Teardown check: `podman ps -a --filter label=aic.tryitout` empty, stack down, port 3000 free
- Ledger: `.planning/spend-log.md` (one 0.0000 row for a 403 Origin mismatch before any job existed, one 0.0122 row for the run)

## Agent evidence

### Agent 1: ETIM and classification repair
Status: COUNTED (entry validated, real-model container run, rubric met after one SKILL revision).

- Entry: data/agents/etim-classification-repair.yaml (validate-submission and validate-entries exit 0); SKILL.md and synthetic sample in data/tryitout-prompts/etim-classification-repair/
- Counted run: job ca984d20-c703-4138-9b52-691d6c092add, model gpt-4.1-mini, 10568 tokens, 3 requests (proxy-observed, Pi container path, Option A), estimated cost 0.0169 USD (upper bound)
- Earlier run with SKILL v1: job 49e4e911-bf7b-45de-b2b3-255d56e3a441, 9980 tokens, 0.0160 USD, NOT counted. Findings: all rows present, no invented codes, wrong/unknown-code correct, but the two ambiguous elements and the no-match element were typed `missing` (the ambiguity was put in the proposed-class cell as free text), rows missing/wrong carried review NO, and the Counts line contradicted the list. SKILL revision 1 added a first-match decision order, a strict proposed-class cell (code or NONE) and an explicit review rule.
- Input label: synthetic (invented rows and invented SYN- codes, no real project or ETIM data)
- Answer key vs returned (counted run):

| Category | Seeded elements | Returned |
|---|---|---|
| missing (clear fit) | E-101, E-102, E-103 | missing, SYN-EC001/002/003 |
| wrong class | E-104, E-105 | wrong, proposed SYN-EC001 and SYN-EC005 |
| unknown code | E-106, E-107 | unknown-code, NONE |
| ambiguous | E-111, E-112 | ambiguous, review YES |
| no fitting class | E-113 | no-match, NONE |
| correct (control) | E-108, E-109, E-110, E-114 | ok, review NO |

- Rubric: 14 table rows for 14 CSV rows; every code in the output is in the input excerpt; no lookup claimed; all seeded categories matched; draft caveat present in the output footer and in the entry system prompt. Verdict: pass.
- Output excerpt (output/result.md):
  ```
  element_id | issue | current | proposed class | confidence | evidence | review
  E-104 | wrong | SYN-EC002 | SYN-EC001 | high | Pump but classified as LED luminaire | YES
  E-106 | unknown-code | SYN-EC099 | NONE | low | LED luminaire with unknown code SYN-EC099 | YES
  E-111 | ambiguous |  | SYN-EC008 | low | Actuated unit could be motorised damper or others | YES
  E-112 | ambiguous |  | SYN-EC005 | low | Ceiling unit could be fan coil or air handling unit | YES
  E-113 | no-match |  | NONE | low | Wall-mounted charger not in excerpt | YES
  ...
  Draft for engineer review. Classes come only from the supplied synthetic excerpt; no ETIM lookup was made.
  ```
- Quality note: confidence for E-106/E-107 is low although the element type is obvious; harmless, review is YES.
- Caveat: draft for engineer review; classes are synthetic SYN- codes, not ETIM.
- Teardown: stack down, `podman ps -a --filter label=aic.tryitout` empty, port 3000 free.
- Ledger: two 25-02 rows in .planning/spend-log.md (0.0160 not counted, 0.0169 counted)

### Agent 2: QTO normalization
COUNTED (SKILL revision 1).

- Entry: data/agents/qto-normalization.yaml (validate-submission INGESTIBLE, validate-entries 0 errors). Option A, gpt-4.1-mini, Pi container.
- Run 1 (SKILL v1), job 5ecd9f99-c1e2-4253-b78d-ac4ce366c66e, 10958 tokens, 3 requests, est. 0.0175 USD. All 20 rows and all conversions correct, but the totals section was wrong (m2 1769.2 vs 2020.1, m3 42.845 vs 43.145, m -0 vs 8.505, pcs list included a merged duplicate) and one original_unit contained a NUL character (m-squared). Not counted.
- Run 2 (SKILL revision 1: explicit addend lists in totals, ASCII units), job af4663e3-f128-4272-9b77-e0eace2acc6c, gpt-4.1-mini, 11384 tokens, 3 requests, est. 0.0182 USD. Input label: synthetic (data/tryitout-prompts/qto-normalization/sample-qto-table.txt, 20 rows).
- Answer key vs result: duplicates Q-004/Q-020 (merged-duplicate, both ids logged); conversions Q-008 mm 0.001, Q-009 cm 0.01 plus decimal comma, Q-010/Q-011 l 0.001, Q-012 t 1000 (all numerically correct: 12.5, 8.505, 0.3, 0.045, 2000); decimal comma Q-001/Q-009, thousands separator Q-006; missing unit Q-015 and bag Q-016 -> UNRESOLVED and logged; zero Q-018 and negative Q-019 flagged; group labels wall/WALLS -> Walls mapped.
- Rubric: 20 normalised rows for 20 input ids; unchanged-unit rows keep identical digits; every converted row states its factor and original*factor == quantity (checked Q-008, Q-009, Q-010, Q-011, Q-012); UNRESOLVED rows not guessed; draft caveat in the output footer and entry system prompt. Totals recomputed by hand and correct: m2 2020.1, m3 43.145, m 8.505, kg 3850, pcs 59. Verdict: pass.
- Quality notes: Q-017 (cable tray in pcs, a length item) not flagged as ambiguous; the original_unit column shows normalised spelling for Q-006 (m2 instead of m^2) and the spelling change is not logged for Q-001/Q-006; a spurious group-label change Cable tray -> Cable trays was logged. No quantity was altered wrongly.
- Output excerpt (output/result.md):
  ```
  Q-008 | Pipes | Copper pipe DN22 | 12.5 | m | 12500 | mm | unit conversion
  Q-009 | Pipes | Copper pipe DN15 | 8.505 | m | 850,5 | cm | unit conversion, number format
  Q-012 | Rebar | Reinforcement steel B500 | 2000 | kg | 2 | t | unit conversion
  Q-015 | Windows | Window 1200x1500 | 18 | UNRESOLVED | 18 |  | missing unit
  Q-016 | Masonry mortar | 40 | UNRESOLVED | 40 | bag | unknown unit
  Q-020 | Doors | Single door 900x2100 | 24 | pcs | 24 | pcs | merged-duplicate
  ## Totals (re-check required)
  m2: Q-001 245.5 + Q-002 310.2 + Q-003 128 + Q-006 1250 + Q-014 86.4 = 2020.1
  m: Q-008 12.5 + Q-009 8.505 + Q-018 0 + Q-019 -12.5 = 8.505
  Draft for engineer review. Synthetic input; quantities were not checked against any model geometry.
  ```
- Caveat: draft for engineer review; model-computed totals must be re-checked; synthetic input only.
- Teardown: stack down, `podman ps -a --filter label=aic.tryitout` empty.
- Ledger: two 25-03 rows in .planning/spend-log.md (0.0175 not counted, 0.0182 counted)

### Agent 3: Clash prioritization
_pending_

### Agent 4: RFI generation
_pending_
