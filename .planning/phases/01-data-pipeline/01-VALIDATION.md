---
phase: 1
slug: data-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` — does not exist yet (Wave 0 installs) |
| **Quick run command** | `npx vitest run src/lib/spec/ scripts/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/spec/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| PIPE-01 parse | 01 | 1 | PIPE-01 | unit | `npx vitest run src/lib/spec/oracle-agentspec.test.ts` | ❌ W0 | ⬜ pending |
| PIPE-01 error | 01 | 1 | PIPE-01 | unit | `npx vitest run src/lib/spec/oracle-agentspec.test.ts` | ❌ W0 | ⬜ pending |
| PIPE-02 shim | 01 | 1 | PIPE-02 | unit | `npx vitest run src/lib/spec/types.test.ts` | ❌ W0 | ⬜ pending |
| PIPE-03 upsert | 02 | 2 | PIPE-03 | integration | `npx vitest run scripts/ingest.test.ts` | ❌ W0 | ⬜ pending |
| PIPE-04 build | 03 | 3 | PIPE-04 | smoke | manual `npm run build` verification | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — framework config; `environment: 'node'`, no jsdom needed for data pipeline tests
- [ ] `src/lib/spec/oracle-agentspec.test.ts` — covers PIPE-01: valid parse, malformed YAML, missing required fields, Zod error messages
- [ ] `src/lib/spec/types.test.ts` — covers PIPE-02: static assertion that no AgentRecord key appears in OracleAgentSpecSchema key set
- [ ] `scripts/ingest.test.ts` — covers PIPE-03: runs ingest twice against fixture YAMLs, asserts row count stability and `last_ingested_at` update
- [ ] `data/agents/fixtures/` — 2-3 sample AgentSpec YAML files: valid agent, minimal-field agent, malformed agent

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm run build` executes ingest before vite build | PIPE-04 | Build pipeline order not unit-testable | Run `npm run build`, verify ingest step completes and SQLite file exists before vite output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
