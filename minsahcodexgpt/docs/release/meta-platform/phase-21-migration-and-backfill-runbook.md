# Phase 21 migration and backfill runbook

## Scope

This runbook applies `20260721233500_add_meta_external_reference` and establishes environment-scoped local ↔ Meta provider identity mappings. It does not call Meta APIs or change any live producer.

## Why automatic backfill is forbidden

Existing `MetaConnection` rows contain provider asset IDs but no trustworthy environment provenance. Assuming `PRODUCTION` would permit staging records to target production assets, so the migration fails closed and inserts no rows automatically.

## Apply and verify

1. Back up PostgreSQL and capture the immutable source revision.
2. Apply all committed migrations to a disposable PostgreSQL database first.
3. Verify the three enum types, table, two unique indexes and two lookup indexes.
4. Run the Phase 21 focused tests and audit.
5. In the target environment, apply with the normal forward migration command.
6. Confirm the table is empty before explicit backfill unless runtime registration has already started.

## Explicit backfill

1. Determine the environment (`DEVELOPMENT`, `STAGING` or `PRODUCTION`) from deployment configuration, never from an asset ID.
2. Read the intended `MetaConnection` row and independently verify every provider asset belongs to that environment and business.
3. Build candidates with `buildMetaConnectionReferenceBackfill(context, snapshot)`.
4. Review the dry-run candidate list. It contains no tokens or customer PII.
5. Register candidates through `MetaExternalReferenceRepository`; uniqueness conflicts must stop the run and be reconciled, not overwritten.
6. Record counts, conflicts, operator, source revision and verification timestamp in release evidence.

## Recovery

Before any consumer depends on the table, `recovery.sql` may remove the table and enum types transactionally. After reference data exists or a consumer is enabled, do not run destructive recovery; disable the consumer and ship a forward-fix migration that preserves mappings.
