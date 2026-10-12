# Autonomous decisions log

Format: ID — decision | alternatives | why | revert

- D-001 — Phase 2 left as "pending human": only 02-04 (human-verification checkpoint) remains and cannot be faked. Proceeding to Phase 3 despite its dependency on Phase 2, since 02-01..02-03 shipped and are tested. | Block everything on Phase 2 | Nothing else is gated on a human; saves the whole run | Run /gsd-verify-work 2 later.
- D-002 — Autonomous lifecycle: run milestone audit only; skip complete-milestone and cleanup (archiving/deleting phase dirs is not safe unattended and Phase 2 is unverified). | Full lifecycle | Guardrails say no destructive changes | Run /gsd-complete-milestone manually.
- D-003 — Workflow prompts (human_needed / gaps_found / blockers) auto-resolved: human_needed -> defer; gaps -> one gap-closure attempt then defer and log; blocker -> log in AUTONOMOUS-BLOCKERS.md, skip phase. | Ask user | User is away.
- D-004 — Phase 2.1: discuss replaced by auto-generated CONTEXT.md and research skipped; planner spawned directly (no full plan-phase workflow with researcher). | Full discuss+research+plan workflow | Small maintenance phase with fully specified success criteria; keeps overnight token budget for larger phases | Re-run /gsd-plan-phase 2.1 --research.
