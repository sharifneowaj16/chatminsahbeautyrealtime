# ADR-020 — MetaPlatform facade and repository boundary

- **Status:** Accepted for Phase 20
- **Date:** 2026-07-21
- **Scope:** Application-facing Meta integration boundary

## Context

The repository contains multiple existing Meta Business SDK, Graph HTTP, webhook, tracking, queue and realtime implementations. Moving those implementations directly would mix provider cutover with foundational architecture and make rollback unsafe.

## Decision

Introduce one provider-neutral `MetaPlatform` contract with:

- a public import-safe entrypoint at `lib/meta-platform/index.ts`;
- an explicit server-only entrypoint at `lib/meta-platform/server.ts`;
- stable result, error and invocation-context contracts;
- a capability registry aligned to the frozen Phase 19 manifest;
- dependency-injected capability adapters;
- a server-only legacy compatibility adapter that wraps existing functions without importing them eagerly.

The public dependency graph may not import provider SDKs, Graph clients, secrets, Prisma, Redis, BullMQ, Node-only modules or the server-only compatibility layer. Provider transports and credential selection remain future Phase 22–24 work.

## Alternatives considered

1. **Move all legacy callers immediately.** Rejected because it combines facade creation with provider cutover and makes regression/rollback scope too large.
2. **Expose raw SDK objects through the facade.** Rejected because it leaks provider contracts into application domains.
3. **Create a singleton that reads environment variables at import time.** Rejected because it violates build-safe import and credential-boundary rules.

## Consequences

- New application-facing Meta work has a stable internal API.
- Existing provider behavior remains unchanged until capability-specific migration phases.
- Adapters must return normalized `MetaResult` values and cannot leak raw provider errors.
- No capability is considered migrated merely because an adapter can wrap it.

## Migration and rollback

Capability phases register adapters behind their approved cutover flags. Before observed cutover, rollback is removal of the new caller/adapter registration and restoration of the unchanged legacy call path. Reverting Phase 20 removes only the new core/facade files, audits and documentation; it does not require data or provider rollback.
