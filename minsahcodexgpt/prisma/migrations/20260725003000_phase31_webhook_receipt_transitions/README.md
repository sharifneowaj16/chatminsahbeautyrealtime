# Phase 31 Layer 3.3 — guarded receipt lifecycle

## Purpose

Adds only the fields required for atomic queue transitions, processing claims, expiring leases,
stale-worker fencing, terminal timestamps and transition audit metadata.

## Compatibility

- The Layer 3.2 dedupe unique index is unchanged.
- `MetaWebhookReceipt`, `MetaInstagramWebhookReceipt` and `FbWebhookAudit` are unchanged.
- Existing canonical rows remain in their current state. Existing `BLOCKED` rows are deterministically backfilled from `firstSeenAt`; no later historical timestamp is invented.
- The migration fails closed if an out-of-band canonical `PROCESSING` row exists before leases are available.

## Recovery warning

Recovery refuses to run while any canonical row is `PROCESSING` or has a lease token. It removes only
Layer 3.3 columns, checks and the state/lease index. It does not drop the canonical receipt table.

Recovery precondition: no worker may hold a lease while recovery runs.
