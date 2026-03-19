# Architecture Research

**Domain:** AI agent catalog / showcase web platform
**Researched:** 2026-03-19
**Confidence:** MEDIUM (training knowledge; web search unavailable; patterns are well-established but verify SvelteKit/Astro version-specific details)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BUILD / INGEST LAYER                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  GitHub Repo     │  │  Spec Shim Layer │  │  Embedding Gen    │  │
│  │  (YAML/JSON      │→ │  (AgentSpec +    │→ │  (build-time      │  │
│  │   agent files)   │  │   future specs)  │  │   cosine vectors) │  │
│  └──────────────────┘  └──────────────────┘  └────────┬──────────┘  │
│                                                         │            │
│                              ┌──────────────────────────┘            │
│                              ↓                                        │
│                    ┌──────────────────┐                               │
│                    │  Catalog Store   │                               │
│                    │  (SQLite or      │                               │
│                    │   JSON bundle)   │                               │
│                    └──────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
                                │ (deployed artifact)
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                           │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────┐  │
│  │  Catalog      │  │  Agent Detail │  │  Customization Wizard   │  │
│  │  Browse /     │  │  Page         │  │  (e.g. MCP config gen)  │  │
│  │  Filter UI    │  │  (exec + tech │  │                         │  │
│  │               │  │   accordion)  │  │                         │  │
│  └───────┬───────┘  └───────┬───────┘  └──────────┬──────────────┘  │
│          │                  │                       │                │
├──────────┴──────────────────┴───────────────────────┴────────────────┤
│                        CLIENT RUNTIME LAYER                           │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Search Module (in-memory cosine similarity on embeddings)     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Catalog Data Store (loaded at page load from JSON bundle)     │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Agent Source Files | Canonical human-edited data; one file per agent | YAML or JSON in GitHub repo |
| Spec Shim Layer | Normalizes multiple spec formats into internal AgentRecord type | TypeScript adapter module, run at build time |
| Embedding Generator | Produces float32 cosine vectors from agent descriptions | Build-time script; `@xenova/transformers` or OpenAI embeddings API |
| Catalog Store | Serialized agent records + embeddings; deployed artifact | SQLite file OR pre-built JSON bundle; loaded once at runtime |
| Catalog Browse/Filter UI | Category grid, tag filters, card list | SvelteKit route (`/`) or Astro page with islands |
| Agent Detail Page | Executive summary top, collapsible technical accordion | SvelteKit dynamic route (`/agents/[slug]`) |
| Search Module | Client-side cosine similarity; queries embedding store | Vanilla TypeScript module, no external deps |
| Customization Wizard | Multi-step form that produces downloadable config artifact | SvelteKit route (`/wizards/[type]`), isolated component tree |
| GitHub Link Passthrough | All "get this agent" CTAs point to GitHub; no runtime needed | Static href attributes; no server logic required |

## Recommended Project Structure

```
src/
├── lib/
│   ├── spec/                  # Spec shim layer
│   │   ├── types.ts           # AgentRecord — internal canonical type
│   │   ├── oracle-agentspec.ts # Oracle AgentSpec → AgentRecord adapter
│   │   └── index.ts           # Registry: format detection + dispatch
│   ├── search/
│   │   ├── embeddings.ts      # Load embedding bundle, cosine similarity
│   │   └── index.ts           # Query API: search(query) → AgentRecord[]
│   ├── catalog/
│   │   ├── store.ts           # Svelte store or module holding AgentRecord[]
│   │   └── filters.ts         # Category/tag filter logic
│   ├── wizards/
│   │   └── mcp/               # MCP config wizard logic
│   └── components/
│       ├── AgentCard.svelte
│       ├── AgentDetail.svelte
│       ├── SearchBar.svelte
│       └── TechAccordion.svelte
├── routes/
│   ├── +page.svelte           # Catalog home
│   ├── agents/
│   │   └── [slug]/
│   │       └── +page.svelte   # Agent detail
│   └── wizards/
│       └── [type]/
│           └── +page.svelte   # Customization wizard
scripts/
├── ingest.ts                  # Reads agent files → runs shim → writes catalog
└── generate-embeddings.ts     # Reads catalog → writes embeddings bundle
static/
└── catalog/
    ├── agents.json            # Serialized AgentRecord[]
    └── embeddings.bin         # Float32 vectors (or embedded in agents.json)
data/
└── agents/                    # Source-of-truth agent YAML/JSON files
    ├── agent-slug.yaml
    └── ...
```

