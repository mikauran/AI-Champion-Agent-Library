# Consortium agents: combined gaps list

Combined gaps list for Ville and Jussi. One row per gap. Source slide is confidential: names only.

| ID | Agent no/name | Gap | Type | Owner | Raised in | Status |
| --- | --- | --- | --- | --- | --- | --- |
| G-001 | 1-3, 5-7, 9-12 | No catalog entry yet for the agents with status missing (see the inventory); agents 4 and 8 are partial. | data | Ville | Phase 24 | open |
| G-002 | all | The extra template fields under `metadata` (stage, inputs, outputs, gaps and so on) are not rendered by the detail page; no UI change in Phase 24. | UI | open | Phase 24 | open |
| G-003 | 5 Product sourcing | stk-mcp reads a local product-catalog Excel file (the Finnish electrical product database) that is not public, so no sample runs or data can be stored in the repo. | data | Ville | Phase 24 | open |
| G-004 | MCP servers | `kind: mcp-server` entries are only visible with `AGENT_KINDS=on`; with the flag off they are valid files but not listed. | tool | open | Phase 24 | open |
| G-005 | 5 Product sourcing | Question for Ville: choice made in Plan 24-03 to catalogue stk-mcp (gsd-only arm, recommended), stk-catalog-mcp (codex arm) and the hand-authored arm as the canonical LVI-INFO server (lvi-info-mcp). Please confirm or name a different arm. | question | Ville | Phase 24 | open |
| G-006 | 5 Product sourcing | The five other LVI-INFO arms (gsd, plain, mcpybarra, from_openapi, openapi-mcp-generator) are not catalogued; add them if wanted. | tool | Ville | Phase 24 | open |
| G-007 | 5 Product sourcing | stk-catalog-mcp has no tests. | tool | Ville | Phase 24 | open |
| G-008 | MCP servers | The existing ingest tests `scripts/ingest.kinds.test.ts` and `scripts/ingest.allformats.hinted.test.ts` assert that the flag-on catalog from `data/agents` equals the flag-off catalog, which the three new mcp-server directories break (see .planning/AUTONOMOUS-BLOCKERS.md B-004). | tool | open | Phase 24 | open |
| G-009 | 1 ETIM & classification repair | No live ETIM release: ETIM is licensed and not redistributed; the sample uses a small synthetic SYN- class list. | data | Ville | Phase 25 | open |
| G-010 | 1 ETIM & classification repair | No MCP class lookup from the container (no network except the LLM proxy); LVI-INFO/stk-mcp search is done by the engineer or an excerpt is pasted into the input. | tool | open | Phase 25 | open |
| G-011 | 1 ETIM & classification repair | Input is text extracted from IFC; real IFC parsing is out of scope. | tool | open | Phase 25 | open |
| G-012 | 1 ETIM & classification repair | No feature-value validation against a real class definition; one model call, no per-element tool use. | tool | open | Phase 25 | open |
| G-013 | 2 QTO normalization | No access to the BIM model: cannot check quantities against geometry. | data | open | Phase 25 | open |
| G-014 | 2 QTO normalization | Text input only (CSV text), no IFC or Excel parsing. | tool | open | Phase 25 | open |
| G-015 | 2 QTO normalization | No mapping to a cost classification or CWICR rates (licence and scope). | data | open | Phase 25 | open |
| G-016 | 2 QTO normalization | Arithmetic is done by the model in one call; totals were wrong in the first run and must be re-checked by the engineer. | tool | open | Phase 25 | open |
| G-017 | 2 QTO normalization | No unit dictionary beyond the canonical set in the prompt; ambiguous pcs on length items is not reliably flagged (observed in run af4663e3). | tool | open | Phase 25 | open |
