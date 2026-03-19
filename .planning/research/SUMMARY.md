# Project Research Summary

**Project:** AIC Agent Library
**Domain:** AI agent catalog / showcase web platform (internal consortium)
**Researched:** 2026-03-19
**Confidence:** MEDIUM

## Executive Summary

This is an internal consortium catalog platform — not an AI system, but a browse-and-discovery website for AI agents contributed by AIC member organizations. The platform's job is to surface the right agent to the right evaluator in seconds, with a single page that serves both executive and technical audiences through progressive disclosure. Experts build this class of product with a static or SSR web framework, a build-time ingestion pipeline that normalizes structured spec files into a stable internal data model, and in-memory or SQLite-backed semantic search — with no external services required. SvelteKit 2 with Svelte 5 is the clear framework choice given the explicit project constraint on lean dependencies (12 direct deps versus Astro's 55), and all search infrastructure runs locally at ingestion time, with no API keys or vector database required at runtime.

The recommended approach is: ingest Oracle AgentSpec YAML files through an adapter shim layer at build time, producing a canonical `AgentRecord` type that the entire UI and search system consumes; generate float32 embeddings locally using `@huggingface/transformers` and store them alongside the catalog in SQLite (or as a binary bundle); serve the catalog as a SvelteKit app with server-side rendering and static pre-rendered agent detail pages; and implement hybrid keyword + cosine similarity search. The data pipeline is the critical dependency — nothing else can be built until structured, normalized agent data is available and flowing through the system.

The primary risks are: (1) broken semantic search at small scale (avoid by using hybrid BM25 + cosine similarity and validating with 20 real test queries before declaring search done), (2) Oracle AgentSpec field names leaking into the UI and search layers before a real shim boundary is established (avoid by defining the internal canonical model before any component touches agent data), and (3) premature infrastructure complexity (avoid by committing to a single-process, single-SQLite-file architecture for v1 and requiring explicit justification for any external service). Over-engineering is the most recoverable pitfall only if caught early — once distributed infrastructure is deployed mid-project, the recovery cost is high.

## Key Findings

### Recommended Stack

SvelteKit 2 + Svelte 5 handles both the catalog UI and server-side search API routes in a single framework with 12 direct dependencies, TypeScript-first, with SSR and static adapter options. Tailwind CSS 4 (Vite plugin, no PostCSS config) handles styling. The data layer is `better-sqlite3` for the catalog and search index (synchronous, no separate process), Drizzle ORM for type-safe queries, and `@huggingface/transformers` for local ONNX embedding generation at build time only. Zod validates all AgentSpec ingestion at runtime to catch malformed files before they corrupt the index. No external services are required in development or production.

For the deployment pattern best suited to this project: run ingestion as part of the build step, include the SQLite artifact in the deployment, and query it from SvelteKit server routes. `@huggingface/transformers` is a devDependency (ingestion only). For static hosting, embed agent data and embeddings as JSON/binary in the build and execute cosine similarity client-side.

**Core technologies:**
- SvelteKit 2.55.0 + Svelte 5.54.0: full-stack framework and component layer — fewest dependencies, TypeScript-first, handles both UI and API routes
- TypeScript 5.9.3: required for safe AgentSpec schema ingestion and shim architecture
- Tailwind CSS 4.2.2: utility CSS via Vite plugin — no PostCSS, no config file
- better-sqlite3 12.8.0: synchronous SQLite driver — catalog store and embedding BLOB columns
- @huggingface/transformers 3.8.1: local ONNX embedding generation at build time, no API key or network call
- Zod 4.3.6: runtime validation of AgentSpec files at ingest time
- Drizzle ORM 0.45.1: type-safe SQL over better-sqlite3 with zero runtime overhead
- Vitest 4.1.0: unit and integration testing for ingestion pipeline and search logic

### Expected Features

