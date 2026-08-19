# Roadmap: AIC Agent Library

## Overview

Four phases deliver a public browse-and-discovery catalog for 100+ AI agents. The data pipeline is the foundational dependency — nothing else can be built until normalized agent data flows through the shim layer. Catalog browse and agent detail pages come next, sharing the same component surface. Hybrid search follows once the detail page components and curated semantic summary fields exist. The customization placeholder closes out v1 as an isolated, low-risk addition.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Pipeline** - Canonical data model, Oracle AgentSpec ingestion, SQLite store
- [ ] **Phase 2: Catalog and Detail** - Browse page, agent detail page, responsive layout
- [ ] **Phase 3: Search** - Hybrid keyword + semantic search with live results
- [ ] **Phase 4: Customization Placeholder** - Customize button and visible-but-non-functional menu
- [ ] **Phase 5: Try It Out Field** - Optional try_it_out field (none/external/runnable) threaded through schema, ingest, and detail page
- [ ] **Phase 6: Runnable Try It Out Flow (mock-backed)** - Mock-backed job client + panel for runnable mode, contract-shaped for a later real backend swap

## Phase Details

### Phase 1: Data Pipeline

**Goal**: Structured, normalized agent data flows from source YAML files through the shim layer into a queryable SQLite store
**Depends on**: Nothing (first phase)
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04
**Success Criteria** (what must be TRUE):

  1. Running the ingestion script against a directory of Oracle AgentSpec YAML files produces a populated SQLite database with one `AgentRecord` row per file
  2. Re-running ingestion on the same files produces identical records — no duplicates, `last_ingested_at` timestamp updated
  3. A malformed or invalid YAML file causes Zod validation to fail with a clear error message, leaving valid records unaffected
  4. No Oracle AgentSpec field names appear in `AgentRecord` — the canonical type uses its own naming
  5. The ingestion script runs as part of the build step without manual intervention

**Plans:** 1/2 plans executed

Plans:

- [ ] 01-01-PLAN.md — AgentRecord canonical type, Oracle AgentSpec Zod schema, adapter registry, and unit tests
- [ ] 01-02-PLAN.md — Drizzle ORM schema, ingestion script with upsert semantics, build-step integration, and integration tests

### Phase 2: Catalog and Detail

**Goal**: Users can browse the agent catalog, filter by category and attributes, and read agent detail pages with progressive disclosure for dual audiences
**Depends on**: Phase 1
**Requirements**: BROW-01, BROW-02, BROW-03, DETL-01, DETL-02, DETL-03, UI-01
**Success Criteria** (what must be TRUE):

  1. User can browse a paginated catalog page organized by domain/function categories without layout degradation at 100+ agents
  2. User can filter the catalog by at least three attributes (e.g., LLM, tools, deployment type) and see results update without a page reload
  3. User can open an agent detail page that shows name, purpose, use cases, and a GitHub link by default — no technical details visible until expanded
  4. User can expand a collapsible technical specification section to see LLM, tools, memory system, invocation, and deployment details
  5. User can see which fields of the agent are tailorable in a customization panel on the detail page
  6. All pages are usable on desktop and tablet viewports without horizontal scrolling or broken layouts

**Plans:** 3/4 plans executed

Plans:

- [ ] 02-01-PLAN.md — SvelteKit scaffold, Tailwind CSS v4, adapter-node, db singleton, tailorable fields config, Wave 0 test skeletons
- [ ] 02-02-PLAN.md — Catalog browse page with AgentCard, FilterBar (3 filters: category, model, status), Pagination, responsive grid
- [ ] 02-03-PLAN.md — Agent detail page with progressive disclosure, TechAccordion, CustomizationPanel
- [ ] 02-04-PLAN.md — Human verification checkpoint for catalog and detail pages

### Phase 3: Search

**Goal**: Users can find agents using natural language queries or short keywords, with results appearing live as they type
**Depends on**: Phase 2
**Requirements**: SRCH-01, SRCH-02, SRCH-03
**Success Criteria** (what must be TRUE):

  1. User can type a natural language query (e.g., "automate customer support") into a search bar and see semantically relevant agents ranked at the top
  2. User can type a short keyword (e.g., "SQL") and get reliable results that include agents with exact keyword matches even if embedding similarity is low
  3. Search results update live as the user types — no submit button required
  4. A labeled test set of 20+ query/result pairs passes with acceptable ranking accuracy before search is declared done

**Plans**: TBD

Plans:

- [ ] 03-01: Embedding generation script, embeddings stored in SQLite, search module with cosine similarity
- [ ] 03-02: BM25 keyword scoring, hybrid ranking, SearchBar component, and search result rendering
- [ ] 03-03: Search validation — 20-query labeled test set, model selection confirmation

### Phase 4: Customization Placeholder

