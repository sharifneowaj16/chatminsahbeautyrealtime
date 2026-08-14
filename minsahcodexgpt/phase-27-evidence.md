# Phase 27 evidence — workflows, concurrency, reconciliation and controlled replay

**Status:** `CODE_COMPLETE`  
**Evidence date:** 2026-07-23  
**Production/runtime state:** not `COMPLETE`; migration apply/recovery and live drills remain.

## Implemented source

- Versioned workflow definitions, ordered durable steps and optimistic concurrency.
- Explicit mutation guards: active exact fenced lease or audited administrative mutation.
- Monotonic fencing tokens. PostgreSQL release expires the lease row instead of deleting it; acquisition and validation use database `NOW()`.
- Lease heartbeat with abort/fail-closed behavior when renewal is lost.
- Transaction-bound provider command preparation: provider job and reconciliation record must both commit before the external provider callback runs.
- Separate immutable provider command identity for `EXECUTION` and `COMPENSATION`.
- Atomic terminal outcome commit for workflow, step, provider job and reconciliation.
- Interrupted execution or compensation is converted to `UNKNOWN`/`WAITING_RECONCILIATION`; the provider write is not blindly repeated.
- Reverse compensation with explicit `COMPENSATION_FAILED_RETRYABLE`; a terminal command identity cannot be silently reused for another provider attempt.
- Capability/operation/resolver-specific unknown-outcome reconciliation with independent lease heartbeat, terminal split-state repair and workflow resume.
- Controlled replay as three operations: request, authorized independent approval, then execute. Immutable request digest and exact expiry are revalidated before approval and execution.
- Rebuildable workflow projection from PostgreSQL-authoritative records.
- `meta-workflows` capability registration and fail-closed permission entry.
- Forward Phase 27 correction migration and reviewed pre-cutover recovery SQL; historical migrations were not modified.
- Repository rule and CI gate requiring every `schema.prisma` change to include a new timestamped `migration.sql` plus recovery/forward-fix evidence.

## Source and test evidence

- Focused Phase 27 TypeScript graph: **PASS** with a standalone strict TypeScript configuration matching project compiler semantics.
- Focused Phase 27 runtime suite: **13/13 PASS**.
- Tests cover durable provider preparation, purpose-aware idempotency, stale version/fencing rejection, execution interruption, compensation interruption, lost-response reconciliation, atomic split-state repair, reverse compensation, reconciliation claim leasing, separate replay approval/RBAC/digest/expiry, unknown-outcome replay block and durable projection rebuild.
- Phase 27 source audit: **89/89 PASS**.
- Phase 20 boundary: **83/83 PASS**, with two dependency-backed import smoke checks marked `BLOCKED` because the archive has no installed `tsx`.
- Phase 21–26 static audits: **47/47, 56/56, 75/75, 74/74, 87/87 and 124/124 PASS**.
- Migration governance: **392/392 PASS**.
- Frozen source inventory: **47/47 PASS**, covering **429 active paths**, **23 capabilities** and **15 realtime paths**.
- Phase 19 inventory tests: **4/4 PASS**.
- Prisma schema/migration pair audit: **PASS**; Git-based change-set enforcement runs in CI.
- Storefront search fallback audit after route-path correction: **17/17 PASS**.

## Prisma change policy

A change that touches `prisma/schema.prisma` is invalid unless the same change-set contains:

1. a new timestamped `prisma/migrations/<name>/migration.sql`;
2. `recovery.sql` or an explicit reviewed forward-fix strategy;
3. migration manifest/hash refresh where governed;
4. schema/migration pairing CI gate success.

Historical migration SQL must not be rewritten after it is part of the repository history.

## Runtime/release evidence still required

- Fresh Prisma Client generation in the normal dependency environment.
- Disposable PostgreSQL forward migration, recovery/forward-fix rehearsal and reapply.
- Multi-process PostgreSQL lock acquisition/heartbeat/takeover drill.
- Worker crash drill after durable preparation and during compensation against PostgreSQL.
- Live/test Meta lost-response reconciliation by stable provider evidence.
- Standard locked-dependency repository typecheck, lint, tests and Next.js build.
- Phase 28 feature-flagged producer cutover.

These items block `COMPLETE`, not Phase 27 source `CODE_COMPLETE`.
