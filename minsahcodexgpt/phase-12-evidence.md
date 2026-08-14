# Meta v6 Phase 12 Evidence — Product Sets, Categories & Merchandising Segmentation

Date: 18 July 2026  
State: `READY_FOR_GENERATION`  
Branch label: `artifact/meta-v6-phase-12`

## Scope delivered

Phase 12 now provides a deterministic product-set control chain:

```text
Canonical catalog items
→ allowlisted merchandising rule
→ canonical rule hash
→ exact sorted membership snapshot + hash
→ expiring preview token
→ approval-gated Meta ProductSet create/update
→ scheduled reconciliation
→ empty/broken incident and rollback evidence
```

Optional Meta Shop collection synchronization is not included in this engineering slice.

## Persistence and migration

Migration:

```text
prisma/migrations/20260718040000_meta_v6_phase12_product_sets/migration.sql
```

Added typed lifecycle enums:

- `MetaProductSetStatus`: `DRAFT`, `READY`, `SYNCING`, `ACTIVE`, `EMPTY`, `BROKEN`, `ARCHIVED`
- `MetaProductSetSyncStatus`: `NOT_SYNCED`, `SUBMITTED`, `SUCCEEDED`, `FAILED`

Added models:

- `MetaProductSet`
- `MetaProductSetVersion`
- `MetaProductSetPreview`
- `MetaProductSetMembership`

Every set has a catalog-scoped unique slug, monotonic rule version, canonical rule hash, exact membership hash/count, provider ID, preview expiry, sync lifecycle, creator/updater identity and redacted failure evidence. Exact membership rows are unique by product set and `retailerId`.

## Deterministic rule contract

`lib/meta/product-sets/rules.ts` implements:

- a fixed field allowlist for brand, product type, availability, price/sale, sale presence, custom labels, color, size, source type and retailer ID
- a fixed operator allowlist for equality, inequality, set membership, numeric bounds and text containment
- maximum 12 conditions and maximum 100 values for `IN`/`NOT_IN`
- whitespace/value normalization and fail-closed invalid combinations
- canonical condition sorting
- SHA-256 rule and membership hashes
- case-insensitive value deduplication that preserves the first canonical input
- deterministic membership ordering by `retailerId`
- exact Meta filter compilation through sorted `retailer_id.is_any`
- hard rejection of empty provider synchronization

The evaluator reuses canonical Phase 2 catalog items rather than creating another product identity or field-mapping path.

## Preview, parity and synchronization

A preview:

1. evaluates the current rule against canonical catalog data;
2. atomically replaces local membership rows;
3. stores rule version, rule hash, membership hash/count and a sampled ID list;
4. expires after 30 minutes;
5. marks zero-member sets `EMPTY` and raises a deduplicated incident.

Manual provider synchronization is guarded by all of the following before the SDK mutation:

- product set exists and is not archived;
- preview belongs to the same set;
- preview is unconsumed and unexpired;
- rule version/hash still match;
- persisted membership hash still matches;
- preview count equals the exact membership-row count;
- membership is non-empty;
- an exact two-person admin approval covers `{ productSetId, previewId }`.

Provider integration uses official `ProductCatalog` and `ProductSet` SDK objects. A successful mutation consumes the preview and records the provider ID plus terminal local success. A failed mutation stores only redacted error data and raises `PRODUCT_SET_BROKEN`.

Provider-side `product_count` parity still requires live Meta runtime evidence before release completion.

## Versioning, audit and rollback

Create, update, preview, sync and rollback routes are protected by Meta operations permissions and run through the immutable Meta admin action/audit service.

- Updates use optimistic `expectedVersion` claiming.
- Any rule update invalidates old membership and unconsumed previews.
- Rollback does not rewind history; it creates a new monotonic version from the selected historical rule.
- Manual Meta synchronization is a high-risk action requiring a separate approver and exact approved payload.
- Rule mutation and sync outcomes emit bounded low-cardinality metrics.

## Reconciliation and incidents

