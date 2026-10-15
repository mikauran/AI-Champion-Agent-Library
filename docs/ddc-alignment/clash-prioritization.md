# Alignment spec: agent 3 Clash prioritization

Source skill (untrusted data, read in full, SKILL.md and instructions.md, 2026-10-15): `2_DDC_Book/4.3-BIM-Validation-Pipeline/clash-resolution-analyzer` of the DDC skills repository (MIT, (c) 2026 DataDrivenConstruction). The method, data model, rules and outputs below are the spec for the agent; the skill's code is not packaged or run. instructions.md is a generic wrapper (gather input, process per SKILL.md, tables, constraints) and adds no rules. Nothing from the DDC book or CWICR is used. Written before the agent files were changed.

## 1. Skill method

1. Import clash rows (ids, two elements each with discipline, level and system, a distance, a clash type of hard, clearance or duplicate).
2. Auto-prioritise each clash from its own characteristics (first matching rule wins): hard clash with a structural element is CRITICAL; a large overlap (more than 100 mm, computed as the absolute value of the distance) is HIGH; both elements MEP is MEDIUM; clearance type is LOW; everything else MEDIUM.
3. Auto-assign responsibility: a lookup keyed by discipline pair gives a strategy and responsible discipline; without a hit, the discipline with the larger rank number in a fixed discipline ranking takes the clash (the "more flexible" trade).
4. Find patterns: group clashes by discipline pair, then by system pair; a pattern is reported when the discipline pair has at least 3 clashes and the system pair at least 2.
5. Suggest a resolution per clash: the pair lookup gives a resolution type and a note, default route around; the pattern a clash belongs to adds its root cause and example ids.
6. Track status over time and report (counts by priority, discipline, status, resolution rate, patterns, critical unresolved list).

## 2. Skill data model and rules (field names and enumerations)

| Item | Skill content |
|---|---|
| Priority scale | CRITICAL (1, must resolve before construction), HIGH (2, next coordination cycle), MEDIUM (3, before the trade starts), LOW (4, can resolve in the field) |
| Status | new, assigned, in_progress, resolved, approved, void (void = not a real clash) |
| Resolution type | ROUTE_AROUND, RAISE_LOWER, RESIZE, RELOCATE, STRUCTURAL_MOD, DESIGN_CHANGE, NO_CLASH, SEQUENCE (only ROUTE_AROUND, RAISE_LOWER, RESIZE are ever produced by the rules) |
| Clash fields | id, name, element 1 and 2 (id, name, category, discipline, level, system), location, distance (negative = hard, positive = clearance violation), clash type, priority, status, assigned_to (responsible discipline), resolution type, notes |
| Pattern fields | pattern type (discipline pair), disciplines, systems, clash count, example ids, suggested resolution, root cause |
| Discipline ranking (responsibility) | Structural 1, Architectural 2, Mechanical 3, Plumbing 4, Electrical 5, Fire Protection 6; the higher number is the more flexible trade and takes the clash when no pair rule exists |
| Pair rules | Mechanical+Structural: route around, Mechanical; Plumbing+Structural: route around, Plumbing (coordinate sleeves with the structural engineer); Electrical+Mechanical: raise or lower, Electrical; Mechanical+Mechanical: resize, Mechanical; Fire Protection+Mechanical: route around, Fire Protection |

## 3. Skill outputs

A per-clash record (priority, status, assigned discipline, resolution type), pattern list, coordination matrix, and a markdown report with counts, resolution rate, patterns and critical unresolved clashes. The agent keeps the per-clash record and the pattern list; counts, rates and the matrix are dropped (see section 5).

## 4. Adapted to Finnish MEP

The export uses Finnish discipline labels. The agent maps them through this lookup (the SKILL copies it and uses the Finnish label in its output):

| Export label | Skill discipline | Rank | MEP |
|---|---|---|---|
| Rakenne | Structural | 1 | no |
| Arkkitehti | Architectural | 2 | no |
| Ilmanvaihto | Mechanical (ventilation) | 3 | yes |
| Putkisto | Plumbing (water, drainage, heating pipework) | 4 | yes |
| Sähkö | Electrical | 5 | yes |
| Sprinkler | Fire Protection (sprinkler) | 6 | yes |

A label not in the table is not guessed: responsible discipline is `TO BE DECIDED BY COORDINATOR`. Pair lookup (order of the two disciplines does not matter), built from the skill rules in section 2 plus its default (route around; responsible = higher rank number):

