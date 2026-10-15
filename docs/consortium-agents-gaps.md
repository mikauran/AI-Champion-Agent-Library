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
| G-018 | 3 Clash prioritization | No geometry or model access: ranking uses only the report columns. | data | open | Phase 25 | open |
| G-019 | 3 Clash prioritization | No project priorities, schedule or cost data: the P1-P3 scale is generic. | data | open | Phase 25 | open |
| G-020 | 3 Clash prioritization | Text/CSV input only, no Navisworks or BCF parsing. | tool | open | Phase 25 | open |
| G-021 | 3 Clash prioritization | Suggested owners are proposals, responsibility is decided by the coordinator. | process | open | Phase 25 | open |
| G-022 | 3 Clash prioritization | Report size limited by the 200 KB upload cap and one model call. | tool | open | Phase 25 | open |
| G-023 | 3 Clash prioritization | Three early runs (jobs 57e5c2cc, ab20a259, 2141f80e) failed: gpt-4.1-mini lost a clash or mis-applied the P1-P3 rule in a multi-section output. Counted after a redesign (one row per clash, fixed A-E checklist, clusters by copying location_key; job 1aa6f1be), but the first redesign run (job 50656bb4) still mis-ranked 5 rows, so reliability on larger or messier reports is unproven and a deterministic tool remains the robust option. | tool | open | Phase 25 | open |
| G-024 | 4 RFI generation | No model or clash tool access: it cannot verify a finding, it writes only from the table | tool | open | Phase 25 | open |
| G-025 | 4 RFI generation | Attachments (screenshots, viewpoints, drawing sheets) are not generated: placeholders only | tool | open | Phase 25 | open |
| G-026 | 4 RFI generation | No RFI numbering or log: the coordinator assigns numbers and dates | process | open | Phase 25 | open |
| G-027 | 4 RFI generation | No project directory: addressed party is a discipline/role | data | open | Phase 25 | open |
| G-028 | 4 RFI generation | Chaining from agent 3 is manual (paste its findings table); agent 3 is attempted-not-counted, so findings come from a manual list for now | process | open | Phase 25 | open |
| G-029 | 3 Clash prioritization | The sample adds a hand-made location_key column (shared element or level/grid) that defines the clusters; real clash exports (Navisworks, BCF) have no such column and need a preprocessing step to compute it. | tool | open | Phase 25 | open |
| G-030 | 5 Product sourcing | No live catalog access: the Pi container reaches only the LLM proxy, so stk-mcp and lvi-info-mcp cannot be called; the catalog excerpt is pasted as text | data | open | Phase 26 | open |
| G-031 | 5 Product sourcing | Excerpt is synthetic: real LVI-INFO and Finnish product-catalog data is confidential or keyed and was not used; behaviour on a real export unproven | data | open | Phase 26 | open |
| G-032 | 5 Product sourcing | Matching is exact equality: no synonyms, no multi-attribute scoring, no ETIM feature validation | tool | open | Phase 26 | open |
| G-033 | 5 Product sourcing | Unit mismatches are flagged, never converted (pack sizes, coils) | tool | open | Phase 26 | open |
| G-034 | 5 Product sourcing | No price, lead-time or availability reasoning; in_stock is copied only | data | open | Phase 26 | open |
| G-035 | 5 Product sourcing | Real E-BOMs (IFC or Excel) need a preprocessing step to the CSV shape | tool | open | Phase 26 | open |
| G-036 | 5 Product sourcing | Three runs (jobs e4181f2f, 24e650a3, 02bb5e13) failed the rubric: gpt-4.1-mini lost matched line BL-09 (cand NONE despite dn_ok=Y, mat_ok=Y) and other per-row slips; attempted-not-counted after two SKILL revisions. A deterministic matching tool with the model writing only the reason is the robust option. Retry with per-catalog-row Match checks (jobs bc11ce1a, 0ab6b5f4, 20061fd7) fixed the BL-09 contradiction but the 156-line enumeration was skipped, split or truncated by the model and `any` equality was mis-ticked (BL-06); still not counted. | tool | open | Phase 26 | open | Resolved for a small step: with the sample scoped down to 6 lines x 6 rows (36 check lines) the run of job 41f820ae passed and is counted (jobs 90c11c2c and 94f49e70 failed on review and underspecified flags first). | tool | open | Phase 26 | open |
| G-037 | 5 Product sourcing | Handles only an excerpt of up to about 6 E-BOM lines x 6 catalog rows per run; larger BOMs and catalogs must be batched (the per-row check list is too long for one gpt-4.1-mini output: 12 x 13 failed in three runs). A deterministic matching script would remove the limit. | tool | open | Phase 26 | open |
| G-037 | 6 Quote comparison | No arithmetic by design: totals, VAT adjustment, currency and unit conversion (pack sizes, price per 100) are left to a script or the engineer | tool | open | Phase 26 | open |
| G-038 | 6 Quote comparison | No exchange rates or Incoterm cost adjustment | data | open | Phase 26 | open |
| G-039 | 6 Quote comparison | Quotes arrive as PDF or e-mail in practice; only pre-extracted text or CSV is read | tool | open | Phase 26 | open |
| G-040 | 6 Quote comparison | No supplier scoring, scope-gap weighting or award recommendation (a DDC idea deliberately not adopted) | process | open | Phase 26 | open |
| G-041 | 6 Quote comparison | Substitution detection is by visible model or size text only; technical equivalence is not assessed | tool | open | Phase 26 | open |
| G-042 | 6 Quote comparison | Comparison of more than 3 quotes or more than about 40 lines is unproven (one model call, 200 KB upload cap) | tool | open | Phase 26 | open |
| G-043 | 6 Quote comparison | SKILL v1 run (job c1bb118d) failed the rubric: the model wrote code=22/22 with code_same=N and named a lowest price from a single eligible offer; fixed by an agreement rule and a closing lowest= line per RFQ line (job eaee09d8 passed). Multi-condition steps still need copyable per-row checks. | tool | open | Phase 26 | open |
| G-044 | 7 Carbon & EPD enrichment | No live EPD register access: the Pi container reaches only the LLM proxy, so EPD Finland (Rakennustieto), EPD Norway and ECO Platform data must be pasted as an excerpt | data | open | Phase 26 | open |
| G-045 | 7 Carbon & EPD enrichment | EPD values in the sample are synthetic and not authoritative; real EPD numbers were not used and licence/reuse terms of the registers are unchecked | data | open | Phase 26 | open |
| G-046 | 7 Carbon & EPD enrichment | No calculation by design: quantity x GWP totals and unit conversions (kg vs t, m2 vs kg per m2) are left to a script or the engineer | tool | open | Phase 26 | open |
| G-047 | 7 Carbon & EPD enrichment | Only module A1-A3 is read; no A4-C4, no biogenic carbon, no scenario or generic-data fallback | data | open | Phase 26 | open |
| G-048 | 7 Carbon & EPD enrichment | Mapping by exact material_key: no fuzzy product-name matching and no product-specific vs average EPD logic | tool | open | Phase 26 | open |
| G-049 | 7 Carbon & EPD enrichment | No product-to-EPD link from the manufacturer; the product list needs a material_key (from 26-01 or a classification step) | process | open | Phase 26 | open |
| G-050 | 7 Carbon & EPD enrichment | Counted on the first run (job c61b9914, SKILL v1, all 10 rows correct) with the per-product check line and agreement rules from 26-02; still one synthetic sample of 10 products and 8 EPDs, a larger real excerpt is unproven | tool | open | Phase 26 | open |
| G-051 | 8 Cut-sheet QA | Text only: PDF or image data sheets need a conversion step (OCR/table extraction) that is not part of the agent | tool | open | Phase 27 | open |
| G-052 | 8 Cut-sheet QA | Sample is synthetic: real manufacturer data sheets and specifications are confidential or copyrighted and were not used; behaviour on real documents unproven | data | open | Phase 27 | open |
| G-053 | 8 Cut-sheet QA | Keys match by exact text: no synonym or multilingual key mapping, no tables or footnotes in cut sheets | tool | open | Phase 27 | open |
| G-054 | 8 Cut-sheet QA | Only eq and ge numeric tests; no le, ranges, tolerances or conditional requirements | tool | open | Phase 27 | open |
| G-055 | 8 Cut-sheet QA | Units are flagged, never converted (a deterministic unit tool is the proper place) | tool | open | Phase 27 | open |
| G-056 | 8 Cut-sheet QA | Scoped to about 6 requirements per run; larger specifications must be batched | tool | open | Phase 27 | open |
| G-057 | 8 Cut-sheet QA | Counted on the first run (job fb46b86d, SKILL v1, all 6 verdicts correct) with the per-requirement check line and Y/N lookup from 26-02; still one synthetic sample of 6 requirements, real data sheets unproven | tool | open | Phase 27 | open |
| G-058 | 9 Spooling & cutting | No cut optimisation or nesting: stock pieces, waste and remainder reuse are marked to compute (tool); a deterministic cut-optimiser (script) is proposed as the future tool | tool | open | Phase 27 | open |
| G-059 | 9 Spooling & cutting | No isometric, IFC or drawing parsing: the input is a hand-prepared segment list; a preprocessing step from the prefab model is needed | tool | open | Phase 27 | open |
| G-060 | 9 Spooling & cutting | Sample is synthetic: real prefab and fabrication data are consortium-confidential and were not used; behaviour on real spools unproven | tool | open | Phase 27 | open |
| G-061 | 9 Spooling & cutting | Only straight segments: no fittings, bends, joints, cut allowances or kerf | tool | open | Phase 27 | open |
| G-062 | 9 Spooling & cutting | Pipes only in the sample: duct and cable-tray variants are not tested | tool | open | Phase 27 | open |
| G-063 | 9 Spooling & cutting | Scoped to about 6 segments per run; larger lists must be batched | tool | open | Phase 27 | open |
| G-064 | 9 Spooling & cutting | Counted on the first run (job a7f0ad36, SKILL v1, all six cut statuses and groups correct) with the per-segment check line and Y/N lookup; still one synthetic sample of 6 segments, real prefab lists unproven | tool | open | Phase 27 | open |
| G-065 | 10 D2 code validation | Assumption: D2 is read as the Finnish National Building Code part D2 (indoor climate and ventilation), not defined in the task; if another code or standard is meant the agent needs different requirement rows (alternative open, to confirm with Ville/Jussi) | data | open | Phase 28 | open |
| G-066 | 10 D2 code validation | Requirement values in the sample are invented placeholders (SYN-REQ); the real regulation text (public, Finnish government / environment ministry / Finlex) is not loaded or quoted, so no real code validation is claimed | data | open | Phase 28 | open |
| G-067 | 10 D2 code validation | Sample is synthetic: real design and commissioning data are consortium-confidential and were not used; behaviour on real extracts unproven | data | open | Phase 28 | open |
| G-068 | 10 D2 code validation | Text only: no BIM or ventilation-design tool export parsing, no measured commissioning data feed | tool | open | Phase 28 | open |
| G-069 | 10 D2 code validation | Exact-text key and room matching; no synonyms, no room-type based requirements, no conditional or formula requirements | tool | open | Phase 28 | open |
| G-070 | 10 D2 code validation | Units are flagged, never converted (a deterministic unit tool is the proper place) | tool | open | Phase 28 | open |
| G-071 | 10 D2 code validation | Scoped to about 6 requirement rows per run; larger sets must be batched | tool | open | Phase 28 | open |
| G-072 | 10 D2 code validation | Counted on the second run (job 2231091f) after one SKILL revision: SKILL v1 (job 86ff272e) missed a same-room same-key line with another unit (Q-04, not-stated instead of unit-differs deviation); fixed by an explicit scan rule and a worked line; still one synthetic sample of 6 rows, real extracts unproven | tool | open | Phase 28 | open |
| G-073 | 11 O&M completeness | Sample is synthetic: real handover indexes and document sets are confidential and were not used; behaviour on real indexes unproven | data | open | Phase 28 | open |
| G-074 | 11 O&M completeness | Index only: document content (is the manual actually complete and correct) is not checked, no PDF reading | tool | open | Phase 28 | open |
| G-075 | 11 O&M completeness | The checklist is a placeholder: no real handover requirement set (contract, standard) is loaded and the agent does not derive what documents an equipment class needs | data | open | Phase 28 | open |
| G-076 | 11 O&M completeness | Exact-text id and document type matching; no synonyms, multilingual or revision-aware matching | tool | open | Phase 28 | open |
| G-077 | 11 O&M completeness | No document management system or COBie-style export connection | tool | open | Phase 28 | open |
| G-078 | 11 O&M completeness | Scoped to about 6 required rows per run; larger checklists must be batched | tool | open | Phase 28 | open |
| G-079 | 11 O&M completeness | Counted on the first run (job 20b66bce, SKILL v1, all six statuses right, cross-equipment line not used); still one synthetic sample of 6 rows, real handover indexes unproven | tool | open | Phase 28 | open |
| G-080 | 12 BMS digital twin | Sample is synthetic: real BMS point lists and naming schemes are confidential and were not used; behaviour on real point lists unproven | data | open | Phase 28 | open |
| G-081 | 12 BMS digital twin | No live BMS, BACnet or digital-twin platform connection: text export only, no values, no write-back | tool | open | Phase 28 | open |
| G-082 | 12 BMS digital twin | Mapping by exact id prefix only: no fuzzy matching, no different naming schemes, no mapping by description or location | tool | open | Phase 28 | open |
| G-083 | 12 BMS digital twin | Tag hints are a supplied table: no real ontology (Brick or other) is loaded or validated, no relationship modelling (feeds, locates) | data | open | Phase 28 | open |
| G-084 | 12 BMS digital twin | Units are flagged, never converted | tool | open | Phase 28 | open |
| G-085 | 12 BMS digital twin | Scoped to about 6 points per run; real point lists have thousands of points and must be batched | tool | open | Phase 28 | open |
| G-086 | 12 BMS digital twin | Counted on the second run (job 187e5446) after one SKILL revision: SKILL v1 (job 013b53ce) dropped the review cell of one table row and wrote a `%%` typo; fixed by an explicit 8-cell row rule and worked rows; still one synthetic sample of 6 points, real point lists unproven | tool | open | Phase 28 | open |

