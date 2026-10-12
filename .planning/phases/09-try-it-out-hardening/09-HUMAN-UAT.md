---
phase: 09-try-it-out-hardening
status: pending human
---

# Phase 9 Try It Out hardening: Human UAT (pending human)

Nothing below was run autonomously. The autonomous run used a fake runtime, fake timers and a mocked upstream fetch only; no Podman, Docker or network was touched. Every item is **pending human** and every checkbox is deliberately unchecked.

Common setup (rootless Podman host, repo root):

```bash
systemctl --user enable --now podman.socket
podman build -t localhost/pi-runner:latest -f Containerfile.pi-runner .
```

Env names used below are from `.env.example`: `PI_RUNNER_NETWORK` (default `aic-pi-internal`), `PI_RUNNER_IMAGE` (`localhost/pi-runner:latest`), `PI_RUNNER_SOCKET`, `PI_RUNNER_IDLE_TTL_MS`, `PI_RUNNER_WARM_WAIT_MS`, `PI_RUNNER_JOB_TIMEOUT_MS`, `PI_JOB_TOKEN_BUDGET`, `PI_JOB_REQUEST_BUDGET`, `PI_RUNNER_MAX_CONTAINERS`, and `APP_INSTANCE_NAME` (owner label, D-017). Pi containers are named `aic-pi-<hex>` and carry label `aic.tryitout=1`, `aic.instance`, `aic.owner`.

## 1. Smoke script after the Phase 9 changes (pending human)

Validates: runtime create options after 09-01 (IN-04 `MemorySwap = Memory`, SEC-13), `.` path rejection, null-prototype getFiles.

```bash
npx tsx scripts/smoke-pi-runner.ts                                  # tmpfs mode
podman-compose up -d --build
npx tsx scripts/smoke-pi-runner.ts --proxy-host aic-agent-library   # DNS + egress checks
```

Expected: every line `PASS` (dns line may `SKIP` without the app running; `external egress blocked` is a `PASS`), final `cleanup: 0 smoke containers left`. If `createAndStart` fails with a memory/swap error, Podman rejected `MemorySwap`: revert the `MemorySwap = Memory` create option (see the 09-01 SUMMARY and D-018).

- [ ] tmpfs run all PASS
- [ ] compose run with `--proxy-host aic-agent-library` all PASS

## 2. Container hardening (pending human)

Validates: SEC-13 and the Phase 8 container profile. Start the app, open a runnable agent page (for example `demo-rfi-triage`) to warm a container, then:

```bash
C=$(podman ps --filter label=aic.tryitout --format '{{.Names}}' | head -1)
podman inspect "$C" --format 'user={{.Config.User}} ro={{.HostConfig.ReadonlyRootfs}} capdrop={{.HostConfig.CapDrop}} secopt={{.HostConfig.SecurityOpt}} mem={{.HostConfig.Memory}} swap={{.HostConfig.MemorySwap}} pids={{.HostConfig.PidsLimit}} ports={{.NetworkSettings.Ports}}'
podman inspect "$C" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E '^(AIC_|OPENAI)'
```

Expected: `user=pi`, `ro=true` (tmpfs mode), `capdrop=[ALL]`, `secopt` contains `no-new-privileges`, `mem` equals `swap` (default 1073741824), `pids=200`, no published ports; only `AIC_LLM_TOKEN=...` matches the grep and no `OPENAI_API_KEY`.

- [ ] all values as expected

## 3. Network guard live (pending human)

Validates: SEC-15/IN-03 (accepted), WR-03 guard.

```bash
C=$(podman ps --filter label=aic.tryitout --format '{{.Names}}' | head -1)
podman exec "$C" node -e "fetch('https://example.com').then(r=>console.log('REACHED',r.status),e=>console.log('BLOCKED',e.cause?.code||e.message))"
podman exec "$C" node -e "fetch('http://aic-agent-library:3000/health').then(r=>console.log('app',r.status),e=>console.log('app BLOCKED',e.message))"
OTHER=$(podman ps --filter label=aic.tryitout --format '{{.Names}}' | sed -n 2p)
[ -n "$OTHER" ] && podman exec "$C" node -e "fetch('http://$(podman inspect "$OTHER" --format '{{(index .NetworkSettings.Networks "aic-pi-internal").IPAddress}}'):3000').then(r=>console.log('peer',r.status),e=>console.log('peer',e.cause?.code||e.message))"
```

Expected: external `BLOCKED` (ENETUNREACH or EAI_AGAIN), app `200`, peer connection refused/timeout (nothing listens in the peer; record the exact result, same-network reachability of peers is not blocked by the engine).

Guard refuses a non-internal network:

```bash
podman network create aic-pi-open
PI_RUNNER_NETWORK=aic-pi-open PI_RUNNER_ALLOW_OPEN_EGRESS=false npx tsx scripts/smoke-pi-runner.ts   # expect FAIL on ensureNetwork: "not internal"
podman network rm aic-pi-open
```

- [ ] external blocked, app reachable, peer result recorded
- [ ] guard refuses the non-internal network, network removed afterwards

## 4. Orphan sweep owner scoping, WR-08 / SEC-05 (pending human)

Validates: D-017. Two app instances with different owners on one socket.

```bash
APP_INSTANCE_NAME=owner-a npm run dev -- --port 5173 &   # instance A, warm a container via its UI
APP_INSTANCE_NAME=owner-b npm run dev -- --port 5174 &   # instance B, warm another via its UI
podman ps --filter label=aic.tryitout --format '{{.Names}} {{.Label "aic.owner"}} {{.Label "aic.instance"}}'
# restart only instance B, then list again
```