| Pair | resolution_type | responsible_discipline |
|---|---|---|
| Rakenne + Arkkitehti | ROUTE_AROUND | Arkkitehti |
| Rakenne + Ilmanvaihto | ROUTE_AROUND | Ilmanvaihto |
| Rakenne + Putkisto | ROUTE_AROUND | Putkisto |
| Rakenne + Sähkö | ROUTE_AROUND | Sähkö |
| Rakenne + Sprinkler | ROUTE_AROUND | Sprinkler |
| Arkkitehti + Ilmanvaihto | ROUTE_AROUND | Ilmanvaihto |
| Arkkitehti + Putkisto | ROUTE_AROUND | Putkisto |
| Arkkitehti + Sähkö | ROUTE_AROUND | Sähkö |
| Arkkitehti + Sprinkler | ROUTE_AROUND | Sprinkler |
| Ilmanvaihto + Putkisto | ROUTE_AROUND | Putkisto |
| Ilmanvaihto + Sähkö | RAISE_LOWER | Sähkö |
| Ilmanvaihto + Sprinkler | ROUTE_AROUND | Sprinkler |
| Putkisto + Sähkö | ROUTE_AROUND | Sähkö |
| Putkisto + Sprinkler | ROUTE_AROUND | Sprinkler |
| Sähkö + Sprinkler | ROUTE_AROUND | Sprinkler |
| Ilmanvaihto + Ilmanvaihto | RESIZE | Ilmanvaihto |
| any other same + same | ROUTE_AROUND | that discipline |

Status mapping: the export's `open` means the skill's `new`; `assigned`, `in_progress`, `resolved`, `approved`, `void` are copied. Closed statuses (resolved, approved, void) are not ranked.

## 5. Deliberately different

- Small-model design (proven in phase 25): one output row per input clash in input order, a fixed per-row Y/N checklist, lookup verdicts, worked rows for every verdict, no counts or totals anywhere (no resolution rate, no priority breakdown, no coordination matrix, no pattern clash_count).
- Proposals only: priority, resolution type and responsible discipline are drafts for the coordinator, never decisions. No geometry, no coordinates: the skill's distance is the report's `penetration_mm` (positive = overlap, in mm; the skill uses metres and a negative sign for overlap).
- Pattern keyed from export fields (decision in section 7), not from discipline pair plus system pair.
- The earlier P1-P3 scale and the "3 or more in a cluster is top priority" rule were this project's own invention (phase 25). They are gone; priority is per clash by the skill's rules, a pattern group takes the highest priority of its members.
- Skill enumerations never produced by its rules (RELOCATE, STRUCTURAL_MOD, DESIGN_CHANGE, NO_CLASH, SEQUENCE) are not produced either; the coordinator may choose them.

## 6. Skill bugs and inconsistencies found, and fixes

Checked the scoring (`_auto_prioritize`), responsibility (`_auto_assign`), pattern code (`analyze_patterns`) and report code.

1. Large-overlap rule uses `abs(distance) > 0.1`: a large positive distance (a clearance violation, not an overlap) is also ranked HIGH. Fix: HIGH only for a hard clash with overlap above 100 mm.
2. Pattern thresholds are inconsistent: the discipline pair needs 3 clashes before the system pair (needing 2) is examined, so two clashes on the same system pair are never reported, and resolved/void clashes count towards patterns. Fix: a pattern is 2 or more OPEN clashes sharing an element; closed clashes are excluded.
3. Unknown discipline gets rank 10 in the fallback and so becomes the responsible one. Fix: unknown label means the coordinator decides.
4. The report lists critical unresolved clashes only with status `new`, hiding `assigned` and `in_progress` ones. Fix: open set = new, assigned, in_progress.
5. Resolution rate counts void clashes in the denominator; `generate_report` is annotated with an undefined class (`ConsistencyReport`), a NameError when the class body runs. Not applicable: counts and the report class are dropped.
6. The MEP-MEP rule precedes the clearance rule, so a clearance clash between two MEP trades is MEDIUM, not LOW; LOW is reached only by clearance clashes with structural or architectural elements. Treated as intended (stated rule, kept in the thresholds below) and called out here so the coordinator is not surprised.
7. `NO_CLASH` (tolerance) is in the enum but no rule assigns it; `void` status is the only way a false clash is recorded. Kept: void rows are copied from the report, never decided by the agent.

## 7. location_key decision: replaced

The invented `location_key` column is removed. The skill's pattern idea (same system pair across several clashes) is keyed from export fields instead: two open clashes belong to the same pattern group when an element text of one (element_a or element_b) is identical to an element text of the other. This is a model-checkable lookup by identical copied text: per row, `others=` lists the ids of the other open rows that share an identical element text. The group label is `PAT-` plus the first clash_id (in file order) of the group, copied. Justification: the skill groups by system; a system is not in the export, but the shared element (a duct, a riser) is the closest field-based stand-in and needs no hand-made preprocessing column. Limits (recorded as gaps): real exports may spell the same element differently, and groups are not transitive (only direct text matches with this row count; the synthetic sample contains no chains).

## 8. Priority rule table (all thresholds stated and copied into the SKILL)

Per open row, answers decide, first Y wins:

