# Autonomous overnight run — charter

Branch: `autonomous/overnight-improvements` (from `agent-integration` @ be11fd2)
Goal: spend leftover token budget on reviewable, low-risk improvements. The human reviews everything afterwards.

## Guardrails (hard)
- Work only on this branch. Never push, never merge, never touch `main`, `agent-integration`, or remotes.
- No deploys, no `podman`/docker runs against real hosts, no calls to paid external APIs (OpenAI etc.). Use fakes/mocks.
- Never ask the user questions. Pick the recommended default and log it.
- No destructive changes to `data/`, `db/`, or the existing DB. No dependency major-version bumps without a logged reason.
- Every decision of substance goes in `.planning/AUTONOMOUS-DECISIONS.md` (decision, alternatives, why, how to revert).
- Small atomic commits. Tests/typecheck must pass before each phase is marked done; if they cannot, stop that phase and log it in `.planning/AUTONOMOUS-BLOCKERS.md`, then move on.
- Human-verification checkpoints (e.g. 02-04): do not fake them. Mark as "pending human" and continue.

## Work queue (in order)
1. Phase 3 — Search (discuss→plan→execute with --auto defaults). Embeddings: use a local/offline-capable approach or an injectable provider with a fake for tests; no paid calls.
2. Phase 4 — Customization placeholder.
3. Close Phase 2 gaps except the human checkpoint.
4. Per completed phase: code review + fix, security audit (`/gsd-secure-phase`), test-gap fill (`/gsd-add-tests`).
5. Whole-repo passes: code review of Phase 8 container/lease/proxy code, dependency/typecheck/lint health, README/TECHNICAL_DOCUMENTATION sync with the code.
6. Free exploration: after 1-6, propose and implement further improvements you judge valuable (UX polish, perf, test coverage, DX, accessibility). Each one gets a D-NNN entry with rationale and revert steps. Stay inside the guardrails.
7. Final: milestone audit + `.planning/AUTONOMOUS-SUMMARY.md` (what changed, decisions, open questions, what needs human eyes first).

## Progress at handoff
- Phase 3: CONTEXT, RESEARCH, VALIDATION, PATTERNS done and committed. Next step is `gsd-planner` (then plan-checker, execute). Do not redo discuss/research.
- Traps to honour in Phase 3 plans: see 03-RESEARCH.md and 03-PATTERNS.md (catalog.test.ts mocks, ingest.test.ts DDL/embedder, syncUrl drops q, ONNXRUNTIME_NODE_INSTALL_CUDA=skip, HF cache dir under db/).

## Review
One branch, small commits. Entry points for the human: AUTONOMOUS-SUMMARY.md, AUTONOMOUS-DECISIONS.md, AUTONOMOUS-BLOCKERS.md.
