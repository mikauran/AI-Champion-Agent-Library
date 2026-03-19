# Phase 2: Catalog and Detail - Research

**Researched:** 2026-03-19
**Domain:** SvelteKit 2, Svelte 5 runes, Tailwind CSS v4, Drizzle ORM query patterns, client-side filtering, progressive disclosure UI
**Confidence:** HIGH (stack verified against npm registry and official docs; patterns verified against SvelteKit and Drizzle official documentation)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BROW-01 | User can browse agents organized by domain/function category | Category filtering via Drizzle `eq()` in server load; `AgentRecord.category` field available from Phase 1 |
| BROW-02 | User can filter the catalog by attributes (LLM, tools, deployment type, tags) | Client-side `$derived.by()` filter over server-loaded array; URL search params via `goto()` for shareable state |
| BROW-03 | Catalog handles 100+ agents gracefully with pagination or infinite scroll | Drizzle `.limit()/.offset()` server-side pagination; Tailwind responsive grid degrades cleanly |
| DETL-01 | Agent detail page shows executive summary by default (name, purpose, use cases, GitHub link) | SvelteKit dynamic route `[slug]`; `AgentRecord.summary`, `title`, `githubUrl` fields available |
| DETL-02 | Technical specification (LLM, tools, memory, invocation, deployment) shown in collapsible section, collapsed by default | Native `<details>`/`<summary>` HTML or button+`aria-expanded` pattern; no JS library needed |
| DETL-03 | Agent detail page shows a customization panel listing tailorable fields | Static list from `AgentRecord` schema; rendered as a panel component alongside exec summary |
| UI-01 | Platform is responsive and usable on desktop and tablet viewports | Tailwind CSS v4 `sm:`/`md:`/`lg:` breakpoints; `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` card grid |
</phase_requirements>

---

## Summary

Phase 2 introduces the SvelteKit application layer on top of the Phase 1 data pipeline. The existing project (`package.json`, `src/lib/spec/`, `drizzle/schema.ts`) is a plain Node.js TypeScript project — SvelteKit must be scaffolded into it. The key integration challenge is wiring the existing `better-sqlite3` + Drizzle setup into SvelteKit's server-only module pattern (`src/lib/server/`) so that load functions can query the catalog database without the database client ever reaching the browser bundle.

The three plans map cleanly to sequential concerns: (1) scaffold SvelteKit + Tailwind, set up the db singleton, define catalog store and filter logic; (2) the catalog browse page with AgentCard, responsive grid, pagination, and filter controls; (3) the agent detail page with progressive disclosure — executive summary default, collapsible TechSpec accordion, GitHub CTA, and customization panel. All client-side filtering in Plan 02-02 should use Svelte 5 `$derived.by()` on the server-loaded agent array — no additional state management library is needed.

The critical architectural decision is adapter choice: this application uses SQLite at request time (server load functions query the database), which requires `adapter-node` rather than `adapter-static`. The `adapter-static` approach only works for build-time prerendering and cannot support dynamic server queries. For v1 catalog scale (~300 agents), server-side pagination (Drizzle `limit/offset`) plus client-side filter reactivity is the correct pattern — no virtual scroll library is needed.

