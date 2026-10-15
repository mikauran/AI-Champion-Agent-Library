---
phase: 23-code-review-of-new-generator-code
plan: 02
status: part_1_complete
part_1: critical 6 of 6 fixed; warnings fixed (passes A, B, C plus CR-32, CR-40, CR-42)
fixed: 18
accepted: 0
not_a_defect: 0
deferred_to_part_2: 41
---

# Phase 23 Review Fix

Source: 23-REVIEW.md (baseline d45f59b). Fixes were made one finding or tight cluster at a time on branch
autonomous/overnight-improvements, failing test first, `Co-Authored-By` trailer on every commit. Statuses:
fixed (commit, test), accepted (decision id, finding left as is), not-a-defect (evidence), deferred-to-part-2.
Part 2 appends its rows to the table in "Part 2 rows" (move a row there, keep the id) and updates the front matter counts.

## Part 1 summary

- All 6 critical findings reproduced as described and fixed (CR-10, CR-18, CR-26, CR-27, CR-38, CR-39). None was a false positive.
- Warnings of passes A, B and C fixed: CR-01..CR-05, CR-11, CR-12, CR-19, CR-20. Entangled warnings from passes D and E1 fixed with them:
  CR-32 (same cause as CR-20), CR-40 (truncation in the text cleaners CR-38/39 rewrote), CR-42 (link filter shared with CR-38).
- Where a fix is narrower than the suggested fix, the decision id says how (see AUTONOMOUS-DECISIONS.md D-611..D-617).
- Goldens: two goldens-only commits. eb4dd6f: model/report JSON gain the info gap `base-path-in-env` (fixtures with a servers url or
  basePath), proposal review goldens and `proposals/real/acme-openapi.proposals.json` carry the new baseline fingerprint (the fingerprint
  covers gaps); no server.py text changed. 4803492: OData goldens (server.py, test_server.py, model, report) for CR-19 (new runtime
  helpers, list tools warn on capped responses, one new generated test). Generated OData pytest passes (21 tests) on FastMCP 4.1.0 in a
  throwaway venv outside the repo (deleted afterwards). No other emitted Python changed.
- A repo guard (criteria.test.ts, "no pre-existing test file was modified by Phase 15") forced the CR-10/11/12 tests into the new file
  adapters/sql-ddl.review23.test.ts.

## Part 1 rows

| Finding | Severity | Status | Commit | Test | Decision |
|---|---|---|---|---|---|
| CR-01 | warning | fixed | 20ac57e | adapters/openapi.test.ts "detects the marker after 64 KB of components" |  |
| CR-02 | warning | fixed | 66be918 | adapters/openapi.security.test.ts "undefined security scheme (CR-02)" |  |
| CR-03 | warning | fixed | 53f0aa0 | adapters/openapi.swagger2.test.ts "swagger 2.0 produces */* (CR-03)" |  |
| CR-04 | warning | fixed | 8d3e753, 8ea0bb8 (goldens eb4dd6f) | adapters/openapi.test.ts "base path gap (CR-04)" | D-611 |
| CR-05 | warning | fixed | cc07a67 | adapters/openapi.audit31.test.ts "3.1 nullable unions and const (CR-05)" |  |
| CR-10 | critical | fixed | 2e9c8ac | adapters/sql-ddl.review23.test.ts "columns named like constraint keywords (CR-10)" | D-612 |
| CR-11 | warning | fixed | 43d6e68 | adapters/sql-ddl.review23.test.ts "identifier case in keys (CR-11)" |  |
| CR-12 | warning | fixed | 9237075 | adapters/sql-ddl.review23.test.ts "MySQL comments (CR-12)" |  |
| CR-18 | critical | fixed | d627b20 | adapters/odata.adversarial.test.ts "entity and property names that collide with Object.prototype (CR-18)" | D-612 |
| CR-19 | warning | fixed | 0400021 (goldens 4803492) | generated test_capped_response_with_next_link_warns (pytest, FastMCP 4.1.0 venv) + adapters/odata.golden.test.ts | D-613 |
| CR-20 | warning | fixed | 1e3e4d2 | mcptest/proposalEval.xml.test.ts |  |
| CR-26 | critical | fixed | 789dd8a | proposals/gates.test.ts "gate 4: rename_arg collisions (CR-26)" | D-614 |
| CR-27 | critical | fixed | e5c702f | proposals/contextPack.test.ts "SQL dump data rows stay out of the pack (CR-27)" | D-615 |
| CR-32 | warning | fixed | 1e3e4d2 (same fix as CR-20) | mcptest/proposalEval.xml.test.ts |  |
| CR-38 | critical | fixed | 7b97acc | hygiene.test.ts "CR-38: long link-shaped tokens are linear" |  |
| CR-39 | critical | fixed | e5834b9 | hygiene.test.ts + proposals/hygiene.test.ts "CR-39 invisible characters" | D-616 |
| CR-40 | warning | fixed | 7aaf7db | hygiene.test.ts "CR-40 truncation never leaves a lone surrogate" |  |
| CR-42 | warning | fixed | 7aaf7db | hygiene.test.ts + proposals/hygiene.test.ts "CR-42 ..." | D-617 |

