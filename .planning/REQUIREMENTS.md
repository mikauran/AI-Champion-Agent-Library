# Requirements: AIC Agent Library

**Defined:** 2026-03-19
**Core Value:** Tech evaluators and executives can find the right AI agent for their use case within seconds — through semantic search or category browsing — and understand what it does, how it works, and how to get it.

## v1 Requirements

### Data Pipeline

- [x] **PIPE-01**: Ingest pipeline parses Oracle AgentSpec YAML/JSON files into structured records using Zod schema validation
- [x] **PIPE-02**: Canonical `AgentRecord` type decouples all UI components from Oracle AgentSpec field names (shim/adapter layer)
- [x] **PIPE-03**: Ingestion is idempotent — re-running produces the same result; each record carries `last_ingested_at` timestamp
- [x] **PIPE-04**: Ingestion script can be triggered at deploy time from structured agent files in the repository

### Catalog Browse

- [x] **BROW-01**: User can browse agents organized by domain/function category
- [x] **BROW-02**: User can filter the catalog by attributes (LLM, tools, deployment type, tags)
- [x] **BROW-03**: Catalog handles 100+ agents gracefully with pagination or infinite scroll

### Search

- [ ] **SRCH-01**: User can search agents using natural language (semantic search via cosine similarity on pre-built embeddings)
- [ ] **SRCH-02**: Search combines semantic similarity with keyword/BM25 scoring for reliable short-query results
- [ ] **SRCH-03**: Search results update live as the user types (search-as-you-type)

### Agent Detail

- [x] **DETL-01**: Agent detail page shows executive summary by default (name, purpose, use cases, GitHub link)
- [x] **DETL-02**: Technical specification (LLM, tools, memory system, invocation, deployment) is shown in a collapsible section, collapsed by default
- [x] **DETL-03**: Agent detail page shows a customization panel listing which fields of the agent are tailorable (the 20%)

### Customization (Placeholder)

- [ ] **CUST-01**: Agent detail page has a "Customize" button that opens a menu — menu items are visible but non-functional in v1 (placeholder for future wizard flows)

### UI / UX

- [x] **UI-01**: Platform is responsive and usable on desktop and tablet viewports

### Try It Out (delivered outside the v1 REQ-ID system — Phases 5-7)

Added mid-project (see STATE.md "Roadmap Evolution") as a self-contained initiative branching off Phase 2. Scope was defined directly by each phase's CONTEXT.md decisions and ROADMAP.md's numbered Success Criteria rather than by pre-assigned REQ-IDs, so these are recorded here for traceability rather than folded into the numbered list above.

- [x] **Phase 5 — Try It Out Field**: optional `try_it_out` mode (none/external/runnable) threaded through schema, ingest, and the agent detail page — complete 2026-08-19 (05-CONTEXT.md, 5 success criteria, all met)
- [x] **Phase 6 — Runnable Try It Out Flow (mock-backed)**: frozen `submitJob`/`subscribeProgress`/`downloadArtifact` client contract (`docs/job-api-contract.md`) + `TryItOutPanel.svelte`, demoable end-to-end with no real backend — complete 2026-08-19 (06-CONTEXT.md, 6 success criteria, all met)
- [x] **Phase 7 — No-Container Demo Backend for Try It Out**: real SvelteKit server routes calling an LLM, replacing the mock; `?job=` refresh persistence; human-verified live against the real OpenAI API — complete 2026-08-20 (07-CONTEXT.md, 9 success criteria, all met)

## v2 Requirements

### Customization (Functional)

- **CUST-02**: MCP config wizard — user provides database schema and credentials, platform generates a configured MCP variant of the agent
- **CUST-03**: Additional customization wizard flows for other well-defined agent types

### Discovery Enhancements

- **DISC-01**: Related agents panel on detail page (similar agents by embedding distance)
- **DISC-02**: Side-by-side agent comparison view
- **DISC-03**: Agent collections / curated bundles

### Auth & Deployment

- **AUTH-01**: User can register for an account
- **AUTH-02**: Registered users can initiate agent deployment flows
- **DEPL-01**: Platform supports deployment of agents to consortium member environments

### UI Polish

- **UI-02**: Dark / light mode theme toggle
- **UI-03**: WCAG AA accessibility (keyboard nav, screen reader labels)
- **UI-04**: AgentSpec raw viewer (syntax-highlighted spec file on detail page)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Agent runtime execution | Not in scope; platform links to GitHub — no runtime environment |
| Real-time GitHub sync | Hybrid deploy-time ingestion is sufficient; real-time sync adds complexity without value at this scale |
| Dedicated vector database | ~300 agents; SQLite + in-memory cosine similarity is sufficient |
| User ratings / reviews | Closed consortium context; no audience for public social proof |
| Execution sandbox / demo | Requires runtime infrastructure; explicitly out of scope |
| Mobile-optimized layout | Desktop/tablet primary audience; mobile deferred |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 1 | Complete |
| PIPE-02 | Phase 1 | Complete |
| PIPE-03 | Phase 1 | Complete |
| PIPE-04 | Phase 1 | Complete |
| BROW-01 | Phase 2 | Complete (code) — human checkpoint 02-04 not yet executed |
| BROW-02 | Phase 2 | Complete (code) — human checkpoint 02-04 not yet executed |
| BROW-03 | Phase 2 | Complete (code) — human checkpoint 02-04 not yet executed |
| DETL-01 | Phase 2 | Complete (code) — human checkpoint 02-04 not yet executed |
| DETL-02 | Phase 2 | Complete (code) — human checkpoint 02-04 not yet executed |
| DETL-03 | Phase 2 | Complete (code) — human checkpoint 02-04 not yet executed |
| UI-01 | Phase 2 | Complete (code) — human checkpoint 02-04 not yet executed |
| SRCH-01 | Phase 3 | Pending — no plans exist yet |
| SRCH-02 | Phase 3 | Pending — no plans exist yet |
| SRCH-03 | Phase 3 | Pending — no plans exist yet |
| CUST-01 | Phase 4 | Pending — no plans exist yet |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓
- Note (added 2026-08-20 during a phase-consistency pass): 02-04-PLAN.md is Phase 2's single human-verification checkpoint for the seven rows above (`requirements:` frontmatter lists exactly BROW-01/02/03, DETL-01/02/03, UI-01) and has never been executed — no 02-04-SUMMARY.md exists. The underlying code shipped and is unit-tested (02-01/02/02/02/03), but browser-level sign-off is outstanding. See STATE.md "Missing / Open Work".
- The Try It Out initiative (Phases 5-7, all complete) is tracked separately above under "Try It Out (delivered outside the v1 REQ-ID system)" rather than in this table, since it was never assigned REQ-IDs.

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation — traceability complete*
