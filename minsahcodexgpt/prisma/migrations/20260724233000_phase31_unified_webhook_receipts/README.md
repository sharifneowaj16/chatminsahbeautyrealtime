# Phase 31 Layer 3.2 — unified Meta social webhook receipts

This migration is additive. It creates a canonical receipt table while preserving all existing Lead Ads, Instagram and Facebook/realtime receipt tables.

## Dedupe boundary

`provider + platform + environment + connectionKey + providerEventKey`

The application writes a deterministic provider event key. PostgreSQL is the final concurrency authority. Duplicate deliveries update counters and last-seen/digest mismatch metadata instead of creating a second row.

## Payload policy

The canonical table stores a SHA-256 digest and an allowlisted scalar metadata projection. It has no raw body, message text, Lead field values, token, secret, authorization header or signed media URL column.

## Compatibility

Legacy receipt IDs are linked through `legacyReceiptType` and `legacyReceiptId`. Legacy tables are not renamed, deleted or backfilled in this item.

## Recovery warning

`recovery.sql` is destructive for canonical receipts. It is intended only before cutover/consumer dependency. After receipt records matter in production, ship a forward-fix instead.