**Primary recommendation:** Scaffold SvelteKit 2 + Svelte 5 into the existing project using `npx sv create . --template minimal`, add Tailwind CSS v4 via `npx sv add tailwindcss`, use `adapter-node`, place the Drizzle db client in `src/lib/server/db.ts`, and load agents server-side in `+page.server.ts` load functions. Use `$derived.by()` for client-side filter reactivity; use `goto()` + URLSearchParams for filter state in the URL.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| svelte | 5.54.0 | Component framework with runes reactivity | Official Svelte 5; `$state`, `$derived`, `$props` runes replace legacy stores for local component state |
| @sveltejs/kit | 2.55.0 | Full-stack framework: routing, SSR, load functions | SvelteKit 2 is stable current release; provides file-based routing, server load functions, and adapter system |
| @sveltejs/vite-plugin-svelte | 7.0.0 | Vite integration for Svelte components | Required peer of SvelteKit; handles Svelte component compilation |
| tailwindcss | 4.2.2 | Utility-first CSS | v4 removes PostCSS config entirely; `@import "tailwindcss"` is the only setup step |
| @tailwindcss/vite | 4.2.2 | Vite plugin for Tailwind CSS v4 | Replaces PostCSS pipeline; integrates directly with Vite via `vite.config.ts` plugin array |
| @sveltejs/adapter-node | 5.5.4 | Production adapter for Node.js server | Required for SQLite server-side access at request time; `adapter-static` cannot support runtime DB queries |
| vite | (bundled with SvelteKit) | Build tool | SvelteKit uses Vite internally; no separate install required |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| better-sqlite3 | 12.8.0 | SQLite driver (from Phase 1) | Already installed; used in `src/lib/server/db.ts` singleton |
| drizzle-orm | 0.45.1 | Type-safe SQL queries (from Phase 1) | Already installed; `.select().from(agents).where(eq(...)).limit().offset()` pattern |
| @types/node | (dev, from Phase 1) | Node.js types | Already installed; needed for server-side file path operations |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| adapter-node | adapter-static with prerender | `adapter-static` cannot query SQLite at request time — only at build time. Wrong for a dynamic catalog. |
| $derived.by() for filtering | Svelte store (`writable`) | Runes are the Svelte 5 canonical pattern; legacy stores still work but are deprecated for new code |
| native `<details>`/`<summary>` | Bits UI or Melt UI accordion | Native HTML requires zero JS, is accessible out-of-the-box, and is sufficient for DETL-02. Only add a library if animation requirements emerge. |
| Drizzle `limit/offset` pagination | Virtual scroll (e.g., svelte-virtual) | Virtual scroll adds complexity; server pagination is simpler and correct for 100-300 agents |
| goto() + URLSearchParams | sveltekit-search-params library | The library adds a dependency for a pattern that is 4 lines of code with goto(); avoid the dependency |

**Installation (Phase 2 adds):**

```bash
# SvelteKit scaffold into existing project
npx sv create . --template minimal --types ts --no-install

# After merge, install new deps
npm install

# Add Tailwind CSS v4 via sv add
npx sv add tailwindcss --no-install
npm install

# adapter-node for Node server deployment
npm install -D @sveltejs/adapter-node
```

**Version verification (confirmed via npm registry 2026-03-19):**
- `svelte@5.54.0` — current
- `@sveltejs/kit@2.55.0` — current (last published 6 days ago)
- `@sveltejs/adapter-node@5.5.4` — current
- `tailwindcss@4.2.2` — current
- `@tailwindcss/vite@4.2.2` — current

---

## Integrating SvelteKit into the Existing Project

The existing project root has `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/lib/spec/`, `drizzle/`, and `scripts/`. Running `npx sv create . --template minimal` in the project root will add SvelteKit's file structure alongside the existing files. Key collision points to resolve manually:

| File | Collision Type | Resolution |
|------|---------------|------------|
| `package.json` | sv create overwrites | Merge scripts manually: keep `ingest`, `db:push`; replace `build` with SvelteKit build |
| `tsconfig.json` | sv create overwrites | Merge: keep `paths`, `baseUrl`; add SvelteKit's `extends` and `include` additions |
| `vite.config.ts` | sv create creates new | Keep sv create version; add `@tailwindcss/vite` and `tailwindcss()` plugin |
| `vitest.config.ts` | sv create may overwrite | SvelteKit vitest setup uses `@sveltejs/kit/vite`; merge with existing test include paths |
| `src/` directory | sv create adds `src/routes/`, `src/app.html` | Non-conflicting — existing `src/lib/spec/` stays; routes are new directories |

**Post-scaffold build script:**

```json
{
  "scripts": {
    "db:push": "drizzle-kit push",
    "ingest": "tsx scripts/ingest.ts",
    "dev": "npm run db:push && npm run ingest && vite dev",
    "build": "npm run db:push && npm run ingest && vite build",
    "preview": "node build",
    "test": "vitest run"
  }
}
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 scope)

```
src/
├── app.css                         # @import "tailwindcss" — Tailwind entry
├── app.html                        # SvelteKit HTML shell
├── hooks.server.ts                 # (optional) server lifecycle hooks
├── lib/
│   ├── server/
│   │   └── db.ts                   # Drizzle db singleton — server-only
│   ├── spec/                       # Existing from Phase 1 (unchanged)
│   │   ├── types.ts
│   │   ├── oracle-agentspec.ts
│   │   └── index.ts
│   └── components/
│       ├── AgentCard.svelte        # Single agent card for catalog grid
│       ├── FilterBar.svelte        # Filter controls (LLM, category, tags)
│       ├── Pagination.svelte       # Page controls
│       ├── TechAccordion.svelte    # Collapsible technical spec section
│       └── CustomizationPanel.svelte  # Tailorable fields panel
└── routes/
    ├── +layout.svelte              # Root layout — imports app.css
    ├── +page.svelte                # (redirect or landing)
    ├── catalog/
    │   ├── +page.server.ts         # Load: query agents with filter/pagination
    │   └── +page.svelte            # Catalog browse page
    └── agents/
        └── [slug]/
            ├── +page.server.ts     # Load: query single agent by slug
            └── +page.svelte        # Agent detail page
