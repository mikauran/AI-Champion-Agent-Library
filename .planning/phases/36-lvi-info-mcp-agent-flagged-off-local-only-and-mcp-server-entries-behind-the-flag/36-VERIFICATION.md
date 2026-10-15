# Phase 36 Verification (in progress: plans 36-01..36-03)

## 36-01 (LMCP-01)
- Flag LOCAL_MCP_AGENTS default off: src/lib/localMcpFlag.test.ts (12 cases).
- Flag-off byte-identical: scripts/flag-off.golden.test.ts and the ingest goldens pass unchanged, no UPDATE_GOLDEN, `git diff scripts/__golden__` empty.
- Relocation: three entries are renames into data/agents-local/; data/agents has only those three removals.
- Ingest second pass and purge: scripts/ingest.local-mcp.test.ts (5), scripts/mcp-server-entries.test.ts retargeted.
- Decisions D-635..D-637 recorded.

## 36-02 (LMCP-02)
- Route 404 when off (no upstream or child process created), 401/403/400/413/429/503/502/504 covered, allow-list, caps, per-lease budget isolation, hook prefix gating both ways.
- `npm run check` (end of 36-02): exit 0; 325 files passed / 1 skipped; 3935 tests passed / 1 skipped.
- Network guard, compose, Containerfile, RunnerConfig unchanged (git diff empty).

## 36-03 (LMCP-03)
- Flag off: buildWarmFiles, buildPiArgs (4 cases) and the staged file set deep-equal the pre-change literals (src/lib/server/tryitout/localMcpStaging.test.ts); existing piRunner/service tests unchanged.
- Flag on, LVI slug: extension staged at AGENT_DIR/extensions/lvi-info.ts, `-e` + 5 tool names in argv, `--no-extensions`/`--no-mcp` kept, no bash; canary env value and `sk-` absent from the staged text.
- Extension behaviour with stubbed fetch: bearer, body, banner, hostile text unchanged inside banner, ok:false/non-2xx throw, budget exhaustion without fetch, missing token without fetch.
- `npm run check`: 328 files passed / 1 skipped; 3957 tests passed / 1 skipped.
- Guard, runnerConfig, compose, Containerfiles, DDC script: git diff empty.

## Pending (plans 36-04..36-05)
agent entry, proof that Pi 1.0.4 loads the extension (jiti .ts, -e under --no-extensions, --tools allow-listing of extension tools), mock-run Try It Out evidence, vite build smoke with flag off, security notes.