The agent data ingestion pipeline is the foundational dependency — every display and search feature blocks on it. The dual-audience agent detail page (executive summary above the fold, collapsible technical spec below) is the single most important UX pattern explicitly called out in the project constraints. Semantic search is not optional for this audience: an AI tool catalog without semantic search feels broken to technical evaluators.

**Must have (table stakes — v1 launch):**
- Agent data ingestion pipeline with Oracle AgentSpec shim — unblocks everything
- Catalog browse page with category/domain taxonomy and tag filtering — 100+ agents requires faceted narrowing
- Keyword + semantic (hybrid) search — stated core value proposition
- Agent detail page with dual-audience progressive disclosure — exec summary default, collapsible tech spec
- AgentSpec viewer / renderer on detail page — technical credibility signal
- Stable, shareable slug URLs — evaluators share links async
- Maturity / status indicators (Production / Beta / Experimental) — quality signal
- Consortium provenance display — trust signal for governance-conscious executives
- Lightweight customization flow (at least one use case, e.g., MCP config from DB schema) — validates "80/20 done" value proposition
- Responsive layout and fast page loads — baseline expectations

**Should have (competitive differentiators — v1.x after validation):**
- Related agents / recommendations — embedding similarity is already available from search, low marginal cost
- Side-by-side agent comparison — validate need from user behavior before building
- Collections / bundles — editorial curation ("Starter pack for Accounts Payable"), low effort, high executive value
- Use-case / scenario matching — map business language to agents; add after observing failed search queries

**Defer (v2+):**
- User accounts, saved favorites, bookmarks — adds auth complexity; shareable URLs serve the same use case for v1
- Deployment and provisioning flows — requires org-specific integration work, explicitly out of scope for v1
- Additional customization flow types — expand after first flow is proven
- Consortium member submission portal — admin UI for members to submit agents without GitHub access

**Anti-features (do not build):**
- User ratings and reviews — political in closed consortium context; adds auth complexity
- Agent execution / demo sandbox — explicitly not a runtime platform
- Real-time GitHub sync via webhooks — overengineered for catalog cadence; build-time ingestion is correct
- Commenting / discussion threads — requires moderation; consortium uses existing communication channels

### Architecture Approach

The recommended architecture is a build-time ingestion pipeline that reads agent YAML files, normalizes them through a spec shim/adapter registry into a stable internal `AgentRecord` type, generates float32 embeddings locally, and writes both to a SQLite file deployed with the app. The SvelteKit presentation layer serves the catalog and agent detail pages (SSR or SSG), loads the catalog data once at startup, and performs all search as in-process cosine similarity over a Float32Array — no server round-trips, no external services. The customization wizard is a client-side multi-step form isolated from catalog code. At 300 agents, the entire embedding bundle is approximately 460 KB uncompressed (~200 KB gzipped), well within acceptable transfer bounds.

**Major components:**
1. Spec Shim Layer (`lib/spec/`) — adapter registry mapping format IDs to `AgentRecord`; the boundary that prevents spec format details from leaking into the rest of the codebase
2. Build-time Ingestion Scripts (`scripts/ingest.ts`, `scripts/generate-embeddings.ts`) — reads source YAML, runs shim, generates embeddings, writes SQLite artifact; must be idempotent (upsert semantics)
3. Catalog Store (`lib/catalog/store.ts`) — in-memory AgentRecord[] loaded once at startup; filter logic in `lib/catalog/filters.ts` is pure and independently testable
4. Search Module (`lib/search/`) — loads embeddings.bin, implements cosine similarity over pre-normalized Float32Array; pure TypeScript, no external runtime deps
5. Catalog Browse / Filter UI (`routes/+page.svelte`) — paginated grid with category and tag filters; must paginate at 100+ agents to avoid layout shift on mobile
6. Agent Detail Page (`routes/agents/[slug]/+page.svelte`) — progressive disclosure layout: exec summary above fold, `TechAccordion` for spec fields, GitHub CTA as primary action
7. Customization Wizard (`routes/wizards/[type]/`) — isolated component tree; generation logic in `lib/wizards/mcp/generate.ts` is a pure function with no UI dependency