```

### Pattern 1: Database Singleton in server/ Module

**What:** The Drizzle db client is initialized once in `src/lib/server/db.ts`. Files in `src/lib/server/` are server-only — SvelteKit enforces that they cannot be imported client-side. This prevents the database connection from leaking into the browser bundle.

**When to use:** Always — never initialize `better-sqlite3` inside a load function (creates a new connection per request). Never import `src/lib/server/db.ts` from a `.svelte` component directly.

```typescript
// src/lib/server/db.ts
// SOURCE: Derived from fullstacksveltekit.com/blog/sveltekit-sqlite-drizzle (official pattern)
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { agents } from '../../drizzle/schema.js'

const DB_PATH = process.env.CATALOG_DB_PATH ?? './db/catalog.db'

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite)
export { agents }
```

### Pattern 2: Server Load Function for Catalog Page

**What:** `+page.server.ts` load functions run exclusively on the server. They query SQLite via Drizzle and return serializable data to the page component via the `data` prop.

**When to use:** All database queries. Never import `db` from a `+page.svelte` file.

```typescript
// src/routes/catalog/+page.server.ts
// SOURCE: SvelteKit official docs — svelte.dev/docs/kit/load
import { db, agents } from '$lib/server/db.js'
import { eq, and, inArray, asc } from 'drizzle-orm'
import type { PageServerLoad } from './$types'

const PAGE_SIZE = 24

export const load: PageServerLoad = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const category = url.searchParams.get('category') ?? null
  const llm = url.searchParams.get('llm') ?? null

  const conditions = []
  if (category) conditions.push(eq(agents.category, category))
  if (llm) conditions.push(eq(agents.llmName, llm))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const rows = db
    .select()
    .from(agents)
    .where(whereClause)
    .orderBy(asc(agents.title))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all()

  const totalRows = db
    .select({ count: agents.slug })
    .from(agents)
    .where(whereClause)
    .all()

  // Deserialize JSON arrays stored as text
  const agentList = rows.map(row => ({
    ...row,
    toolNames: JSON.parse(row.toolNames) as string[],
    tags: JSON.parse(row.tags) as string[],
  }))

  // Distinct filter options for filter bar
  const allCategories = db
    .selectDistinct({ category: agents.category })
    .from(agents)
    .where(eq(agents.category, agents.category))
    .all()
    .map(r => r.category)
    .filter(Boolean) as string[]

  const allLlms = db
    .selectDistinct({ llmName: agents.llmName })
    .from(agents)
    .all()
    .map(r => r.llmName)
    .filter(Boolean) as string[]

  return {
    agents: agentList,
    total: totalRows.length,
    page,
    pageSize: PAGE_SIZE,
    categories: allCategories,
    llms: allLlms,
    filters: { category, llm },
  }
}
```

### Pattern 3: Server Load Function for Agent Detail Page

**What:** Dynamic route `[slug]` — load function fetches a single agent by slug. Throws a 404 if not found.

```typescript
// src/routes/agents/[slug]/+page.server.ts
// SOURCE: SvelteKit official docs — svelte.dev/docs/kit/load
import { db, agents } from '$lib/server/db.js'
import { eq } from 'drizzle-orm'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const row = db
    .select()
    .from(agents)
    .where(eq(agents.slug, params.slug))
    .get()

  if (!row) {
    throw error(404, `Agent "${params.slug}" not found`)
  }

  return {
    agent: {
      ...row,
      toolNames: JSON.parse(row.toolNames) as string[],
      tags: JSON.parse(row.tags) as string[],
    },
  }
}
```

### Pattern 4: Client-Side Filter Reactivity with $derived.by()

**What:** Filter state is held in `$state` variables in the catalog page component. The filtered array is computed with `$derived.by()`. URL is updated via `goto()` for shareability.

**When to use:** When BROW-02 requires filter updates without a page reload. The server load function handles initial load and pagination; client-side `$derived` handles live filter UI.

```svelte
<!-- src/routes/catalog/+page.svelte -->
<!-- SOURCE: Svelte 5 $derived docs — svelte.dev/docs/svelte/$derived -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  // Filter state — initialized from URL params (for shareable links)
  let selectedCategory = $state(data.filters.category ?? '')
  let selectedLlm = $state(data.filters.llm ?? '')

  // Client-side derived filter (fast, no server round-trip for already-loaded page)
  let filteredAgents = $derived.by(() => {
    return data.agents.filter(agent => {
      const categoryMatch = !selectedCategory || agent.category === selectedCategory
      const llmMatch = !selectedLlm || agent.llmName === selectedLlm
      return categoryMatch && llmMatch
    })
  })

  function applyFilters() {
    const params = new URLSearchParams()
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedLlm) params.set('llm', selectedLlm)
    params.set('page', '1')
    goto(`?${params.toString()}`, { replaceState: true })
  }
