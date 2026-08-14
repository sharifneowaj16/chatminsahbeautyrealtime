# ADR-026 — Distributed reliability governance for Meta operations

- **Status:** Accepted
- **Date:** 2026-07-22
- **Phase:** 26

## Context

Phase 25 made outbound Meta commands durable, but durability alone does not protect the provider, Redis, PostgreSQL or critical workloads from retry storms. A provider outage, throttling response, slow dependency or queue surge can otherwise cause every worker to retry independently, exhaust capacity and starve Purchase, lead and customer-reply operations.

## Decision

1. Every governed call is scoped by environment, connection, capability, operation kind and optional asset. Circuit, rate-limit and cache keys are derived only from validated scoped identifiers.
2. Work is classified into exact priorities `P0` through `P4`. Queue admission reserves capacity for critical priorities so lower-priority saturation cannot starve P0/P1 work.
3. Circuit state is `CLOSED`, `OPEN` or `HALF_OPEN`. State is stored behind a distributed contract; the Redis adapter uses token-fenced atomic Lua scripts so only one half-open probe may execute across workers.
4. Retry policy is centralized. It combines normalized error classification, idempotency, unknown-outcome metadata, priority-specific attempt budgets, exponential backoff with jitter, provider `Retry-After`, operation expiry and remaining deadline.
5. A non-idempotent request whose outcome may be unknown is never retried blindly. It is routed to reconciliation. Retry/defer decisions are persisted through the Phase 25 operation/outbox store rather than relying on in-process sleeping.
6. Rate limits are enforced at app, capability and optional asset scopes. Meta usage headers and `Retry-After` can establish a distributed cooldown and may force a circuit open.
7. Reads may use bounded stale cache only after the fresh window expires and a governed provider attempt fails. Writes never use cache and are durably deferred when admission, rate limit or circuit policy blocks execution.
8. Every operation has a bounded expiry. Work that cannot start before expiry is terminally dead-lettered instead of circulating indefinitely.
9. PostgreSQL remains the durable source of pending work; BullMQ performs one delivery attempt per job. Phase 26 does not move durable retry ownership into Redis.
10. Existing capability producers are not cut over in this phase. Phases 28–31 adopt the reliability coordinator through their approved migrations.

## Consequences

- Provider outages are absorbed by one distributed circuit and durable defer schedule instead of a worker-local request storm.
- Critical operations retain reserved queue capacity while bulk/background work is rejected or deferred first.
- Redis is required for cross-worker coordination in production; the in-memory implementation is limited to focused tests and single-process development.
- Exact Redis failover, PostgreSQL migration, provider-throttle and production load evidence remain required before this phase can be marked complete.
