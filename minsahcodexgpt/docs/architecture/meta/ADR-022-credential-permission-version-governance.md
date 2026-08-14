# ADR-022 — Credential, permission, rotation and version governance

- **Status:** Accepted for Phase 22 source implementation
- **Date:** 2026-07-22
- **Decision owners:** Platform Security and Growth Platform

## Context

Existing Meta integrations read several environment tokens through capability-specific configuration modules. Some legacy paths fall back from one token role to another, and Graph/SDK versions are repeated across configuration and tracking modules. That can route a request through a credential with the wrong permission set or keep a long-lived SDK client alive after token rotation.

## Decision

1. Meta provider credentials have one explicit role: `APP`, `BUSINESS_SYSTEM_USER`, `CAPI`, `PAGE`, or `INSTAGRAM`.
2. The Phase 22 environment provider resolves only the requested role. It never falls back to another role's token.
3. Secret values remain in server-only credential material with private fields. JSON serialization returns only safe metadata.
4. Secret references use an explicit scheme. The built-in provider supports `env:VARIABLE`; external secret-manager providers can implement the same provider contract later.
5. Every governed Meta capability has a machine-readable credential mode, allowed roles, role-specific permissions and feature-compatibility requirement.
6. Authorization evaluates the approved Graph/SDK feature registry before resolving a credential, then validates exact role and permissions before any provider transport can execute.
7. Credential versions are derived as non-reversible fingerprints. Client registries reuse a client only while the role and credential version remain unchanged; rotation disposes the old client.
8. `appsecret_proof` is generated only from an explicit non-APP access credential plus the explicit APP credential.
9. PostgreSQL stores only secret references and safe metadata—credential fingerprint, app association, permissions and rotation/expiry timestamps—in `MetaCredentialMetadata`; no access token, app secret or secret value is persisted.
10. Existing legacy callers are not cut over in Phase 22. Their cross-role fallback removal occurs with capability migrations in Phases 28–31.

## Alternatives considered

- **One global Meta token:** rejected because permissions and asset scope differ by workload.
- **Fallback to another configured token:** rejected because successful authentication with the wrong role is less safe than a fail-closed configuration error.
- **Store encrypted raw tokens in the application database:** rejected because the target architecture uses external secret references and reduces credential exposure.
- **Keep version constants in each integration:** rejected because compatibility and upgrade gates would drift.
- **Reuse clients until process restart:** rejected because rotation must invalidate long-lived provider clients without a full deployment.

## Consequences

- Future transports must request one explicit credential role and call the governance preflight.
- Missing credentials, wrong roles, missing permissions and unapproved versions fail before provider execution.
- Operators must maintain role-specific secret references and granted-permission metadata.
- The version registry can keep a new Graph version visible but unavailable to a feature until regression evidence is approved.
- Phase 22 remains generation/runtime-evidence limited until Prisma generation and a disposable PostgreSQL migration/recovery drill are completed.

## Migration and rollback

Before any consumer uses `MetaCredentialMetadata`, rollback may apply the reviewed recovery SQL and remove the new source paths. After metadata or clients depend on the contract, rollback means disabling the Phase 22 cutover flag and shipping a forward fix that preserves metadata. Legacy token paths remain available until their later observed cutovers; Phase 22 does not delete them.