**Goal**: The customization entry point is visible and accessible on agent detail pages, surfacing future wizard flows without implementing them
**Depends on**: Phase 2
**Requirements**: CUST-01
**Success Criteria** (what must be TRUE):

  1. User can see a "Customize" button on every agent detail page
  2. Clicking "Customize" opens a menu showing available customization options — items are clearly labeled but clicking them produces a "coming soon" or disabled state, not an error

**Plans**: TBD

Plans:

- [ ] 04-01: Customize button, dropdown menu with placeholder items, and disabled state handling

### Phase 5: Try It Out Field

**Goal:** Agent records support an optional `try_it_out` field (mode: none | external | runnable, url, task_template) threaded through the Drizzle schema, ingest script, and agent detail page. External mode renders a working "Try it out" link; runnable mode renders a disabled button; none/missing renders nothing. No runtime is built. One agent (e.g. rfi-triage-assistant) is set to external with a placeholder url as a working example.
**Depends on:** Phase 2
**Requirements**: none assigned (scope defined by 05-CONTEXT.md decisions D-01..D-13)
**Success Criteria** (what must be TRUE):

  1. `drizzle/schema.ts` includes a `try_it_out` field capturing mode (none|external|runnable), url, and task_template
  2. `scripts/ingest.ts` parses and writes `try_it_out` data for agents that define it
  3. Agent detail page renders: nothing for none/missing, a working link for external, a disabled button for runnable
  4. One agent (e.g. rfi-triage-assistant) has mode: external with a placeholder url visible on its detail page
  5. No runtime execution behavior is added for runnable mode

**Plans:** 2 plans

Plans:

- [ ] 05-01-PLAN.md — Tracer: try_it_out_* schema columns applied to the DB, mode-conditional Try It Out affordance on the agent detail page (external link / disabled runnable button / nothing), rfi-triage-assistant set to external with a placeholder URL
- [ ] 05-02-PLAN.md — Ingestion safe defaults + no-clobber onConflictDoUpdate omission with regression tests, full-build durability check, human verification of all three modes

### Phase 6: Runnable Try It Out Flow (mock-backed)

**Goal:** Build a mock-backed, contract-shaped "Try It Out" runnable flow that demos end-to-end with no real backend: a client layer (`src/lib/tryItOut.ts`) exposing exactly `submitJob`, `subscribeProgress`, and `downloadArtifact` per `docs/job-api-contract.md`'s frozen signatures, and a Svelte 5 `TryItOutPanel.svelte` wired into the agent detail page's `runnable` mode (replacing Phase 5's disabled placeholder button), also usable standalone with a hardcoded agentId. Swapping mock → real backend later must touch only `tryItOut.ts`, never the UI.
**Depends on:** Phase 5
**Requirements**: none assigned (scope defined by `docs/job-api-contract.md` and user-specified success criteria below)
**Success Criteria** (what must be TRUE):

  1. `src/lib/tryItOut.ts` exposes `submitJob`, `subscribeProgress`, `downloadArtifact` — all mock-backed and contract-shaped; a later real-backend swap touches only this file
  2. Mock progress events look like real `pi` tool_execution output, with timestamps (e.g. "read data/sample.csv", "read data/sample.csv (12 lines)", "write output/result.txt")
  3. `TryItOutPanel.svelte` renders a task textarea, optional file input, Run button, a live auto-scrolling progress feed, a "Download results" button on success, and a red failed state showing the error
  4. A task containing the word "fail" exercises the failed path so both outcomes are demoable
  5. The panel is wired into the runnable-mode agent detail page AND works standalone with a hardcoded agentId
  6. No real backend exists; the UI only ever calls the three client functions — no `fetch`/`EventSource`/endpoint references anywhere else in the UI

**Plans:** 3 plans

Plans:
**Wave 1**

- [ ] 06-01-PLAN.md — Tracer: complete frozen mock client (`src/lib/tryItOut.ts` — submitJob/subscribeProgress/downloadArtifact + the 4 contract types, success and fail scripts), tracer `TryItOutPanel.svelte` (Task textarea, Run, live timestamped feed), and the runnable-mode detail-page wiring replacing Phase 5's disabled button

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 06-02-PLAN.md — Panel expansion: red "Job failed" block, "Download results" button, optional file input, bounded auto-scrolling monospace log box, plus unmount/terminal/re-run subscription-cleanup tests

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 06-03-PLAN.md — COVERAGE.md no-external-API declaration, staged runnable demo row in the dev DB, and human verification of both outcomes in a browser

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6
Note: Phase 4 depends only on Phase 2 and can begin after Phase 2 completes; it does not require Phase 3. Phase 5 depends only on Phase 2 and can begin any time after Phase 2 completes. Phase 6 depends on Phase 5 (replaces its disabled runnable button).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Pipeline | 1/2 | In Progress|  |
| 2. Catalog and Detail | 3/4 | In Progress|  |
| 3. Search | 0/3 | Not started | - |
| 4. Customization Placeholder | 0/1 | Not started | - |
| 5. Try It Out Field | 1/2 | In Progress | - |
| 6. Runnable Try It Out Flow (mock-backed) | 0/3 | Not started | - |
