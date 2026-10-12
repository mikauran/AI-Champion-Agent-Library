# Phase 9 Security Review: Try It Out (Phase 8 code)

## Scope

`src/lib/server/tryitout/`: `llmProxy.ts`, `leaseManager.ts`, `runtimeDockerode.ts`, `runtime.ts`, `artifact.ts`, `piEvents.ts`, `service.ts`, `clientLimit.ts`. Includes the deferred Phase 8 findings WR-05, WR-08, WR-09, IN-01, IN-02, IN-04, IN-05 (IN-03 is an accepted risk).

## Method

Adversarial read of each file against the seven areas of 09-01-PLAN (lease tokens, proxy auth, budget, path/archive, network guard, sweep and client limit, JSONL parser). Fake runtime and mocked fetch only; no engine, no network.

## Findings

| ID | Area | Severity | File:line (pre-fix) | Issue | Disposition | Planned fix |
|----|------|----------|---------------------|-------|-------------|-------------|
| SEC-01 (WR-05a) | Budget | medium | llmProxy.ts:140-143 | No completion cap when `max_tokens`/`max_completion_tokens` is absent or non-numeric | open | Always send `max_tokens` capped at MAX_COMPLETION_TOKENS; drop non-numeric values |
| SEC-02 (WR-05b) | Budget | medium | llmProxy.ts:254-265 | Check-then-spend spans an await; concurrent requests all pass the token check | open | Reserve the capped completion before the await, reconcile after |
| SEC-03 (WR-05c) | Budget | medium | llmProxy.ts:194-224 | Aborted or usage-less streams record 0 tokens | open | Charge the reservation when no usage was observed |
| SEC-04 | Proxy | low | llmProxy.ts:144-150 | Client `stream_options` keys are spread through to upstream | open | Send only `{include_usage:true}` |
| SEC-05 (WR-08) | Sweep | medium | leaseManager.ts:290-294 | Sweep removes containers of every other instance on the same engine | open | `aic.owner` label from stable owner id; sweep only same owner |
| SEC-06 | Client limit | low | clientLimit.ts, routes via `getClientAddress()` | Per-client key depends on adapter ADDRESS_HEADER/XFF config; map is bounded (10k) | open | Accept, document |
| SEC-07 (WR-09a) | Archive | medium | runtimeDockerode.ts:582 | `collect(entry)` buffers the entry before the size check | open | Check `header.size` against remaining bytes first |
| SEC-08 (WR-09b) | Archive | medium | runtimeDockerode.ts:555-589 | Archive/extract streams not destroyed on early exit | open | try/finally destroy both |
| SEC-09 | Archive | low | runtimeDockerode.ts:561-566 | Non-file entries skipped but unbounded in number (time DoS) | open | Cap total entries |
| SEC-10 (IN-02) | Archive | low | runtimeDockerode.ts:557,587 | `__proto__` entry dropped by plain-object map | open | Own property via defineProperty |
| SEC-11 (IN-01) | Archive | low | runtimeDockerode.ts:412-430 | Unsafe staged path leaves `done` rejected, unhandled | open | Validate before creating pack |
| SEC-12 | Paths | low | runtime.ts:96-108 | `.` segments accepted (`a/./b`), comment claims they are rejected | open | Reject `.` segments |
| SEC-13 (IN-04) | Create opts | low | runtimeDockerode.ts:379 | No MemorySwap, swap can double memory | open | `MemorySwap = Memory` |
| SEC-14 (IN-05) | JSONL | low | piEvents.ts:44-65 | Line buffer unbounded | open | 1 MiB cap, drop to next newline |
| SEC-15 (IN-03) | Network | low | podman-compose.yml:36-39 | Pi can reach whole app on the internal network | open | Accepted, documented |

## No finding (evidence checked)

- Token entropy: `randomBytes(32)` base64url; storage by sha256 digest, lookup by Map plus `timingSafeEqual` (llmProxy.ts:65-114). No Math.random.
- Revocation on every terminal path: all of evict, expire, discard, reap, warm-timeout, stuck warming and shutdown go through `evictSync`, which calls `tokens.revoke` (leaseManager.ts:98-103); stage failure covered by existing test. Re-registering invalidates the old token.
- Token placement: only in container Env (`AIC_LLM_TOKEN`), never in labels, events, logs or error text. Residual: visible to anyone with engine socket access (accepted, same trust domain).
- A token only resolves to its own lease's active job (`activeJobs.get(auth.leaseId)`); a token with no job gets 429.
- Authorization variants: scheme match is case-sensitive "Bearer " and tokens are trimmed; anything else is 401. Stricter than RFC, safe. Accepted.
- Body cap enforced on actual streamed bytes, not only Content-Length (readCappedText).
- Upstream URL, model, store are server-controlled; `n`, `logprobs`, `user`, `metadata` and model override are dropped by the whitelist (existing test).
- Upstream error bodies are not leaked (WR-06 verified).
- Network guard: `verifyNetwork` runs before every create (`beforeCreate`), failure refuses the create, network name and `allowOpenEgress` come from env only, not from request input. Residual: a successful verification is cached for the process lifetime (a network later recreated non-internal would not be noticed). Accepted, operator-level change.
- CapDrop ALL, no-new-privileges, no ports, no mounts, PidsLimit set.
- Path handling: output tar entries other than `file` (symlink, hardlink, device, fifo) are skipped and never followed; traversal, absolute, backslash, NUL and empty segments are rejected by `isSafeRelativePath`; zip names are re-validated in `zipFiles` with file-count and byte caps; `collect()` on the fs path skips symlinks.

## Accepted risks

- SEC-06: client key trust is deployment configuration (set ADDRESS_HEADER/XFF_DEPTH for the proxy in front).
- SEC-15 (IN-03): app reachable from the internal network; deliberate D-19 second-network design; nginx relay on `/api/llm/` is the documented alternative.
- Cached network verification, token visible in engine inspect, strict Bearer parsing (see above).

## Out of scope

Real engine behaviour (no containers run), upstream provider security, auth/login routes, Pi itself.
