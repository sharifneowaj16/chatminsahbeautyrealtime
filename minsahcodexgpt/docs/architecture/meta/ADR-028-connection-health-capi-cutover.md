# ADR-028 — Connection health and CAPI cutover through MetaPlatform

- **Status:** Accepted for source implementation; production cutover requires runtime evidence.
- **Date:** 2026-07-23
- **Phase:** 28

## Context

Connection/token health and CAPI delivery were implemented through legacy modules with direct environment-token access and duplicated provider boundaries. CAPI already had a durable PostgreSQL outbox, shared browser/server event IDs, consent controls and retry handling; replacing those durable domain guarantees would increase risk.

## Decision

1. Preserve the existing transactional CAPI outbox as the authoritative producer and retry ledger.
2. Route worker delivery through a Phase 28 migration facade. The facade selects exactly one transport for a stable `event_id`: legacy, platform test-event, deterministic platform canary or full platform.
3. Resolve CAPI credentials only inside the MetaPlatform server credential provider and Business SDK transport. API routes never require a live token before committing the outbox event.
4. Move connection health behind a compatibility facade supporting legacy, shadow and platform modes. Shadow mode compares normalized results but returns/persists the legacy result, so it cannot alter production readiness state before review.
5. Require explicit flags to disable legacy paths. Enabling the unified path and deleting the fallback are separate decisions.
6. Persist transport, cutover mode, Graph/SDK version and credential-version metadata with delivery evidence.
7. Keep SDK loading lazy. Importing a route or cutover policy must not load or initialize the provider SDK.

## Cutover order

```text
Connection: LEGACY -> SHADOW -> PLATFORM -> LEGACY_DISABLED
CAPI: LEGACY -> PLATFORM_TEST -> PLATFORM_CANARY -> PLATFORM -> LEGACY_DISABLED
```

Canary selection is deterministic from the canonical Meta `event_id`; retries cannot switch transport.

## Consequences

- Durable event production remains independent of provider credential availability.
- No shadow CAPI write is permitted, avoiding duplicate provider mutations.
- Token rotation produces a new credential version and therefore a new SDK client through the Phase 22 client registry.
- Production completion still requires test-event evidence, canary observations, Redis outage/recovery, duplicate Purchase, old-event, token-rotation and circuit recovery drills.

## Rollback

Before legacy disable, set all Phase 28 write/read flags false to return to legacy execution. After legacy disable, rollback requires an explicit reviewed configuration change; no automatic cross-token or cross-transport fallback is allowed.
