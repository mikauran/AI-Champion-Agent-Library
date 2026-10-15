# Third-party notices

## DDC Skills for AI Agents in Construction

- Source: https://github.com/datadrivenconstruction/DDC_Skills_for_AI_Agents_in_Construction
- License: MIT
- Retrieved: 2026-10-14 (LICENSE and NOTICE.md read from the `main` branch; the live text matched the earlier check)

License text, reproduced verbatim:

```
MIT License

Copyright (c) 2026 DataDrivenConstruction

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### What the MIT license covers (per the repository's NOTICE.md)

- Covered by MIT: the `SKILL.md` instruction files and the documentation.
- Not covered, all rights reserved by the author (Artem Boiko): the "Data-Driven Construction" book (`Books/`) and the GuideBook PDF.
- Not MIT: the DDC CWICR cost database is CC BY-NC 4.0 for the DDC compilation, plus a separate DDC commercial license for commercial use.
- Trademarks: product names such as Revit, Autodesk, Procore belong to their owners and are used for identification only.
- Curated skills in the DDC repository (category `4_DDC_Curated`) come from other public collections and keep those sources' licenses; do not adapt those from the DDC repository without checking the source license.

### Policy for this repository

- a. `SKILL.md` instructions and documentation may be adapted, with the copyright notice retained (this file).
- b. Never copy the book, the PDF or CWICR data into the repo, into agent prompts or into samples.
- c. An adapted entry sets `metadata.attribution` to "Adapted from DDC skill <name>, MIT, (c) 2026 DataDrivenConstruction" and gets a row in the table below (entry slug, DDC skill path, date).
- d. Trademarks (Revit, Autodesk, Procore and so on) are used for identification only.

### Adapted entries

| Entry slug | DDC skill path | Date |
| --- | --- | --- |
| etim-classification-repair | 1_DDC_Toolkit/BIM-Analysis/bim-classification-ai | 2026-10-15 |
| qto-normalization | 1_DDC_Toolkit/BIM-Analysis/ifc-qto-extraction | 2026-10-15 |
| clash-prioritization | 2_DDC_Book/4.3-BIM-Validation-Pipeline/clash-resolution-analyzer; 1_DDC_Toolkit/BIM-Analysis/bim-clash-detection | 2026-10-15 |
| rfi-generation-from-findings | 1_DDC_Toolkit/Document-Control/rfi-management | 2026-10-15 |
| product-sourcing-mbom | 1_DDC_Toolkit/Procurement/material-procurement-tracker; 2_DDC_Book/2.4-PDF-CAD-to-Data/specification-extractor | 2026-10-15 |
| quote-comparison | 1_DDC_Toolkit/Procurement/bid-analysis-comparator; 6_OpenConstructionERP/oce-tendering | 2026-10-15 |
| carbon-epd-enrichment | 5_DDC_Innovative/embodied-carbon-esg; 1_DDC_Toolkit/Sustainability/carbon-calculator | 2026-10-15 |
| cut-sheet-qa | 1_DDC_Toolkit/Document-Control/submittal-tracker; 2_DDC_Book/2.4-PDF-CAD-to-Data/specification-extractor | 2026-10-15 |
| spooling-and-cutting | 5_DDC_Innovative/prefab-optimization | 2026-10-15 |
| d2-code-validation | 2_DDC_Book/4.3-BIM-Validation-Pipeline/ids-checker; 2_DDC_Book/2.5-Data-Modeling-Standards/standards-compliance-checker | 2026-10-15 |
| om-completeness | 1_DDC_Toolkit/Project-Closeout/project-closeout-checklist; 1_DDC_Toolkit/Closeout/as-built-tracker; 1_DDC_Toolkit/Closeout/warranty-tracker | 2026-10-15 |
| bms-digital-twin | 5_DDC_Innovative/digital-twin-sync; 2_DDC_Book/2.2-Open-Data-Standards/ontology-mapper | 2026-10-15 |
| daily-report-cross-check | 1_DDC_Toolkit/Field-Operations/daily-report-generator; 3_DDC_Insights/Automation-Workflows/n8n-daily-report | 2026-10-15 |
| (further entries: Phases 25-29) | | |

### Skills adapted in this repository

- etim-classification-repair: approach adapted from DDC skill 1_DDC_Toolkit/BIM-Analysis/bim-classification-ai (MIT); own design for ETIM-style mapping; no DDC code or data copied
- qto-normalization: ideas adapted from DDC skill 1_DDC_Toolkit/BIM-Analysis/ifc-qto-extraction (MIT); own design; qto-report (quotes the DDC book) and cwicr-* skills (CWICR data licence) not used
- clash-prioritization: ideas adapted from DDC skills 2_DDC_Book/4.3-BIM-Validation-Pipeline/clash-resolution-analyzer and 1_DDC_Toolkit/BIM-Analysis/bim-clash-detection (MIT); own design; no DDC book text copied
- rfi-generation-from-findings: RFI field set adapted from DDC skill 1_DDC_Toolkit/Document-Control/rfi-management (MIT); own design; no DDC code copied
- product-sourcing-mbom: ideas adapted from DDC skills 1_DDC_Toolkit/Procurement/material-procurement-tracker and 2_DDC_Book/2.4-PDF-CAD-to-Data/specification-extractor (MIT); own design; no DDC code or text copied
- quote-comparison: ideas adapted from DDC skills 1_DDC_Toolkit/Procurement/bid-analysis-comparator and 6_OpenConstructionERP/oce-tendering (MIT); own design; scoring/recommendation not adopted; no DDC code or text copied
- carbon-epd-enrichment: ideas adapted from DDC skills 5_DDC_Innovative/embodied-carbon-esg and 1_DDC_Toolkit/Sustainability/carbon-calculator (MIT); own design; no DDC code, factors or text copied
- cut-sheet-qa: ideas adapted from DDC skills 1_DDC_Toolkit/Document-Control/submittal-tracker and 2_DDC_Book/2.4-PDF-CAD-to-Data/specification-extractor (MIT); own design; no DDC code or text copied
- spooling-and-cutting: ideas adapted from DDC skill 5_DDC_Innovative/prefab-optimization (MIT); own design; its optimisation algorithms not adopted; no DDC code or text copied
- d2-code-validation: ideas adapted from DDC skills 2_DDC_Book/4.3-BIM-Validation-Pipeline/ids-checker and 2_DDC_Book/2.5-Data-Modeling-Standards/standards-compliance-checker (MIT); own design; no DDC code or text copied
- om-completeness: ideas adapted from DDC skills 1_DDC_Toolkit/Project-Closeout/project-closeout-checklist, 1_DDC_Toolkit/Closeout/as-built-tracker and 1_DDC_Toolkit/Closeout/warranty-tracker (MIT); own design; no DDC code or text copied
- bms-digital-twin: ideas adapted from DDC skills 5_DDC_Innovative/digital-twin-sync and 2_DDC_Book/2.2-Open-Data-Standards/ontology-mapper (MIT); own design; no DDC code or text copied; book content not used
- daily-report-cross-check: ideas adapted from DDC skills 1_DDC_Toolkit/Field-Operations/daily-report-generator and 3_DDC_Insights/Automation-Workflows/n8n-daily-report (MIT); own design; no DDC code or text copied
