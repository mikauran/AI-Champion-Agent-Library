# Pitfalls Research

**Domain:** AI agent catalog / showcase web platform
**Researched:** 2026-03-19
**Confidence:** MEDIUM (no external search available; based on established patterns in catalog platform development, embedding search implementation, and spec versioning — all well-precedented domains)

---

## Critical Pitfalls

### Pitfall 1: Semantic Search That Feels Broken at Small Scale

**What goes wrong:**
With ~100–300 agents, cosine similarity over raw embeddings returns results that feel nonsensical or unhelpful. Users search "customer support automation" and get an unrelated DevOps agent ranked #1. Trust is lost immediately. The catalog is effectively unusable for discovery because keyword search would have been more reliable.

**Why it happens:**
Embedding models optimized for general-purpose text retrieval don't align well with short, structured agent descriptions. Agent specs tend to be dense with noun phrases and category labels ("incident response," "SQL query generation") rather than natural prose. The semantic space encodes surface vocabulary overlap as much as conceptual overlap. When there are only 100 items, a single bad rank feels much worse than it does in a 10,000-item corpus — there's no crowd of correct results to hide behind.

Additionally, teams often embed the full spec document including boilerplate fields (metadata headers, schema version strings, license fields) that dilute the semantic signal from the meaningful description and capability fields.

**How to avoid:**
- Embed a curated "semantic summary" field constructed from the agent's description, capabilities, and use-case fields — not the full raw spec document.
- Use a domain-tuned embedding model or a model trained on technical documentation rather than general web text (e.g. `text-embedding-3-large` from OpenAI or `nomic-embed-text` handle technical content better than older Ada-002 at the same cost).
- Hybrid search from day one: combine cosine similarity score with BM25/token-overlap score, weighted 60/40 or tunable. At small scale, keyword signal is highly reliable and compensates for embedding failures.
- Build a small labeled test set (20–30 query/expected-result pairs) before shipping search — run it against each embedding strategy choice. This takes one hour and prevents shipping broken search.

**Warning signs:**
- Search results look "random" for obvious queries during internal testing.
- The top result for a specific agent name is not that agent.
- Users start using category browse instead of search to find things they know exist.
- Feedback mentions "the search doesn't work."

**Phase to address:** Catalog search foundation phase (whichever phase implements the search backend). The hybrid approach and test set must be built before the feature is called done — not retrofitted post-launch.

---

### Pitfall 2: Oracle AgentSpec Structural Lock-In Without a Real Shim Boundary

**What goes wrong:**
The shim layer for "future spec language support" gets built as a thin rename mapping (rename field A to field B) rather than a real semantic translation layer. When a second spec format arrives — whether a consortium standard, an open standard, or internal v2 — it doesn't map cleanly to AgentSpec's conceptual model. The shim breaks, or worse, silently misrepresents agents ingested from the new format. The data model throughout the system has leaked AgentSpec-specific concepts (field names, enumeration values, structural nesting) into UI components, search indexes, and API shapes.

**Why it happens:**
Building a shim is treated as an afterthought — "we'll make it flexible later." The internal data model used for storage and display starts as a direct copy of AgentSpec. Every component that consumes agent data does so in AgentSpec terms. When a shim is eventually added, it must fight the entire codebase's implicit assumptions rather than just a single boundary.

The other failure mode: the shim is designed but never exercised. No second spec is ever loaded during development, so structural assumptions accumulate invisibly.

**How to avoid:**
- Define an **internal canonical model** distinct from AgentSpec on day one. This is the model that the database, UI, and search index speak. The AgentSpec ingester maps AgentSpec → canonical model. When a second spec arrives, it gets its own ingester → canonical model.
- The canonical model should be driven by what the UI and search need, not by what AgentSpec provides. Fields that AgentSpec has but the platform never displays should not appear in the canonical model.
- Write a test: load a "fake second spec" (even a hand-crafted JSON with different field names) through the shim boundary and assert that the output canonical model is identical. This test forces the boundary to be real.
- Do not leak AgentSpec type names into UI component props or search schemas.

