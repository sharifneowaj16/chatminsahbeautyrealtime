# Phase 22 credential rotation runbook

## Scope

This runbook rotates one Meta credential role for one connection without using another role as fallback.

## Preconditions

- Identify the connection key and exact role: `APP`, `BUSINESS_SYSTEM_USER`, `CAPI`, `PAGE`, or `INSTAGRAM`.
- Confirm the replacement token/secret belongs to the expected Meta app and asset ownership.
- Record the granted permissions and provider expiry/data-access expiry.
- Keep the old secret available in the external secret store until rollback observation closes.

## Rotation procedure

1. Write the replacement secret to the external secret store or dedicated environment variable.
2. Update only that role's secret reference, for example `META_PAGE_ACCESS_TOKEN_SECRET_REF=env:META_PAGE_ACCESS_TOKEN`.
3. Update that role's granted-permission metadata, rotation timestamp, credential expiry and data-access expiry where applicable.
4. Run the Phase 22 focused gate and the connection-health check in a non-production environment.
5. Confirm the credential fingerprint changed and the role-scoped client registry disposed the previous client.
6. Execute a read-only provider check for the exact capability and asset.
7. Canary one controlled operation if the later capability phase permits writes.
8. Observe authentication, permission, rate-limit and provider-error metrics before retiring the old secret.

## Fail-closed expectations

- A missing role credential returns `META_CREDENTIAL_NOT_CONFIGURED`.
- A wrong role returns `META_CREDENTIAL_ROLE_NOT_ALLOWED`.
- Missing permissions return `META_REQUIRED_PERMISSION_MISSING`.
- An unapproved Graph/SDK combination returns `META_FEATURE_VERSION_INCOMPATIBLE`.
- No other role's token is used automatically.

## Rollback

Restore the prior secret reference for the same role, update the rotation metadata, invalidate that role's cached client, and repeat the read-only health check. Do not point the role at a different token class as an emergency fallback.

## Evidence to retain

- connection key and role;
- old/new non-reversible credential-version fingerprints;
- permission snapshot;
- Graph/SDK version decision;
- client invalidation observation;
- read-only health result;
- canary result when applicable;
- rollback result or closure approval.
