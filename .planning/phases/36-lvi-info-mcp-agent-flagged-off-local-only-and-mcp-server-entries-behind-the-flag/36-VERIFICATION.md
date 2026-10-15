# Phase 36 Verification (in progress: plans 36-01, 36-02)

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

## Pending (plans 36-03..36-05)
Pi extension, agent entry, mock-run Try It Out evidence, vite build smoke with flag off, security notes.