**Warning signs:**
- UI component prop names match AgentSpec field names verbatim.
- The internal data model type is named `AgentSpec` or `OracleAgent` rather than `Agent` or `AgentRecord`.
- The shim file has only 5–10 lines and is just a field rename map.
- No test exists that exercises the shim with a non-AgentSpec input.

**Phase to address:** Data ingestion / schema design phase. The canonical model and the ingester-as-boundary must be established before any UI component or search indexer touches agent data.

---

### Pitfall 3: Executive/Engineer Dual View Designed as Two Separate Pages

**What goes wrong:**
The team designs an "executive summary view" and a "technical detail view" as two separate routes or components, then spends substantial time maintaining both. Neither audience uses the product as intended: engineers click through to GitHub immediately and ignore the technical view; executives get lost navigating between views. The feature that was meant to serve both audiences actually serves neither well.

**Why it happens:**
"Two audiences" is mentally mapped to "two views," which is a natural but wrong decomposition. The audiences don't diverge at the page level — they diverge at the information density level within a single agent's page. Executives need the same page as engineers; they just need to stop reading earlier.

**How to avoid:**
- Design the agent detail page as a single progressive disclosure page: executive-legible headline, one-paragraph plain-language description, and key metadata above the fold. Everything technical — spec fields, capability enumerations, configuration parameters, integration details — lives in collapsible sections below. The page works for both audiences without any routing or view switching.
- Test with a non-technical stakeholder: can they read the top half and answer "what does this agent do and who should care?" within 30 seconds? That's the executive bar.
- The "collapsible technical details" pattern is well-understood (GitHub's "Show more" for README content, npm's "Show full README") — borrow it directly rather than inventing a custom tabbed UI.

**Warning signs:**
- Figma/design has two separate wireframe pages for "executive view" and "engineer view."
- A routing path like `/agent/:id/summary` vs `/agent/:id/technical` appears in the design.
- Engineers on the team say "executives won't read the technical bits anyway" as justification for splitting views.

**Phase to address:** UI design phase (before any agent detail page implementation). The layout contract — progressive disclosure on a single page — must be established in the design artifact and not relitigated during implementation.

---

### Pitfall 4: Catalog Data Going Stale as GitHub Source Evolves

**What goes wrong:**
Agents are updated in GitHub (descriptions improved, capabilities added, bugs fixed in spec files) but the catalog shows outdated information for weeks or months. Users reference a capability that was removed, or miss a new agent because it was added after the last manual ingestion run. The catalog loses credibility as a source of truth.

**Why it happens:**
"Hybrid admin+deploy ingestion" sounds robust, but without an explicit operational contract for when re-ingestion happens, it defaults to "whenever someone remembers." The GitHub source evolves continuously; the catalog's ingestion is event-driven by humans. The gap widens silently — there is no alert, no dashboard, no staleness indicator.

The second failure mode: the ingestion pipeline is not idempotent. Re-running it on an already-ingested catalog corrupts data, creates duplicates, or loses edits made directly to the catalog DB. This discourages re-ingestion.

**How to avoid:**
- Make re-ingestion a one-command, zero-risk operation from day one. It must be safe to run repeatedly. Implement upsert semantics (insert-or-replace by canonical agent ID), not append semantics.
- Add a `source_commit_sha` or `last_ingested_at` field to each catalog record, visible somewhere in the admin or health surface. This makes staleness visible rather than invisible.
- Define an explicit SLA for catalog freshness in the project docs (e.g. "catalog reflects GitHub within 48 hours of a commit to the spec files"). Without a stated SLA, freshness becomes indefinitely deferred.
- Consider a lightweight CI hook on the GitHub repository that triggers re-ingestion on commits to the agent spec directory. Even a manual `workflow_dispatch` GitHub Action is better than pure human memory.

**Warning signs:**
- The ingestion script has append (INSERT) semantics without deduplication.
- There is no `last_ingested_at` or equivalent field in the catalog schema.
- Nobody can answer "when was the catalog last updated?" within 30 seconds.
- A new agent was added to GitHub but is not in the catalog.

