# Phase 31 Layer 6 — Realtime Bridge Layer

## Result

**Source/offline Layer gate: PASS**  
**Dependency-backed/live runtime evidence: BLOCKED/PENDING**

Layer 6 replaces default realtime Facebook ownership with a normalized bridge. The main application remains authoritative for provider transport, persistence, queue/retry/dead-letter, media validation and permission health. Realtime consumes safe normalized events and projects them to authenticated WebSocket clients.

## Final remediation applied

- Restored Second Brain v4 fast workflow, execution manifest, fail-closed advancement and provider-specific bootstrap files.
- Made Layer 5 regression tests forward-compatible after advancement beyond Item 6.1.
- Converted Item 6.1 from an obsolete defect-presence test into an immutable historical evidence audit.
- Removed Redis network connections from module-import time; subscriber and publisher clients are now created lazily on first use and closed safely.
- Added Layer 6 release tests for lazy Redis lifecycle and Second Brain v4 preservation.
- Preserved Prisma schema unchanged; no migration was created.

## Implementation coverage

### 6.2 Normalized event bridge

- Versioned `social-updates` contract with stable IDs, correlation, ordering and safe reason/state codes.
- Runtime parsing rejects raw text, names, secrets, tokens, raw payloads and external/signed URLs.
- Redis event storage handles event-ID dedupe, ordering, bounded history and cursor recovery.
- WebSocket authentication uses protocol tokens; reconnect gaps emit `REFETCH_REQUIRED`.

### 6.3 Graph isolation

- Bridge mode is default.
- Legacy provider code is dynamically loaded only under explicit rollback settings.
- Realtime proxies webhook delivery to the main application through body-bound HMAC.
- Main application separately verifies Meta signatures and owns shared Graph transport/health.

### 6.4 Retry/dead-letter alignment

- Realtime-local retry/replay/media/sync workers are default-off.
- Bridge mode disables local mutation and replay operations.
- Main-app BullMQ/job audit owns retry, dead-letter, replay approval and deterministic handoff identity.

### 6.5 Media/token health

- Attachment download is deferred to the shared validation pipeline.
- Only safe attachment state transitions are published after persistence.
- Main-app connection/Page health owns revoked-token and permission behavior.

## Executed gates

| Gate | Result |
|---|---|
| Layer 5 cumulative regression | PASS; Layer 5.12 audit 32/32 |
| Item 6.1 historical evidence gate | 6/6 tests; 14/14 audit PASS |
| Item 6.2 | 5/5 tests; 15/15 audit PASS |
| Item 6.3 | 3/3 tests; 10/10 audit PASS |
| Item 6.4 | 4/4 tests; 12/12 audit PASS |
| Item 6.5 | 4/4 tests; 12/12 audit PASS |
| Realtime offline normalized-bridge typecheck | PASS |
| Realtime offline normalized bridge build | PASS |
| Layer 6.6 release tests | 7/7 PASS |
| Layer 6.6 release audit | 22/22 PASS |
| Second Brain v4 audit | 135/135 PASS |
| Prisma schema | Unchanged; `d3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce` |

## Runtime blocker honesty

A fresh realtime `npm ci` was attempted. The configured package gateway returned repeated HTTP 503 responses, so dependency-backed full service typecheck/build and runtime startup were not completed. No live PostgreSQL, Redis/BullMQ, WebSocket session, Meta provider, ClamAV or MinIO validation is claimed.

## Checkpoint

Source/offline Layer 6 gate is sealed. Exact next item: **7.1 — Admin/API data contract audit**.
