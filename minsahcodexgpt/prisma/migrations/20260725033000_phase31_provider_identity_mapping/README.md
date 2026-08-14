# Phase 31 Layer 3.4 provider identity mapping

This migration is additive. It extends the existing `MetaExternalReference` registry with typed identity and permission-health state, adds typed provider-identity relationships, and allows a canonical webhook receipt to reference its primary resolved identity.

## Safety decisions

- Existing generic references remain `UNVERIFIED` / `UNKNOWN`; the migration does not guess provider health.
- No token, secret, raw Graph response, email, phone, message text, or signed URL is backfilled.
- Relationship rows are not auto-created by SQL because `MetaConnection` has no environment field and ownership cannot be inferred safely.
- Backfill is explicit, environment-scoped, connection-scoped, deterministic, and resumable through the Layer 3.4 repository service.
- Existing Lead, Instagram, Facebook, receipt, and connection tables are not renamed or removed.

## Pre-constraint duplicate check

The relationship table is new and empty. If rows are staged before the unique edge index is applied, run the duplicate query documented in `migration.sql`; the migration must stop for manual reconciliation rather than delete data.

## Recovery warning

Recovery removes identity-health columns, typed relationship rows, and receipt identity links. Export required relationship and trace data first. It does not drop `MetaExternalReference` or `MetaSocialWebhookReceipt`.

The migration does not guess provider health; every existing row remains unverified until an explicit scoped verification or backfill runs.
