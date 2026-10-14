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
_pending_

### Agent 3: Clash prioritization
_pending_

### Agent 4: RFI generation
_pending_