**Build order constraint:** spec types → adapters → ingestion scripts → catalog store → search module → UI components → routes. The wizard is independent and can be built in parallel with UI components.

### Critical Pitfalls

1. **Broken semantic search at small scale** — At 100–300 agents, bad cosine similarity ranking is highly visible. Avoid by: embedding only a curated semantic summary field (not the full spec), implementing hybrid BM25 + cosine similarity scoring (60/40 weight is a good starting point), and validating with a labeled test set of 20+ query/result pairs before declaring search done. The hybrid approach also compensates for embedding model failures on technical vocabulary.

2. **AgentSpec field names leaking through the shim boundary** — If the internal `AgentRecord` type mirrors AgentSpec field names, adding a second spec format requires touching every component and query. Avoid by: defining the canonical model before any UI component is built; naming the internal type `AgentRecord` (not `OracleAgent` or `AgentSpec`); and writing a test that loads a hand-crafted non-AgentSpec JSON through the shim and asserts the output canonical model is correct.

3. **Catalog data staleness from non-idempotent ingestion** — If the ingestion pipeline uses append semantics, re-running it creates duplicates and discourages re-ingestion, causing the catalog to diverge from GitHub source. Avoid by: implementing upsert semantics from day one; adding a `last_ingested_at` field to each catalog record; and defining an explicit SLA for catalog freshness (e.g., "catalog reflects GitHub within 48 hours").

4. **Dual-audience view decomposed into separate pages/routes** — Two separate pages for executives and engineers doubles UI surface area and serves neither audience well. Avoid by: designing the agent detail page as a single progressive disclosure page before any implementation begins; the top half is the exec view, the collapsible accordion is the tech view.

5. **Over-engineering a 300-agent catalog into distributed infrastructure** — Redis, separate microservices, external vector databases, and message queues are all inappropriate at this scale. Enforce a hard constraint in writing: the entire application runs as a single process with a single SQLite file and no external services required for local development or production.

## Implications for Roadmap

Based on the research, the dependency graph is clear: data pipeline must precede all display work, and the canonical data model must precede the pipeline. Semantic search can be built concurrently with early UI work but requires the pipeline to be running first. The customization wizard is isolated and can be deferred or built in parallel.

### Phase 1: Foundation — Data Model, Ingestion Pipeline, and Schema

**Rationale:** Everything else blocks on this. No UI component can be built until the canonical `AgentRecord` type is defined and agent data is flowing through the shim. This is also where the most costly pitfalls (AgentSpec lock-in, non-idempotent ingestion, stale catalog) must be prevented — before any dependent work begins.
**Delivers:** `AgentRecord` canonical type, Oracle AgentSpec adapter, ingestion script with upsert semantics, SQLite schema with `last_ingested_at`, initial agent data loaded and queryable
**Addresses:** Agent data ingestion pipeline (P1), stable shareable URLs (slug field established here), consortium provenance and maturity status fields
**Avoids:** AgentSpec structural lock-in (Pitfall 2), non-idempotent ingestion (Pitfall 4), search index sync issues (Pitfall 6)
**Research flag:** LOW — well-established adapter/shim patterns; verify Oracle AgentSpec field structure against actual spec files before implementation

### Phase 2: Catalog Browse and Agent Detail Pages

**Rationale:** With a working data pipeline, the primary user-facing surfaces can be built. The agent detail page layout contract (progressive disclosure, not split routes) must be established here before content is written for both views. Category taxonomy must be use-case language, not engineering language.
**Delivers:** Catalog home page with paginated agent grid, category/tag filtering, agent detail page with progressive disclosure (exec summary + TechAccordion), AgentSpec viewer, maturity badges, consortium provenance, GitHub CTA as primary action, stable slug URLs
**Uses:** SvelteKit dynamic routes, Svelte 5 components, Tailwind CSS 4, catalog store, filter logic
**Implements:** Catalog Browse/Filter UI, Agent Detail Page components, AgentCard
**Avoids:** Dual-audience split pages (Pitfall 3), raw spec fields on catalog cards (UX pitfall), buried GitHub links (UX pitfall), rendering all 300 agents without pagination (performance trap)
**Research flag:** LOW — SvelteKit SSR/SSG patterns are well-documented; progressive disclosure UX is a standard pattern

