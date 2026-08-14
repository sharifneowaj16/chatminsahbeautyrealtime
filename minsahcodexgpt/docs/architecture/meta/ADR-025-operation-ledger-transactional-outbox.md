# ADR-025 — Immutable Meta operation ledger and transactional outbox

- **Status:** Accepted
- **Date:** 2026-07-22
- **Phase:** 25

## Context

A business transaction can commit while Redis or a Meta provider is unavailable. Direct enqueue after commit can lose work; direct provider calls inside the database transaction create long locks and unknown outcomes. Existing CAPI and social outboxes are capability-specific and do not provide one canonical command identity, payload version contract or append-only audit history.

## Decision

1. Every new Meta command is represented by `MetaOperation`, an immutable identity/scope/payload record with a mutable status projection.
2. Business mutation, operation insert, initial events and `MetaOutboxMessage` insert commit in one PostgreSQL transaction. Provider and Redis calls never occur inside that transaction.
3. `(environment, connectionKey, idempotencyKey)` is unique. A duplicate command returns the original operation/outbox and does not repeat the business mutation.
4. `MetaOperationEvent` is append-only. Database triggers reject update and delete; corrections are new events.
5. Operation identity, scope, payload, digest and replay linkage are database-protected immutable fields. Outbox routing and payload identity are also immutable.
6. Outbox dispatch is leased with `FOR UPDATE SKIP LOCKED`. Redis/BullMQ publication is at-least-once and uses `operationId` as stable message/job identity.
7. Publication success followed by acknowledgement loss is treated as ambiguous; the message remains leased and may be published again after lease expiry. Execution must therefore claim the operation and skip an already successful operation.
8. Payloads carry `type` and positive `schemaVersion`, have a deterministic SHA-256 digest, contain JSON-safe data only, and reject secret-like fields. Exact decoder registration is required.
9. Unknown/unsupported/malformed payload versions are quarantined rather than retried blindly.
10. Basic lease expiry, dead-letter and retryable/permanent execution states are Phase 25 foundations. Advanced retry classification, rate limits, circuit breakers and backpressure remain Phase 26.
11. Provider replay does not mutate or re-execute a historical record. A later replay creates a new operation linked by `replayOfOperationId`; controlled replay orchestration remains Phase 27.
12. Existing capability-specific producers are not cut over in Phase 25. Phases 28–31 migrate them behind their approved flags.

## Consequences

- PostgreSQL is the durable source of pending work; Redis can be rebuilt by redispatching due outbox rows.
- Duplicate queue delivery is expected and safe when workers use the operation execution claim.
- Payload decoder removals become explicit operational changes because unsupported versions quarantine.
- Runtime PostgreSQL apply/recovery, real Redis outage and worker-crash evidence are still required before completion.
