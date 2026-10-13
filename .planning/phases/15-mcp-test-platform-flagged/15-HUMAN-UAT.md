# Phase 15 human UAT (MCP test platform)

Every item below is **pending human**. None of it was run unattended: no real FastMCP server, no container engine, no browser. All outputs go to `/tmp`; nothing here needs a real credential. Tick the box and note the outcome beside each item.

Run all commands from the repository root. Setup once:

```
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
mkdir -p db
SEARCH_EMBEDDINGS=off npm run db:push && npm run ingest
```

## 1. FastMCP pin check
Status: pending human
- [ ] Create a throwaway venv and see which version resolves:
  ```
  python3 -m venv /tmp/mcp-venv
  /tmp/mcp-venv/bin/pip install fastmcp httpx pyyaml
  /tmp/mcp-venv/bin/pip show fastmcp
  ```
- [ ] Confirm the current pin `fastmcp>=3.4,<4` and that `mcp.tool(fn)` registration works in that version. If not, update `FASTMCP_PIN` in `src/lib/mcpgen/emit/requirements.ts`, the same pin in `Containerfile.mcp-test-runner`, then regenerate goldens: `UPDATE_GOLDEN=1 npx vitest run src/lib/mcpgen` and review the diff.
- Expected: version 3.x resolves. Unverified: the pin has never been checked against the package index.

## 2. Generate a server, then score it through the CLI
Status: pending human
- [ ] Generate:
  ```
  npm run generate-mcp -- --adapter openapi src/lib/mcpgen/testing/fixtures/acme-openapi.yaml --out /tmp/acme-server
  ```
  Open `/tmp/acme-server/<server-dir>/README.generated.md` and note the base-URL and API-key variable names (`<BASE_URL_VAR>`, `<API_KEY_VAR>`).
- [ ] Install the generated requirements and score (the platform runs the server as a real process here, hence `--allow-local-exec`):
  ```
  /tmp/mcp-venv/bin/pip install -r /tmp/acme-server/<server-dir>/requirements.txt
  npm run mcp-test -- --subject cmd:"/tmp/mcp-venv/bin/python /tmp/acme-server/<server-dir>/server.py" --env-base-url <BASE_URL_VAR> --env-api-key <API_KEY_VAR> --case T2-CATALOG-API --reruns 3 --allow-local-exec --out /tmp/report.json
  ```
- Expected: protocol or banner surprises are likely (stdout noise, protocol version); they should show as findings, not crashes. Record the verdict and any `ERROR` cells (scorer problems) in the notes.

## 3. Build the runner image
Status: pending human
- [ ] Build and sanity-check:
  ```
  podman build -t localhost/mcp-test-runner:latest -f Containerfile.mcp-test-runner .
  podman run --rm --network none localhost/mcp-test-runner:latest node --version
  ```
- [ ] Check what the review fixes (CR-03, CR-04) assume about the image; none of this was built or run unattended:
  ```
  podman run --rm --network none localhost/mcp-test-runner:latest sh -c 'id -un && /node_modules/.bin/tsx --version && command -v tsx && python3 --version'
  ```
  Expected: user `node`, a tsx version, `tsx` on PATH (`/node_modules/.bin/tsx`), a Python 3 version. The platform creates the container as user `node` with no `/home/pi/agent` tmpfs and runs `/node_modules/.bin/tsx /work/src/lib/mcptest/driver.ts`.
- Expected: Node >= 22.19. The build installs Node and Python dependencies (network needed at build time only).
- [ ] Decide who owns the image tag and how the pins are updated (Question for Ville).

## 4. Container run through the platform
Status: pending human
- [ ] Start the app with the flag and the explicit runtime opt-in:
  ```
  MCP_TESTER=1 MCP_TESTER_RUNTIME=container npm run dev
  ```
