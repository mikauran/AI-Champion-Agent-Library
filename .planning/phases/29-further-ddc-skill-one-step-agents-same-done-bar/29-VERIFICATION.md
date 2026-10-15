---
phase: 29
status: human_needed
---

# Phase 29 Verification

All outputs are drafts for engineer review. Inputs are synthetic or public only.

Harness, procedure and ledger as in Phases 25-28 (see ../28-*/28-VERIFICATION.md): Option A (compose stack, internal network `aic-pi-internal`, image `localhost/aic-agent-library:tryitout`, catalog and prompts bind-mounted), `scripts/tryout-run.ts`, model gpt-4.1-mini in the Pi container, ledger `.planning/spend-log.md`. Selection record: docs/ddc-agent-candidates.md.

## Agent evidence

### Agent 13: Daily report cross-check
COUNTED (SKILL v1, first run, rubric R1-R7 met).

- Entry: data/agents/daily-report-cross-check.yaml (validate-submission INGESTIBLE, validate-entries 0 errors; stage site-handover, agent_no 13; name "Daily Report Cross Check" so the slug is daily-report-cross-check). The validate-entries range for agent_no was widened from 1-12 to 1-16 (deviation; its negative test now uses 17). Input label: synthetic (data/tryitout-prompts/daily-report-cross-check/sample-daily-report-timesheet.txt: 6 invented daily report lines, 7-line invented timesheet extract). Option A, gpt-4.1-mini, Pi container, 3 requests, usage observed (countable).
- Run: job fdf1b5e2-880f-4f69-b209-ca89e963aeeb, SKILL v1, 12696 tokens, est. 0.0203 USD, 14.5 s. No FAILed runs, no revisions.
- Answer key vs result: D-01 consistent, D-02 consistent, D-03 mismatch (workers differ 5 vs 6), D-04 mismatch (hours differ 48 vs 44), D-05 delay-unexplained, D-06 not-in-timesheet (NONE, the 2026-03-03 scaffolding line not used): all six match.
- Verdict: R1 pass (one result.md; 6 check lines and 6 table rows D-01..D-06 in order, 8 cells each); R2 pass (every non-NONE timesheet_line verbatim from the extract); R3 pass (all six verdicts equal the key); R4 pass (notes as key; D-06 NONE; review NO only D-01, D-02); R5 pass (no row for the crane line; open items D-03, D-04, D-05, D-06); R6 pass (no counts, totals, approval statement); R7 pass (draft caveat present).
- Excerpt:
  ```
  D-03 date=2026-03-02 trade=plumbing rep_workers=5 rep_hours=40 delay_hours=0 reason=EMPTY | ts_line="2026-03-02,plumbing,6,40" ts_workers=6 ts_hours=40 | workers_same=N | hours_same=Y | delay_open=N | verdict=mismatch
  D-06 date=2026-03-02 trade=scaffolding rep_workers=2 rep_hours=16 delay_hours=0 reason=EMPTY | ts_line=NONE ts_workers=NONE ts_hours=NONE | workers_same=- | hours_same=- | delay_open=N | verdict=not-in-timesheet
  D-03 | 2026-03-02 | plumbing | 5 workers, 40 h | 2026-03-02,plumbing,6,40 | mismatch | YES | workers differ 5 vs 6
  D-04 | 2026-03-02 | concrete | 6 workers, 48 h | 2026-03-02,concrete,6,44 | mismatch | YES | hours differ 48 vs 44
  D-05 | 2026-03-02 | hvac | 3 workers, 24 h | 2026-03-02,hvac,3,24 | delay-unexplained | YES | delay hours given, no reason
  D-06 | 2026-03-02 | scaffolding | 2 workers, 16 h | NONE | not-in-timesheet | YES | not in timesheet
  Draft for site manager review. Verdicts come only from the supplied report lines and timesheet extract.
  ```
- Caveat: draft for site manager review; counted for the scoped step only (6 report lines, one synthetic sample, first run).
- Teardown: stack down, `podman ps -a --filter label=aic.tryitout` empty.
- Ledger: one 29-01 row (0.0203 USD).

### Agent 14: Punch list closure check
COUNTED (SKILL revision 1, second run; rubric R1-R7 met).

- Entry: data/agents/punch-list-closure-check.yaml (validate-submission INGESTIBLE, validate-entries 0 errors; stage site-handover, agent_no 14; name "Punch List Closure Check" so the slug is punch-list-closure-check, confirmed by tryout:configure). DDC paths 1_DDC_Toolkit/Field-Operations/punch-list-manager and 1_DDC_Toolkit/Project-Closeout/punch-list-manager both verified present with gh api. Input label: synthetic (data/tryitout-prompts/punch-list-closure-check/sample-punch-list.txt: 6 invented items, as_of=2026-05-01, placeholder closure rules). Option A, gpt-4.1-mini, Pi container, 3 requests per run, usage observed (countable).
- Run 1: job e9cef5f5-a822-4549-a3b1-912d37d00950, SKILL v1, 11980 tokens, est. 0.0192 USD, 12.5 s. FAIL (R4): all six verdicts right, but the notes for P-02 (`verified_by missing`) and P-06 (`closed_date missing`) and P-05 were `-`; not counted. Fix: explicit per-verdict note rule and three worked rows with notes (revision 1).
- Run 2 (counted): job 4100e229-7b71-43b5-8803-f7f823ec5f95, SKILL revision 1, 12641 tokens, est. 0.0202 USD. No scope-shrink retry needed.
- Answer key vs result: P-01 closed-ok, P-02 closed-unverified (verified_by missing), P-03 overdue (due 2026-04-10 before as_of 2026-05-01), P-04 open-ok, P-05 no-responsible, P-06 closed-unverified (closed_date missing): all six match.
- Verdict: R1 pass (one result.md; 6 check lines and 6 table rows in order, 8 cells each); R2 pass (responsible, due, status copied verbatim; empty responsible shown as `-`); R3 pass; R4 pass (notes as key; review NO only P-01, P-04); R5 pass (open items P-02, P-03, P-05, P-06); R6 pass (no counts, percent complete, readiness or acceptance statement, nothing invented); R7 pass (draft caveat present).
- Excerpt:
  ```
  P-03 status=open resp=Carpenter Oy due=2026-04-10 as_of=2026-05-01 closed_date=EMPTY verified_by=EMPTY | resp_empty=N | closure_missing=- | due_before_asof=Y | verdict=overdue
  P-02 | Level 1 lobby | Floor Oy | 2026-04-28 | closed | closed-unverified | YES | verified_by missing
  P-03 | Level 2 office | Carpenter Oy | 2026-04-10 | open | overdue | YES | due 2026-04-10 before as_of 2026-05-01
  P-05 | Level 3 hall | - | 2026-05-15 | open | no-responsible | YES | responsible missing
  P-06 | Level 3 stair | Electric Oy | 2026-04-30 | closed | closed-unverified | YES | closed_date missing
  Draft for engineer review. Verdicts come only from the supplied punch list and as_of date using placeholder closure rules.
  ```
- Caveat: draft for engineer review; counted for the scoped step only (6 items, one synthetic sample, placeholder closure rules that are not a contract requirement).
- Teardown: stack down, `podman ps -a --filter label=aic.tryitout` empty.
- Ledger: two 29-02 rows (0.0192 + 0.0202 USD).