### Phase 3: Hybrid Search

**Rationale:** Search is a stated core value proposition and cannot be retrofitted post-launch. However, it requires the ingestion pipeline (Phase 1) to be producing `AgentRecord` data with curated semantic summary fields before embedding generation can run. Building search after the catalog browse surfaces means the search result rendering components already exist.
**Delivers:** Local embedding generation at build time (using `@huggingface/transformers` as devDependency), embeddings stored in SQLite, in-process cosine similarity search, BM25 keyword scoring hybrid, search bar UI, result rendering (reusing AgentCard), empty state handling, labeled test set validation (20+ query/result pairs)
**Uses:** `@huggingface/transformers` 3.8.1, `better-sqlite3`, `lib/search/embeddings.ts`, `lib/search/index.ts`
**Implements:** Search Module architecture component, SearchBar Svelte component, embedding generation script
**Avoids:** Broken semantic search at small scale (Pitfall 1) — hybrid scoring and test set validation are requirements, not options; embedding model mismatch (same model for build-time docs and runtime queries); fetching all catalog from DB on every search (load into memory at startup)
**Research flag:** MEDIUM — hybrid BM25 + cosine implementation patterns are well-documented, but the specific embedding model behavior on short technical agent descriptions should be validated with real agent data early; recommend building the test set in Phase 2 before search implementation begins

### Phase 4: Customization Wizard (MCP Config Generation)

**Rationale:** The "80/20 completion" value proposition is explicitly required for v1. The wizard is architecturally isolated — it depends on agent detail pages for context but has no other dependencies on catalog or search infrastructure. Building it last avoids wizard complexity leaking into catalog code.
**Delivers:** Multi-step MCP config generation wizard for at least one well-defined use case (DB schema input → generated MCP YAML download), accessible from agent detail pages, pure client-side generation (no server call), wizard generation logic as independently testable pure TypeScript function
**Uses:** `routes/wizards/[type]/`, `lib/wizards/mcp/generate.ts`, SvelteKit client-side routing
**Implements:** Customization Wizard architecture component
**Avoids:** One-giant-wizard-component anti-pattern (Pitfall); keep step components and generation logic separate
**Research flag:** LOW for wizard UI patterns; MEDIUM for MCP config format specifics — verify the exact MCP YAML schema required before implementation

### Phase 5: Discovery Enhancements (v1.x)

**Rationale:** These features add significant value but are not blocking for launch. They can be validated by observing real usage patterns (which search queries fail, whether evaluators open multiple tabs to compare agents) before investing implementation time.
**Delivers:** Related agents / recommendations (embedding similarity reuses Phase 3 infrastructure), side-by-side agent comparison, editorial collections/bundles, use-case/scenario search taxonomy
**Avoids:** Building features before validating the need with real user behavior
**Research flag:** LOW for related agents (same infrastructure as search), MEDIUM for comparison UI and collections (requires editorial investment and taxonomy decisions)

### Phase Ordering Rationale

- Phase 1 before all others: the canonical data model is the contract everything else depends on; changing it after UI components exist is expensive
- Phase 2 before Phase 3: agent detail page components exist before search results need to render them; category taxonomy is established before use-case matching (Phase 5) is designed
- Phase 3 after Phase 2: curated semantic summary fields (needed for good embeddings) are defined during Phase 2 agent detail design; embedding test set can be assembled from real catalog content
- Phase 4 can begin after Phase 2: detail page context exists; no dependency on search
- Phase 5 deferred: requires real usage data and Phase 3 embedding infrastructure to be running

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Hybrid Search):** Validate embedding model behavior on actual Oracle AgentSpec content early. The curated semantic summary field design is critical and should be treated as a design artifact, not an implementation detail. Also validate that `all-MiniLM-L6-v2` (384 dims, ~22 MB ONNX) is the right model choice for technical agent descriptions before committing to it.
- **Phase 4 (Customization Wizard):** Verify the exact MCP YAML config schema and required fields before implementation. The wizard is only valuable if the output is immediately usable.