- [ ] Open `/mcp-test`, run `generator:openapi` with a small case set, watch progress, download `report.json`.
- Expected: report runtime label is the container label; T4-PARTIAL-SPEC is dropped in container mode (documented limit).
- Code-side fix applied after the review (CR-03, D-241): the runner config for this image sets `runUser: 'node'` and `mountAgentDir: false`, so `buildCreateOptions` names the user the Containerfile ends with and mounts no `/home/pi/agent` tmpfs (the Pi image is unchanged). Still pending human: confirm the engine accepts the create options with `ReadonlyRootfs` plus the `/work` and `/tmp` tmpfs mounts, that the staged files are writable and readable by uid 1000, and that the driver writes `/work/out/report.json`.
- [ ] Confirm no `mcptest-*` container is left behind after a normal run, after a timeout and after a cancel (`podman ps -a --filter label=aic.mcptest=1`). Containers now also carry `aic.tryitout=1` and `aic.owner`, so the Try It Out orphan sweep removes leftovers from a previous process; confirm that sweep does not touch a run in flight.
- [ ] Open the downloaded report and check that `cases` contains every requested case with real checks (not zero checks): the driver tree now includes `golden.jsonl` and the csv fixtures, and an empty golden is an error.

## 5. Fake versus real comparison
Status: pending human
- [ ] Produce a fake report for the same case and compare cell by cell with the real report from item 2:
  ```
  npm run mcp-test -- --subject fake:good --case T2-CATALOG-API --out /tmp/report-fake.json
  ```
- Expected: differences are discrepancies in the fake model or the real server; list them. Fake variants are scorer fixtures, not predictions.

## 6. T2-CATALOG-DUMP real run
Status: pending human
- [ ] Generate a tabular server and run the dump case with a data path (the runner supplies the dump fixture path through the env for real-runtime cases; check the printed command):
  ```
  npm run generate-mcp -- --adapter tabular-catalog src/lib/mcpgen/testing/fixtures/<tabular-fixture> --out /tmp/acme-tabular
  npm run mcp-test -- --subject cmd:"/tmp/mcp-venv/bin/python /tmp/acme-tabular/<server-dir>/server.py" --case T2-CATALOG-DUMP --allow-local-exec --out /tmp/report-dump.json
  ```
- Expected: the case runs (no longer `PENDING_HUMAN`). Note whether the data-path variable name (`ACME_*_DATA_PATH`) reaches the server (Questions for Ville).

## 7. Browser and keyboard check
Status: pending human
- [ ] Flag off (`npm run dev` without `MCP_TESTER`): `/mcp-test` and `/api/mcp-test/runs` return 404; the Customize menu has no tester entry and looks unchanged.
- [ ] Flag on (`MCP_TESTER=1 npm run dev`): the Customize menu shows the entry; `/mcp-test` lists fake variants and generator samples plus a disabled "Real server" entry; start a `fake:good` run; progress updates; the verdict and matrix render; `report.json` downloads.
- [ ] Keyboard only: tab order, focus ring, menu entry reachable with arrow keys, Enter starts a run, results announced.
- [ ] Screen reader pass (NVDA or VoiceOver) of progress and result announcements; 200% zoom.
- Expected for `fake:good` over all cases: verdict FAIL at coverage 6/7 (the dump case is pending human; see D-168 in AUTONOMOUS-DECISIONS.md). Confirm this reads sensibly to you.

## 8. Auth hook and rate limit
Status: pending human
- [ ] With auth enabled in a deployment, confirm `/api/mcp-test/runs` (POST), `/api/mcp-test/runs/<id>` and `/api/mcp-test/runs/<id>/report` are covered by the global hook the same way as other `/api/*` routes: `curl -i -X POST http://localhost:5173/api/mcp-test/runs -H 'content-type: application/json' -d '{"subject":"fake:good"}'` without a session.
- [ ] Same check for `/api/mcp-generate` (Phase 14 caveat).
- [ ] Decide whether the 10 starts per client per 10 minutes limit is enough for production.

## 9. Optional questions for the study author
Status: pending human
- [ ] Is the Acme stand-in of the T2 case faithful enough to the study's case structure? (Never share or commit real data.)
- [ ] The real partner-profile text for T3-PROFILE-CONTRACT, if mapping is wanted; it must never be committed.
- [ ] Is the headline score formula (mean of Tier 2 and Tier 3 case pass-rates) what the study uses?

See "Questions for Ville" in `.planning/AUTONOMOUS-SUMMARY.md` for the consolidated list.