### Structure Rationale

- **lib/spec/:** Isolated shim layer — adding a new spec format means adding one adapter file and registering it in `index.ts`. Nothing else changes.
- **lib/search/:** Pure functions over a flat Float32Array; zero external runtime deps; easily unit-tested.
- **lib/catalog/:** Separates data loading (store.ts) from filter logic (filters.ts); filters can be tested without DOM.
- **lib/wizards/:** Each wizard is a self-contained feature; isolating them prevents wizard complexity from leaking into catalog code.
- **scripts/:** Build-time scripts are not shipped to the client; keeping them separate avoids accidental import in browser bundles.
- **data/agents/:** Human-edited source files live in the repo alongside code; no CMS needed for v1.

## Architectural Patterns

### Pattern 1: Build-Time Ingestion with Static Artifact

**What:** All agent data is read from source files and pre-processed (shim normalization, embedding generation) during the build step. The output is a static JSON/binary artifact deployed with the app.

**When to use:** Catalog data changes on deploy, not on user request. ~100-300 agents. No database server needed.

**Trade-offs:**
- Pro: Zero runtime server cost, no database to operate, fast cold start
- Pro: Content changes go through Git (reviewable, auditable)
- Con: New agents require a rebuild + redeploy (acceptable for this scale)
- Con: If embeddings are generated via external API (OpenAI), build has an external dependency; use a local model to avoid this

**Example:**
```typescript
// scripts/ingest.ts (runs at build time, not shipped to browser)
import { detectFormat, normalize } from '../src/lib/spec/index.js'
import { readAgentFiles } from './utils.js'

const raw = await readAgentFiles('./data/agents')
const records = raw.map(f => normalize(detectFormat(f), f.content))
await Bun.write('./static/catalog/agents.json', JSON.stringify(records))
```

### Pattern 2: Spec Shim / Adapter Registry

**What:** A central registry maps spec format identifiers to adapter functions. Each adapter transforms a raw spec payload into the internal `AgentRecord` type. Callers never depend on the raw format.

**When to use:** Multiple spec formats must be supported now or in the future. The internal type is stable; the wire formats are not.

**Trade-offs:**
- Pro: Adding a new spec format is a single-file change with no impact on consumers
- Pro: Internal `AgentRecord` type acts as the stable API contract for the entire app
- Con: Requires discipline — all code must import from `lib/spec`, never from format-specific modules directly
- Con: Shim adds one indirection layer; acceptable given the scale

**Example:**
```typescript
// src/lib/spec/index.ts
import type { AgentRecord } from './types.js'
import { fromOracleAgentSpec } from './oracle-agentspec.js'

type FormatId = 'oracle-agentspec' | 'future-format'

const adapters: Record<FormatId, (raw: unknown) => AgentRecord> = {
  'oracle-agentspec': fromOracleAgentSpec,
  // 'future-format': fromFutureFormat,  // add here when needed
}

export function normalize(formatId: FormatId, raw: unknown): AgentRecord {
  const adapter = adapters[formatId]
  if (!adapter) throw new Error(`Unknown spec format: ${formatId}`)
  return adapter(raw)
}
```

### Pattern 3: Client-Side Embedding Search (No Server Required)

**What:** Embeddings are precomputed at build time and bundled as a static artifact. At runtime, the user's query is embedded in the browser (local model) or matched against a pre-embedded query set, and cosine similarity is computed over the Float32Array in memory.

**When to use:** Corpus is small enough to fit in browser memory (~300 agents × 384 dimensions × 4 bytes = ~460 KB uncompressed). No server round-trip needed for search.

**Trade-offs:**
- Pro: No server, no latency, works offline, no API keys at runtime
- Pro: Full-text fallback is trivial alongside vector search
- Con: First load includes embedding bundle (~460 KB gzipped to ~200 KB) — acceptable
- Con: Browser-side embedding inference (for query embedding) is slower than server; pre-embed common queries or use lightweight model (`all-MiniLM-L6-v2` at 384 dims is fast enough)

