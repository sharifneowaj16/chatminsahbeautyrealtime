# Phase 28 connection health and CAPI migration

Phase 28 keeps PostgreSQL outbox durability and migrates provider execution behind the unified MetaPlatform boundary.

## Runtime modes

- Connection: `LEGACY`, `SHADOW`, `PLATFORM`.
- CAPI: `LEGACY`, `PLATFORM_TEST`, `PLATFORM_CANARY`, `PLATFORM`.

CAPI never performs a shadow write. A stable event ID chooses one transport for all attempts. Public routes persist work first; worker runtime resolves the exact CAPI credential and loads the SDK lazily.

See `phase-28-evidence.md`, ADR-028 and the Phase 28 runbook for release requirements.

- Offline/dataset conversion uploads use the same Phase 28 cutover facade and dataset override; no direct legacy token read remains in the producer.
