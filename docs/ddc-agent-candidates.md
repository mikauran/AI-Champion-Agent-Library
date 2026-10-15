# DDC-derived agent candidates (Phase 29)

Selection record for the agents 13-16, chosen from the DDC skills after the 12 consortium agents. All outputs of these agents are drafts for engineer review. Inputs are synthetic or public only.

## Purpose and criteria

Source: github.com/datadrivenconstruction/DDC_Skills_for_AI_Agents_in_Construction (MIT, (c) 2026 DataDrivenConstruction). The survey covered the 221 skills of the repository (paths re-verified with the GitHub tree listing on the build date; the LICENSE file is present at the repository root).

A skill is built as a one-step agent only if all four criteria hold:

1. Useful to the consortium stages (design, sourcing, manufacturing, site and handover, compliance) or adjacent to them.
2. Fits the proven pattern: per-item check lines with copied texts and Y/N tests, verdict by lookup on those checks, no model arithmetic.
3. Not a duplicate of the 12 consortium agents or of an existing entry in data/agents.
4. A synthetic sample can be written without confidential data.

Exclusions: `cwicr-*` skills (cost database under a data licence), book content (all rights reserved), anything that needs code execution, network access, image or audio input, and anything beyond about 6 items per run for a small model. Own design only: the idea of a skill is adapted, no DDC text or code is copied.

## Selected (built in Phase 29)

| No | Slug | Name | DDC skills adapted | One-step task | Lookup design | Why it qualifies |
| --- | --- | --- | --- | --- | --- | --- |
| 13 | daily-report-cross-check | Daily Report Cross Check | 1_DDC_Toolkit/Field-Operations/daily-report-generator; 3_DDC_Insights/Automation-Workflows/n8n-daily-report | Reconcile daily report lines (trade, workers, hours, delay) with a timesheet extract (two-source cross-check). | Per report line: copy the timesheet line with the same date and trade (or NONE), tick workers_same, hours_same and delay_open as Y/N by identical-text tests, verdict by lookup (consistent, mismatch, delay-unexplained, not-in-timesheet). | Site stage; two plain CSV inputs; no arithmetic; new (no consortium agent compares site reports with time recording). |
| 14 | punch-list-closure-check | Punch List Closure Check | 1_DDC_Toolkit/Field-Operations/punch-list-manager; 1_DDC_Toolkit/Project-Closeout/punch-list-manager | Check punch-list items against closure rules and an as-of date (status and date rules). | Per item: copy status, due date and closure evidence, tick rule tests as Y/N, verdict by lookup. | Handover stage; rules are exact-text tests; complements O&M completeness (documents) with defect closure. |
| 15 | change-order-consistency-check | Change Order Consistency Check | 1_DDC_Toolkit/Cost-Management/change-order-processor; 4_DDC_Curated/Contract-Legal/change-order-manager | Reconcile a change-order log with the change-order forms (document consistency). | Per log row: copy the matching form line, tick id, title, status and amount text equality as Y/N, verdict by lookup. | Contract administration adjacent to site and handover; amounts compared as identical text only, never summed. |
| 16 | safety-observation-classification | Safety Observation Classification | 1_DDC_Toolkit/Field-Operations/safety-inspection; 3_DDC_Insights/Safety-Quality/safety-inspection-checklist | Classify site safety observations with a supplied keyword table (lookup classification; categories are placeholders). | Per observation: copy the first table keyword found in the text (or NONE), category read off the table line. | Site stage; the model only copies and looks up; categories are not a regulation. |

Stage placement: all four are `site-handover`, because the entry template allows only four stages (design, sourcing, manufacturing, site-handover). Change orders are commercial; this is recorded as a gap in plan 29-03.

## Not built (remaining candidates)

