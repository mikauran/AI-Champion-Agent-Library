# Phase 24 Context: Agent Inventory, Catalog Template, MCP-server entries, DDC license

Gathered unattended (auto mode, 2026-10-14). Where a question would have been asked, the recommended option was chosen and is recorded below as an assumption (A-nn).

## Scope
1. Audit the 12 consortium agents against data/agents (full / partial / missing).
2. Define the catalog entry template and use it for every new entry.
3. Add Ville's MCP servers as `kind: mcp-server` entries.
4. Record the DDC skills license (MIT, checked via GitHub API 2026-10-14) and attribution.
5. Start the combined gaps list `docs/consortium-agents-gaps.md`.

## Constraints from the user
- Source slide is TUNI-confidential: use agent names only, describe in own words, never commit the slide.
- Principle: agents do semantic steps (read, interpret, map, draft); engineers review and decide. Every output is a draft.
- No consortium/confidential data in anything that goes to the release branch. Sample data public or synthetic, labelled.
- Spend: $0.50 per agent run, $10 total. Log in STATE.md.
- Pi container: one run at a time; 3.7 GB RAM; at most two subagents in parallel.
- No pushes, no PRs.

## Assumptions
- A-01: Catalog entries are Oracle AgentSpec YAML in `data/agents/` (existing shape) with `metadata` carrying category, tags, maturity, stage and extra template fields (inputs, outputs, data_sources, assumptions, gaps). A `docs/agents/<slug>.md` page is not needed; the YAML is the entry. Reason: smallest change, ingest already handles it.
- A-02: Template fields beyond the schema go in `metadata` (open record) and are rendered where the detail page already shows metadata; no UI change in this phase.
- A-03: MCP-server entries use the Phase 13 MCP `server.json`/`catalog.yaml` kind path behind the AGENT_KINDS flag; if that flag is off in release builds, entries are still valid files and are listed as such. Check how existing fixtures carry `kind`.
- A-04: DDC skills are MIT: reuse permitted with copyright notice retained. Attribution goes in `docs/third-party-notices.md` and in each entry that is adapted from a DDC skill (`metadata.attribution`).
- A-05: Ville's own MCP servers: stk-mcp (gsd-only/stk_mcp, local Excel STK catalog) and other servers found in mcp-gen-comparison arms; their data (STK Excel) may be non-public: entries describe the server, never ship its data.
- A-06: Try It Out runs with the container path and a real model; stage-specific agent runs belong to Phases 25-29, not here. This phase only proves the template with the existing agents where cheap.
- A-07: Stage names: Design (IFC/BIM), Sourcing (LVI-INFO catalog), Manufacturing (prefab and cut sheets), Site and handover (O&M, BMS).

## Done when
- docs/consortium-agents-inventory.md lists each of the 12 with status and evidence pointers.
- Template documented (docs/agent-entry-template.md) and validated by a test or script against the existing schema.
- MCP-server entries present for each of Ville's MCP servers, validated by the ingest/validate-submission CLI.
- docs/third-party-notices.md records DDC MIT attribution.
- docs/consortium-agents-gaps.md exists with the header and first entries.
- npm run check passes.
