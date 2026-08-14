# Meta v6 Phase 07 Evidence — Connection, API Version, Token & Permission Health

**Date:** 17 July 2026  
**Project snapshot:** `minsahbeauty_meta_v6_phase07_loop_update.zip`  
**Source specification:** `docs/spec/MinsahBeauty_Meta_AZ_Final_Spec_v6_FULL.md`  
**Manifest status:** `READY_FOR_RUNTIME_QA`

## Implemented scope

- Added persisted `MetaConnection`, immutable `MetaConnectionCheck`, and `MetaApiVersionPolicy` records with typed connection/version-regression states.
- Added canonical bootstrap/config resolution for app, business, catalog, dataset/pixel, page, ad account, Instagram account, token reference, required permissions, Graph API version, and exact SDK version.
- Added a server-only Graph client with bearer authorization, timeout, safe error classification/redaction, and centralized `appsecret_proof` support.
- Added token introspection through `debug_token`, including validity, app association, expiry, data-access expiry, token type, and scope checks without returning token values.
- Added explicit permission verification through `/me/permissions` and required-scope diffing.
- Added API verification for every configured business/catalog/dataset/pixel/page/ad-account/Instagram asset; ID mismatch and provider not-found responses fail closed.
- Added aggregate readiness status and warnings for invalid tokens, app mismatch, missing permissions, inaccessible assets, token expiry, and API-version policy.
- Added daily token/permission/asset health and weekly version-policy durable jobs using secret-free payloads.
- Added a `SUPER_ADMIN` connection API and Meta Business admin connection card with safe status/history/recheck controls.
- Added an exact SDK dependency pin and a file-backed v24-to-v25 version policy with internal warning/block/review dates.
- Kept official expiration nullable when the official version table shows `TBD`; no invented official expiration date is persisted.
- Added a release-mode API-version gate that blocks below-minimum, internally blocked, SDK-mismatch, or failed-regression configurations.

## Main changed files

```text
prisma/schema.prisma
prisma/migrations/20260717050000_meta_v6_phase7_connection_health/migration.sql
config/meta-api-version-policy.json
config/env.manifest.json
.env.example
lib/meta/connection/appsecret-proof.ts
lib/meta/connection/assets.ts
lib/meta/connection/client.ts
lib/meta/connection/config.ts
lib/meta/connection/errors.ts
lib/meta/connection/index.ts
lib/meta/connection/permissions.ts
lib/meta/connection/readiness.ts
lib/meta/connection/repository.ts
lib/meta/connection/sdk-version.ts
lib/meta/connection/token-debug.ts
lib/meta/connection/types.ts
lib/meta/connection/version-policy.ts
lib/meta-business/config.ts
lib/meta-business/sdk.ts
lib/jobs/job-types.ts
lib/jobs/queues.ts
lib/jobs/scheduler.ts
lib/jobs/idempotency.ts
workers/meta-token-health.worker.ts
app/api/admin/meta/connection/route.ts
app/api/admin/meta/settings/route.ts
app/admin/meta-business/page.tsx
tests/meta-v6/phase7-connection-health.test.ts
scripts/meta-graph-version-policy-audit.mjs
scripts/meta-v6-phase7-connection-audit.mjs
scripts/meta-v6-phase5-jobs-audit.mjs
package.json
config/meta-v6-phase-manifest.json
docs/release/meta-v6/phase-dashboard.json
```

## Schema and migration evidence

Migration `20260717050000_meta_v6_phase7_connection_health` adds:

- `MetaConnectionStatus`: `UNCONFIGURED`, `HEALTHY`, `DEGRADED`, `INVALID_TOKEN`, `MISSING_PERMISSION`, `ASSET_NOT_FOUND`, `VERSION_WARNING`, `ERROR`
- `MetaVersionRegressionStatus`: `PENDING`, `PASS`, `FAIL`, `WAIVED`
- `MetaConnection` current safe snapshot
- `MetaConnectionCheck` immutable check history
- `MetaApiVersionPolicy` release/expiration/warning/block/review/regression governance
- status, expiry, check-time, version-regression, and review indexes
- v24 controlled-baseline and v25 target policy seeds

The migration deliberately stores `NULL` for unknown official expiration dates and labels internal dates as internal migration controls.

## Automated gate evidence

```text
npm run qa:meta-v6-phase7
11/11 tests passed
50/50 static checks passed
16/16 version-policy checks passed

npm run qa:meta-business-platform
22/22 passed

npm run qa:meta-v6-phase1
4/4 tests + 9/9 audit passed

npm run qa:meta-v6-phase2
8/8 tests + 20/20 audit passed

npm run qa:meta-v6-phase3
9/9 tests + 20/20 audit passed

npm run qa:meta-v6-phase4
11/11 tests + 27/27 audit passed

npm run qa:meta-v6-phase5
11/11 tests + 43/43 audit passed

npm run qa:meta-v6-phase6
12/12 tests + 45/45 audit passed

npm test
16/16 passed

Phase 7 targeted esbuild integration
8/8 changed entry points compiled successfully

npm run qa:meta-v6-gap
12/14 passed; A6 is green

npm run qa:meta-graph-version-gate
16/19 passed; release correctly blocked because v25 target promotion, approved regression, and target SDK evidence are pending
```

Remaining global blockers are outside Phase 7:

- `A13` — remaining lifecycle states across later lead/webhook/approval/diagnostic phases must use Prisma enums
- `A14` — Phase 10 catalog diagnostics persistence and admin visibility

