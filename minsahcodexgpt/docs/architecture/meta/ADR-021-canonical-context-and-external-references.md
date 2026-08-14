# ADR-021 — Canonical Meta models, asset context, and external references

- **Status:** Accepted for Phase 21 source implementation
- **Date:** 2026-07-21
- **Decision owners:** Growth Platform and Data Platform

## Context

Existing Meta integrations expose a mixture of Business SDK objects, Graph JSON, and provider IDs stored directly in domain tables. Provider asset IDs are not globally safe identifiers: the same logical capability can exist in development, staging, and production, and an incorrect environment/asset pairing could direct a write to the wrong provider asset.

## Decision

1. New Meta domain code consumes provider-neutral canonical resources produced by explicit, allowlisted field mappings. Raw SDK/Graph objects and provider pagination URLs do not cross the normalization boundary.
2. Every provider operation and external-reference lookup uses an explicit `MetaAssetContext` containing environment, logical connection key, and verified asset bindings.
3. `MetaExternalReference` stores local ↔ provider identity under both local-side and provider-side unique constraints scoped by environment, connection, asset type, asset ID, and object type.
4. A local identity cannot be remapped to another provider ID, and a provider ID cannot be aliased to another local identity, without an explicit reconciliation process.
5. Existing `MetaConnection` rows are not automatically backfilled because they lack trustworthy environment provenance. Backfill requires an explicit environment and verified asset context and remains dry-run/review driven until runtime evidence is available.
6. The Prisma-backed repository is server-only and loaded lazily. Public MetaPlatform imports remain provider-, database-, and network-side-effect free.

## Alternatives considered

- **Store provider IDs directly on every domain model:** rejected because environment and asset scope remain implicit and upgrades require repeated provider-specific logic.
- **Use one globally unique provider ID column:** rejected because provider IDs are only meaningful with object and asset context.
- **Infer production during migration:** rejected because it can create staging-to-production identity collisions and violates fail-closed operation.
- **Persist full provider payloads as canonical state:** rejected because raw payloads can contain unstable fields, secrets in URLs, or unnecessary personal data.

## Consequences

- New adapters must normalize before returning domain values.
- Reference registration requires explicit context and may return a conflict instead of silently overwriting identity.
- Prisma client generation and a disposable PostgreSQL apply/recovery drill are mandatory before the phase can advance beyond `READY_FOR_GENERATION`.
- Later phases can add capability-specific canonical models without changing the reference identity contract.

## Recovery and rollback

Before any consumer depends on the new table, the reviewed recovery SQL may remove it transactionally. After references are written or a consumer is enabled, rollback means disabling the consumer and shipping a forward-fix migration that preserves identity data. No historical migration or evidence file may be edited to simulate success.
