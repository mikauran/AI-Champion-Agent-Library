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
| BROW-01 | Phase 2 | Complete |
| BROW-02 | Phase 2 | Complete |
| BROW-03 | Phase 2 | Complete |
| DETL-01 | Phase 2 | Complete |
| DETL-02 | Phase 2 | Complete |
| DETL-03 | Phase 2 | Complete |
| UI-01 | Phase 2 | Complete |
| SRCH-01 | Phase 3 | Pending |
| SRCH-02 | Phase 3 | Pending |
| SRCH-03 | Phase 3 | Pending |
| CUST-01 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation — traceability complete*
