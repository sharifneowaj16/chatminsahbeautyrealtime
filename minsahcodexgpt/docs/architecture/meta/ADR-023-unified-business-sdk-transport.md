# ADR-023 — Unified Meta Business SDK transport

- **Status:** Accepted for Phase 23 source implementation
- **Date:** 2026-07-22
- **Decision owners:** Growth Platform and Platform Security

## Context

The repository previously initialized `facebook-nodejs-business-sdk` through more than one wrapper and allowed provider runtime details to leak into capability code. That duplicates import assumptions, client construction, response handling and error behavior. It also makes credential rotation and SDK-version upgrades difficult to verify consistently.

Phase 22 established exact credential roles, capability authorization, version governance, app-secret proof and rotation-aware client invalidation. Phase 23 needs one server-only SDK transport that consumes those contracts without migrating the later Ads, Catalog, Page, Lead or CAPI workflows ahead of their approved phases.

## Decision

1. The official `facebook-nodejs-business-sdk` package is imported only by `lib/meta-platform/transports/business-sdk/runtime.ts` using a namespace import.
2. The runtime namespace is validated lazily. Required constructors and the approved SDK major/minor line must exist before a client is created.
3. Package metadata version and `FacebookAdsApi.SDK_VERSION` are recorded separately. Patch-only metadata drift is observable; a major/minor mismatch fails closed. The requested Graph API version must also match the SDK runtime Graph version.
4. SDK clients are created only after Phase 22 capability, role, permission and version authorization succeeds.
5. Client creation uses the rotation-aware credential registry. A changed credential fingerprint removes the old cached client, clears its SDK access-token field, disables its request method and creates a replacement.
6. SDK crash reporting is disabled during construction. Debug mode is opt-in and enabled explicitly after construction.
7. When an APP credential is configured, the transport decorates `FacebookAdsApi.call` so every SDK request receives `appsecret_proof`. Missing optional APP metadata does not prevent an otherwise authorized client; malformed or inaccessible configured APP credentials fail closed.
8. The executor owns deadlines, cancellation, structured safe logs and canonical success/error normalization. Tokens, app secrets and proof values are never included in log contracts.
9. Focused adapters expose only approved SDK entity constructors for business, ads, insights, audiences, catalog, pixels, CAPI, pages and leads. Undeclared entity types fail closed.
10. Existing wrappers remain compatibility facades. Capability cutover, direct-call removal and production workflow migration remain in Phases 28–31.
11. Public client-safe MetaPlatform exports do not import the SDK transport. Server consumers obtain factories through lazy server-entry imports.

## Runtime contract

The runtime contract verifies the constructors required by the transport and records:

- approved package version;
- runtime-reported SDK version and the pinned package-specific expected runtime constant;
- Graph API version reported by the SDK;
- patch metadata drift;
- required and available exports.

This avoids relying on a synthetic default export or assuming package metadata and runtime constants are identical.

## Alternatives considered

- **Keep multiple SDK wrappers:** rejected because initialization, proof injection, version checks and errors would continue to drift.
- **Use a synthetic TypeScript default export:** rejected because it can compile while disagreeing with the installed CommonJS runtime.
- **Initialize one global client at module load:** rejected because it reads credentials too early, complicates server/client boundaries and cannot react safely to rotation.
- **Require APP credentials for every client:** rejected because app-secret proof is an optional hardening mechanism for deployments that configure an APP secret; capability credentials remain independently governed.
- **Migrate every Meta capability in this phase:** rejected because Phases 28–31 own observed, reversible capability cutovers.

## Consequences

- New SDK-backed provider code must use this transport and cannot import the package directly.
- Runtime export changes fail during lazy transport initialization rather than deep inside a workflow.
- Credential and permission failures occur before provider client construction.
- Response/error normalization becomes consistent for later capability adapters.
- Exact dependency-backed runtime tests are still required before the phase can advance beyond `READY_FOR_RUNTIME_QA`.

## Migration and rollback

Phase 23 changes the two existing root SDK wrappers into compatibility facades but does not remove legacy feature flags or migrate business workflows. Rollback can restore those wrappers from the pre-change archive and remove the new transport while no later capability has cut over. After later phases depend on this boundary, rollback must disable the affected cutover flag and ship a forward-compatible fix rather than reintroducing scattered package imports.
