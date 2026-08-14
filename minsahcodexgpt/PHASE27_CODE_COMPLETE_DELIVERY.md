# Minsah Beauty — Phase 27 Code-Complete Delivery

**Delivery date:** 2026-07-23 (Asia/Dhaka)  
**Phase status:** `CODE_COMPLETE`  
**Production status:** not `COMPLETE`; database, multi-process, provider and full dependency/build evidence remains.

## Scope completed

This delivery remediates the architecture and Phase 27 audit findings in the uploaded project while keeping Phase 28 producer cutover blocked.

### Concurrency and fencing

- PostgreSQL lock release now expires the lease row rather than deleting the persisted fencing counter.
- Reacquisition increments the same scope's token atomically, preserving monotonic fencing across release/takeover.
- Acquire, renew and validation decisions use PostgreSQL `NOW()` rather than worker clock time.
- Lease heartbeat aborts/fails closed when renewal is lost.
- In-memory lock behavior follows the same monotonic-token contract.

### Durable workflow/provider execution

- Provider job and reconciliation records are prepared together in a database transaction before any external provider mutation starts.
- `EXECUTION` and `COMPENSATION` use separate immutable command identities.
- Workflow, step, provider job and reconciliation terminal states commit atomically.
- A worker interruption after dispatch does not blindly repeat a provider write; it enters `UNKNOWN` / `WAITING_RECONCILIATION`.
- Compensation interruption follows the same durable unknown-outcome path and cannot falsely finalize the workflow.
- Explicit workflow transition and mutation guards reject stale version/fencing mutations.

### Reconciliation and replay

- Reconciliation has its own fenced lease and heartbeat.
- Capability/operation/resolver-specific verification resolves unknown outcomes and repairs prior split state atomically.
- Workflow execution resumes only after durable reconciliation finalization.
- Controlled replay is split into request, independent authorized approval and execution.
- Self-approval is denied; immutable request digest, exact expiry and unresolved-unknown restrictions are revalidated.
- Replay creates a new linked operation rather than re-executing an old provider event.

### Architecture boundary and capability governance

- `meta-workflows` is registered in the public capability type, registry and fail-closed permission matrix.
- Public MetaPlatform type exports no longer pull Node runtime code into the client-safe graph.
- Source inventory and generated architecture views were refreshed.

### Prisma governance requested by the owner

Any change touching `prisma/schema.prisma` is now invalid unless the same change-set includes:

1. a new timestamped `prisma/migrations/<timestamp>_<name>/migration.sql`;
2. `recovery.sql` or an explicitly reviewed forward-fix strategy;
3. migration manifest/hash refresh where governed;
4. the schema/migration pairing CI gate.

Historical migration SQL must not be rewritten. A new forward correction migration was added:

- `prisma/migrations/20260723033000_harden_meta_phase27_workflows/migration.sql`
- `prisma/migrations/20260723033000_harden_meta_phase27_workflows/recovery.sql`

The policy is documented in `rules.md`, implemented by `scripts/prisma-schema-migration-pair-audit.mjs`, exposed through `npm run qa:prisma-schema-migration-pair`, and enforced in `.github/workflows/meta-v6-release.yml`.

## Final verification from this working copy

| Gate | Result |
|---|---:|
| Phase 27 focused runtime tests | **13/13 PASS** |
| Phase 27 focused TypeScript graph | **PASS** |
| Phase 27 source audit | **89/89 PASS** |
| Phase 26 audit | **124/124 PASS** |
| Phase 25 audit | **87/87 PASS** |
| Phase 24 audit | **74/74 PASS** |
| Phase 23 audit | **75/75 PASS** |
| Phase 22 audit | **56/56 PASS** |
| Phase 21 audit | **47/47 PASS** |
| Phase 20 boundary audit | **83/83 PASS; 2 dependency-backed smoke checks BLOCKED** |
| Migration governance | **392/392 PASS** |
| Meta source inventory | **47/47 PASS — 429 paths, 23 capabilities, 15 realtime paths** |
| Phase 19 inventory tests | **4/4 PASS** |
| Prisma schema/migration pair audit | **PASS** |
| Search fallback/path regression audit | **17/17 PASS** |
| Changed audit scripts syntax check | **PASS** |

The two Phase 20 blocked smoke checks require the repository's locked `tsx` dependency. They are not architecture assertion failures.

## Evidence not claimed in this environment

- Fresh Prisma Client generation.
- Disposable PostgreSQL migration/apply/recovery/reapply drill.
- Multi-process PostgreSQL fencing/takeover drill.
- Provider sandbox lost-response reconciliation.
- Full locked-dependency typecheck, lint, repository tests and terminal Next.js production build.

These are runtime/release evidence for moving from `CODE_COMPLETE` to `COMPLETE`; they do not change the delivered Phase 27 source coding verdict.

## Cutover rule

Phase 28 remains `BLOCKED`. Do not enable Phase 27 provider-mutating workflows or begin Phase 28 producer cutover until the outstanding runtime evidence is attached.
