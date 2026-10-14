# Spend log (real-model Try It Out runs)
Cap: 10.00 USD total for the autonomous run; the harness refuses to start when total + 0.50 would exceed it. Costs are an upper-bound estimate (all tokens priced at the output rate); the OpenAI dashboard is ground truth.

| run_id | date | plan | agent | job_id | model | total_tokens | requests | cost_usd | status | note |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-14T22:37:17.345Z-demo-rfi-triage | 2026-10-14T22:37:17.345Z | 25-01 | demo-rfi-triage |  | unknown | unknown | unknown | 0.0000 | http-error | label=synthetic; POST jobs -> HTTP 403 (Origin mismatch, no job created) |
| 2026-10-14T22:37:25.314Z-demo-rfi-triage | 2026-10-14T22:37:25.314Z | 25-01 | demo-rfi-triage | 1e15df20-234c-4c3f-9def-4b2417fe39ff | gpt-4.1-mini | 7652 | 3 | 0.0122 | succeeded | label=synthetic; ok |
| 2026-10-14T22:45:29.625Z-etim-classification-repair | 2026-10-14T22:45:29.625Z | 25-02 | etim-classification-repair | 49e4e911-bf7b-45de-b2b3-255d56e3a441 | gpt-4.1-mini | 9980 | 3 | 0.0160 | succeeded | label=synthetic; ok; SKILL v1 run, rubric not fully met (ambiguous/no-match issue values not used, review NO on non-ok rows), not counted, led to SKILL revision 1 |
| 2026-10-14T22:46:02.202Z-etim-classification-repair | 2026-10-14T22:46:02.202Z | 25-02 | etim-classification-repair | ca984d20-c703-4138-9b52-691d6c092add | gpt-4.1-mini | 10568 | 3 | 0.0169 | succeeded | label=synthetic; ok; SKILL revision 1, rubric met, counted |