**Phase to address:** Data ingestion pipeline phase. Idempotency, staleness visibility, and the re-ingestion trigger mechanism must be defined before the ingestion pipeline is called complete.

---

### Pitfall 5: Over-Engineering a Simple Catalog Into a Distributed System

**What goes wrong:**
The team adds a Redis cache for search results, a separate microservice for the ingestion pipeline, a message queue for "future async workflows," and a dedicated vector database — for a catalog of 200 agents serving a few hundred consortium members. The system has more moving parts than the problem warrants. Deployments become complicated, local development requires Docker Compose with five services, and the team spends more time on infrastructure than on catalog features.

**Why it happens:**
Resume-driven development and misapplied "production readiness" thinking. The team knows how to build distributed systems and defaults to those patterns regardless of scale. "We'll need it eventually" is the justification, but eventually never arrives because the catalog stays at 200 agents. The cost of complexity is paid immediately; the benefit is never realized.

This project is particularly vulnerable because "AI" in the name attracts assumptions about ML infrastructure requirements. A catalog of AI agents does not itself need AI infrastructure beyond a single embedding model call at ingestion time.

**How to avoid:**
- Hard constraint: the entire application must run as a single process with a single SQLite file (or in-memory store during build). No external services required for local development or production.
- Embeddings are computed once at ingestion and stored as BLOB columns in SQLite. Search is a cosine similarity computation over a few hundred vectors — this runs in <10ms in-process with no external service.
- When a new infrastructure component is proposed, require an explicit justification: "at current and projected scale (300 agents, 500 concurrent users), what breaks without this?" If the answer is "nothing," don't add it.
- SvelteKit or Astro on a single server (or as a static site with a small API) is the entire production architecture for v1. This is a feature, not a limitation.

**Warning signs:**
- A Docker Compose file with more than 2 services (app + optional DB) appears early in the project.
- "We should add Redis for caching" is suggested before any performance problem is observed.
- A separate repository or service is created for the ingestion pipeline.
- The phrase "microservices" or "event-driven" appears in architecture discussions for v1.

**Phase to address:** Architecture definition phase (before any infrastructure is provisioned). The single-process constraint must be written down as an explicit architectural decision, not just assumed.

---

### Pitfall 6: Search Index Out of Sync With Catalog Data

**What goes wrong:**
Agents are updated or added to the catalog database, but the search index (embeddings array, BM25 index) is not rebuilt. Search returns stale results — old descriptions, missing new agents, dead references to deleted agents. Users find agents via category browse that don't appear in search, or search returns agents that have been removed.

**Why it happens:**
The ingestion pipeline updates the database but the search index rebuild is a separate step that is easy to forget or skip. When running on a deadline, "we'll fix the search sync later" becomes a permanent state.

**How to avoid:**
- Search index rebuild must be part of the ingestion pipeline, not a separate optional step. The ingestion run should atomically: update the DB records, recompute embeddings for changed records, and rebuild the in-memory search index.
- At startup, the application loads the search index from the stored embeddings in the DB. There is no separate index file to get out of sync.
- Because the corpus is small (300 agents), rebuilding all embeddings on every ingestion run is acceptable and simpler than delta-only rebuilds. Don't optimize this prematurely.

**Warning signs:**
- The search index is stored as a separate file (`.json`, `.npy`) outside the database.
- The README has separate "ingest data" and "rebuild search index" commands.
- A new agent is visible on the catalog browse page but not in search results.