Expected: after B restarts, A's container is still there (different owner); B's previous container (same owner, old instance id) is removed. Containers created before Phase 9 (no `aic.owner` label) survive. Stop both dev servers afterwards.

- [ ] A's container survives B restart
- [ ] B's stale container swept on B restart

## 5. Hostile output archive live (pending human)

Validates: SEC-07..SEC-11 (D-018). In a warm container:

```bash
C=$(podman ps --filter label=aic.tryitout --format '{{.Names}}' | head -1)
J=/work/smoke-hostile; podman exec "$C" sh -c "mkdir -p $J/output && ln -s /etc/passwd $J/output/link && head -c 300M /dev/zero > $J/output/big.bin 2>/dev/null; echo hi > $J/output/__proto__"
ps -o rss= -p "$(pgrep -f 'vite|node build' | head -1)"      # note RSS
# trigger the getFiles path for $J/output: run a job, or temporarily point a tsx snippet at createDockerodeRuntime(...).getFiles("$C","$J/output",{maxBytes:20971520,maxFiles:200})
ps -o rss= -p "$(pgrep -f 'vite|node build' | head -1)"      # RSS again
ss -xp | grep -c podman.sock                                  # stream count before/after
```

Expected: the symlink is skipped, the oversized entry is rejected as `output exceeds ... bytes` (the 256 MB work tmpfs may refuse 300 MB first; either outcome is fine), `__proto__` is kept as an ordinary name, app RSS stays roughly flat (no 300 MB jump), and the socket connection count returns to its earlier value (no leaked archive stream).

- [ ] symlink skipped, big file rejected
- [ ] RSS flat, no leaked stream

## 6. Hung engine live (pending human)

Validates: 09-02 chaos fixes (warm bound, REMOVE_TIMEOUT_MS 15 s, ENGINE_CALL_TIMEOUT_MS 60 s).

```bash
PID=$(pgrep -u "$USER" -f 'podman system service' | head -1)
kill -STOP "$PID"       # pause the engine, then open a runnable agent page / start a job
sleep 100               # warm wait (PI_RUNNER_WARM_WAIT_MS=90000 default)
kill -CONT "$PID"
podman ps -a --filter label=aic.tryitout --format '{{.Names}} {{.Status}}'
```

Expected: the UI shows a bounded failure (warm timeout or "container engine error", never an endless spinner); after `kill -CONT` the app recovers and a new job works; no `aic-pi-*` container is left that no lease owns.

- [ ] bounded failure while paused
- [ ] recovery and no leaked container after resume

## 7. Budget enforcement with a real model (pending human, needs OPENAI_API_KEY, user-run only)

Validates: D-016 (reserve-then-reconcile) and 09-03 usage sanitising. This spends real money; use a small model and tiny budgets.

```bash
PI_JOB_TOKEN_BUDGET=3000 PI_JOB_REQUEST_BUDGET=5 npm run dev -- --host
```

Run a job with a long task. Expected: the job ends `failed` with `job token budget exceeded (N tokens, M requests)`, and the provider dashboard shows spend no more than the budget plus one capped completion (4096 tokens).

- [ ] job stopped with the budget message
- [ ] dashboard spend within budget + one capped completion: ____

## 8. Reaper timing live (pending human)

Validates: chaos.reaper tests against real wall-clock timing.

```bash
PI_RUNNER_IDLE_TTL_MS=15000 npm run dev -- --host      # warm one container via the UI, then:
podman ps --filter label=aic.tryitout --format '{{.Names}}'; sleep 16; sleep 30; podman ps --filter label=aic.tryitout --format '{{.Names}}'
```

Expected: gone within about 16 s plus up to one reaper tick (30 s). Stalled warm: `kill -STOP` the engine mid-create (item 6) and confirm the stuck lease frees its slot within 2x `PI_RUNNER_WARM_WAIT_MS`.

- [ ] idle container removed after TTL plus at most one tick
- [ ] stalled warm freed within 2x warm wait

## 9. Cleanup after compose down (pending human)

```bash
podman-compose down
podman ps -a --filter label=aic.tryitout
podman network ls | grep aic-pi-internal
podman volume ls | grep -E 'tryout-sessions|auth-data'
```

Expected: no containers with the label; `aic-pi-internal` is removed with the stack (the compose file declares it); volumes stay (they hold data).

- [ ] no leftover containers, network gone

## Known accepted risks

Copied from `09-SECURITY-REVIEW.md` so they are reviewed in one place:

- SEC-06 client limit: the per-client key depends on adapter `ADDRESS_HEADER`/XFF configuration; trust is deployment configuration; the table is bounded (10k).
- SEC-15 / IN-03: Pi containers can reach the whole app on the internal network `aic-pi-internal` (deliberate D-19 second-network design; an nginx relay exposing only `/api/llm/` is the documented alternative).
- Network verification is cached for the process lifetime: a network later recreated non-internal is not noticed until restart.
- The per-lease token is visible in container Env to anyone with engine socket access (same trust domain).
- Bearer parsing is stricter than RFC (case-sensitive `Bearer `); stricter is safe.
- Operator note: set `APP_INSTANCE_NAME` in compose deployments, or the hostname fallback changes with every container recreation and leftovers are not swept.
- From Phase 9 chaos work: while an evicted lease's container is still being removed the engine can briefly hold more than `PI_RUNNER_MAX_CONTAINERS` containers (cap counts leases); a hung `remove` is abandoned after 15 s and left to the orphan sweep.
