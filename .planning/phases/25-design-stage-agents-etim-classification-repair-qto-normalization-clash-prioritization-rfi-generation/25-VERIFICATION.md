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
_pending_

### Agent 2: QTO normalization
_pending_

### Agent 3: Clash prioritization
_pending_

### Agent 4: RFI generation
_pending_
