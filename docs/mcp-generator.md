# Phase 14: MCP generator (flagged)

A deterministic generator that turns a schema or specification into a small Python FastMCP (stdio) server package. The design and its reasoning are in [mcp-generator-design.md](mcp-generator-design.md); this page is the user and extension guide.

## Overview and flag

The web route and the Customize menu entry are behind `MCP_GENERATOR`, default off. Accepted values are `1`, `true`, `on`, `yes` (case-insensitive), read at call time by `mcpGeneratorEnabled()` in `src/lib/flags.ts`.

```bash
MCP_GENERATOR=1 npm run dev
```

With the flag off: `POST /api/mcp-generate` answers 404, the detail page load has no `mcpGeneratorEnabled` key, and the Customize menu shows only the three Phase 4 "Coming soon" items. With the flag on, the menu gains an enabled "Generate MCP" item that opens a paste-and-download panel. The CLI is an author tool and works regardless of the flag (like `validate-submission`, D-153).

The generator reads schema or specification text only. It never reads data, never contacts a network, never executes the Python it writes, and stores nothing.

## Inputs and accepted text formats

One adapter per input type. The registry detects the best match, or you force one with `--adapter` / the panel select. A forced adapter that does not fit is rejected; there is no fallback.

### openapi

OpenAPI 3.x as YAML or JSON. Local `#/` references only. Swagger 2.0 is reported (`swagger-2-unsupported`), external references are reported and never fetched. Only GET operations become tools; every other method is listed in the report as dropped. The `servers` URL and defaults are never read; the server gets a `<NAME>_BASE_URL` variable instead. Response examples are never copied into the output; they are read only to check them against their own schema (gap `example-schema-mismatch`, below).

```yaml
openapi: 3.0.3
info: { title: Acme Parts API, version: "1.0.0" }
paths:
  /parts:
    get:
      operationId: listParts
      parameters:
        - { name: q, in: query, schema: { type: string } }
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: array
                items: { type: object, properties: { partId: { type: string }, name: { type: string } } }
```

### tabular-catalog

Header and dictionary text for a spreadsheet-style catalog. Rows are never ingested: at most 5 sample rows are accepted (used only to infer types, values are not stored) and more than 5 is rejected (`rows-rejected`, D-150). Format:

```text
WG010,WG020,WG030
Widget code,Widget name,Quantity
ZZ-9001,Sample gizmo,12
# dictionary
code,label,type,description
WG010,Widget code,string,Stable widget code
WG030,Quantity on hand,integer,
# options
name=Acme Widgets
entity=widget
skip_rows=1
identifier=WG010
```

The first line holds column codes. `skip_rows` is the number of label lines after the header to skip. `# dictionary` rows are `code,label[,type[,description]]`. `# options` accepts `skip_rows`, `identifier`, `entity`, `name`. The generated server reads the real file at run time from `<NAME>_DATA_PATH`.

### sql-ddl

`CREATE TABLE` statements only (CUST-02, D-151): primary keys (inline, table-level, composite), foreign keys, quoted names, comments, `IF NOT EXISTS`, schema-qualified names.

```sql
CREATE TABLE customer (
  customer_id INTEGER NOT NULL PRIMARY KEY,
  customer_name VARCHAR(80) NOT NULL,
  city TEXT
);
```

INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/GRANT are ignored and recorded in the report as dropped writes; views, indexes and triggers are reported as unsupported. The generated backend is read-only SQLite (`<NAME>_DB_PATH`).

## Entry points

**CLI** (author tool, no flag needed):

```bash
npm run generate-mcp -- --adapter openapi spec.yaml --out ./my-server
```

Options: `--adapter <openapi|tabular-catalog|sql-ddl|auto>`, `--out <dir>`, `--force` (allow a non-empty output directory), `--server-name`, `--max-page-size`, `--result-ceiling`. Exit codes: 0 generated, 2 rejected or failed (gaps printed, nothing written), 64 usage. The CLI reads only the given input file, refuses `.env*` file names and inputs over the size cap.