## Part 2 rows

Append moved rows here, or edit the status in place. Every id below is untouched by Part 1.

| Finding | Severity | Status | Commit | Test | Decision |
|---|---|---|---|---|---|
| CR-06 | info | deferred-to-part-2 | | | |
| CR-07 | info | deferred-to-part-2 | | | |
| CR-08 | info | deferred-to-part-2 | | | |
| CR-09 | info | deferred-to-part-2 | | | |
| CR-13 | info | deferred-to-part-2 | | | |
| CR-14 | info | deferred-to-part-2 | | | |
| CR-15 | info | deferred-to-part-2 | | | |
| CR-16 | info | deferred-to-part-2 | | | |
| CR-17 | info | deferred-to-part-2 | | | |
| CR-21 | info | deferred-to-part-2 | | | |
| CR-22 | info | deferred-to-part-2 | | | |
| CR-23 | info | deferred-to-part-2 | | | |
| CR-24 | info | deferred-to-part-2 | | | |
| CR-25 | info | deferred-to-part-2 | | | |
| CR-28 | warning | deferred-to-part-2 | | | |
| CR-29 | warning | deferred-to-part-2 | | | |
| CR-30 | warning | deferred-to-part-2 | | | |
| CR-31 | warning | deferred-to-part-2 | | | |
| CR-33 | warning | deferred-to-part-2 | | | |
| CR-34 | warning | deferred-to-part-2 | | | |
| CR-35 | warning | deferred-to-part-2 | | | |
| CR-36 | info | deferred-to-part-2 | | | |
| CR-37 | info | deferred-to-part-2 | | | |
| CR-41 | warning | deferred-to-part-2 | | | |
| CR-43 | info | deferred-to-part-2 | | | |
| CR-44 | info | deferred-to-part-2 | | | |
| CR-45 | info | deferred-to-part-2 | | | |
| CR-46 | info | deferred-to-part-2 | | | |
| CR-47 | warning | deferred-to-part-2 | | | |
| CR-48 | warning | deferred-to-part-2 | | | |
| CR-49 | warning | deferred-to-part-2 | | | |
| CR-50 | warning | deferred-to-part-2 | | | |
| CR-51 | warning | deferred-to-part-2 | | | |
| CR-52 | warning | deferred-to-part-2 | | | |
| CR-53 | warning | deferred-to-part-2 | | | |
| CR-54 | info | deferred-to-part-2 | | | |
| CR-55 | info | deferred-to-part-2 | | | |
| CR-56 | info | deferred-to-part-2 | | | |
| CR-57 | info | deferred-to-part-2 | | | |
| CR-58 | info | deferred-to-part-2 | | | |
| CR-59 | info | deferred-to-part-2 | | | |

## Info findings

Info findings are listed in the table above as deferred-to-part-2 and are fixed only when trivial and zero-risk; the rest stay open.
