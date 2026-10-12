# Phase 3 Search: Human UAT (pending human)

Nothing below was run autonomously: it needs network access to download the embedding model.
Status of every item: **pending human**.

## 1. Real-model accuracy run (pending human)

Prerequisites: dependencies installed with `ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci` (already done in dev setups).

```bash
SEARCH_REAL_EMBEDDINGS=1 npx vitest run src/lib/server/search/accuracy.real.test.ts
```

- First run downloads about 90 MB (Xenova/all-MiniLM-L6-v2) and takes about 90 s; it caches under `db/models` (`HF_CACHE_DIR`).
- Expected: hybrid hit@3 >= 0.8 over ALL query kinds (including paraphrases) on both the 150-agent scale corpus and the 9 real agents, and hybrid paraphrase hit@3 >= BM25 paraphrase hit@3. hit@1 and MRR are printed.
- For reference, BM25-only paraphrase hit@3 is 0.40 (scale) and 0.67 (real); keyword+nl is 1.00 on both.
- Record results here:
  - [ ] hybrid hit@3 (scale): ____  (real): ____
  - [ ] paraphrase hybrid vs BM25: ____
- Decision: keep Xenova/all-MiniLM-L6-v2 if hybrid hit@3 >= 0.8 including paraphrases. Tune `SIM_FLOOR` in `src/lib/server/search/hybrid.ts` (currently an untuned 0.25) using the printed similarity distribution, and note the final value in the 03-05 or a follow-up summary.

## 2. Populate real embeddings and check /catalog (pending human)

1. With network access, run `npm run db:push && npm run ingest` once (without `SEARCH_EMBEDDINGS=off`) to fill `agent_embeddings` in `db/catalog.db`.
2. Start the app and open `/catalog`; type a paraphrase query such as "how much air does each room need" and confirm the HVAC agent ranks near the top; check `GET /api/search?q=...` reports `mode: "hybrid"`.
3. Confirm a keyword query (for example `rfi`) still returns exact matches first.

## 3. Live typing feel in the browser (pending human)

Not verified autonomously (no browser): run `npm run dev`, open `/catalog`, and type "hvac" quickly.
- [ ] List narrows about 200 ms after the last keystroke, input keeps focus and caret, page does not jump (keepFocus/noScroll).
- [ ] URL shows `?q=hvac&page=1`; changing a filter keeps q; clearing the box (or "Clear search") restores the full catalog.
- [ ] No-results query shows `No agents match "..."`; screen reader announces "N agents found" after results update.
- [ ] Visual pass of the search box (spacing, focus ring) above the filters.
