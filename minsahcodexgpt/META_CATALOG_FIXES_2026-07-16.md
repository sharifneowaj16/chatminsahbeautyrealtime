# Meta Catalog fixes — 2026-07-16

Implemented in this patch:

- Catalog retailer IDs now use the same `NEXT_PUBLIC_META_CATALOG_ID_SOURCE` resolver as Pixel/CAPI (`sku` or `database_id`).
- Catalog sync fails closed when the identity source is missing or invalid.
- Reserved quantity is deducted before availability is calculated.
- `trackInventory=false` and `allowBackorder=true` are respected.
- Sale price is emitted only when active, positive, and lower than the concrete item price.
- Variant products no longer emit a duplicate sellable parent row.
- Variant group IDs follow the configured identity namespace.
- Canonical product URLs and default images are preferred.
- Product condition is sourced from Prisma instead of always forcing `new`.
- CSV output now includes GTIN and visibility, matching the Items Batch payload more closely.
- `MetaLead` and `MetaBusinessSyncLog` were added to `prisma/schema.prisma` to match the deployed migration.
- `.env.example` now defaults catalog identity to `sku`.

Still pending for a later hardening pass:

- Remote catalog reconciliation and DELETE tombstones for removed/renamed products.
- Polling Meta batch processing until final per-item status.
- Distributed locking/idempotency for overlapping cron and manual syncs.

## Hardening pass 2
- Added database-backed catalog sync lock with 30-minute stale-lock recovery.
- Full sync now reconciles only retailer IDs previously managed by this project and submits DELETE requests for stale items; unrelated/manual catalog items are preserved.
- Inventory-only sync does not delete catalog items.
- Async Items Batch submissions are logged as SUBMITTED instead of falsely marked final SUCCESS.
- Batch submission responses are retained for later status polling.

## V4 validation and semantic QA

- Added strict catalog feed action validation (`create`, `upload`, `schedule`).
- Added HTTP/HTTPS URL validation before feed upload or scheduling.
- Added schedule validation for interval, hour, minute, and weekly weekday.
- Added strict boolean validation for manual inventory-only sync.
- Added `qa:meta-catalog-semantic` with 16 semantic contract checks.
- Confirmed saved catalog sync preferences are honored by the internal cron route.