**API route** `POST /api/mcp-generate` (flag-gated). Request JSON: `{ "adapter": "auto"|id, "input": "<text>", "options": { serverName, allowWrite, limits: { maxPageSize, resultCeiling, maxResponseItems } } }`. Success: `200 application/zip` (header `x-mcp-gaps` carries the gap count). Failure: JSON `{ ok: false, message, gaps: [...] }` (`message` is the first gap's message, D-461) with 400 (bad request), 404 (flag off), 429 (too many requests from this client or too many simultaneous generations; body `{ message }` only, with `Retry-After`; limits `MCP_GENERATOR_RATE_MAX` default 20, `MCP_GENERATOR_RATE_WINDOW_SEC` default 600, `MCP_GENERATOR_MAX_CONCURRENT` default 2, `0` = unlimited, D-465), 413 (input over 262,144 bytes; the raw body is capped at twice that), 422 (rejected input or oversize output over 2,000,000 bytes, D-155). The route adds no authentication logic of its own, writes nothing, logs nothing and never echoes the input. Authentication: with `AUTH_ENABLED=true` the global request hook (`src/hooks.server.ts`) protects `/api/mcp-generate` like every other `/api/*` route (401 `{ message: 'Authentication required' }` without a session); confirmed by Ville 2026-10-14 (D-476). The generator is deterministic only: LLM-assisted synthesis stays deferred and the generated server does not depend on `@modelcontextprotocol/sdk` (D-475).

**Customize menu**: the "Generate MCP" item on an agent detail page opens a panel: paste text, pick an adapter (default auto-detect), generate, and the zip downloads. The pasted text is cleared after a successful download and nothing is stored in the browser.

## Generated package layout

The zip contains one folder named after the server:

| File | Purpose |
| --- | --- |
| `server.py` | FastMCP stdio server, helpers and tools |
| `test_server.py` | pytest tests for the behaviour checklist against a stubbed upstream, temp CSV or temp SQLite |
| `requirements.txt` | pins (`fastmcp>=3.4,<5`, `httpx` for http backends only; verified on fastmcp 3.4.8 and 4.1.0 on 2026-10-14) |
| `README.generated.md` | env var table, run command, `.mcp.json` snippet with placeholders |
| `report.json` | tools emitted and dropped, gaps, assumptions, env vars |

Environment variable convention: `<NAME>_BASE_URL`, `<NAME>_API_KEY` or `<NAME>_TOKEN`, `<NAME>_DATA_PATH`, `<NAME>_DB_PATH`, where `<NAME>` derives from the server name. Documentation and snippets only ever contain placeholders such as `<ACME_PARTS_API_KEY>`.

## Behaviour checklist

Every generated server guarantees (RESEARCH-SYNTHESIS section 3.2; the generated pytest asserts each):

1. Task-oriented tool names (`list_*`, `search_*`, `lookup_<entity>_by_<id>`, `filter_<entity>_by_<field>`, `query_*`, `describe_*`), not raw operation ids.
2. Trimmed responses: at most 12 projected fields; a `fields` argument can narrow but not exceed 12.
3. Page-size clamp to the documented maximum (default 100 when unknown, with a gap).
4. Ceiling warning: a page beyond `limits.resultCeiling` returns a structured warning suggesting narrowing the query.
5. Honest not-found for single lookups.
6. Honest empty results with a message, never a bare empty envelope.
7. Structured errors (`ok`, `kind`, `message`, `hint`): no tracebacks, no upstream body, no exception text, no secrets.
8. Authentication failures name the environment variable, never its value.
9. Read-only by default: no write tools are emitted (D-143: an opt-in is recorded and reported but writes are not generated in this version).

Plus bounded retries on 429/5xx, response size caps and parameterised read-only SQL with allow-listed identifiers.

## Safety

- Schema or spec only. Credential-looking input (keys, bearer tokens, `?apiKey=` literals, `.env` content) is rejected rather than redacted; the finding records rule, line and kind, never the matched text (D-142).
- The credential scan runs in time linear in the input (long lines are scanned in overlapping windows), and it knows URL userinfo, JWTs, common vendor key shapes and `password`/`passwd`/`secret_key`-style assignments (D-220, D-221).
- Credentials are also checked on the way out: text copied from the source into descriptions is redacted, and every generated file is scanned again; a hit withholds the whole package with `credential-in-output` (file, line and kind only; D-222).
- Source text published in tool descriptions is labelled `Source note`, stripped of markup and of phrases that address a model, and reported with the `source-text-copied` and `source-text-flagged` gaps (D-223).
- Generated tools reject `.` and `..` as identifiers, write only validated numbers and identifiers into Python and SQL, and order every report and gap list by code unit (D-224, D-225, D-231).
- Generation makes no network call and has no persistence.
- Ambiguous or unsupported constructs become gaps; the affected tool is omitted, never guessed.
- Generated code never contains URLs, secrets or raw exception text, and docstring text is sanitised.
- Fixtures and docs use invented Acme names only.

## Not supported and reported

Docs-only inputs, data dumps, profile documents, repositories, composite inputs, Swagger 2.0, external `$ref`, non-SQLite DSNs, spreadsheets, and write operations. Each produces a gap or report line, not a guess. LLM-assisted synthesis is deferred (D-159).

Known limitations of the current core:

- The sql and dataset planners ignore the model's `operations`: they emit only `describe_*` and one bounded `query_<entity>` per entity (the list/get operations of a DDL model are kept for fidelity but yield no separate lookup tool). Lookup by key or foreign key works through the query filter. The dataset backend emits the first entity only (gap `dataset-multiple-entities`).
- Derived tool kinds `schemaDiscovery` and `crossFieldSearch` are declared in the type but only `inMemoryFilter` is accepted from callers; derived filters are http-only.
- (Fixed in 14-07: SQL `ORDER BY` now uses every identifier column, so composite-key tables page deterministically.)

## Gap codes (openapi adapter)

Every gap carries a code, a severity (`error`, `warn`, `info`), a message and, for operation gaps, the operation id in `path`. Messages name locations and type words only, never values copied from the input.

| Code | Severity | Meaning | Tool |
| --- | --- | --- | --- |
| `missing-response-schema` | warn | no JSON response schema on a success status | omitted |
| `path-param-undocumented` | warn | a templated path parameter is not declared | omitted |
| `pagination-conflict` | warn | both page and offset style parameters | omitted |
| `ambiguous-response` | warn | several candidate result arrays | omitted |
| `oneof-merged` | info | a oneOf with a discriminator was merged into one field set | kept |
| `auth-operation-override` | warn | an operation declares its own security; the document-level scheme is used for every tool | kept |
| `example-schema-mismatch` | warn | a response example contradicts its own schema (a property the schema does not define, a wrong type, null where not nullable); the message names the property path and the type words, never the example value (D-463) | kept, generated from the schema |

The Phase 15 tester treats a planted defect that produces neither a gap nor an omitted tool as `SILENT_GUESS`; since D-463 the partial-spec case's stale example is reported, so the generator passes `gap_reported` for it.

## Extension point for synthesized capability

A `DerivedTool` describes a tool the source does not expose but that can be built from what it does expose:

```ts
interface DerivedTool {
  id: string            // "<entity>.<field>"
  kind: 'inMemoryFilter' | 'schemaDiscovery' | 'crossFieldSearch'
  entity: string
  source: string        // nested collection field on the entity
  description: string
  origin: 'detected' | 'user'
}
```

**Structural detection rule** (RESEARCH-SYNTHESIS 3.1, domain-free): a response entity has a nested array of objects with key-like and value-like item fields (a `NestedCollection` with key fields), and no declared request parameter filters on the collection or its key fields. `detectDerivedTools(model)` then emits an `inMemoryFilter` derived tool with `origin: 'detected'`. Adapters only describe the nested collection in the `SourceModel`; they never emit tools.

**Kinds.** `inMemoryFilter` fetches up to a bounded number of candidate pages from the entity's list or search operation (`max_pages`, 1 to 10, default 5), filters the nested array locally by key (and optionally value) and returns the matches. `schemaDiscovery` and `crossFieldSearch` are reserved names; the core already emits `describe_*` itself for dataset and SQL backends.

**Coverage reporting contract.** A derived tool never silently under-reports: its result states `pages_scanned` and whether the scan was `truncated`, and an empty result carries the honest-empty message.

**Worked example** (library API, no core change):

```ts
import { generate } from '$lib/mcpgen/generate'
import { parseInput } from '$lib/mcpgen/registry'

const parsed = parseInput({ text: openapiText }, { adapterId: 'openapi' })
if (parsed.ok) {
  const result = generate(parsed.model, {}, [
    {
      id: 'part.features',
      kind: 'inMemoryFilter',
      entity: 'part',
      source: 'features',
      description: 'Find parts that have a matching feature entry.',
      origin: 'user',
    },
  ])
  // result.files: server.py gains filter_part_by_features(key, value=None, ..., max_pages=5)
}
```

The emitted Python (in outline): a plain function `filter_part_by_features` registered with `mcp.tool(fn)` that validates `key`, `value` and `max_pages`, loops over the list operation's pages up to `max_pages`, keeps items whose `features` array has an entry with the requested key (and value), projects at most 12 fields, and returns the matches with `pages_scanned`, `truncated` and a message or the structured error shape.

**Invalid derived rules** never break generation. A user rule with an unknown entity, a source that is not a nested collection, an unsupported kind, or a non-http backend is skipped and reported as gap `derived-invalid`; a duplicate id is `derived-duplicate` (info); a missing list or search operation is `derived-no-source`. Unrecognizable input to the pipeline yields `unrecognized-input`.

**Adding an InputAdapter.** Implement `InputAdapter` from `src/lib/mcpgen/types.ts` (`id`, `label`, `detect(input)` returning a 0..1 confidence and never throwing, `parse(input, options)` returning `{ model, gaps }` or `{ rejected }`), add one line to `src/lib/mcpgen/adapters/index.ts`, and add fixtures plus a golden test. The core (plan, emit, registry, pipeline) is untouched; `criteria.test.ts` fails if the core imports an adapter module.

## Reproducibility

Output is byte-identical for the same input: sorted zip entries, fixed 1980-01-01 timestamps, stable JSON. Golden files live in `src/lib/mcpgen/__golden__/`; update them deliberately with:

```bash
UPDATE_GOLDEN=1 npx vitest run src/lib/mcpgen
```

and review the diff.

## Relation to Phase 15

The generated `test_server.py` asserts the behaviour checklist against a stub, which makes it a seed set of cases for the Phase 15 test platform. How a case binds to the field names of an arbitrary generated server (per-case binding config, emitted next to the server or kept with the case) is an open question (synthesis section 6 Q7).

## Design basis

- RESEARCH-SYNTHESIS section 3.1: the synthesize-what-the-source-lacks discriminator.
- RESEARCH-SYNTHESIS section 3.2: behaviour checklist.
- RESEARCH-SYNTHESIS section 4.1: unverified claims stay marked UNVERIFIED (FastMCP pin).
- RESEARCH-SYNTHESIS section 5.1 and 5.2: adapter set and core/adapter interface.
- RESEARCH-SYNTHESIS section 5.3: deterministic first, LLM-assisted deferred.
- RESEARCH-SYNTHESIS section 5.4: safety invariants.
- RESEARCH-SYNTHESIS section 5.5 and 6: Phase 15 reuse and open questions.
