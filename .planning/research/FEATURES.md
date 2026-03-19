# Feature Research

**Domain:** AI agent catalog / showcase platform (internal consortium, 100+ agents)
**Researched:** 2026-03-19
**Confidence:** MEDIUM — External network access unavailable; findings based on training knowledge of comparable platforms (Smithery, Hugging Face Hub/Spaces, LangChain Hub, npm registry, PyPI, various AI tool directories) through August 2025. Core catalog/directory UX patterns are stable and HIGH confidence; agent-specific nuances are MEDIUM.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full-text keyword search | Every catalog has it; first thing users try | LOW | Baseline before semantic; needed even if semantic search is primary |
| Semantic / intent search | AI tool catalogs without semantic search feel broken; this audience expects it | MEDIUM | In-memory embeddings on ~300 agents is feasible without a vector DB (cosine similarity); PROJECT.md confirms this approach |
| Category / domain browsing | Users who don't know exact keywords browse by topic area | LOW | Finance, HR, supply chain, customer service, etc. — needs a controlled taxonomy defined from the agent data |
| Agent detail page | Every catalog item needs a dedicated page with name, description, capabilities, and how to get it | LOW | The primary landing surface for an evaluator; must exist at a stable URL |
| Dual-audience detail view | Tech evaluators need specs; executives need a plain-language summary | MEDIUM | PROJECT.md explicitly requires exec-friendly default + collapsible technical detail; this is the single most important UX pattern for this platform |
| GitHub link / source access | Platform is "front door, not runtime"; link to canonical source is required | LOW | Must be prominent; this is the call-to-action for evaluators who decide to proceed |
| Tag / keyword filtering | Faceted narrowing by tags after a search; essential for 100+ items | LOW | Tags on agent records; filter chips in UI |
| Agent capabilities list | What can this agent do? Users need a structured answer, not just a prose description | LOW | Should map to Oracle AgentSpec capabilities fields; may be rendered as a bulleted list |
| Responsive layout | Executives often browse on iPads or mobile; evaluators on desktop; must work on both | LOW | Standard today; a broken mobile layout signals low quality to executives |
| Fast page loads | Both audiences are impatient; a slow catalog directory kills browsing behavior | LOW | Static or SSR with aggressive caching; Astro/SvelteKit defaults are suitable |
| Stable, shareable URLs | Evaluators email agents to colleagues; executives reference agents in presentations | LOW | Each agent needs a permanent, human-readable slug URL |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "80/20" customization surface | Each agent is 80% done; showing what the remaining 20% looks like and how to configure it turns browsing into buying | MEDIUM | Surfaces configurable parameters from AgentSpec; optional lightweight customization workflow (e.g. generate MCP config from DB schema) — PROJECT.md identifies this explicitly |
| Use-case / scenario matching | "Find agents for X business problem" rather than just keyword search; maps business language to agent capabilities | MEDIUM | Requires a curated use-case taxonomy and mapping to agents; valuable for exec audience who don't know agent names |
| Side-by-side agent comparison | Evaluators frequently compare 2-3 candidates; inline comparison reduces context-switching to GitHub | MEDIUM | Select-to-compare UI; diff capabilities, inputs, constraints; can be a v1.x feature |
| AgentSpec viewer / renderer | Renders the structured Oracle AgentSpec in a readable, annotated format rather than raw YAML/JSON | LOW | Builds trust with technical evaluators; makes the spec feel like documentation, not configuration |
| Related agents / recommendations | "You looked at the invoice-processing agent — you might also need the PO-matching agent" | MEDIUM | Relevance-based; can be computed from tag overlap or embedding similarity at build time; no personalization/session needed |
| Collections / bundles | Curated lists like "Starter pack for Accounts Payable" group related agents into coherent solutions | LOW | Static editorial content; very high value for executives; low complexity |
| Agent maturity / status indicators | "Production-ready", "Beta", "Experimental" — signals to evaluators how much validation work remains | LOW | Simple enum field in AgentSpec; displayed prominently on detail page and in catalog cards |
| Consortium provenance display | Shows which AIC member(s) contributed or validated the agent; builds trust in enterprise context | LOW | Single field; maps to consortium member list; relevant for governance-conscious executives |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| User ratings and reviews | Feels like social proof; every marketplace has it | With a closed consortium audience, reviews are political (member companies rating each other's agents); gaming and thin participation are both risks; adds auth complexity for zero incremental discovery value | Consortium provenance + maturity status signals quality without community dynamics |
| Agent execution / demo sandbox | "Try it before you buy it" is compelling | Platform is explicitly not a runtime; sandboxed execution requires infra, secrets management, security boundary work far beyond catalog scope; this is a different product | Link to GitHub for implementation; lightweight customization flow for structured use cases only |
| User accounts and saved favorites | Personalization seems valuable | Adds auth/session complexity, defers launch, and the audience is small enough that users can bookmark pages; PROJECT.md defers auth to post-v1 | Shareable URLs solve the "remember this agent" use case without auth |
| Real-time GitHub sync | Feels like it keeps catalog fresh automatically | Webhook complexity, rate limits, partial-update edge cases, and stale render bugs; for a consortium catalog, agent data changes are infrequent and controlled | Hybrid file-based ingestion at deploy time is appropriate for this scale and cadence |
| Agent version history / changelog | Power users want to see what changed | Requires versioning schema in AgentSpec, storage of past versions, diff rendering — high complexity for a v1 browse use case | GitHub is the source of truth for history; link out |
| Commenting / discussion threads | Community engagement looks good on marketplaces | Requires moderation, auth, notifications; consortium context means issues go through existing channels (Teams, email); abandoned comment sections harm credibility | Contact info / GitHub issues link on agent detail page |
| Full-text search within agent specs | Deep search into raw AgentSpec fields | Returns confusing low-quality matches on field names rather than intent; creates noise for non-technical users | Semantic search on curated descriptions; AgentSpec viewer for browsing raw fields |

---

## Feature Dependencies

```
[Semantic Search]
    └──requires──> [Agent Data Pipeline / Ingestion]
                       └──requires──> [Oracle AgentSpec parsing + shim layer]

[Category Browsing]
    └──requires──> [Controlled taxonomy / category field in AgentSpec]

[Tag Filtering]
    └──requires──> [Tag field in AgentSpec + index]

[Agent Detail Page]
    └──requires──> [Agent Data Pipeline / Ingestion]
    └──requires──> [AgentSpec rendering layer]

[Dual-Audience View]
    └──requires──> [Agent Detail Page]
    └──requires──> [AgentSpec fields mapped to exec summary vs technical fields]

[Customization Flow]
    └──requires──> [Agent Detail Page]
    └──requires──> [Configurable parameters surfaced from AgentSpec]

[AgentSpec Viewer]
    └──requires──> [Agent Detail Page]
    └──enhances──> [Dual-Audience View]

[Related Agents]
    └──requires──> [Agent Data Pipeline / Ingestion]
    └──enhances──> [Agent Detail Page]
    └──can reuse──> [Semantic Search embeddings]

[Use-Case Matching]
    └──requires──> [Category taxonomy]
    └──enhances──> [Semantic Search]

[Side-by-Side Comparison]
    └──requires──> [Agent Detail Page data model]
    └──enhances──> [Tag Filtering] (select candidates from filtered list)

[Collections / Bundles]
    └──requires──> [Agent Data Pipeline] (collections are editorial data)
    └──enhances──> [Category Browsing]

[Consortium Provenance]
    └──requires──> [Provenance field in AgentSpec or catalog metadata]

[Agent Maturity Status]
    └──requires──> [Status enum in AgentSpec]
```

### Dependency Notes

- **Agent Data Pipeline is foundational:** Every display feature depends on structured, parsed agent data being available. This is Phase 1 work and blocks everything else.
- **AgentSpec shim is a prerequisite for pipeline:** The shim layer that normalizes spec formats must be designed before ingestion logic, even if only Oracle AgentSpec is used in v1.
- **Semantic search can reuse pipeline artifacts:** Embedding generation runs at ingest time; same pipeline that builds the catalog builds the search index. No separate pass needed.
- **Dual-audience view requires field mapping:** The exec summary vs. technical detail split requires knowing which AgentSpec fields map to which audience. This is a design-time decision that must be made before building the detail page template.
- **Related agents and collections can share embedding data:** Both can be computed at build time from embedding similarity + tag overlap. Low marginal cost once search embeddings exist.
- **Customization flow is isolated:** It depends on the detail page for context but is otherwise independent. Safe to defer to v1.x without blocking anything else.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Agent data ingestion pipeline** — everything else is blocked without structured, queryable agent data; must handle Oracle AgentSpec with shim architecture
- [ ] **Catalog browse page** — paginated/grid view of all agents with name, summary, category, and maturity badge; entry point for all users
- [ ] **Keyword + semantic search** — the stated core value is "find the right agent within seconds"; search is not optional
- [ ] **Tag and category filtering** — 100+ agents is too many to browse unfiltered; faceted narrowing is required for the catalog to be usable
- [ ] **Agent detail page** — dual-audience view (exec summary default, collapsible technical spec); includes capabilities list, GitHub link, configurable parameters summary
- [ ] **AgentSpec viewer / renderer** — surfaces the structured spec in readable form on the detail page; validates technical credibility for evaluators
- [ ] **Stable shareable URLs** — agents need permanent slugs so evaluators can share links; foundational to all async communication about agents
- [ ] **Maturity / status indicators** — signals quality tier to evaluators and executives; simple enough to include in v1
- [ ] **Consortium provenance** — shows which member contributed/validated; trust signal for governance-conscious executives; low complexity
- [ ] **Lightweight customization flow** — at least one well-defined use case (e.g. MCP generation from DB schema); validates the "80/20 completion" value prop; PROJECT.md names this explicitly for v1

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Related agents / recommendations** — add once catalog has real usage patterns showing which agent combinations are common; embedding similarity is already available from search infrastructure
- [ ] **Side-by-side comparison** — add when user feedback confirms evaluators are opening multiple agent tabs to compare; defer until validated need
- [ ] **Collections / bundles** — add once domain taxonomy is stable enough to curate coherent bundles; low effort but requires editorial investment
- [ ] **Use-case / scenario matching** — add after observing which search queries fail; requires curation work to map business language to agents

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **User accounts + saved searches / bookmarks** — defer; adds auth complexity; validate first that users want persistent sessions
- [ ] **Deployment / provisioning flows** — PROJECT.md explicitly defers; requires org-specific integration work
- [ ] **More customization flow types** — expand beyond one well-defined use case once first flow is proven
- [ ] **Consortium member portal** — admin UI for members to submit/update agents without touching GitHub directly

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Agent data ingestion pipeline | HIGH | MEDIUM | P1 |
| Catalog browse page | HIGH | LOW | P1 |
| Keyword search | HIGH | LOW | P1 |
| Semantic search | HIGH | MEDIUM | P1 |
| Tag / category filtering | HIGH | LOW | P1 |
| Agent detail page (dual-audience) | HIGH | MEDIUM | P1 |
| AgentSpec viewer / renderer | MEDIUM | LOW | P1 |
| Stable shareable URLs | HIGH | LOW | P1 |
| Maturity / status indicators | MEDIUM | LOW | P1 |
| Consortium provenance display | MEDIUM | LOW | P1 |
| Customization flow (1 use case) | HIGH | MEDIUM | P1 |
| Related agents / recommendations | MEDIUM | LOW | P2 |
| Side-by-side comparison | MEDIUM | MEDIUM | P2 |
| Collections / bundles | MEDIUM | LOW | P2 |
| Use-case / scenario matching | MEDIUM | MEDIUM | P2 |
| User accounts / favorites | LOW | HIGH | P3 |
| Deployment flows | HIGH | HIGH | P3 |
| Additional customization flows | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Note: Competitor analysis based on training knowledge (through August 2025). External network access unavailable for live verification. Confidence: MEDIUM.

| Feature | Smithery (MCP catalog) | Hugging Face Hub | Our Approach |
|---------|----------------------|------------------|--------------|
| Search | Keyword + tag filter | Full-text + filter + semantic | Keyword + semantic (in-memory); no external vector DB |
| Detail pages | Model card style with README render | Rich model card + metrics + demos | Dual-audience: exec summary first, spec on demand |
| Categories / tags | Tag-based, flat | Tasks + tags + datasets taxonomy | Controlled domain taxonomy + tags from AgentSpec |
| Usage / deployment | One-click install via Smithery config | Inference API + Spaces demos | GitHub link only (v1); customization flow for structured cases |
| Social signals | Download counts, stars | Downloads, likes, leaderboards | Maturity status + provenance (no community dynamics) |
| Versioning | Basic | Full version history, changelogs | GitHub is source of truth; no platform-side versioning |
| Related items | None observed | "Models like this" | Embedding-similarity related agents (v1.x) |
| Collections | No | Collections, Papers With Code links | Editorial bundles (v1.x) |
| Comparison | No | No | Side-by-side (v1.x) |

---

## Sources

- PROJECT.md (project constraints, scope decisions, audience definition) — HIGH confidence
- Smithery platform (mcp.so, smithery.ai) — training knowledge through August 2025, MEDIUM confidence
- Hugging Face Hub (huggingface.co/models) — training knowledge through August 2025, MEDIUM confidence
- LangChain Hub — training knowledge through August 2025, MEDIUM confidence
- npm registry (npmjs.com) and PyPI — training knowledge for directory/catalog UX patterns, HIGH confidence (stable patterns)
- General SaaS catalog/marketplace UX patterns (Zapier app directory, Salesforce AppExchange patterns) — HIGH confidence (stable patterns)
- Note: WebSearch, WebFetch, and Brave Search were all unavailable during this research session. Findings rely on training data and internal document analysis. Recommend live verification of competitor features before finalizing taxonomy decisions.

---

*Feature research for: AI agent catalog / showcase platform (AIC consortium)*
*Researched: 2026-03-19*
