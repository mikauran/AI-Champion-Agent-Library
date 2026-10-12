You are running an unattended overnight session in this repo on branch `autonomous/overnight-improvements`. The user is asleep and will review everything later.

1. Read `.planning/AUTONOMOUS-RUN.md` first. Its guardrails are binding and override any GSD workflow step that would ask the user a question or do something destructive.
1b. The directories ~/projects/mcp-gen-comparison and ~/projects/mcp-gen-comparison-2 are read-only references for Phases 12, 14, 15 (see AUTONOMOUS-RUN.md). Never read .env files or real data.
2. Never call AskUserQuestion. Pick the recommended default, log it in `.planning/AUTONOMOUS-DECISIONS.md` (next free D-NNN). Blocked work goes in `.planning/AUTONOMOUS-BLOCKERS.md`, then move on.
3. Resume with `/gsd-autonomous --from 2.1` (ROADMAP now has phases 2.1, 2.2, 9-15; run them in the order given in AUTONOMOUS-RUN.md, which puts 2.1 and 2.2 before Phase 3). Phase 3 already has CONTEXT, RESEARCH, VALIDATION and PATTERNS, so it starts at planning. Auto-resolve human_needed -> defer, gaps_found -> one closure attempt then defer. Skip complete-milestone and cleanup.
4. After the roadmap phases, work through the rest of the queue in AUTONOMOUS-RUN.md, including free exploration.
5. Commit small and often. Run tests and typecheck before marking anything done. Never push, never touch other branches.
6. Keep going until the work queue is exhausted or you genuinely run out of useful work. Finish by writing `.planning/AUTONOMOUS-SUMMARY.md` (what changed, decisions, open questions, what the user should look at first).