**Phase to address:** Data ingestion pipeline phase, concurrent with search implementation.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Embed full AgentSpec document (not curated summary) | Simpler ingestion code | Poor search relevance, hard to debug why results are bad | Never — takes 30 minutes to do correctly |
| Use AgentSpec field names as internal data model | Faster first implementation | Lock-in to spec format, painful shim work later | Never for this project — spec may change |
| Skip staleness metadata on catalog records | Simpler schema | Invisible data rot, no operational visibility | Never — one extra column costs nothing |
| Single embed-and-store pass with no test queries | Faster to ship | Ships with broken search, damages trust immediately | Never — write 20 test queries first |
| Append-only ingestion without upsert | Simpler first pass | Duplicates on re-run, discourages re-ingestion | Only as throwaway prototype, never in production ingestion |
| Split executive/engineer views as separate pages | Feels thorough | Double the UI surface to maintain, neither audience well-served | Never — use progressive disclosure instead |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub as spec source | Fetch raw file URLs that break when branches or paths change | Use GitHub API with explicit ref; store the commit SHA used for each ingestion in the catalog record |
| Embedding model API | Call embedding API on every search query at runtime | Embed at ingestion time only; store vectors; search is pure in-process computation |
| Embedding model API | Use a different model for queries vs. documents | Query embeddings and document embeddings must use the same model; mismatched models produce meaningless similarity scores |
| Oracle AgentSpec | Parse spec files with ad-hoc string matching or regex | Use the spec's own JSON/YAML schema for parsing; validate against schema at ingestion to catch malformed specs early |
| Static site build (if Astro) | Bake catalog data at build time only | Include an API route for search (client-side POST) even in mostly-static builds, or pre-compute search index as a JS module loaded at runtime |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Computing cosine similarity in a hot loop with unoptimized JS | Search latency >500ms even at 300 agents | Pre-normalize all document vectors at index build time; use typed arrays (Float32Array); the dot product of two normalized vectors equals cosine similarity — no sqrt needed | Noticeable immediately at 300 agents if naive implementation |
| Fetching full catalog from DB on every search request | Slow search, high DB I/O | Load all agent records and embeddings into memory at startup; the full corpus is <5MB | Already slow at 100 agents if hitting SQLite per query |
| Rendering all 300 agents on initial catalog page load | Slow initial page, layout shift | Paginate or virtualize the catalog grid; 300 card components with images can be 2–3 seconds on mobile | Noticeable at 200+ agents without pagination |
| Embedding every spec field including boilerplate | Large vector store, noisy similarity | Only embed the curated summary field; store it separately from the raw spec data | Degrades search quality continuously as catalog grows |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing GitHub PAT or embedding API key in the frontend bundle | Full credential exposure; attackers can read private repos or run up API bills | All external API calls (GitHub, embedding model) happen server-side only, during ingestion — never in browser JS |
| No rate limiting on search endpoint | Embedding API cost abuse if search ever calls the embedding API at runtime | Search must be purely in-process at runtime; no external API calls per search query |
| Exposing internal agent IDs or spec file paths in public URLs | No high security risk for v1 (public catalog), but creates coupling to internal structure | Use human-readable slugs for public URLs, not internal database IDs or file paths |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Search returns results with no explanation of why they matched | Users don't trust results; can't tell if search is broken or just unlucky | Show matched keywords or relevant capability tags on each result card; even basic match highlighting helps |
| Category taxonomy designed by engineers (technical categories) | Executives can't find agents because they don't know the technical category name | Derive categories from use-case language ("automate customer support") not implementation language ("NLP pipeline agents") |
| Agent cards on browse page show raw spec fields | Information overload for executives; engineers still click through to GitHub | Cards should show: name, one-sentence description, 2–3 use-case tags, "view details" CTA — nothing else |
| No empty state for search with zero results | Users assume the catalog is broken | Explicit "no agents match X — try Y categories" message with alternative paths |
| "Link to GitHub" is buried on the detail page | Engineers (primary users) have to hunt for the one thing they actually need | GitHub link is a primary action on the detail page, not a footnote |

---

## "Looks Done But Isn't" Checklist