</script>
```

### Pattern 5: Tailwind Responsive Card Grid

**What:** A CSS grid that goes 1 → 2 → 3 columns across mobile/tablet/desktop breakpoints. Each card is an `<a>` link to the detail page.

```svelte
<!-- Catalog grid — no page reload needed for navigation (SvelteKit client-side nav) -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each filteredAgents as agent (agent.slug)}
    <AgentCard {agent} />
  {/each}
</div>
```

### Pattern 6: Progressive Disclosure with Native `<details>`

**What:** The TechSpec section on the detail page uses the native HTML `<details>` and `<summary>` elements. Collapsed by default. No JavaScript, no library, no accessibility overhead.

**When to use:** Always for DETL-02 — the `<details>` element is fully accessible (keyboard operable, screen reader compatible) and works without JavaScript.

```svelte
<!-- TechAccordion.svelte -->
<!-- SOURCE: Accessibility guidance — fedmentor.dev/posts/disclosure-ui/ -->
<details>
  <summary class="cursor-pointer font-semibold text-gray-700 py-3 select-none">
    Technical Specification
  </summary>
  <div class="pt-4 space-y-2 text-sm text-gray-600">
    <div><span class="font-medium">LLM:</span> {agent.llmName}</div>
    <div><span class="font-medium">Temperature:</span> {agent.llmTemperature ?? 'default'}</div>
    <div><span class="font-medium">Tools:</span> {agent.toolNames.join(', ') || 'none'}</div>
    <div><span class="font-medium">Human Approval:</span> {agent.requiresHumanApproval ? 'required' : 'not required'}</div>
  </div>
