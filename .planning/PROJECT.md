# AIC Agent Library

## What This Is

A web-based showcase and discovery platform for the 100+ AI agents produced by the AI Champion (AIC) consortium project. Tech evaluators and executives from member companies can browse, search, and explore the agent catalog to find agents relevant to their needs, with links out to GitHub for implementation details and optional lightweight customization flows for well-defined use cases.

## Core Value

Tech evaluators and executives can find the right AI agent for their use case within seconds — through semantic search or category browsing — and understand what it does, how it works, and how to get it.

## Requirements

### Validated

- [x] Oracle AgentSpec as the canonical agent description format, with a shim layer for future spec language support — *Validated in Phase 01: data-pipeline*
- [x] Agent data sourced from structured files in GitHub (hybrid admin+deploy ingestion model) — *Validated in Phase 01: data-pipeline*

### Active

- [ ] Public catalog with browse and semantic search (cosine similarity on embeddings, no external vector DB)
- [ ] Agent detail pages with executive-friendly default view and collapsible technical specs
- [ ] Agent data sourced from structured files in GitHub (hybrid admin+deploy ingestion model) — moved to Validated
- [ ] Oracle AgentSpec as the canonical agent description format, with a shim layer for future spec language support — moved to Validated
- [ ] Simple, modern web stack — lean dependencies, no framework sprawl
- [ ] Lightweight customization flows for well-defined use cases (e.g. MCP generation from DB schema)
- [ ] Registration-gated features (deployment) deferred to post-v1

### Out of Scope

- Agent runtime execution — not in scope; link to GitHub for implementation
- Auth / user registration — deferred to post-v1
- Deployment functionality — deferred to post-v1
- Dedicated vector database — scale doesn't warrant it (few hundred agents)
- Real-time GitHub sync — hybrid file-based ingestion is sufficient

## Context

- Part of the AI Champion (AIC) consortium project, producing 100+ AI agents
- No declarative agent language has been finalized yet; Oracle AgentSpec is the current choice with a planned shim to support other formats (e.g. future consortium standard)
- Agents are "80% specified" — the remaining 20% is company-specific tailoring; the platform surfaces what's configurable and may assist with simple customization workflows
- Audience is dual: technical evaluators (primary) and executives (must be legible to both — executive summary first, technical details on demand)
- Agent pages link to GitHub for full implementation; platform is the front door, not the runtime

## Constraints

- **Tech Stack**: Modern frameworks only — prefer solutions with minimal dependency surface (e.g. SvelteKit, Astro); avoid vanilla JS/CSS sprawl or npm dependency explosions
- **Scale**: ~100-300 agents; in-memory or SQLite-backed semantic search is sufficient
- **Format**: Oracle AgentSpec as primary; architecture must support shim for alternative spec languages
- **Scope**: v1 = public catalog only (browse, search, view); no auth, no deployment

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Oracle AgentSpec as canonical format | No consortium standard finalized yet; Oracle AgentSpec is well-defined and available | — Pending |
| Shim architecture for spec languages | Future-proofs against consortium adopting a different declarative agent language | — Pending |
| In-memory/SQLite semantic search | Scale (~hundreds of agents) doesn't justify an external vector DB | — Pending |
| v1 = public catalog only, no auth | Fastest path to value; auth complexity deferred until deployment features are needed | — Pending |
| Hybrid agent data ingestion | Structured files in GitHub edited by admins, ingested at deploy time | — Pending |

---
*Last updated: 2026-08-19 — Phase 06 complete: mock-backed runnable Try It Out flow (submitJob/subscribeProgress/downloadArtifact client + TryItOutPanel.svelte), demoable end-to-end with no real backend*
