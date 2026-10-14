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
| 1 | ETIM & classification repair | Design | missing | none | No existing YAML deals with ETIM or classification codes; the energy, load and fixture agents work on BIM quantities, not classification. | 25 |
| 2 | QTO normalization | Design | missing | none | `plumbing-fixture-unit-counter` counts fixtures from BIM but does not normalise quantity take-off data, so it is not counted as a match. | 25 |
| 3 | Clash prioritization | Design | missing | none | No entry reads or ranks clash reports. | 25 |
| 4 | RFI generation | Design | partial | data/agents/rfi-triage-assistant.yaml, data/agents/demo-rfi-triage.yaml | The assistant drafts, classifies and routes field RFIs through a conversation; it is not driven by model or clash findings, and the demo entry only triages one uploaded text. | 25 |
| 5 | Product sourcing E-BOM to M-BOM | Sourcing | missing | none | Nothing maps engineering bills of materials to manufacturing ones; stk-mcp and lvi-info-mcp (Plan 24-03) are catalog data sources, not this agent. | 26 |
| 6 | Quote comparison | Sourcing | missing | none | No entry compares supplier quotes. | 26 |
| 7 | Carbon & EPD enrichment | Sourcing | missing | none | No entry touches EPD or carbon data; `energy-model-sync` covers energy simulation only. | 26 |
| 8 | Cut-sheet QA | Manufacturing | partial | data/agents/submittal-review-router.yaml | It extracts values from product submittals and compares them with the specification, which is close to checking a product data sheet, but it targets submittal routing, not prefab cut sheets. | 27 |
| 9 | Spooling & cutting | Manufacturing | missing | none | No entry handles prefab spools or cut lists. | 27 |
| 10 | D2 code validation | Manufacturing | missing | none | `airo` checks regulations for AI use cases, not code validation of design data. | 27 |
| 11 | O&M completeness | Site and handover | missing | none | No entry checks handover documentation. | 28 |
| 12 | BMS digital twin | Site and handover | missing | none | No entry connects building management data to a model. | 28 |

Summary: 0 full, 2 partial (4, 8), 10 missing.

Stage names: Design (IFC/BIM), Sourcing (LVI-INFO catalog), Manufacturing (prefab and cut sheets), Site and handover (O&M, BMS).

## Other existing entries (not among the 12)

airo, electrical-panel-scheduler, energy-model-sync, hvac-load-calculator, mep-scope-planner, plumbing-fixture-unit-counter. These stay unchanged.

## MCP servers

Entries for Ville's MCP servers are `kind: mcp-server` catalog manifests in `data/agents/<slug>/catalog.yaml`, ingested only with `AGENT_KINDS=on`. They describe the servers only; no data, keys or paths are included.

| Slug | Source | Tools | Data source | Public? |
| --- | --- | --- | --- | --- |
| stk-mcp | mcp-gen-comparison-2, gsd-only arm (FastMCP) | search_products, get_product | local Excel export of the Finnish electrical product database | no |
| stk-catalog-mcp | mcp-gen-comparison-2, codex arm (plain JSON-RPC) | catalog_overview, search_fields, search_products, get_product, query_products | local Excel export of the same database | no |
| lvi-info-mcp | mcp-gen-comparison, handauthored arm (FastMCP) | lookup_by_lvi_number, get_product_by_link, get_product_by_gtin, search_products, filter_by_etim_class, list_suppliers, get_changed_products | LVI-INFO Read-API (key required) | API is not open without a key; server code is in the comparison repository |

The other five LVI-INFO arms (gsd, plain, mcpybarra, from_openapi, openapi-mcp-generator) are benchmark variants of the same API and are listed in the lvi-info-mcp entry as `variants`, not catalogued separately.
