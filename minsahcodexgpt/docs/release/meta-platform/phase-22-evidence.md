# Phase 22 evidence — credential, permission and version governance

## Source status

`READY_FOR_GENERATION`

The Phase 22 source implementation is complete for the approved boundary. It adds role-isolated credential resolution, redacted secret material, a complete capability permission matrix, centralized Graph/SDK feature policy, appsecret proof, rotation-aware client invalidation, safe credential metadata persistence, migration/recovery SQL, focused tests, static audits, architecture documentation and operator guidance.

No legacy provider caller, Business SDK adapter, Graph transport, webhook transport or live provider flow has been cut over.

## Implemented contracts

- Explicit credential roles: `APP`, `BUSINESS_SYSTEM_USER`, `CAPI`, `PAGE`, `INSTAGRAM`.
- Environment credential provider resolves only the requested role; no cross-role token fallback exists in the new boundary.
- Secret material is held in server-only private fields; JSON serialization returns metadata only.
- Credential fingerprints are non-reversible and scoped by connection plus role.
- Capability governance validates feature/version compatibility, role and permissions before provider execution.
- `appsecret_proof` requires an explicit APP secret and an explicit non-APP access credential.
- Cached clients are disposed and replaced when the credential version changes.
- `MetaCredentialMetadata` stores only secret reference, fingerprint, app association, permissions and rotation/expiry metadata; it has no raw token or app-secret column.
- Graph API and Business SDK versions now delegate to one policy registry.
- Existing legacy credential fallbacks remain untouched until their capability cutovers in Phases 28–31.

## Verified command evidence

```text
node scripts/meta-platform-phase22-audit.mjs
PASS — 56/56 checks.

node scripts/meta-v6-migration-governance-audit.mjs
PASS — 372/372 checks; 73 committed migrations hashed, including Phase 22.

node scripts/meta-platform-source-inventory.mjs
PASS — 45/45 checks; 335 active paths, 21 capabilities and 15 realtime-service paths.

node --test tests/meta-v6/phase19-source-inventory.test.mjs
PASS — 4/4 tests.

Focused Phase 22 TypeScript compilation using the installed global TypeScript compiler
PASS — credential, governance, versioning and Prisma metadata repository source compiled with strict checking and no emit.

Dependency-independent compiled runtime harness
PASS — 8/8 scenarios: matrix coverage, no role fallback, redaction, missing credential, permission denial/success, pre-resolution version block, appsecret proof and credential-rotation client invalidation.

node scripts/meta-platform-phase21-audit.mjs
PASS — 47/47 checks.

node scripts/meta-v6-phase7-connection-audit.mjs
PASS — 50/50 checks after delegating policy assertions to the centralized registry.

node scripts/meta-graph-version-policy-audit.mjs
PASS — 18/18 checks against policy schema version 2.

node scripts/tracking-phase12-capi-schema-audit.mjs
PASS — 51/51 checks after accepting the centralized Graph-version export.

node scripts/phase18-environment-docs-audit.mjs
PASS — 18/18 checks.

node scripts/validate-env.mjs --example .env.example
PASS — production contract validation; only expected unconfigured recommended-variable warnings were emitted.
```

## Standard command blockers

```text
npm ci --ignore-scripts --no-audit --no-fund
BLOCKED — the package gateway returned HTTP 503 for a dependency tarball during repeated attempts; a final retry did not complete and was terminated. No dependency-install pass is claimed.

npm run test:meta-v6-phase22
BLOCKED — the exact repository test command requires the unavailable local `tsx` dependency. Equivalent source contracts were verified by strict compilation and the 8/8 dependency-independent runtime harness, but the npm command itself is not claimed as passed.

npm run typecheck / npm run build / Prisma generation
BLOCKED — a fresh dependency install and generated Prisma client are unavailable in this sandbox. No freshness stamp or generated output was fabricated.

Disposable PostgreSQL migration/recovery drill
BLOCKED — `psql`, Docker and Podman are unavailable. Migration apply, schema inspection, recovery and reapply are not claimed.

Live credential rotation/provider verification
NOT RUN — requires controlled Meta test assets and secret-store access.
```

The repository-wide environment contract audit also reports four pre-existing embedded-credential-URL fixtures outside the Phase 22 change set; Phase 22 does not claim that unrelated gate as passing.

## Runtime and migration evidence still required

1. Install locked dependencies and run `npm run test:meta-v6-phase22`.
2. Generate a fresh Prisma client for the Phase 21 and Phase 22 schema changes.
3. Apply the Phase 22 migration to disposable PostgreSQL.
4. Verify enum, table, app-association column, unique key, indexes and foreign key.
5. Prove no raw credential value is stored.
6. Run recovery SQL before consumer enablement and reapply the migration.
7. Exercise a real role-scoped credential rotation and observe old-client disposal.
8. Verify token/app association and permission scopes through connection-health/provider checks.

## Status rationale

`CODE_COMPLETE` is not used because the phase includes a Prisma schema/migration and the fresh generated client is unavailable. `COMPLETE` is not used because PostgreSQL, live rotation and provider evidence are absent. `READY_FOR_GENERATION` accurately records that the source boundary and dependency-independent gates pass while generation/runtime evidence remains blocked.