| Test | Y when | Priority |
|---|---|---|
| T1 | struct=Y (a discipline is Rakenne) AND type=hard | CRITICAL |
| T2 | big=Y (type=hard AND penetration known AND more than 100 mm) | HIGH |
| T3 | mep=Y (neither discipline is Rakenne or Arkkitehti) | MEDIUM |
| T4 | type=soft | LOW |
| none | all of T1-T4 N | MEDIUM |

Missing penetration: pen=unknown, big=N, add `confidence lower: penetration missing`. Pattern group priority = highest member (CRITICAL > HIGH > MEDIUM > LOW). Resolution type and responsible discipline: pair lookup (section 4); a group copies both from its first member.

## 9. Output format (what the agent writes)

0. `## Element index` (and per-row `idx_a`, `idx_b` fields added in revision 2 after run 2 mis-copied `others`; element index added in revision 1 after live run 1 found no patterns: one line per element text of open rows with the ids that contain it; `others=` is looked up from it). Not consumed by agent 4.
1. `## Per-clash rows`: `clash_id | status | priority | pattern | resolution_type | responsible_discipline | reason` one row per input clash in input order; closed rows have priority `not ranked` and `-` in pattern, resolution_type, responsible_discipline.
2. `## Pattern groups`: `pattern | clash_ids | shared_element | priority | suggested_resolution | root_cause`, in order of first appearance; none if there are no groups.
3. `## Findings for RFI drafting`, the 8 columns agent 4 reads, unchanged names: `finding_id | clash_ids | priority | disciplines | location | description | suggested_owner | open_question`, one row per pattern group and one per ungrouped open clash, in order of first appearance. Change for agent 4 (plan 32-02): `priority` now holds CRITICAL/HIGH/MEDIUM/LOW; the resolution type is carried in `description` as `proposed: <type>`; `suggested_owner` is the responsible discipline (Finnish label) or the coordinator marker.
4. Caveat footer.

## 10. Answer key for the synthetic sample (hand derived from section 8)

Scope-shrink note: the first sample had 16 rows (key written before any run; CL-001..CL-016 incl. a third pattern group CL-012/CL-013). After two failed revisions on it (jobs 4f18541b, f4376fb6, 977ecb72; see 32-VERIFICATION.md) the sample was shrunk to 8 rows (the one allowed scope-shrink retry) and this key replaces the long one. Rules and thresholds are unchanged.

Closed (not ranked): CL-006 resolved.

| clash_id | status | pattern | priority | resolution_type | responsible_discipline | note |
|---|---|---|---|---|---|---|
| CL-001 | new | PAT-CL-001 | CRITICAL | ROUTE_AROUND | Ilmanvaihto | struct hard |
| CL-002 | new | PAT-CL-001 | CRITICAL | ROUTE_AROUND | Ilmanvaihto | struct hard |
| CL-003 | assigned | PAT-CL-001 | LOW | ROUTE_AROUND | Ilmanvaihto | struct but soft, T4 |
| CL-004 | in_progress | PAT-CL-004 | MEDIUM | ROUTE_AROUND | Sähkö | mep, T3 |
| CL-005 | new | PAT-CL-004 | HIGH | ROUTE_AROUND | Sprinkler | 130 mm, T2 |
| CL-006 | resolved | - | not ranked | - | - | closed |
| CL-007 | new | - | CRITICAL | ROUTE_AROUND | Sähkö | struct hard, pen unknown, confidence lower |
| CL-008 | new | - | MEDIUM | ROUTE_AROUND | Sprinkler | soft MEP-MEP is MEDIUM |

Pattern groups: PAT-CL-001 = CL-001..CL-003, shared element Supply duct SD-12, CRITICAL; PAT-CL-004 = CL-004, CL-005, shared element Riser RS-3, HIGH. Findings: F-01 = PAT-CL-001, F-02 = PAT-CL-004, F-03 = CL-007, F-04 = CL-008 (4 rows).

## 11. Rubric R1-R7 (written before the live run; ids adjusted for the 8-row sample)

- R1: every input clash_id appears exactly once in the per-clash table, in input order (8 rows).
- R2: CL-006 is `not ranked` with `-` fields and absent from pattern and findings tables.
- R3: pattern groups come only from copying identical element text: exactly PAT-CL-001 (CL-001..003) and PAT-CL-004 (CL-004, CL-005); no other grouping, no invented labels.
- R4: priority per row follows the key (section 10) and equals the word after `fired:`; the rule that fired is named.
- R5: resolution_type and responsible_discipline per row follow the pair lookup, labelled proposals, Finnish labels used.
- R6: no invented ids, elements, numbers, dates; no counts, totals or rates anywhere; missing penetration (CL-007) flagged `confidence lower: penetration missing`.
- R7: findings table has the exact 8-column header, 4 rows F-01..F-04 matching section 10, and the draft caveat is present.
A single material violation of R1-R7 is a FAIL.
