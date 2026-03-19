# Stack Research

**Domain:** AI agent catalog/showcase web platform
**Researched:** 2026-03-19
**Confidence:** HIGH (versions verified via npm registry; framework characteristics verified via package metadata)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| SvelteKit | 2.55.0 | Full-stack web framework (routing, SSR, API endpoints) | 12 direct dependencies vs Astro's 55. Handles both the catalog UI and the search API routes in one framework. Svelte 5's runes model eliminates boilerplate. SSR + static adapters available. TypeScript-first. The explicit project constraint ("lean dependencies") makes SvelteKit the clear choice. |
| Svelte | 5.54.0 | Component framework (UI layer) | Ships with SvelteKit 2. Svelte 5 (runes) eliminates the old Options API confusion; reactivity is explicit (`$state`, `$derived`). Compiles to vanilla JS — no virtual DOM runtime shipped to users. |
| TypeScript | 5.9.3 | Type safety, IDE tooling | Required for safe AgentSpec schema ingestion and the shim architecture. SvelteKit generates full TypeScript types for routes. No additional configuration needed. |
| Vite | 8.0.1 | Dev server and build tool | Bundled with SvelteKit — not a separate install decision. Vite 8 adds native TypeScript stripping (faster cold starts), Module Federation 2.0. No config needed beyond SvelteKit's defaults. |
| Tailwind CSS | 4.2.2 | Utility-first CSS | Tailwind 4 uses a Vite plugin instead of PostCSS — eliminates the PostCSS/autoprefixer dependency chain entirely. Zero config file needed for basic setup. CSS variable-based theming is cleaner for a design-system approach. |
| better-sqlite3 | 12.8.0 | SQLite driver for search index | Synchronous, fast, zero-dependency C binding. Used server-side at build time and in SvelteKit API routes. Stores pre-computed embeddings as BLOB columns. Perfect for ~300 agents — no separate process, no network overhead. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @huggingface/transformers | 3.8.1 | Generate text embeddings for semantic search | Use at build time (ingestion script) to generate embedding vectors for each agent's description. Uses ONNX Runtime Node under the hood — runs locally without any API key or network call. 4 direct dependencies. |
| Zod | 4.3.6 | Schema validation for AgentSpec ingestion | Validate every agent data file at ingest time. Define the canonical AgentSpec shape once in Zod; the shim layer transforms alternative formats to match. Fails loudly with descriptive errors on bad data. |
| yaml | 2.8.2 | Parse YAML-formatted agent definition files | If AgentSpec files are YAML (likely given the Oracle AgentSpec format). Pure JS, no native binding, tiny footprint. Supports YAML 1.2. |
| gray-matter | 4.0.3 | Parse YAML frontmatter from markdown files | Only needed if agent definitions embed metadata in markdown frontmatter. If pure YAML/JSON files, skip this — use `yaml` directly. |
| Drizzle ORM | 0.45.1 | Type-safe SQL query builder for SQLite | Lightweight alternative to raw SQL strings. Generates TypeScript types from schema. Use for the search index database (embedding storage, agent metadata cache). Not a full ORM — no hidden N+1 queries. |
| drizzle-kit | 0.31.10 | Drizzle migration tooling | Generates SQL migrations from Drizzle schema definitions. Use at build time to initialize the search index SQLite file. Dev dependency only. |
| marked | 17.0.4 | Markdown to HTML (for agent description rendering) | Render markdown content in agent detail pages. Lightweight, no AST overhead unless needed. If descriptions are plain text, skip entirely. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| @tailwindcss/vite | 4.2.2 | Tailwind 4 Vite integration | Add to `vite.config.ts` plugins array — replaces the old `postcss.config.js` + `tailwind.config.js` setup entirely. |
| Vitest | 4.1.0 | Unit and integration testing | Same config as Vite, runs in Node. Use for testing the ingestion pipeline, schema validation, and search scoring logic. No separate Jest setup needed. |
| @playwright/test | 1.58.2 | End-to-end browser testing | Test catalog browse flows, search result rendering, agent detail pages. Only install if E2E tests are in scope for the milestone. |
| svelte-preprocess | 6.0.3 | TypeScript preprocessing for .svelte files | Required for TypeScript in `<script lang="ts">` blocks. SvelteKit's `create` scaffold installs this automatically — do not configure manually. |
| eslint | 10.0.3 | Linting | Use with `@typescript-eslint` and `eslint-plugin-svelte`. ESLint 10 drops the legacy config format entirely — flat config only. |
| prettier | 3.8.1 | Code formatting | Use with `prettier-plugin-svelte` for `.svelte` file formatting. |

