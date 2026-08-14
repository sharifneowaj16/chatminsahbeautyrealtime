# Meta v6 Phase 06 Evidence — Consent, Privacy, Retention & Data Governance

**Date:** 17 July 2026  
**Project snapshot:** `minsahbeauty_meta_v6_phase06_loop_update.zip`  
**Source specification:** `docs/spec/MinsahBeauty_Meta_AZ_Final_Spec_v6_FULL.md`  
**Manifest status:** `READY_FOR_GENERATION`

## Implemented scope

- Added a versioned, deterministic tracking-policy contract with explicit `UNKNOWN`, `GRANTED`, `DENIED`, and `WITHDRAWN` consent states.
- Changed `Order.nonEssentialTrackingAllowed` to fail closed with `@default(false)` and added consent version/policy reason fields.
- Added a conservative forward migration that does not reinterpret historical unversioned `true` values as fresh consent.
- Added policy metadata to durable Meta outbox records: policy version, policy reason, consent state/version, advanced-matching permission, and retention deadline.
- Enforced the authoritative policy on browser Pixel/CAPI dispatch, public CAPI ingestion, Purchase outbox creation, and outbox delivery.
- Added shared server-side normalization and SHA-256 hashing for email/phone/text identity, double-hash prevention, recursive operational redaction, and raw-PII scanning.
- Added durable consent recording, data-deletion requests, tracking suppression, privacy audit logs, retention cleanup, and PII audit scans.
- Added bounded/resumable privacy workers and schedules for deletion recovery, suppression sync, retention cleanup, and PII scanning.
- Refactored the Meta deletion callback to persist a recoverable request before Redis enqueue; Redis failure no longer loses the deletion request.
- Added a SUPER_ADMIN privacy-governance API and a public deletion-status endpoint without exposing raw identity data.
- Updated the cookie manager, public privacy policy, and production consent documentation for versioned opt-in, withdrawal, retention, deletion, and backup limitations.
- Updated admin manual Purchase replay to resolve the order's current consent/version before creating an outbox event.

## Main changed files

```text
prisma/schema.prisma
prisma/migrations/20260717040000_meta_v6_phase6_privacy_governance/migration.sql
lib/privacy/consent-types.ts
lib/privacy/tracking-policy.ts
lib/privacy/consent-resolver.ts
lib/privacy/consent-record.ts
lib/privacy/pii-normalize.ts
lib/privacy/pii-hash.ts
lib/privacy/pii-redaction.ts
lib/privacy/retention.ts
lib/privacy/retention-worker.ts
lib/privacy/deletion.ts
lib/privacy/deletion-worker.ts
lib/privacy/audit.ts
lib/privacy/jobs.ts
lib/privacy/scheduler.ts
lib/tracking/tracking-consent.ts
lib/tracking/client-traffic-filter.ts
lib/tracking/traffic-filter.ts
lib/tracking/order-attribution.ts
lib/tracking/pixels/TrackingConsentManager.tsx
lib/meta/browser/types.ts
lib/meta/browser/consent.ts
lib/meta/browser/payload.ts
lib/meta/browser/client.ts
lib/meta/capi/types.ts
lib/meta/capi/builder.ts
lib/meta/capi/core-outbox.ts
lib/meta/capi/purchase-outbox.ts
lib/meta/capi/outbox-repository.ts
lib/meta/capi/sender.ts
app/api/facebook-capi/route.ts
app/api/privacy/consent/route.ts
app/api/privacy/deletion/status/[code]/route.ts
app/api/admin/meta/privacy/route.ts
app/api/admin/tracking-health/route.ts
app/data-deletion/route.ts
app/(storefront)/privacy-policy/page.tsx
workers/privacy-governance.worker.ts
workers/privacy-scheduler.worker.ts
tests/meta-v6/phase6-privacy-governance.test.ts
scripts/meta-v6-phase6-privacy-audit.mjs
scripts/tracking-test-exclusion-audit.mjs
scripts/tracking-retention-audit.mjs
scripts/security-audit.mjs
docs/production/phase-6-consent-internal-bot-filters.md
PHASE14_TEST_INTERNAL_TRAFFIC_EXCLUSION.md
PHASE16_TRACKING_FAILURE_RETENTION_OPS.md
ENVIRONMENT_VARIABLES_PRODUCTION.md
package.json
config/meta-v6-phase-manifest.json
docs/release/meta-v6/phase-dashboard.json
```

## Schema and migration evidence

Migration `20260717040000_meta_v6_phase6_privacy_governance` adds:

- `TrackingConsentState`: `UNKNOWN`, `GRANTED`, `DENIED`, `WITHDRAWN`
- `DataDeletionRequestStatus`
- `TrackingConsentRecord`
- `DataDeletionRequest`
- `PrivacyAuditLog`
- `TrackingSuppression`
- consent version and policy reason on `Order`
- policy/consent/retention fields and indexes on `MetaEventOutbox`
- retention and operational indexes for privacy cleanup and governance views

Historical policy is deliberately conservative:

