---
phase: 2
slug: catalog-and-detail
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 (already installed) |
| **Config file** | `vitest.config.ts` — exists; needs updating for SvelteKit browser environment |
| **Quick run command** | `npx vitest run src/lib/ src/routes/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/ src/routes/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | BROW-01, BROW-03 | unit | `npx vitest run src/routes/catalog/` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | BROW-02 | unit | `npx vitest run src/lib/components/FilterBar.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | BROW-01 | unit | `npx vitest run src/routes/catalog/` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | BROW-02 | unit | `npx vitest run src/lib/components/FilterBar.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 2 | BROW-03 | unit | `npx vitest run src/routes/catalog/` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 3 | DETL-01 | unit | `npx vitest run src/routes/agents/` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 3 | DETL-02 | unit (jsdom) | `npx vitest run src/lib/components/TechAccordion.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-03 | 03 | 3 | DETL-03 | unit (jsdom) | `npx vitest run src/lib/components/CustomizationPanel.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-04 | 03 | 3 | UI-01 | smoke | manual browser check desktop + tablet | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — update to support jsdom environment for component tests alongside existing node tests; add `@testing-library/svelte` for Svelte 5
- [ ] `src/routes/catalog/catalog.test.ts` — load function unit tests (node env); covers BROW-01, BROW-02 filtering logic, BROW-03 pagination
- [ ] `src/routes/agents/detail.test.ts` — load function unit tests (node env); covers DETL-01 field presence, 404 behavior
- [ ] `src/lib/components/TechAccordion.test.ts` — component test (jsdom env); covers DETL-02 `<details>` element closed by default
- [ ] `src/lib/components/CustomizationPanel.test.ts` — component test (jsdom env); covers DETL-03 tailorable fields rendered
- [ ] `src/lib/components/FilterBar.test.ts` — component test (jsdom env); covers BROW-02 filter state reactivity
- [ ] Framework install: `npm install -D @testing-library/svelte @testing-library/jest-dom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Catalog page has responsive grid layout at desktop and tablet viewports | UI-01 | CSS layout verification requires visual browser check | Open catalog page in Chrome DevTools at 1280px (desktop) and 768px (tablet); confirm no horizontal scroll, no broken card layouts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