**Example:**
```typescript
// src/lib/search/embeddings.ts
let embeddings: Float32Array | null = null
let agentIds: string[] = []

export async function loadEmbeddings() {
  const res = await fetch('/catalog/embeddings.bin')
  const buf = await res.arrayBuffer()
  embeddings = new Float32Array(buf)
  // agentIds loaded from agents.json in parallel
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

## Data Flow

### Ingestion Flow (build time)

```
data/agents/*.yaml
    │
    ↓  (scripts/ingest.ts)
Format Detection
    │
    ↓  (lib/spec/index.ts)
Spec Shim / Adapter
    │
    ↓
AgentRecord[] (canonical internal type)
    │
    ├──→ static/catalog/agents.json   (all metadata, descriptions, tags)
    │
    ↓  (scripts/generate-embeddings.ts)
Embedding Model (local, build-time)
    │
    ↓
static/catalog/embeddings.bin         (Float32Array, parallel-indexed with agents.json)
```

### Browse / Filter Request Flow (runtime)

```
User lands on /
    │
    ↓  (SvelteKit +page.svelte)
Fetch /catalog/agents.json             (one request, cached)
    │
    ↓
Catalog Store (in-memory AgentRecord[])
    │
    ├──→ Category/Tag Filter (lib/catalog/filters.ts) → filtered AgentRecord[]
    │
    ↓
AgentCard components rendered
```

### Semantic Search Flow (runtime)

```
User types query in SearchBar
    │
    ↓  (debounced)
Embed query in browser (local model OR heuristic keyword expansion)
    │
    ↓
Cosine similarity against embeddings.bin (in-memory Float32Array)
    │
    ↓
Top-K AgentRecord[] by score
    │
    ↓
Search results rendered (same AgentCard components)
```

### Agent Detail Flow (runtime)

```
User clicks AgentCard → navigates to /agents/[slug]
    │
    ↓  (SvelteKit dynamic route)
Load AgentRecord from catalog store (already in memory) OR server-load from agents.json
    │
    ↓
AgentDetail component:
    ├── Executive Summary section (always visible)
    ├── TechAccordion (collapsed by default, expand on click)
    └── GitHub CTA (static href to source repo)
```

### Customization Wizard Flow (runtime)

```
User navigates to /wizards/mcp
    │
    ↓
Wizard step 1: DB schema input (paste/upload)
    │
    ↓
Wizard step 2: Configuration review
    │
    ↓
Wizard step 3: Download generated MCP YAML config
    │
    (no server call; all generation happens client-side)
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-300 agents (v1) | Static JSON artifact + in-memory search; SvelteKit or Astro SSG; no database server; rebuild on data change |
| 300-2000 agents | In-memory still viable (embeddings ~3 MB at 2000 × 384 × 4 bytes); consider lazy-loading embeddings; SQLite-backed search becomes practical |
| 2000+ agents | External vector DB (pgvector, Qdrant) warranted; server-side search endpoint; catalog pages can remain static |

### Scaling Priorities

1. **First bottleneck:** Embedding bundle size. At ~500 agents the uncompressed Float32Array (~800 KB) is still acceptable; at ~2000 agents (~3 MB) consider lazy-loading or server-side search. This is not a v1 concern.
2. **Second bottleneck:** Build time. If embedding generation uses a local model and corpus grows to thousands, incremental embedding caching (skip unchanged files) becomes necessary.

## Anti-Patterns

### Anti-Pattern 1: Fetching Agent Data at Request Time

**What people do:** Hit a live GitHub API or database on every catalog page load to get fresh agent data.

**Why it's wrong:** GitHub API has rate limits and adds latency. For a catalog that changes on deploy, not continuously, there is no benefit. It also creates a runtime dependency that can cause outages.

**Do this instead:** Ingest at build time, serve static artifact. Changes go through a rebuild/redeploy cycle — acceptable for this use case.

### Anti-Pattern 2: Leaking Spec Format Details into UI Components

**What people do:** Import raw Oracle AgentSpec fields directly in Svelte components (`agent.agentSpecVersion`, `agent.oracleMetadata.category`).

**Why it's wrong:** When a second spec format is added, every component that touches raw spec fields must be updated. The shim layer exists to prevent this.

**Do this instead:** UI components only consume `AgentRecord` (internal canonical type). All field mapping happens in the spec adapter layer.

### Anti-Pattern 3: Embedding Query Text Client-Side with a Heavy Model

**What people do:** Ship a full sentence-transformer model (>100 MB) to the browser for query embedding.

**Why it's wrong:** Download size is prohibitive. Initial load stalls. Mobile devices may not complete inference in acceptable time.

**Do this instead:** Either (a) use a tiny quantized model like `all-MiniLM-L6-v2` via ONNX (~22 MB, ~50 ms inference), or (b) implement keyword fallback search that works without embeddings for the query side, and use embeddings only for reranking. Option (b) is simpler for v1.

### Anti-Pattern 4: One Giant Wizard Component

**What people do:** Build the customization wizard as a single large component with all steps and generation logic mixed together.

**Why it's wrong:** Wizards grow. MCP config generation will have edge cases. Debugging a 600-line component is painful.

**Do this instead:** Each wizard step is its own Svelte component. Generation logic lives in a pure TypeScript module (`lib/wizards/mcp/generate.ts`) with no UI dependencies — independently testable.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GitHub (agent source files) | Static file read at build time (git clone or GitHub API at build) | No runtime dependency; use API only if CI/CD pulls from a remote repo |
| Embedding model (build time) | Local model via `@xenova/transformers` or similar ONNX runtime | Avoid OpenAI API at build time to keep CI free and offline-capable |
| GitHub (agent detail CTA) | Static outbound href only | No API call; just a link |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `scripts/` ↔ `lib/spec/` | Direct TypeScript import | Build scripts import spec shim; this is fine — scripts are not shipped |
| `lib/spec/` ↔ `lib/catalog/` | `AgentRecord` type only | Catalog store receives normalized records; never raw spec payloads |
| `lib/catalog/` ↔ UI components | Svelte store subscription or prop passing | Components read from catalog store; never call fetch directly |
| `lib/search/` ↔ UI components | Function call: `search(query) → AgentRecord[]` | Search module is pure; UI calls it and renders results |
| `lib/wizards/mcp/` ↔ wizard UI | Function call: `generate(config) → string (YAML)` | Generation logic has no UI dependency; wizard UI handles steps and calls generate() at the end |

## Build Order Implications

Components have the following dependency graph. Build in this order:

```
1. lib/spec/types.ts          — AgentRecord canonical type (no deps)
2. lib/spec/oracle-agentspec.ts — Oracle adapter (depends on types)
3. lib/spec/index.ts           — Shim registry (depends on adapters)
4. scripts/ingest.ts           — Reads files, runs shim, writes agents.json
5. scripts/generate-embeddings.ts — Reads agents.json, writes embeddings.bin
6. lib/catalog/store.ts        — Loads agents.json at runtime
7. lib/search/embeddings.ts    — Loads embeddings.bin at runtime
8. lib/catalog/filters.ts      — Filter logic over AgentRecord[]
9. UI components (AgentCard, AgentDetail, etc.) — Consumes store + search
10. routes/ pages              — Compose components into SvelteKit routes
11. lib/wizards/mcp/           — Isolated; can be built last or in parallel with step 9
```

**Key dependency:** Steps 4-5 (ingest + embedding scripts) must run before the app can display any agents. This is a build-time gate, not a runtime concern. Phase structure should ensure data pipeline is working before UI work begins.

## Sources

- Architecture derived from training knowledge of SvelteKit SSG patterns, static catalog sites (e.g. npmjs.com catalog model, Astro Starlight), and adapter/shim patterns in TypeScript ecosystems (confidence: MEDIUM)
- In-memory embedding search approach consistent with documented behavior of `@xenova/transformers` and float32 cosine similarity for corpora under ~5000 documents (confidence: MEDIUM — verify current model sizes and ONNX browser support)
- Oracle AgentSpec format details not verified (no public documentation found via available tools) — shim layer design accounts for this by isolating format-specific logic (confidence: LOW for Oracle AgentSpec specifics, HIGH for the shim pattern itself)
- SvelteKit route conventions current as of SvelteKit 2.x (confidence: MEDIUM — verify against current docs before implementation)

---
*Architecture research for: AI agent catalog / showcase web platform*
*Researched: 2026-03-19*
