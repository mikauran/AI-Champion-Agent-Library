# Consortium agents: inventory against data/agents

Audit date: 2026-10-14 (Phase 24). Compared the 12 consortium agents with every entry in `data/agents/*.yaml`.

## Principle

Agents do the semantic steps: read, interpret, map, draft. Engineers review and decide. Every agent output is a draft for engineer review, never a final decision.

## Confidentiality

Only the agent names are used here, with our own wording. The source slide is TUNI-confidential and is not in this repository.

## Status legend

- full: an existing entry covers the agent's purpose.
- partial: an existing entry covers part of the purpose or a neighbouring task.
- missing: no existing entry covers it.

## Inventory

| No | Agent | Stage | Status | Evidence | Notes / what is missing | Target phase |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | ETIM & classification repair | Design | partial | data/agents/etim-classification-repair.yaml | Counted: entry plus one container run with a synthetic sample (Phase 25, 25-02). Classification lookup and real ETIM data missing. | 25 |
| 2 | QTO normalization | Design | partial | data/agents/qto-normalization.yaml | Counted: entry plus one container run on a synthetic table (Phase 25, 25-03); no model access, no cost mapping. | 25 |
| 3 | Clash prioritization | Design | partial | data/agents/clash-prioritization.yaml | Counted: entry plus one container run on a synthetic clash report (Phase 25, 25-04, redesigned one-row-per-clash SKILL after three failed runs); no model access, generic priority scale; the report must carry a precomputed location_key (real clash exports need a preprocessing step). | 25 |
| 4 | RFI generation | Design | partial | data/agents/rfi-triage-assistant.yaml, data/agents/demo-rfi-triage.yaml, data/agents/rfi-generation-from-findings.yaml | Counted: new entry driven by findings plus one container run on synthetic findings (Phase 25, 25-05). The assistant and demo entries stay as they were (conversational drafting/routing, single-RFI triage); no RFI log or numbering, no attachments. | 25 |
| 5 | Product sourcing E-BOM to M-BOM | Sourcing | partial | data/agents/product-sourcing-mbom.yaml | Counted: entry plus one container run on a synthetic 6-line E-BOM and 6-row catalog excerpt (Phase 26, 26-01, step scoped down after six failed runs on 12 x 13); handles up to about 6 lines x 6 rows per run, larger BOMs must be batched; no live stk-mcp / lvi-info-mcp access, exact-equality matching only. | 26 |
| 6 | Quote comparison | Sourcing | partial | data/agents/quote-comparison.yaml | Counted: entry plus one container run on three synthetic quotes (Phase 26, 26-02); flag-only, no arithmetic, no conversions, no supplier recommendation. | 26 |
| 7 | Carbon & EPD enrichment | Sourcing | partial | data/agents/carbon-epd-enrichment.yaml | Counted: entry plus one container run on a synthetic product list and synthetic EPD excerpt (Phase 26, 26-03); map-and-flag only, no calculation, no live EPD register access. | 26 |
| 8 | Cut-sheet QA | Manufacturing | partial | data/agents/cut-sheet-qa.yaml, data/agents/submittal-review-router.yaml (related) | Counted: entry plus one container run on a synthetic cut sheet and specification excerpt (Phase 27, 27-01); text only, about 6 requirements per run, no unit conversion. The submittal router stays as it was (submittal routing). | 27 |
| 9 | Spooling & cutting | Manufacturing | partial | data/agents/spooling-and-cutting.yaml | Counted: entry plus one container run on a synthetic segment list (Phase 27, 27-02); copy and group only, cutting arithmetic and nesting left to a tool (to compute); no isometric/IFC parsing. | 27 |
| 10 | D2 code validation | Site and handover | partial | data/agents/d2-code-validation.yaml | Counted: entry plus one container run on a synthetic ventilation extract with placeholder requirement rows (Phase 28, 28-01); D2 read as Finnish code part D2 (assumption); real regulation values not loaded; text only, about 6 rows per run, no unit conversion. | 28 |
| 11 | O&M completeness | Site and handover | partial | data/agents/om-completeness.yaml | Counted: entry plus one container run on a synthetic handover index and placeholder checklist (Phase 28, 28-02); index only, content not checked, about 6 rows per run. | 28 |
| 12 | BMS digital twin | Site and handover | partial | data/agents/bms-digital-twin.yaml | Counted: entry plus one container run on a synthetic point list, asset list and tag hints (Phase 28, 28-03); text only, no live BMS, tags from a supplied hint table, about 6 points per run. | 28 |

Summary: 0 full, 12 partial (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12), 0 missing.

Stage names: Design (IFC/BIM), Sourcing (LVI-INFO catalog), Manufacturing (prefab and cut sheets), Site and handover (O&M, BMS).

## Other existing entries (not among the 12)

airo, electrical-panel-scheduler, energy-model-sync, hvac-load-calculator, mep-scope-planner, plumbing-fixture-unit-counter. These stay unchanged.

## DDC-derived agents (Phase 29)

These agents were chosen from the DDC skills; they are not among the 12 consortium agents (see docs/ddc-agent-candidates.md).

| No | Agent | Stage | Status | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 13 | Daily Report Cross Check | Site and handover | partial | data/agents/daily-report-cross-check.yaml | Counted: entry plus one container run on a synthetic daily report and timesheet (Phase 29, 29-01); text only, about 6 lines per run. |
| 14 | Punch List Closure Check | Site and handover | partial | data/agents/punch-list-closure-check.yaml | Counted: entry plus one container run on a synthetic punch list with placeholder closure rules (Phase 29, 29-02); text only, about 6 items per run. |

## MCP servers

Entries for Ville's MCP servers are `kind: mcp-server` catalog manifests in `data/agents/<slug>/catalog.yaml`, ingested only with `AGENT_KINDS=on`. They describe the servers only; no data, keys or paths are included.

| Slug | Source | Tools | Data source | Public? |
| --- | --- | --- | --- | --- |
| stk-mcp | mcp-gen-comparison-2, gsd-only arm (FastMCP) | search_products, get_product | local Excel export of the Finnish electrical product database | no |
| stk-catalog-mcp | mcp-gen-comparison-2, codex arm (plain JSON-RPC) | catalog_overview, search_fields, search_products, get_product, query_products | local Excel export of the same database | no |
| lvi-info-mcp | mcp-gen-comparison, handauthored arm (FastMCP) | lookup_by_lvi_number, get_product_by_link, get_product_by_gtin, search_products, filter_by_etim_class, list_suppliers, get_changed_products | LVI-INFO Read-API (key required) | API is not open without a key; server code is in the comparison repository |

The other five LVI-INFO arms (gsd, plain, mcpybarra, from_openapi, openapi-mcp-generator) are benchmark variants of the same API and are listed in the lvi-info-mcp entry as `variants`, not catalogued separately.
