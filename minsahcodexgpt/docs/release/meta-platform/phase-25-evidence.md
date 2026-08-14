# Phase 25 evidence — immutable operation ledger, transactional outbox and payload versioning

**Status:** `READY_FOR_GENERATION`

## Implemented source boundary

- Immutable canonical operation identity/scope/payload model with status projection and replay linkage.
- Append-only operation event contract and database triggers that reject event update/delete.
- Transactional operation service and PostgreSQL store: operation + business mutation + outbox commit together; duplicate idempotency returns the original record without repeating the mutation, while mismatched payload/operation reuse fails closed.
- Leased `FOR UPDATE SKIP LOCKED` outbox claiming, at-least-once publication acknowledgement, release/dead-letter and quarantine paths.
- Stable operation ID queue identity and execution lease/idempotency contract for duplicate delivery and worker-crash recovery.
- Versioned payload codec registry, deterministic digest, JSON/size validation and secret-like field rejection.
- Poison-message quarantine and operational runbook.
- BullMQ publisher adapter with one queue attempt; durable retry remains in PostgreSQL.
- Prisma schema plus forward and recovery SQL for `MetaOperation`, `MetaOperationEvent` and `MetaOutboxMessage`.
- No existing Meta capability producer was cut over; migrations remain Phases 28–31.

## Fresh source verification

```text
Focused strict TypeScript compilation — core/tests PASS
Focused strict TypeScript compilation — Prisma store PASS
Focused strict TypeScript compilation — BullMQ publisher boundary PASS
Dependency-independent compiled runtime suite — 9/9 PASS
Phase 25 architecture audit — 87/87 PASS
Migration governance — 377/377 PASS (74 committed migrations)
Meta source inventory — 45/45 PASS (389 governed active paths)
Phase 19 inventory tests — 4/4 PASS
Phase 24 regression — 74/74 PASS
Phase 23 regression — 75/75 PASS
Phase 22 regression — 56/56 PASS
Phase 21 regression — 47/47 PASS
Phase 7 connection regression — 52/52 PASS
Graph version policy — 18/18 PASS
Tracking/CAPI schema audit — 52/52 PASS
```

The runtime suite covers deterministic payload digest and secret rejection, atomic rollback, duplicate idempotency, conflicting-key rejection, Redis outage deferral, unsupported-version quarantine, acknowledgement-loss redispatch identity, worker lease recovery and duplicate execution suppression.

## Runtime gates still required

- Fresh Prisma Client generation.
- Apply and recover the Phase 25 migration on disposable PostgreSQL; verify triggers, constraints, `SKIP LOCKED` concurrency and rollback.
- Exact locked-dependency `tsx` test execution after clean `npm ci`. The attempted repository command reached Node but was blocked before loading tests because package `tsx` is not installed (`ERR_MODULE_NOT_FOUND`); no assertion failure is being represented as a source failure.
- Standard repository typecheck and production build.
- Live Redis/BullMQ outage, publish-ack ambiguity and worker-crash drills.
- First controlled capability producer cutover in Phase 28; Phase 25 makes no production traffic claim.
