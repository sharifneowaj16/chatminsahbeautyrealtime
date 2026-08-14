# Phase 26 evidence — circuit breakers, retry, rate limits, cache, backpressure and deadlines

**Status:** `READY_FOR_GENERATION`

## Implemented source boundary

- Environment/connection/capability/operation/asset-scoped reliability keys with validated identifiers.
- Exact `P0`–`P4` priorities, reserved queue admission and priority-ordered durable outbox claiming.
- Distributed circuit-breaker contract with closed/open/half-open lifecycle and token-fenced single-probe Redis Lua implementation.
- Central retry classifier with priority budgets, exponential jitter, provider `Retry-After`, deadline/expiry checks and unknown-outcome reconciliation.
- Distributed app/capability/asset token buckets and Meta usage-header cooldown parsing.
- Deadline budget, combined cancellation and bounded provider timeout.
- Fresh/stale read cache contract with bounded stale fallback; writes use durable defer only.
- Phase 25 dispatcher/execution integration for queue backpressure, rate-limit/circuit defer, expiry and dead-letter events.
- Prisma schema plus forward/recovery SQL for operation priority, expiry and next-attempt projection.
- Graph safe-header normalization for `Retry-After` and Meta usage headers.
- Lazy server-only Redis adapter; provider-neutral reliability contracts remain safe through the public MetaPlatform entry.
- No Phase 28–31 capability producer was cut over.

## Fresh source verification

```text
Focused strict TypeScript compilation — reliability/operation core PASS
Focused strict TypeScript compilation — Prisma/BullMQ/Redis server boundaries PASS
Dependency-independent compiled runtime suite — 9/9 PASS
Phase 26 architecture audit — 124/124 PASS
Migration governance — 382/382 PASS (75 committed migrations)
Meta source inventory — 46/46 PASS (407 governed active paths across 22 capabilities)
Phase 19 inventory tests — 4/4 PASS
Phase 25 regression — 87/87 PASS
Phase 24 regression — 74/74 PASS
Phase 23 regression — 75/75 PASS
Phase 22 regression — 56/56 PASS
Phase 21 regression — 47/47 PASS
Phase 20 structural boundary — 81/81 PASS; 2 import smoke checks dependency-blocked
Phase 7 connection regression — 52/52 PASS
Graph version policy — 18/18 PASS
Tracking/CAPI schema audit — 52/52 PASS
```

The focused runtime suite covers provider retry-after and jitter, unsafe unknown-outcome reconciliation, one distributed half-open probe, circuit recovery, provider cooldown, priority isolation, bounded stale fallback, P0-before-P4 dispatch, durable backpressure defer, retryable execution defer/recovery and expiry dead-lettering.

## Runtime gates still required

- Fresh Prisma Client generation.
- Apply and recover the Phase 26 migration on disposable PostgreSQL; verify priority ordering, immutability triggers, expiry transitions and concurrent `SKIP LOCKED` claims.
- Exact locked-dependency `tsx` test after clean `npm ci`; the install was attempted and failed with package-gateway HTTP `503` on `zod-validation-error-4.0.2.tgz`, leaving `tsx` incomplete. The repository test therefore stopped before assertions with `ERR_MODULE_NOT_FOUND`.
- Standard repository typecheck and production build.
- Live Redis failover and Lua fencing drill with multiple workers.
- Controlled Meta throttle/outage test proving one half-open probe, provider-header cooldown and no request storm.
- Production queue-load test proving P0/P1 reserved capacity and operation-expiry behavior.