| Candidate (DDC path) | Reason not built | Could be built later? |
| --- | --- | --- |
| 1_DDC_Toolkit/Document-Control/submittal-tracker | Already adapted by cut-sheet-qa (duplicate) | No |
| 1_DDC_Toolkit/Document-Control/meeting-minutes-generator | Free-text action-item extraction is not a per-item lookup | Yes, if a row-per-line minutes format is supplied |
| 1_DDC_Toolkit/Field-Operations/daily-report-generator (beyond the cross-check) | PDF generation and weather API: code and network | No |
| 1_DDC_Toolkit/Analytics/daily-progress-report | Aggregation arithmetic | No (script) |
| 1_DDC_Toolkit/Document-Control/contract-clause-analyzer; 4_DDC_Curated/Contract-Legal/contract-clause-extractor | Legal interpretation and risk judgement cannot be checked reliably; needs legal review | Unlikely |
| 4_DDC_Curated/Contract-Legal/claims-documentation; lien-waiver-tracker | Legal and jurisdiction-specific | Unlikely |
| 1_DDC_Toolkit/Cost-Management/material-delivery-tracker | Date arithmetic for delays | Yes, with a lookup of precomputed dates |
| 1_DDC_Toolkit/Procurement/material-tracker | Overlaps product-sourcing-mbom | No |
| 1_DDC_Toolkit/Procurement/subcontractor-prequalification | Weighted scoring is arithmetic; company financial and safety data are confidential | No |
| 1_DDC_Toolkit/Schedule-Management/schedule-delay-analyzer; 3_DDC_Insights/Schedule-Optimization/delay-analysis, critical-path-analyzer | Day arithmetic and critical path calculation need a deterministic script, not a model | As a tool |
| 1_DDC_Toolkit/Cost-Management/budget-variance-analyzer, cash-flow-forecaster, payment-application-generator, subcontractor-payment-tracker; 4_DDC_Curated/Financial-Management/* | Money arithmetic, which Phase 25 showed the model gets wrong | As a tool |
| 1_DDC_Toolkit/BIM-Analysis/bim-validation-report; 2_DDC_Book/4.3-BIM-Validation-Pipeline/bim-consistency-checker, bim-validation-pipeline | Need IFC or model parsing; ids-checker is already adapted by d2-code-validation | As a tool |
| 3_DDC_Insights/Safety-Quality/incident-reporting | Injury and personal data, statutory reporting duties; not for a small model | No |
| 3_DDC_Insights/Safety-Quality/toolbox-talk-generator | Free generation, no checkable verdicts | No |
| 3_DDC_Insights/Safety-Quality/quality-control-workflow; compliance-tracker | Overlap with the built checks | Yes, as variants later |
| 1_DDC_Toolkit/Field-Operations/progress-photo-analyzer; 2_DDC_Book/2.4-PDF-CAD-to-Data/image-to-data, drawing-analyzer; 3_DDC_Insights/Field-Automation/voice-to-report, telegram-field-bot | Image, audio or messaging network input | No (text only) |
| 1_DDC_Toolkit/CAD-Converters/* | Executable converters (code execution) | No |
| 2_DDC_Book/2.2-Open-Data-Standards/weather-api, price-api | Network access | No |
| 1_DDC_Toolkit/Analytics/*; 2_DDC_Book/4.5-ML-Cost-Prediction/*, 4.1-Analytics-KPI-Dashboard/* | Statistics and model training (code execution) | No |
| 1_DDC_Toolkit/Resource-Management/* | Arithmetic on hours and fleet data | No |
| 2_DDC_Book/2.6-Data-Quality-Validation/* | Generic statistics, no domain checks | No |
| 1_DDC_Toolkit/CWICR-Database/*; cost and QTO skills of 2_DDC_Book/3.1 and 3.2 that use CWICR or quote the book | Excluded by licence and scope | No |
| 4_DDC_Curated/Document-Generation/*; Prompt-Engineering/* | Generic tooling, not construction agents | No |

## Next candidates if more are wanted

- meeting-minutes-generator: a row-per-action check. Precondition: the minutes arrive as one action per line with owner and date columns.
- material-delivery-tracker: date lookups. Precondition: planned and actual dates are supplied and the late/on-time flag is read from a precomputed column, never calculated by the model.

## Attribution

The DDC skill repository is MIT licensed, (c) 2026 DataDrivenConstruction. Each agent is an own design that adapts the idea of the named skills; no DDC text or code is copied. Licence text and the adapted-entries table are in docs/third-party-notices.md.
