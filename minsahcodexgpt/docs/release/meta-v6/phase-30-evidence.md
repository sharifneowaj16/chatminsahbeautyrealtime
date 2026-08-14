# Phase 30 evidence — Catalog, feeds, product items, product sets and commerce migration

## Status

`CODE_COMPLETE` for repository source, schema/migration pair and dependency-independent verification scope. Production `COMPLETE` is not claimed.

## Implemented source evidence

- Unified Business SDK transport owns catalog, product item batch, feed and product-set provider operations; unified Graph HTTP owns diagnostics and batch polling.
- Compatibility wrappers, diagnostics and workers contain no direct SDK/token/legacy Graph client access.
- Canonical SKU identity, mapper, semantic validation, sale/availability/variant behavior and payload hashes remain authoritative.
- Normal sync submits UPDATE requests only and reports `submittedDeletes: 0`.
- Deletions require an immutable full-list dry-run plan, exact independent `CRITICAL` approval, queue identity, live digest revalidation, catalog lock and optional separate emergency override.
- Partial outcomes reconcile by retailer ID/provider index. Only known retryable UPDATE failures are bounded-retry candidates; DELETE failures never auto-retry.
- Feed audit metadata excludes raw/signed URLs.
- Prisma migration adds immutable delete-plan state and item retry lineage, with reviewed pre-consumer recovery SQL.

## Fresh local command evidence — 2026-07-23

```text
Phase 30 dependency-independent runtime tests: 7/7 PASS
Phase 30 changed TypeScript syntax: 23/23 PASS
Global TypeScript filtered to Phase 30 paths: 0 non-dependency diagnostics
```

Phase 30 migration audit: 36/36 PASS
Inherited Phase 2 catalog audit: 20/20 PASS
Catalog semantic audit: 23/23 PASS
Inherited Phase 5 durable-jobs audit: 43/43 PASS
Inherited Phase 10 diagnostics audit: 40/40 PASS
Inherited Phase 12 product-set audit: 51/51 PASS
Phase 26 reliability audit: 124/124 PASS
Phase 27 workflows/reconciliation/replay audit: 89/89 PASS
Phase 28 connection/CAPI audit: 86/86 PASS
Phase 29 Ads/Audiences audit: 28/28 PASS
MetaPlatform boundary audit: 83/83 PASS; 2 dependency-backed import probes BLOCKED because `tsx` is absent
Admin API security audit: PASS; 98 routes scanned
Prisma schema/migration pair audit: PASS for archive scope; Git change-set enforcement remains CI-owned
Migration governance: 397/397 PASS
Meta source inventory: 47/47 PASS; 470 active paths, 23 capabilities, 15 realtime paths
Security baseline comparison: Phase 29 = 23 inherited findings; Phase 30 = 23; added 0, resolved 0

## Runtime evidence still required

1. Fresh locked dependencies and generated Prisma client.
2. Disposable PostgreSQL apply, constraint/trigger inspection, recovery and reapply.
3. Shadow catalog/item/product-set/diagnostics comparison on owned assets.
4. Test-catalog update/feed/product-set writes and provider before/after evidence.
5. Sale-window, stock/backorder and variant parity against provider state.
6. Real partial item failure, bounded retry, timeout and non-terminal batch polling.
7. Independent approval, stale-plan denial, mass-delete override denial/allow window and failed-delete no-auto-retry drill.
8. Kill-switch and read/write rollback evidence.
9. Standard lint, typecheck, build and release workflow with dependencies installed.