`npm run qa:tracking-env` was executed in production mode and correctly blocked because this isolated workspace does not contain production database, Redis, auth, payment, storage, tracking, Meta, or analytics secrets/service URLs. No placeholder credential or public-secret leak was detected. This result is retained as a deployment-environment hold, not converted into a pass.

A full repository TypeScript run was not claimed in this loop because the isolated workspace could not complete a clean dependency installation. The changed Phase 7 entry points were bundled/parsed with esbuild, and executable tests imported the canonical connection modules. Full `npm ci`, Prisma generation, typecheck, lint, and build remain release-environment gates.

## Security and privacy evidence

- Access tokens and app secrets are server-only bootstrap values and never enter durable job payloads.
- The admin route only accepts a `recheck` action; it does not accept token/app-secret rotation values.
- Readiness results and persisted checks contain token metadata but never the token itself.
- Provider errors redact bearer values, `access_token`, `input_token`, and `appsecret_proof` values.
- `debug_token` verifies that the token belongs to the configured app.
- `appsecret_proof` uses deterministic HMAC-SHA256 and is applied centrally to applicable server Graph requests.
- Page asset verification may use a page token without exposing it to queues, responses, or UI.
- Missing credentials produce `UNCONFIGURED` without making a provider call.
- Wrong assets produce a safe `ASSET_NOT_FOUND` state.
- Required permission loss produces a distinct `MISSING_PERMISSION` state.
- The version policy does not misrepresent an internal deadline as an official Meta expiration date.

## Version policy decision

As verified on 17 July 2026, the project policy records:

```text
Current controlled baseline: v24.0
Exact SDK baseline:          24.0.1
Latest official target:      v25.0
Official expiration:         null/TBD where not published
Internal v24 warning date:   2026-07-01
Internal v24 block date:     2026-10-01
v25 regression status:       PENDING
```

The code does not automatically promote to v25. A promotion requires catalog, CAPI, Lead Ads, Ads Insights, SDK/adapter, and rollback evidence. The official GitHub repository shows a newer SDK release, while the package registry available to this isolated environment exposed `24.0.1`; therefore the project remains on the exact tested baseline instead of declaring an unverified SDK upgrade.

## Deferred generation and runtime evidence

The following are required before strict `COMPLETE`:

1. clean `npm ci` in a network-enabled build environment;
2. Prisma client generation and disposable PostgreSQL migration application;
3. full TypeScript, ESLint, and production build;
4. live token-debug evidence with the configured app association;
5. live permission verification for the production system/page token;
6. live API verification for business, catalog, dataset/pixel, page, ad account, and Instagram account;
7. live Redis daily/weekly health-job execution, stalled recovery, and alert evidence;
8. controlled v25 catalog/CAPI/lead/insights/SDK staging regression and rollback proof;
9. production tracking-environment gate with real secret-manager/service configuration.

Run in the release environment:

```bash
npm ci
npm run db:generate
npx prisma migrate deploy
npm run typecheck
npm run lint
npm run qa:meta-v6-phase7
npm run qa:meta-graph-version-gate
npm run qa:meta-business-platform
NODE_ENV=production npm run qa:tracking-env
npm run build
```

Then run/capture the connection jobs:

```bash
npm run worker:meta-token-health
npm run worker:meta-scheduler
```

## Operational handoff

Health schedules:

```text
token-permission-asset-daily
api-version-weekly
```

Operational surfaces:

```text
GET  /api/admin/meta/connection        # SUPER_ADMIN safe snapshot/history
POST /api/admin/meta/connection        # { "action": "recheck", "checks": [...] }
GET  /api/admin/meta/settings          # includes safe connection summary
```

Version governance source:

```text
config/meta-api-version-policy.json
npm run qa:meta-graph-version-policy
npm run qa:meta-graph-version-gate
```

Token rotation remains an external secret-manager/environment operation. The admin endpoint intentionally does not accept or return token values.

## Rollback / forward-fix

- Keep the exact v24/SDK 24.0.1 baseline until the v25 regression is explicitly approved.
- A version-policy warning must not be bypassed by editing test output; update policy/evidence through review.
- During provider failure, retain the latest safe connection snapshot/history and allow scheduled rechecks.
- Stop the connection-health worker during an incident without deleting audit history.
- Prefer a forward corrective migration for schema issues.
- Rotate compromised tokens in the secret manager and recheck; never place replacement secrets in an admin request or durable queue.
- If an asset was re-created, update the secret/config source, re-run API verification, and preserve the old failure history.

## Acceptance criteria

- [x] Presence-only readiness replaced by API-backed checks.
- [x] Token validity and app association are checked without exposing the token.
- [x] Required permission loss has an explicit result.
- [x] Every configured Meta asset has an API verification contract.
- [x] App-secret proof and safe Graph error handling are centralized.
- [x] Current health and check history are persistable.
- [x] Daily/weekly durable health schedules and safe admin recheck exist.
- [x] Exact SDK/API-version policy and CI/release gate exist.
- [x] Official `TBD` expiration is not replaced with a fabricated date.
- [x] Phase 1–6 and repository regressions pass.
- [ ] Generated Prisma client refreshed and migration applied.
- [ ] Full dependency-backed typecheck/lint/build completed.
- [ ] Live Meta token, permission, and all asset checks attached.
- [ ] Live Redis health-job/recovery evidence attached.
- [ ] v25 controlled regression, approval, rollout, and rollback evidence attached.