## Installation

```bash
# Create SvelteKit project (scaffolds everything)
npx sv create aic-agent-library
# Choose: SvelteKit app, TypeScript, Tailwind CSS, Vitest, Prettier, ESLint

# Runtime dependencies (production)
npm install better-sqlite3 drizzle-orm yaml zod @huggingface/transformers

# Dev dependencies
npm install -D drizzle-kit @types/better-sqlite3 @playwright/test

# Tailwind 4 is handled by sv create — verify @tailwindcss/vite is in vite.config.ts
# marked only if rendering markdown agent descriptions
npm install marked
```

> **Note:** `@huggingface/transformers` 3.x installs `onnxruntime-node` as a direct dependency. This is a native binding (~50MB). It is used only in the build-time ingestion script, not in the runtime server. Move it to devDependencies if the production deployment doesn't run ingestion.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| SvelteKit | Astro 6 | If the site were 100% static content with no server-side search API — e.g., a pure documentation site with no dynamic routes. Astro 6 has 55 direct dependencies and is optimized for content collections, not API-driven interactivity. For this project, SvelteKit's server routes are needed for search. |
| SvelteKit | Next.js 15 (React) | If the team has strong React expertise and no Svelte familiarity. Next.js is production-proven at scale but brings the full React ecosystem weight. For a team comfortable with Svelte, SvelteKit is strictly lighter. |
| SvelteKit | Nuxt 3 (Vue) | Same trade-off as Next.js. Heavier than SvelteKit, Vue-specific. Only if Vue expertise on the team. |
| better-sqlite3 | @sqlite.org/sqlite-wasm | If the deployment target is a pure serverless edge (Cloudflare Workers, Deno Deploy). WASM SQLite avoids native bindings but has more complex async API. For Node.js deployments (Vercel, Fly.io, self-hosted), stick with `better-sqlite3`. |
| @huggingface/transformers | OpenAI text-embedding API | If offline/local embedding generation is not a requirement and the project has an API budget. OpenAI `text-embedding-3-small` is faster to set up but adds external dependency + cost + network latency. For a build-time-only operation with ~300 agents, local ONNX embeddings are preferable. |
| @huggingface/transformers | Fuse.js (fuzzy text search) | If semantic similarity is determined to be over-engineered. Fuse.js 7.1.0 provides fuzzy string matching with zero native dependencies. Viable if the catalog stays small and keyword search is sufficient — but loses semantic matching ("find agents that handle database operations" matching "SQL query optimizer"). |
| Drizzle ORM | Raw SQL strings | Acceptable for simple schemas. Drizzle adds 0 runtime overhead (query builder only) and typed results — worth the install for a project with a defined schema. |
| Zod | TypeScript interfaces only | TypeScript interfaces are compile-time only and don't validate runtime data from files. The ingestion pipeline reads user-managed files — Zod runtime validation catches format errors before they corrupt the search index. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Prisma ORM | Pulls in a Rust-compiled query engine binary (~40MB), a separate `prisma generate` step, and a different SQLite connection model than `better-sqlite3`. The schema migration story is more complex for a single-file SQLite database. | Drizzle ORM + drizzle-kit |
| Pinecone / Weaviate / Qdrant | External vector databases are unnecessary at ~300-agent scale. They add network latency, require credentials management, incur cost, and create an external service dependency. | better-sqlite3 with a BLOB column storing Float32Array embeddings, cosine similarity computed in Node.js |
| React (standalone) | Adds virtual DOM runtime to every page. For a catalog with mostly read-only views, the runtime overhead is waste. | Svelte (compiles to vanilla JS, no runtime) |
| Webpack | Vite 8 supersedes Webpack for this use case in every dimension: faster HMR, native ESM, better tree-shaking. No scenario in this project justifies Webpack. | Vite (bundled with SvelteKit) |
| PostCSS + autoprefixer (standalone) | Tailwind 4's Vite plugin handles CSS processing internally. Adding a separate PostCSS pipeline creates configuration conflict. | @tailwindcss/vite plugin only |
| fs-extra | Node.js 22+ has a stable `fs/promises` API with recursive mkdir, glob, and copy. `fs-extra` is unnecessary. | Built-in `node:fs/promises` |
| Axios | Node.js 22+ has native `fetch`. No need for Axios in an SSR context. | Native `fetch` |
| @xenova/transformers | This was the old package name; replaced by `@huggingface/transformers` which is the actively maintained v3 package. `@xenova/transformers` (2.17.2) is no longer receiving updates. | @huggingface/transformers |