```text
legacy true + no current consent version
→ nonEssentialTrackingAllowed=false
→ consent state UNKNOWN
→ policy reason HISTORICAL_CONSENT_UNVERSIONED
```

This prevents a deployment from treating an old boolean as a new, auditable consent grant.

## Automated gate evidence

```text
npm run qa:meta-v6-phase6
12/12 tests passed
45/45 static checks passed

npm run qa:tracking-test-exclusion
57/57 passed

npm run qa:tracking-retention
25/25 passed

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

npm run typecheck:ts
exit 0

targeted ESLint
0 errors, 0 warnings

npm test
16/16 passed

npm run qa:meta-v6-gap
11/14 passed; A8 is green
```

Remaining global blockers are outside Phase 6:

- `A6` — Phase 7 Graph API version policy/expiry gate
- `A13` — later lifecycle enums across connections/leads/diagnostics/approvals
- `A14` — Phase 10 catalog diagnostics persistence/admin visibility

## Security and privacy evidence

- Unknown, missing-version, denied, withdrawn, internal, test, bot, deletion, and suppression states are fail closed.
- Withdrawal takes precedence over an earlier grant.
- The browser does not receive raw customer identity for advanced matching.
- Email and phone matching values are normalized and hashed server-side.
- Already-hashed values are validated and not hashed again.
- Recursive operational redaction removes contact fields, authorization values, tokens, and secrets.
- Public CAPI re-resolves the policy on the server; client-provided permission is not authoritative.
- The sender suppresses any durable event that is not `CONSENT_GRANTED` under the recorded policy.
- Data-deletion requests store a hashed external reference and a recoverable status record, not a raw Meta identifier.
- Privacy-governance routes require `SUPER_ADMIN` and return safe aggregate/state data only.
- The public privacy policy documents fail-closed consent, withdrawal, retention, deletion, and backup rotation limitations.

`npm run audit:security` currently reports 16 historical findings in payment, legacy tracking, Phase 7 environment documentation, Phase 8 QA governance, and old migration documentation. After updating its stale privacy assertions, it reports **no Phase 6 privacy finding**. Those unrelated findings were not bypassed or represented as passing.

## Deferred generation and runtime evidence

Prisma generation is blocked in this isolated environment:

```text
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

Therefore these release claims remain deferred:

1. generated Prisma client freshness after the Phase 6 schema;
2. migration application and historical backfill verification on disposable PostgreSQL;
3. live Redis recovery when a deletion request is persisted but enqueue initially fails;
4. live retention cleanup resume/idempotency evidence;
5. live suppression sync and PII audit scan evidence;
6. business/legal approval of the configured retention periods and public policy wording.

Run in a network-enabled environment:

```bash
npm ci
npm run db:generate
npx prisma migrate deploy
npm run typecheck
npm run qa:meta-v6-phase6
npm run qa:tracking-test-exclusion
npm run qa:tracking-retention
npm run build
```

Then run the privacy workers against the disposable/live-safe environment:

```bash
npm run worker:privacy
npm run worker:privacy-scheduler
```

## Operational handoff

Privacy job types:

```text
PRIVACY_RETENTION_CLEANUP
PRIVACY_DELETION_PROCESSOR
TRACKING_SUPPRESSION_SYNC
PII_AUDIT_SCAN
```

Operational surfaces:

```text
POST /api/privacy/consent
GET  /api/privacy/deletion/status/:code
GET/POST /api/admin/meta/privacy        # SUPER_ADMIN
POST /data-deletion                     # Meta deletion callback
```

The policy version is centralized in `lib/privacy/consent-types.ts`. A policy change must create a new version, update the disclosure/config, pass the Phase 6 gates, and preserve prior decision records for audit.

## Rollback / forward-fix

- Stop `privacy-governance` and privacy scheduler workers during an incident; do not delete pending deletion requests or audit rows.
- Keep the fail-closed application behavior during rollback. Do not restore `nonEssentialTrackingAllowed @default(true)`.
- Prefer a forward corrective migration for schema or retention changes.
- If Redis is unavailable, leave durable deletion requests in recoverable state and allow the scheduler to re-enqueue them.
- Never replay a restricted Meta event by overriding its policy decision; obtain a current valid consent record or keep it suppressed.
- Legal/privacy wording and retention changes require business approval; this engineering evidence is not legal advice.

## Acceptance criteria

- [x] Default non-essential tracking is false in schema and migration.
- [x] Historical unversioned consent is not treated as current permission.
- [x] Every new Meta browser/outbox path has versioned policy metadata.
- [x] Raw PII is excluded from general operational logs and durable advertising payloads.
- [x] Withdrawal and suppression prevent future restricted delivery.
- [x] Deletion, retention, suppression, and PII scan workflows are durable and resumable by contract.
- [x] Phase 1–5 and repository regressions pass.
- [ ] Generated Prisma client refreshed.
- [ ] Migration applied/backfill verified on disposable PostgreSQL.
- [ ] Live Redis privacy worker recovery evidence attached.
- [ ] Retention schedule and disclosure approved by the business/legal owner.