## DDC-derived agents (Phase 29)

Agents 13-16 are chosen from the DDC skills (see docs/ddc-agent-candidates.md); they are not among the 12 consortium agents.

| ID | Agent no/name | Gap | Type | Owner | Raised in | Status |
| --- | --- | --- | --- | --- | --- | --- |
| G-087 | 13 Daily report cross-check | Sample is synthetic: real daily reports and time-recording exports are confidential and were not used; behaviour on real data unproven | data | open | Phase 29 | open |
| G-088 | 13 Daily report cross-check | Text only: no PDF or spreadsheet parsing, no weather or photo inputs (the DDC skill generates PDFs and pulls weather; not adopted) | tool | open | Phase 29 | open |
| G-089 | 13 Daily report cross-check | Exact-text trade and date matching; no synonyms, no multilingual trade names, no several timesheet lines per trade (subcontractor split) | tool | open | Phase 29 | open |
| G-090 | 13 Daily report cross-check | Identical-text comparison of numbers: formats such as 8.0 vs 8 are flagged as differences | tool | open | Phase 29 | open |
| G-091 | 13 Daily report cross-check | Delay reasons are not assessed or categorised | tool | open | Phase 29 | open |
| G-092 | 13 Daily report cross-check | Scoped to about 6 report lines per run; larger reports must be batched | tool | open | Phase 29 | open |
| G-093 | 13 Daily report cross-check | Counted on the first run (job fdf1b5e2, SKILL v1, all six verdicts right, crane line and other-date line not used); still one synthetic sample of 6 lines, real reports unproven | tool | open | Phase 29 | open |