## Stack Patterns by Variant

**If the search index is built at deploy time (recommended for static catalog):**
- Run ingestion script as part of the build step: `node scripts/ingest.js && vite build`
- The SQLite file with embeddings is included in the build artifact
- SvelteKit server routes query the pre-built SQLite file at runtime
- `@huggingface/transformers` is a devDependency (only used during ingestion)

**If the catalog data changes frequently (more than daily):**
- Move ingestion to a SvelteKit server hook (`hooks.server.ts`) on startup
- Watch for file changes in development with `fs.watch`
- Still use SQLite — just rebuild it on each server start
- `@huggingface/transformers` becomes a production dependency

**If the deployment target is serverless (Vercel, Netlify Functions):**
- Use `@sveltejs/adapter-vercel` or `@sveltejs/adapter-netlify` instead of `adapter-node`
- SQLite must be bundled in the function deployment or accessed via a persistent volume
- Verify onnxruntime-node is compatible with the target function runtime (Lambda Node 22)

**If the deployment target is a static host (GitHub Pages, Cloudflare Pages):**
- Use `@sveltejs/adapter-static` (3.0.10) for fully pre-rendered output
- Search must be client-side: embed the agent data + embeddings as JSON in the build, run cosine similarity in the browser
- `@huggingface/transformers` runs in the browser (WASM); expect ~300ms first-search latency for model load
- This trades server infrastructure for slightly higher initial JS bundle

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @sveltejs/kit 2.x | svelte 5.x, vite 8.x | SvelteKit 2 requires Svelte 5 and Vite 5+. Vite 8 is compatible per the SvelteKit scaffold. |
| tailwindcss 4.x | @tailwindcss/vite 4.x | Must match exactly — both should be the same minor version. The old `tailwindcss-svelte` plugin is incompatible with Tailwind 4. |
| better-sqlite3 12.x | Node.js 18+ | Requires a C++ compiler for native binding. In CI/CD, ensure `node-gyp` dependencies are available or use a pre-built binary cache. |
| drizzle-orm 0.45.x | better-sqlite3 12.x | Drizzle's SQLite dialect uses `better-sqlite3`'s synchronous API natively — no async wrapper needed. |
| @huggingface/transformers 3.x | Node.js 18+, onnxruntime-node 1.19+ | v3 is a major rewrite from v2. The package import changed from `@xenova/transformers` to `@huggingface/transformers`. Embedding model names and pipeline API are broadly compatible. |
| zod 4.x | TypeScript 5.x | Zod 4 has a different API for some transforms vs Zod 3. If any existing code uses Zod 3, pin to `^3.22` and upgrade separately. |
| svelte-preprocess 6.x | @sveltejs/kit 2.x, svelte 5.x | svelte-preprocess 6 is required for Svelte 5 compatibility — v5.x is incompatible with Svelte 5's new compiler. |

## Sources

- npm registry (`registry.npmjs.org`) — version verification for all packages listed above (HIGH confidence)
- Package metadata (dependency counts): `@sveltejs/kit@2.55.0` = 12 deps; `astro@6.0.6` = 55 deps — verified directly from registry (HIGH confidence)
- `@huggingface/transformers@3.8.1` — dependency list confirmed as 4 packages: sharp, onnxruntime-web, onnxruntime-node, @huggingface/jinja (HIGH confidence)
- Architecture rationale for SQLite semantic search at small scale: derived from project constraints ("~100-300 agents", "in-memory or SQLite-backed") combined with package capabilities (MEDIUM confidence — no external benchmark source, but well-established pattern)
- Tailwind 4 Vite plugin approach: inferred from `@tailwindcss/vite` package existence and Tailwind 4's architectural shift away from PostCSS (MEDIUM confidence — official docs unavailable, but consistent with package structure)

---
*Stack research for: AI agent catalog/showcase web platform*
*Researched: 2026-03-19*
