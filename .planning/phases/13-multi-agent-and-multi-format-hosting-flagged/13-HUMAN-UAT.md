# Phase 13 Human UAT (pending)

## 13-06 System detail page (AGENT_KINDS=1)
Status: pending human (no browser available in the unattended run).
- Start with `AGENT_KINDS=1`, open a system agent at /agents/<slug> (needs an agent_kinds row with kind system and members).
- Expect: kind badge, "Members" section with topology, no Language Model line when n/a, no runnable Try It Out.
- Expect with the flag off: page identical to before.
