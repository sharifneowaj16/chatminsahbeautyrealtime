# Meta v6 Phase 02 Evidence — Catalog Domain Model, Field Mapping & Lifecycle

**Date:** 17 July 2026  
**Project snapshot:** `minsahbeauty_meta_v6_phase02_loop_update.zip`  
**Source specification:** `docs/spec/MinsahBeauty_Meta_AZ_Final_Spec_v6_FULL.md`  
**Manifest status:** `READY_FOR_GENERATION`  
**Implementation status:** Code, migration, semantic fixtures, direct TypeScript compilation and repository tests pass. The committed Prisma client snapshot still requires regeneration in an environment that can reach `binaries.prisma.sh`.

## Implemented scope

- Added a canonical `CanonicalCatalogItem` domain model independent of Meta endpoint shapes.
- Split Items Batch write serialization, CSV feed serialization and ProductItem read fields into separate adapters.
- Replaced legacy Items Batch write fields with `quantity_to_sell_on_facebook`, `link`, `image_link` and `item_group_id`.
- Normalized catalog money as `1250.00 BDT` rather than minor-unit integers plus a separate currency field.
- Added availability state handling for standard, preorder, discontinued, non-tracked stock, reserved stock and zero-stock backorder.
- Added future, active, expired and invalid sale-window handling; future sales are submitted immediately with `sale_price_effective_date`.
- Added variant lifecycle, independent sale, preorder, condition, GTIN/MPN/barcode and backorder override fields.
- Added canonical SHA-256 payload fingerprints and unchanged-item skipping.
- Upgraded managed item state with typed statuses and per-batch item status records.
- Preserved invalid current items and unknown/manual Meta items from automatic stale deletion.
- Added deleted/inactive variant tombstone reconciliation through the project-owned managed registry.
- Added CSV/Items Batch semantic parity tests.
- Added safe product-condition normalization for future generated Prisma enum types.

## Main changed files

```text
lib/meta/catalog/domain/*
lib/meta/catalog/adapters/*
lib/meta/catalog/mapper.ts
lib/meta/catalog/validator.ts
lib/meta/catalog/fingerprint.ts
lib/meta-business/catalog.ts
lib/products/product-condition.ts
prisma/schema.prisma
prisma/migrations/20260717010000_meta_v6_phase2_catalog_domain/migration.sql
tests/meta-v6/phase2-catalog-domain.test.ts
scripts/meta-v6-phase2-catalog-audit.mjs
scripts/meta-catalog-semantic-audit.mjs
scripts/meta-v6-gap-audit.mjs
components/auth/AuthShell.tsx
```

## Schema and migration evidence

Added enums:

```text
ProductAvailabilityMode
ProductCondition
MetaCatalogItemStatus
MetaCatalogBatchStatus
```

Added/expanded models:

```text
Product catalog category/identifier/preorder fields
ProductVariant lifecycle, sale, inventory-policy and identifier fields
MetaCatalogSyncItem canonical hash and typed lifecycle state
MetaCatalogBatch typed status
MetaCatalogBatchItem per-item final state registry
```

Migration behavior:

- Existing `preOrderOption=true` products backfill to `PREORDER`.
- Existing product condition strings safely normalize to `NEW`, `REFURBISHED` or `USED`; unknown historical values become `NEW`.
- Existing managed catalog items backfill to `ACTIVE` with source identity and success timestamps.
- Existing batch status strings normalize to typed `SUBMITTED`, `SUCCESS` or `FAILED` values.

## Automated gate evidence

### Phase 2 domain tests

```text
8 tests
8 passed
0 failed
```

Covers:

- zero-stock backorder
- future sale
- expired sale
- current Items Batch fields and formatted money
- variant sale/lifecycle/identifier/attribute overrides
- inactive/deleted variant tombstone eligibility
- CSV/Items Batch semantic parity
- stable canonical hash and inventory change detection

### Phase 2 static audit

```text
20 checks
20 passed
0 failed
```

### Catalog semantic audit

```text
23 checks
23 passed
0 failed
```

### Global v6 blocker audit movement

```text
Before Phase 2: 2/14 passed
After Phase 2:  7/14 passed
```

Newly passing blockers:

```text
A1 Items Batch endpoint-specific write fields
A2 zero-stock backorder availability
A3 future sale effective range
A7 ProductVariant lifecycle/sale/availability/identifiers
A12 canonical presentation and merchandising fields
```

`A13` remains intentionally open because it spans later phases and requires lifecycle enums for jobs, outbox events, leads, connections, webhooks and approvals—not only catalog batches.

### Existing Meta platform audit

```text
22/22 passed
```

### Direct TypeScript compiler

```text
npx tsc --noEmit --pretty false
exit 0
```

### Targeted ESLint

```text
0 errors
```

### Repository test suite

```text
16 tests
16 passed
0 failed
```

The previous `AuthShell.tsx` shell-ownership conflict was fixed by retaining the accessible main landmark through `role="main"` without creating a second storefront `<main>` owner.

### Dependency audit

```text
631 packages installed
0 vulnerabilities
```

## Prisma generation environment gate

Attempts:

```text
npm exec prisma generate
PRISMA_GENERATE_NO_ENGINE=1 npm exec prisma generate
npx prisma validate
npx prisma format --schema prisma/schema.prisma
```

All were blocked before schema processing because this execution environment could not resolve:

```text
binaries.prisma.sh
getaddrinfo EAI_AGAIN
```

The generated Prisma snapshot was not falsely stamped or manually represented as current. Run the following in the normal build environment with network access:

```bash
npm run db:generate
npm run typecheck
npm run build
```

## Acceptance criteria mapping

- [x] Legacy Items Batch write fields removed from the write adapter.
- [x] Backorder zero-stock maps to `available for order`.
- [x] Future sale includes price and effective range immediately.
- [x] Expired sale sends base price only.
- [x] Deleted/inactive variant leaves desired updates and creates a managed reconciliation DELETE when previously synced.
- [x] CSV and Items Batch parity fixture passes.
- [x] Unknown/manual Meta items are never selected for automatic deletion.
- [x] Every submitted item has a stable canonical hash and per-item submitted/final lifecycle state.
- [ ] Generated Prisma client refreshed and committed in a network-enabled environment.
- [ ] Disposable database migration deployment executed before production rollout.

## Forward deployment sequence

```bash
npm ci
npm run db:generate
npm run typecheck
npx prisma migrate deploy
npm run qa:meta-v6-phase1
npm run qa:meta-v6-phase2
npm run qa:meta-catalog-semantic
npm test
npm run build
```

## Rollback / forward-fix

The migration is forward-only. If application rollout must be paused after migration, deploy the previous application while leaving additive columns/tables/enums in place, then forward-fix the application. Do not drop catalog state tables before confirming no active batch poller references them.
