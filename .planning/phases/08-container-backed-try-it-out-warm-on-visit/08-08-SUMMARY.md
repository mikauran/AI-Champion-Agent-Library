---
phase: 08-container-backed-try-it-out-warm-on-visit
plan: 08
status: checkpoint-pending
subsystem: deployment
tags: [podman, containerfile, compose, smoke]
requires: ["08-01", "08-05", "08-06", "08-07"]
provides:
  - Containerfile.pi-runner generic Pi image
  - scripts/smoke-pi-runner.ts live engine check
  - compose socket mount and internal network, PI_* docs
key-files:
  created: [Containerfile.pi-runner, scripts/smoke-pi-runner.ts]
  modified: [podman-compose.yml, Containerfile, .env.example, README.md]
---

# Phase 8 Plan 08: pi-runner image, compose wiring and smoke script (checkpoint-pending)

Status: Tasks 1 and 2 are done and committed. Task 3 (live verification on a Podman host) is AWAITING HUMAN VERIFICATION. Nothing in this summary claims the live check passed; Podman is not installed on the dev machine.

## Completed

- Task 1 (404ce69): `Containerfile.pi-runner` (Pi 1.0.4 pinned, `--ignore-scripts`, user pi uid 1000, ripgrep/fd, PI_OFFLINE/PI_SKIP_VERSION_CHECK/PI_TELEMETRY set, no COPY, no secrets) and `scripts/smoke-pi-runner.ts` (drives the production dockerode runtime; `--help` and engine_unavailable exit 1 verified locally).
- Task 2 (see git log, feat(08-08) wire Podman socket): compose socket mount, `label=disable`, keep-id userns, `aic-pi-internal` internal network with alias `aic-agent-library`; `PI_RUNNER_SOCKET` in app Containerfile; `.env.example` PI_* block; README "Trying out an agent" rewritten plus "Setting up the Pi runner".

## Gate results

- vitest excluding set-try-it-out-mode: 38 files, 380 tests passed.
- set-try-it-out-mode baseline: exactly 3 failures (as expected).
- `npm run build` ok; build/client contains neither OPENAI_API_KEY nor dockerode.
- `npx tsc --noEmit`: only the 22 pre-existing errors in catalog.test.ts, tryItOut.test.ts, detail.test.ts, try-it-out.test.ts (out of scope, not fixed). No errors in new files. The plan's literal `npx tsc --noEmit` step therefore exits non-zero for pre-existing reasons only.

## Deviations

None in scope. (A self-introduced type error in the smoke script was fixed before committing.)

## Pending: Task 3

Human must run the plan's "how-to-verify" steps 1-11 on a rootless Podman host with a real OPENAI_API_KEY, then record the smoke output and the RECOMMENDED PI_RUNNER_FS_MODE here. If the result is `layer`, change the compose default to `${PI_RUNNER_FS_MODE:-layer}` and update the .env.example comment.
