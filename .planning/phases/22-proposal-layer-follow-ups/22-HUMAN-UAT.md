---
status: pending human
phase: 22-proposal-layer-follow-ups
updated: 2026-10-15
---

# Phase 22 Human UAT

Interim evidence only: the schema validation and the five automated gates (strict mode, 0 rejected ops), plus `src/lib/mcpgen/proposals/real/real.test.ts`. These do not replace the human review required by the design (D-580). Nothing below is ticked.

## 1. Review by Ville of the first real proposal

- [ ] Reviewed `src/lib/mcpgen/proposals/real/acme-openapi.proposals.json` and accept it (or note changes)

Commands (from the repo root):

```
npm run generate-mcp -- src/lib/mcpgen/testing/fixtures/acme-openapi.yaml --proposals src/lib/mcpgen/proposals/real/acme-openapi.proposals.json --validate-only
npm run generate-mcp -- src/lib/mcpgen/testing/fixtures/acme-openapi.yaml --out /tmp/acme-baseline
npm run generate-mcp -- src/lib/mcpgen/testing/fixtures/acme-openapi.yaml --out /tmp/acme-proposed --proposals src/lib/mcpgen/proposals/real/acme-openapi.proposals.json
diff -ru /tmp/acme-baseline /tmp/acme-proposed
```

Look for: tool names and descriptions are sensible and accurate; no text claims the server writes or changes anything; each op `reason` is true; the hidden tool (`filter_part_by_features`) is an acceptable loss; the composite `find_part_details` returns what its description says (default fields of the first match); the default page size 10 is acceptable.

## 2. Sign-off on the baseline vs proposal-assisted comparison (plan 02)

- [ ] Read `22-COMPARISON.md` and accept the interpretation (pending; result added by plan 02)