Phases with standard patterns (can skip research-phase):
- **Phase 1 (Data Pipeline):** Adapter/shim pattern and SQLite upsert semantics are well-established; verify Oracle AgentSpec field names against real spec files, but no broader research needed
- **Phase 2 (Catalog UI):** SvelteKit SSR + Svelte 5 component patterns are well-documented; progressive disclosure UX is standard
- **Phase 5 (Discovery Enhancements):** Related agents via cosine similarity over existing embeddings is straightforward once Phase 3 infrastructure exists

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified against npm registry; dependency counts verified directly from package metadata; technology choices are well-justified against explicit project constraints |
| Features | MEDIUM | Core catalog/directory UX patterns are stable and HIGH confidence; competitor analysis (Smithery, Hugging Face Hub) based on training knowledge through August 2025, not live verification; Oracle AgentSpec field structure not directly inspected |
| Architecture | MEDIUM | Patterns (static artifact, adapter registry, client-side cosine search) are well-established; SvelteKit 2.x route conventions should be verified against current docs before implementation; Oracle AgentSpec structural details are LOW confidence |
| Pitfalls | MEDIUM | Grounded in documented precedents from comparable platforms (Backstage, Artifact Hub, npm registry); external search unavailable for verification; all pitfalls are actionable regardless of source confidence |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Oracle AgentSpec field structure:** The actual fields, types, and nesting of the Oracle AgentSpec format were not directly inspected. The shim adapter design depends on understanding these fields. Before Phase 1 implementation, obtain the actual spec schema or example files and validate the `AgentRecord` canonical model design against them.

- **Embedding model selection for short technical descriptions:** The recommendation is `all-MiniLM-L6-v2` (384 dims) but this has not been validated against actual agent description content. Build the 20-query test set during Phase 2 and run it against at least two model options before committing.

- **Category taxonomy:** The research recommends use-case language ("automate customer support") over engineering language ("NLP pipeline agents") but the specific taxonomy must be derived from actual agent data. This is a design artifact to produce during Phase 2, not a code decision.

- **MCP YAML config schema:** The exact format required for the customization wizard output is not verified. This must be resolved before Phase 4 implementation begins.

- **Competitor live verification:** Feature analysis of Smithery and Hugging Face Hub is based on training data through August 2025. Recommend a brief live review before finalizing the feature taxonomy, particularly for search UX patterns.

## Sources

### Primary (HIGH confidence)
- npm registry (`registry.npmjs.org`) — version verification and dependency counts for all recommended packages
- PROJECT.md — project constraints, scope decisions, audience definition, explicit feature requirements
- `@huggingface/transformers@3.8.1` package metadata — confirmed 4 direct dependencies

### Secondary (MEDIUM confidence)
- SvelteKit 2.x documentation patterns (training knowledge) — route conventions, adapter options, server hooks
- Backstage software catalog (backstage.io) — ingestion pipeline patterns, staleness handling, shim architecture analogies
- Artifact Hub, npmjs.com — catalog UX patterns for browse, filter, and detail pages
- Smithery (smithery.ai), Hugging Face Hub — competitor feature patterns (training knowledge through August 2025)
- Weaviate and Elasticsearch documentation — hybrid search scoring recommendations for small corpora
- Nielsen Norman Group — progressive disclosure UX for mixed-expertise audiences

### Tertiary (LOW confidence)
- Oracle AgentSpec structure — inferred from project constraints and general YAML agent spec conventions; not directly inspected; must be verified before Phase 1 implementation
- MCP YAML config format specifics — assumed standard format; must be verified before Phase 4 implementation

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*