Added dedicated queue/worker contracts:

```text
queue: meta-product-sets
job: product-set-reconcile
schedule: every 6 hours
worker: workers/meta-product-sets.worker.ts
```

Reconciliation reevaluates each non-archived set through the same preview path. Auto-sync sets can proceed only after a fresh non-empty preview. Empty sets raise `PRODUCT_SET_EMPTY`; evaluation or provider failures raise `PRODUCT_SET_BROKEN`. Both use the Phase 10 incident dedupe/cooldown engine and link to the Product Sets operations tab.

Production Redis/worker scheduling and repeated-run idempotency evidence remain release holds.

## Operations Center

`/admin/meta` now includes a Product Sets tab with:

- deterministic single-condition rule builder foundation
- catalog membership count and rule/membership hash visibility
- latest preview count, expiry and consumed state
- preview action
- exact sync approval request
- approved sync execution
- monotonic rollback action
- lifecycle/sync badges and auto-sync visibility

The backend supports multi-condition `AND`/`OR` rules even though the initial UI builder creates one condition per new set. Rules can be extended through the audited API.

## Metrics

Added exact low-cardinality metrics:

```text
meta_product_set_rule_mutations_total
meta_product_set_sync_total
meta_product_set_members_total
```

## Automated evidence

```text
Phase 12 semantic tests                    14/14 passed
Phase 12 static audit                      51/51 passed
Global Meta v6 strict blocker gate          14/14 passed
Admin API security scan                 91 routes passed
Meta Business platform audit               22/22 passed
Phase 11 regression                  13/13 + 41/41 passed
Phase 10 regression                  12/12 + 40/40 passed
Phase 09 regression                  11/11 + 30/30 passed
Phase 08 regression                  14/14 + 68/68 passed
Repository npm test                         16/16 passed
Direct TypeScript compiler                       passed
Targeted ESLint                    0 errors / 0 warnings
```

## Master tracking gate status

`qa:master-tracking` remains **66 passed / 8 failed**. The failures are inherited historical documentation/runtime-proof checks for tracking lifecycle, product URL reporting, production QA, deploy-runtime health and TikTok documentation. They are not caused by the Phase 12 Product Sets implementation and are not represented as passing.

## Generation and migration hold

`npx prisma validate` was attempted and failed before schema-engine validation because the environment could not resolve the Prisma binary host:

```text
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

The generated-client freshness guard was not bypassed. Direct `npm run typecheck:ts` passes, but release generation/migration proof remains outstanding.

Before deployment:

```bash
npm ci
npm run db:generate
npx prisma validate
npx prisma migrate deploy
npm run qa:meta-v6-phase12
npm run qa:admin-api-security
npm run qa:meta-business-platform
npm run qa:meta-v6-gate
npm run typecheck
npm run build
```

## Remaining evidence

1. Generate Prisma Client and apply/rollback the migration in disposable PostgreSQL.
2. Run preview fixtures against production-like canonical catalog rows.
3. Create and update a Product Set in an owned Meta catalog.
4. Fetch the provider set and prove `product_count` parity with the exact approved membership snapshot.
5. Run scheduled reconciliation twice with Redis/workers and verify idempotent state, alerts and cooldown.
6. Decide whether optional Shop collection synchronization is required in a subsequent phase.
7. Resolve the eight inherited master-tracking documentation/runtime-proof failures.

## Acceptance criteria status

- [x] Rule normalization and membership evaluation are deterministic and tested.
- [x] Preview hash/count parity is enforced before any provider mutation.
- [x] Empty and broken sets create deduplicated incidents.
- [x] Rule mutations, preview, manual sync and rollback are permission-scoped and immutably audited.
- [x] Rollback creates a new monotonic version instead of deleting history.
- [x] The Operations Center exposes rule, preview, approval, sync and rollback controls.
- [ ] Prisma generation and disposable-database migration evidence attached.
- [ ] Live Meta provider `product_count` parity evidence attached.
- [ ] Production reconciliation worker and repeated-run evidence attached.
