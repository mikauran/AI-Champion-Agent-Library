# AIC Agent Library

## What This Is

A web-based showcase and discovery platform for the 100+ AI agents produced by the AI Champion (AIC) consortium project. Tech evaluators and executives from member companies can browse, search, and explore the agent catalog to find agents relevant to their needs, with links out to GitHub for implementation details and optional lightweight customization flows for well-defined use cases.

## Core Value

Tech evaluators and executives can find the right AI agent for their use case within seconds — through semantic search or category browsing — and understand what it does, how it works, and how to get it.

## Requirements

### Validated

- [x] Oracle AgentSpec as the canonical agent description format, with a shim layer for future spec language support — *Validated in Phase 01: data-pipeline*
- [x] Agent data sourced from structured files in GitHub (hybrid admin+deploy ingestion model) — *Validated in Phase 01: data-pipeline*

### Built since (automated-test green; some live checks pending human, see STATE.md "Deferred Verification")

- [x] Public catalog with browse and hybrid search (BM25 + local sentence embeddings, no external vector DB) — Phases 2, 3
- [x] Agent detail pages with executive summary first and collapsible technical specs — Phase 2
- [x] Lightweight customization entry point (Customize menu) — Phase 4; MCP generator behind `MCP_GENERATOR` (CUST-02) — Phase 14
- [x] Try It Out: optional per-agent mode, mock then real backend, container-backed Pi runner warmed on visit, hardened — Phases 5-9
- [x] Accessibility (WCAG AA targets, UI-03) — Phase 10; related agents (DISC-01) — Phase 11
- [x] Multi-agent and multi-format hosting behind `AGENT_KINDS` (default off) — Phase 13; MCP test platform behind `MCP_TESTER` (default off) — Phase 15
- [x] Simple, modern web stack — SvelteKit, SQLite, Drizzle; later phases added `@huggingface/transformers` (local embeddings), `dockerode`/`tar-stream`/`fflate`/`openai` (Try It Out, generator) and `axe-core` (dev, accessibility tests); see `package.json`

### Active

- [ ] Human verification of Phase 2 (02-04) and the pending-human checks of Phases 3, 4, 9, 10, 11, 13, 14, 15
- [ ] Production build is currently blocked by B-002 (route-module exports); fix before deploy
- [ ] Registration-gated deployment features (AUTH-02, DEPL-01) remain deferred; authentication exists as passwordless allow-list sign-in (`AUTH_ENABLED`, default on)

### Out of Scope

- Agent runtime execution of the catalog agents — not in scope; link to GitHub for implementation (the flagged Try It Out demo runs only configured demo agents in sandboxed containers)
- User registration and account-based features — deferred (a passwordless allow-list sign-in gate exists, see `README.md`)
- Deployment functionality — deferred to post-v1
- Dedicated vector database — scale doesn't warrant it (few hundred agents)
- Real-time GitHub sync — hybrid file-based ingestion is sufficient

## Context

- Part of the AI Champion (AIC) consortium project, producing 100+ AI agents
- No declarative agent language has been finalized yet; Oracle AgentSpec is the current choice with a planned shim to support other formats (e.g. future consortium standard)
- Agents are "80% specified" — the remaining 20% is company-specific tailoring; the platform surfaces what's configurable and may assist with simple customization workflows
- Audience is dual: technical evaluators (primary) and executives (must be legible to both — executive summary first, technical details on demand)
- Agent pages link to GitHub for full implementation; platform is the front door, not the runtime

## Research docs

Phase 12 research on agent types and intake (implemented in Phase 13 behind `AGENT_KINDS`, default off; see also `../docs/phase13-adapters.md`): [agent-types](../docs/agent-types.md), [capability matrix](../docs/agent-capability-matrix.md), [intake guide](../docs/agent-intake-guide.md), [decision memo](../docs/agent-hosting-decision-memo.md).

## Constraints

- **Tech Stack**: Modern frameworks only — prefer solutions with minimal dependency surface (e.g. SvelteKit, Astro); avoid vanilla JS/CSS sprawl or npm dependency explosions
- **Scale**: ~100-300 agents; in-memory or SQLite-backed semantic search is sufficient
- **Format**: Oracle AgentSpec as primary; architecture must support shim for alternative spec languages
- **Scope**: v1 = catalog (browse, search, view), behind an allow-list sign-in that can be switched off; no registration, no deployment. Later phases add Try It Out and three default-off feature flags

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Oracle AgentSpec as canonical format | No consortium standard finalized yet; Oracle AgentSpec is well-defined and available | Good: Phase 1 shipped it; Phase 13 adds other formats via adapters |
| Shim architecture for spec languages | Future-proofs against consortium adopting a different declarative agent language | Good: Phase 13 adapters plug in behind the same boundary |
| In-memory/SQLite semantic search | Scale (~hundreds of agents) doesn't justify an external vector DB | Built in Phase 3 (embeddings in SQLite, in-TS BM25 + cosine); real-model quality run pending human |
| v1 = public catalog only, no auth | Fastest path to value; auth complexity deferred until deployment features are needed | Revised: an allow-list passwordless sign-in was added later (`AUTH_ENABLED`, default on) |
| Hybrid agent data ingestion | Structured files in GitHub edited by admins, ingested at deploy time | Good: `npm run ingest` at build time, idempotent |
| Flag-gated additive features (Phases 13-15) | Keep flag-off behaviour byte-identical; additive DB changes only | Pinned by `scripts/flag-off.golden.test.ts`; decisions in `.planning/AUTONOMOUS-DECISIONS.md` |

---
*Last updated: 2026-10-13 — synced after the autonomous run (Phases 2.1-15 built; see STATE.md). Previous: 2026-08-20 — Phase 07 complete: real (no-container) SvelteKit demo backend for Try It Out, replacing Phase 6's mock — three job routes, a single real OpenAI call, and `?job=` refresh persistence, human-verified live against the deployed API*
