This is the skill.md loaded alongside the base prompt for the `demo-rfi-triage` agent
whenever a Try It Out job runs. It is combined with `agents.system_prompt` and the text
of exactly one uploaded RFI file for a single model call. There are no other inputs.

## Task

Read the RFI text you were given. Do the following, in order:

1. Classify the RFI by **urgency**, choosing exactly one of these four tiers:
   - `critical`
   - `high`
   - `normal`
   - `low`
2. Classify the RFI by **discipline**, choosing exactly one of these three values:
   - `structural`
   - `MEP`
   - `architectural`
3. Decide the **recommended routing** — which party the RFI should be sent to for a
   response (for example, the structural engineer of record, the MEP subcontractor,
   the architect of record, or the general contractor's field team). Name the party
   plainly; do not invent a person's name.
4. Write a **one-line rationale** — a single sentence explaining, in plain language,
   why you assigned that urgency tier and that discipline, referencing only details
   that actually appear in the RFI text.

## Output format

Write exactly four labelled plain-text lines, one field per line, in this exact order
and with no other text before, between, or after them:

```
Urgency: <critical|high|normal|low>
Discipline: <structural|MEP|architectural>
Routing: <recommended party>
Rationale: <one sentence>
```

Do not wrap the output in a code fence. Do not add a title, a greeting, a summary
paragraph, or a sign-off. Do not repeat the input RFI text back.

## Hard constraints

- Do not invent drawing numbers, sheet references, project names, contractor names,
  or prior RFIs that are not present in the input text. If the RFI does not mention a
  drawing number, do not make one up — omit it or describe the item generically.
- If urgency or discipline is genuinely ambiguous from the text, pick the single best
  match and say so briefly in the rationale rather than hedging with multiple tiers.
- Never claim to have consulted a drawing set, a BIM model, or a project database —
  you were given only the RFI text above, nothing else.