</details>
```

### Anti-Patterns to Avoid

- **Importing `src/lib/server/db.ts` from a component or `+page.ts`:** SvelteKit enforces server-only imports — any file outside `server/` that imports a server module will fail at build time. `db.ts` must live in `src/lib/server/`.
- **Using `$page.url.searchParams` directly as writable state:** `$page.url.searchParams` is read-only. Use `new URLSearchParams()` + `goto()` to update URL params.
- **Using `adapter-static` for this project:** The project queries SQLite at request time. `adapter-static` prerendering only works for build-time data; it cannot serve dynamic filter/pagination queries.
- **Calling `JSON.parse()` inside Svelte template expressions:** Parse `toolNames` and `tags` JSON strings in the load function before returning to the component. Never parse in the template.
- **Using legacy Svelte 4 `$:` reactive declarations or `export let`:** Svelte 5 projects use `$state`, `$derived`, and `$props()`. The legacy APIs still compile but are deprecated.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS responsive breakpoints | Custom media query CSS | Tailwind `sm:`/`md:`/`lg:` prefixes | Tailwind v4 generates only the classes you use; hand-rolling breakpoints creates maintenance burden |
| Collapsible/accordion | Custom JS toggle with `classList.toggle` | Native `<details>`/`<summary>` HTML element | Browser-native, zero JS, accessible by default, keyboard operable |
| Server-side pagination | Skip/take logic in application code | Drizzle `.limit(N).offset(M)` | Type-safe, prevents SQL injection, handles edge cases |
| URL state management | `window.history.pushState()` | `goto()` from `$app/navigation` | Direct history API bypasses SvelteKit's router and breaks `$page` store reactivity |
| Database connection pooling | Reconnect logic | Module-level singleton in `src/lib/server/db.ts` | `better-sqlite3` is synchronous; Node.js module caching ensures one connection per server process |
| Filter dropdown options | Hardcoded arrays in components | Drizzle `selectDistinct()` queries in load function | Options must reflect actual data in the DB; hardcoded lists become stale |

**Key insight:** SvelteKit's file-based routing, Tailwind's utility classes, and Drizzle's type-safe query builder each eliminate entire categories of boilerplate. The catalog and detail pages should be thin orchestration layers over these primitives.

---

## Common Pitfalls

### Pitfall 1: SvelteKit Scaffold Overwrites Existing Files

**What goes wrong:** Running `npx sv create .` in the existing project root overwrites `package.json`, `tsconfig.json`, and potentially `vitest.config.ts` with SvelteKit defaults, destroying Phase 1 configuration.

**Why it happens:** `sv create` is designed for fresh projects. Overwriting is the default behavior.

**How to avoid:** Before running `sv create .`, copy the key config files to a backup. After scaffolding, manually merge:
- `package.json`: Keep Phase 1 `dependencies` and `scripts`; add SvelteKit's `@sveltejs/kit`, `svelte`, `vite` deps and replace `build` script
- `tsconfig.json`: Keep `paths`, `baseUrl`; add SvelteKit's `extends "@sveltejs/kit/tsconfig.json"` and adjust `include` to cover `src/routes/**/*`
- `vitest.config.ts`: SvelteKit's vitest setup uses `@sveltejs/kit/vite` — merge with existing `environment: 'node'` test include paths

**Warning signs:** `npm run ingest` fails after scaffold because package.json scripts were overwritten.

### Pitfall 2: `toolNames` and `tags` JSON Strings Not Deserialized

**What goes wrong:** The Drizzle `agents` table stores `tool_names` and `tags` as JSON text strings (e.g., `'["tool1","tool2"]'`). If a component receives these raw strings and iterates over them with `{#each agent.toolNames}`, Svelte iterates over characters, not array elements.

**Why it happens:** Drizzle does not auto-deserialize text columns. The JSON serialization was done at ingest time; deserialization must be done explicitly.

**How to avoid:** In every `+page.server.ts` load function that returns agent rows, map the results and call `JSON.parse(row.toolNames)` and `JSON.parse(row.tags)` before returning. This is the correct place — server-side, once, before data reaches the component.

**Warning signs:** Agent tool list shows individual characters instead of tool names, or `tags.map is not a function` error at runtime.

### Pitfall 3: Svelte 5 Component Props use `$props()`, Not `export let`

**What goes wrong:** Phase 2 uses Svelte 5 runes. Writing `export let agent: AgentRow` in a component causes TypeScript errors and incorrect behavior in Svelte 5 projects.

**Why it happens:** Svelte 4 used `export let` for component props. Svelte 5 uses `$props()` rune. The `sv create` scaffold generates a Svelte 5 project.

**How to avoid:** All components must use `let { propName, propName2 } = $props()`. The `$props()` pattern also supports TypeScript generics for type-safe props.

**Warning signs:** `export let` in `.svelte` files in a Svelte 5 project.

### Pitfall 4: `goto()` with Filters Triggers Server Load Re-execution

**What goes wrong:** `goto('?category=nlp')` causes SvelteKit to re-run the `+page.server.ts` load function because the URL changed. This is a server round-trip, not pure client-side filtering.

**Why it happens:** SvelteKit's load functions re-run when URL params they access change. If the load function reads `url.searchParams.get('category')`, a URL change triggers reload.

**How to avoid:** Design deliberately: for fast client-side filter response (no network round-trip), use `$derived.by()` on the already-loaded `data.agents` array with local `$state` for filter values. Call `goto()` only for pagination (which genuinely needs a new server query for the next page of data) or to make filters shareable via URL. Do NOT call `goto()` on every keypress or select change if client-side filtering is sufficient.

**Warning signs:** Network requests fire on every filter selection, causing visible latency.

### Pitfall 5: `adapter-auto` Does Not Support SQLite in Production

**What goes wrong:** `npx sv create .` installs `@sveltejs/adapter-auto` by default. In environments like Vercel or Netlify, this adapter detects the platform and may use serverless function deployment — which lacks a persistent filesystem for SQLite writes. Reads may work for a brief window then fail.

**Why it happens:** `adapter-auto` is designed for serverless platform deployment. SQLite is a file-based database requiring a persistent local filesystem, which serverless platforms do not provide.

**How to avoid:** Replace `adapter-auto` with `adapter-node` in `svelte.config.ts`. This is the correct adapter for Node.js server deployment where the SQLite file is on the same machine.

**Warning signs:** Catalog pages return 500 errors in production despite working in dev.

### Pitfall 6: `src/lib/server/` Enforcement Not Obvious

**What goes wrong:** A developer places `db.ts` in `src/lib/` (not `src/lib/server/`) and imports it from a `+page.svelte`. This works in development but leaks the database connection to the client bundle.

**Why it happens:** SvelteKit only enforces server-only isolation for files in `src/lib/server/` and files with `.server.ts` suffix. Files in `src/lib/` are importable from both client and server.

**How to avoid:** Database client, environment variable access, and any sensitive server logic must live in `src/lib/server/`. Never place `db.ts` in `src/lib/` directly.

**Warning signs:** Build output includes `better-sqlite3` in the client bundle (check build output size). Browser console errors about `fs` module not available.

---

## Code Examples

### Tailwind CSS v4 Vite Config

```typescript
// vite.config.ts
// SOURCE: tailwindcss.com/docs/guides/sveltekit
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
  ],
})
```

### Root Layout with Tailwind Import

```svelte
<!-- src/routes/+layout.svelte -->
<!-- SOURCE: tailwindcss.com/docs/guides/sveltekit -->
<script>
  import '../app.css'
  let { children } = $props()
</script>

{@render children()}
```

### AgentCard Component

```svelte
<!-- src/lib/components/AgentCard.svelte -->
<script lang="ts">
  interface Props {
    agent: {
      slug: string
      title: string
      summary: string
      category: string | null
      maturityStatus: string
      tags: string[]
    }
  }
  let { agent }: Props = $props()
</script>

<a
  href="/agents/{agent.slug}"
  class="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
>
  <div class="flex items-start justify-between gap-2 mb-2">
    <h3 class="font-semibold text-gray-900 text-lg leading-snug">{agent.title}</h3>
    {#if agent.maturityStatus === 'production'}
      <span class="shrink-0 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Production</span>
    {:else if agent.maturityStatus === 'beta'}
      <span class="shrink-0 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Beta</span>
    {:else}
      <span class="shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Experimental</span>
    {/if}
  </div>
  {#if agent.category}
    <p class="text-xs text-indigo-600 font-medium mb-2">{agent.category}</p>
  {/if}
  <p class="text-sm text-gray-600 line-clamp-3">{agent.summary}</p>
  {#if agent.tags.length > 0}
    <div class="flex flex-wrap gap-1 mt-3">
      {#each agent.tags.slice(0, 3) as tag}
        <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tag}</span>
      {/each}
    </div>
  {/if}
</a>
```

### Agent Detail Page Structure

```svelte
<!-- src/routes/agents/[slug]/+page.svelte -->
<script lang="ts">
  import TechAccordion from '$lib/components/TechAccordion.svelte'
  import CustomizationPanel from '$lib/components/CustomizationPanel.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
  let { agent } = data
</script>

<!-- Executive summary — visible by default (DETL-01) -->
<section class="max-w-2xl">
  <h1 class="text-3xl font-bold text-gray-900 mb-2">{agent.title}</h1>
  <p class="text-gray-600 mb-4">{agent.summary}</p>
  {#if agent.githubUrl}
    <a
      href={agent.githubUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
    >
      View on GitHub
    </a>
  {/if}
</section>

<!-- Collapsible technical spec — collapsed by default (DETL-02) -->
<TechAccordion {agent} />

<!-- Customization panel — visible alongside exec summary (DETL-03) -->
<CustomizationPanel {agent} />
```

### Pagination Controls Component

```svelte
<!-- src/lib/components/Pagination.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  interface Props {
    currentPage: number
    totalPages: number
  }
  let { currentPage, totalPages }: Props = $props()

  function navigate(p: number) {
    const params = new URLSearchParams($page.url.searchParams)
    params.set('page', String(p))
    goto(`?${params.toString()}`)
  }
</script>

<nav class="flex items-center gap-2 justify-center mt-8">
  <button
    onclick={() => navigate(currentPage - 1)}
    disabled={currentPage <= 1}
    class="px-3 py-1.5 rounded border text-sm disabled:opacity-40"
  >
    Previous
  </button>
  <span class="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
  <button
    onclick={() => navigate(currentPage + 1)}
    disabled={currentPage >= totalPages}
    class="px-3 py-1.5 rounded border text-sm disabled:opacity-40"
  >
    Next
  </button>
</nav>
```

### svelte.config.ts (adapter-node)

```typescript
// svelte.config.ts
// SOURCE: svelte.dev/docs/kit/adapter-node
import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      '$lib': 'src/lib',
    },
  },
}

export default config
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `export let` for component props | `let { prop } = $props()` rune | Svelte 5 (Oct 2024) | All new components must use runes; legacy APIs still compile with warnings |
| `$:` reactive declarations | `$derived` and `$derived.by()` runes | Svelte 5 (Oct 2024) | More explicit, no implicit dependency tracking issues |
| PostCSS + `tailwind.config.js` | `@tailwindcss/vite` plugin + `@import "tailwindcss"` | Tailwind v4 (early 2025) | No PostCSS config file, no content globs, no `tailwind.config.js` |
| `create-svelte` npm package | `npx sv create` (sv CLI) | 2024-2025 | `create-svelte` deprecated; `sv` is the official CLI |
| `adapter-auto` default | Explicit `adapter-node` for SQLite apps | Ongoing | `adapter-auto` targets serverless platforms; SQLite needs persistent filesystem |
| Writable Svelte stores for local state | `$state` rune in Svelte 5 | Svelte 5 (Oct 2024) | Local component state no longer requires store imports |

**Deprecated/outdated:**
- `create-svelte` package: deprecated; use `npx sv create` instead
- `@tailwindcss/postcss`: the PostCSS integration path is superseded by `@tailwindcss/vite` for Vite projects
- `svelte/store` (writable/readable) for local component state: still works but `$state` rune is canonical in Svelte 5 code
- `export let` for props: still compiles in Svelte 5 but linted as legacy; `$props()` is canonical

---

## Open Questions

1. **SvelteKit scaffold collision handling with existing package.json**
   - What we know: `npx sv create .` will attempt to overwrite `package.json` and `tsconfig.json` with SvelteKit defaults
   - What's unclear: Whether `--no-install` prevents the overwrite or only prevents `npm install`; whether a manual merge or a sed-patch approach is cleaner in the plan
   - Recommendation: In Plan 02-01, the task should explicitly back up `package.json` and `tsconfig.json`, run `sv create .`, then apply a documented merge rather than relying on scaffold behavior

2. **Tailorable fields definition for DETL-03**
   - What we know: DETL-03 requires "a customization panel listing which fields of the agent are tailorable (the 20%)". The `AgentRecord` type is defined but the concept of "tailorable fields" is not in the spec.
   - What's unclear: Is "tailorable" a static list defined by the platform, or is it a field in the AgentSpec/AgentRecord?
   - Recommendation: Treat this as a static list for v1 — define a constant array like `TAILORABLE_FIELDS = ['llm.name', 'llm.temperature', 'systemPrompt', 'tools']` in a config file. The customization panel renders this list. Phase 4 will activate these items.

3. **Detail page "use cases" field mapping**
   - What we know: DETL-01 requires the detail page to show "use cases". The `AgentRecord` type (from Phase 1) does not have a `useCases` field — it has `summary` and `systemPrompt`.
   - What's unclear: Where use cases should be sourced from in the current `AgentRecord`
   - Recommendation: For v1, render `summary` as the primary description (it is already the human-readable purpose). If the consortium's agent YAMLs have a `metadata.use_cases` field, the ingestion adapter can surface it. Otherwise, "use cases" is approximated by `summary` on the detail page. Document this assumption in Plan 02-03.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 (already installed) |
| Config file | `vitest.config.ts` — exists; needs updating for SvelteKit browser environment |
| Quick run command | `npx vitest run src/lib/components/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BROW-01 | Catalog page load function returns agents grouped by category | unit | `npx vitest run src/routes/catalog/` | Wave 0 |
| BROW-02 | Filter state updates derived list without server round-trip | unit | `npx vitest run src/lib/components/FilterBar.test.ts` | Wave 0 |
| BROW-03 | Load function with limit/offset returns PAGE_SIZE agents and correct total | unit | `npx vitest run src/routes/catalog/` | Wave 0 |
| DETL-01 | Detail load function returns agent by slug with exec summary fields | unit | `npx vitest run src/routes/agents/` | Wave 0 |
| DETL-01 | Detail load function throws 404 for unknown slug | unit | `npx vitest run src/routes/agents/` | Wave 0 |
| DETL-02 | TechAccordion renders `<details>` element that is closed by default | unit (jsdom) | `npx vitest run src/lib/components/TechAccordion.test.ts` | Wave 0 |
| DETL-03 | CustomizationPanel renders TAILORABLE_FIELDS list | unit (jsdom) | `npx vitest run src/lib/components/CustomizationPanel.test.ts` | Wave 0 |
| UI-01 | Catalog page has responsive grid class (manual/visual) | smoke | manual browser check desktop + tablet | manual |

**Note on component testing:** Testing Svelte 5 components with Vitest requires `@testing-library/svelte` with the `svelte5` flag or the newer `@sveltejs/svelte-testing-library`. Load function tests (server-side only) can use `environment: 'node'`; component tests need `environment: 'jsdom'`.

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/ src/routes/` (lib + routes unit tests)
- **Per wave merge:** `npx vitest run` (full suite including Phase 1 spec/ and ingest tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — update to support jsdom environment for component tests alongside existing node tests; add `@testing-library/svelte` for Svelte 5
- [ ] `src/routes/catalog/catalog.test.ts` — load function unit tests (node env); covers BROW-01, BROW-02 filtering logic, BROW-03 pagination
- [ ] `src/routes/agents/detail.test.ts` — load function unit tests (node env); covers DETL-01 field presence, 404 behavior
- [ ] `src/lib/components/TechAccordion.test.ts` — component test (jsdom env); covers DETL-02 `<details>` element closed by default
- [ ] `src/lib/components/CustomizationPanel.test.ts` — component test (jsdom env); covers DETL-03 tailorable fields rendered
- [ ] `src/lib/components/FilterBar.test.ts` — component test (jsdom env); covers BROW-02 filter state reactivity
- [ ] Framework install for component testing: `npm install -D @testing-library/svelte @testing-library/jest-dom`

---

## Sources

### Primary (HIGH confidence)

- SvelteKit official docs — `svelte.dev/docs/kit/creating-a-project` — `npx sv create` command and scaffold options
- SvelteKit official docs — `svelte.dev/docs/kit/load` — server load function pattern, `+page.server.ts` data flow
- SvelteKit official docs — `svelte.dev/docs/cli/sv-add` — `npx sv add tailwindcss` for adding Tailwind to existing project
- Tailwind CSS official docs — `tailwindcss.com/docs/guides/sveltekit` — exact Tailwind v4 + SvelteKit setup steps (packages, files)
- Svelte 5 official docs — `svelte.dev/docs/svelte/$derived` — `$derived` and `$derived.by()` rune syntax and semantics
- Drizzle ORM official docs — `orm.drizzle.team/docs/select` — `eq`, `inArray`, `and`, `.limit()`, `.offset()`, `.all()`, `.get()` patterns
- npm registry — version verification for `svelte`, `@sveltejs/kit`, `@sveltejs/adapter-node`, `tailwindcss`, `@tailwindcss/vite` (2026-03-19)

### Secondary (MEDIUM confidence)

- fullstacksveltekit.com/blog/sveltekit-sqlite-drizzle — `src/lib/server/db.ts` singleton pattern (consistent with official SvelteKit server module docs)
- programonaut.com/how-to-change-url-query-parameters-without-reload-sveltekit — `goto()` + URLSearchParams pattern for filter URL state
- fedmentor.dev/posts/disclosure-ui — ARIA accessibility guidance for disclosure widgets (verified against SvelteKit accessibility docs pattern)

### Tertiary (LOW confidence)

- WebSearch: Tailorable fields definition for DETL-03 — not defined in any official spec; recommendation is project-specific interpretation
- WebSearch: sv create collision behavior with existing `package.json` — anecdotal; should be verified during Plan 02-01 execution

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from npm registry 2026-03-19; install commands verified from official docs
- SvelteKit + Tailwind integration: HIGH — official docs walkthrough fetched and verified
- Architecture patterns (server load, db singleton): HIGH — verified against SvelteKit official docs and official Drizzle docs
- Client-side filtering ($derived.by): HIGH — verified against official Svelte 5 docs
- Progressive disclosure (details/summary): HIGH — native HTML, no library; accessibility verified from multiple sources
- Tailorable fields (DETL-03): LOW — no spec definition; planner must make a design decision
- Use cases field mapping (DETL-01): LOW — `AgentRecord` has no `useCases` field; assumption documented as open question

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (SvelteKit is actively released; re-verify `@sveltejs/kit` version in 30 days as minor releases are frequent)
