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

## Work queue (in order; numbers are ROADMAP phases)
1. Phase 2.1 Green Baseline, then Phase 2.2 Scale and Seed Data.
2. Phase 3 Search (plan->execute; discuss/research/patterns already done). Offline/local embeddings only, fakes in tests; use the 2.2 scale set for accuracy checks.
3. Phase 4 Customization placeholder; close Phase 2 gaps except the human checkpoint 02-04.
4. Phase 9 Try It Out hardening.
5. Phase 10 Accessibility, Phase 11 Related agents.
6. Phase 12 Agent types and intake research (use WebSearch for framework formats; docs only), then Phase 13 build behind a feature flag (default off, additive DB changes only). Phase 13 data-model decisions must each be logged with revert steps.
7. Per completed phase: code review + fix, security audit (`/gsd-secure-phase`), test-gap fill (`/gsd-add-tests`).
8. Repo-wide: dependency health (no major bumps), README/TECHNICAL_DOCUMENTATION/PROJECT.md/STATE.md sync with the code, deploy runbook.
9. Free exploration: further improvements you judge valuable (UX polish incl. dark mode/spec viewer, perf, tests, DX). Each gets a D-NNN entry with rationale and revert steps.
10. Final: milestone audit + `.planning/AUTONOMOUS-SUMMARY.md`.

## Progress at handoff
- Phase 3: CONTEXT, RESEARCH, VALIDATION, PATTERNS done and committed. Next step is `gsd-planner` (then plan-checker, execute). Do not redo discuss/research.
- Traps to honour in Phase 3 plans: see 03-RESEARCH.md and 03-PATTERNS.md (catalog.test.ts mocks, ingest.test.ts DDL/embedder, syncUrl drops q, ONNXRUNTIME_NODE_INSTALL_CUDA=skip, HF cache dir under db/).

## Review
One branch, small commits. Entry points for the human: AUTONOMOUS-SUMMARY.md, AUTONOMOUS-DECISIONS.md, AUTONOMOUS-BLOCKERS.md.