- [ ] **Semantic search:** Verify with 20 real queries against real agent data before declaring search done — not just "it returns results."
- [ ] **AgentSpec shim:** Verify that no UI component prop name matches an AgentSpec field name — if they all match, the shim boundary isn't real.
- [ ] **Data ingestion:** Verify that running the ingestion pipeline twice on the same data produces identical output (idempotency) — run it, check record count, run again, check record count again.
- [ ] **Staleness visibility:** Verify that an operator can determine when each catalog record was last ingested from GitHub — without querying the source repository.
- [ ] **Executive legibility:** Verify that a non-technical stakeholder can describe what any agent does within 30 seconds of landing on its detail page — without scrolling past the fold.
- [ ] **Single-process deployment:** Verify that the entire production system can be deployed as a single process with no external services — attempt a fresh deployment to a bare server with no pre-installed services.
- [ ] **Search/catalog sync:** Verify that a newly added agent appears in both browse results and search results within one ingestion cycle — not just in browse.
- [ ] **Broken GitHub links:** Verify that all GitHub links on agent detail pages resolve to real commits or paths — not to deleted branches or renamed files.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Semantic search ships broken | MEDIUM | Add BM25 keyword fallback immediately (1–2 days); rebuild embedding with curated summary field; rebuild test suite; ship corrected version |
| AgentSpec lock-in discovered when second spec format arrives | HIGH | Audit all components touching agent data; extract canonical model type; build real ingester for each format; update UI props; estimate 1–2 week refactor |
| Catalog data goes stale | LOW | Re-ingest from GitHub (if pipeline is idempotent); add `last_ingested_at` to schema; establish re-ingestion schedule |
| Catalog data goes stale + ingestion is not idempotent | HIGH | Fix ingestion to use upsert semantics; wipe and rebuild catalog from scratch; add staleness metadata |
| Over-engineered infrastructure deployed | HIGH | Cannot be recovered cheaply mid-project; requires architecture reset; prevention is the only practical strategy |
| Executive/engineer split views built as separate pages | MEDIUM | Consolidate to single page with progressive disclosure; 3–5 days of UI refactor; lower cost if caught before content is written for both views |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Broken semantic search at small scale | Catalog search implementation | Run labeled test set (20+ queries) before marking search complete |
| AgentSpec structural lock-in | Data model + ingestion design (early) | Confirm internal model type has no AgentSpec field names; shim test with fake second format passes |
| Dual-audience view decomposed into two pages | UI design (before implementation) | Single agent detail page design reviewed by a non-technical stakeholder |
| Catalog data staleness | Ingestion pipeline implementation | Run ingestion twice; verify idempotency; verify `last_ingested_at` is populated |
| Over-engineering into distributed system | Architecture definition (first phase) | Confirm app runs as single process; no external services in dev or prod |
| Search index out of sync with catalog | Ingestion pipeline implementation | Add new agent; run single ingestion command; verify agent appears in search |
| Embedding model mismatch (query vs. document) | Search implementation | Assert in code that query and document embeddings use identical model ID |
| Category taxonomy inaccessible to executives | UX/information architecture | User test with non-technical stakeholder: can they find an agent by describing a business problem? |

---

## Sources

- Patterns derived from established practice in catalog/discovery platform development (npm registry, Backstage software catalog, Artifact Hub)
- Embedding quality at small scale: documented behavior of cosine similarity over small corpora in semantic search literature; hybrid search recommendations from Elasticsearch and Weaviate documentation on small-dataset behavior
- Spec versioning anti-patterns: analogous to OpenAPI schema coupling in API gateway implementations; documented in API gateway migration post-mortems
- Progressive disclosure UX: Nielsen Norman Group guidance on layered information architecture for mixed-expertise audiences
- Staleness/freshness patterns: operational experience with file-based catalog ingestion in Backstage and similar platforms
- Single-process architecture: 37signals/Basecamp philosophy on avoiding premature scaling infrastructure; SQLite-as-application-database documented by Litestream and similar projects

*Note: External search was unavailable during this research session. All findings are based on established patterns in the described domains. Confidence is MEDIUM — findings are grounded in well-documented precedents but were not verified against current community sources.*

---

*Pitfalls research for: AI agent catalog / showcase web platform*
*Researched: 2026-03-19*
