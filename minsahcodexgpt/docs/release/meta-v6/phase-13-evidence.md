# Meta v6 Phase 13 Evidence — Ads Insights & Approval-Based Automation

Date: 18 July 2026  
State: `READY_FOR_GENERATION`  
Branch label: `artifact/meta-v6-phase-13`

## Scope delivered

Phase 13 now provides a fail-closed Ads control chain:

```text
Meta read-only Insights API
→ typed sync run
→ idempotent normalized snapshot
→ three-run freshness/stability gate
→ human-reviewed recommendation
→ exact immutable approval payload
→ server-side mutation normalization and caps
→ provider write
→ provider state re-read
→ immutable before/provider/after execution evidence
```

No recommendation directly mutates a campaign, ad set, creative or ad.

## Persistence and migration

Migration:

```text
prisma/migrations/20260718050000_meta_v6_phase13_ads_automation/migration.sql
```

Added typed lifecycle enums:

- `MetaAdsInsightLevel`: `ACCOUNT`, `CAMPAIGN`, `ADSET`, `AD`
- `MetaAdsInsightSyncStatus`: `RUNNING`, `SUCCEEDED`, `FAILED`
- `MetaAdsRecommendationType`: `SCALE_BUDGET`, `REDUCE_BUDGET`, `PAUSE_ENTITY`, `RESUME_ENTITY`, `REVIEW_CREATIVE`
- `MetaAdsRecommendationStatus`: `OPEN`, `APPROVAL_REQUESTED`, `APPLIED`, `DISMISSED`, `EXPIRED`
- `MetaAdsMutationStatus`: `EXECUTING`, `SUCCEEDED`, `FAILED`, `RECONCILIATION_REQUIRED`

Added models:

- `MetaAdsInsightSyncRun`
- `MetaAdsInsightSnapshot`
- `MetaAdsRecommendation`
- `MetaAdsMutationExecution`

Insight snapshots are uniquely keyed by account, level, entity, date window and canonical breakdown hash. Mutation executions are uniquely reserved by approval ID before the provider write, preventing approval reuse.

## Read-only insights contract

`lib/meta/ads/insights.ts`:

- defaults to the previous complete seven-day UTC window;
- supports account, campaign, ad-set and ad levels;
- normalizes impressions, reach, clicks, link clicks, spend, CTR, CPC, CPM, purchases, purchase value, ROAS and frequency;
- persists a typed run before contacting the provider;
- upserts snapshots through a deterministic breakdown hash;
- stores redacted failure evidence;
- exposes aggregate summary values without merging them into first-party attribution data.

A dedicated queue and worker were added:

```text
queue: meta-ads-insights
job: ads-insights-sync
schedule: every 6 hours
worker: workers/meta-ads-insights.worker.ts
concurrency: 1
provider limiter: 2 jobs/minute
job timeout: 5 minutes
```

The production scheduler must remain read-only until runtime evidence is attached.

## Stability gate

`lib/meta/ads/safety.ts` requires:

- three consecutive latest `SUCCEEDED` sync runs;
- no failed or running result interrupting the consecutive sequence;
- a latest successful snapshot no older than the configured 26-hour freshness horizon.

Every mutation execution calls the stability assertion again immediately before reserving the execution row and contacting Meta. A stale or failed latest run closes the gate.

## Recommendation contract

`lib/meta/ads/recommendations.ts` creates bounded, expiring, idempotent recommendations for:

- high spend with zero purchases → pause review;
- spend with ROAS below 1.0 → budget-reduction review;
- at least three purchases with ROAS at or above 3.0 → controlled scale review;
- ad frequency at or above 4 with CTR below 0.8% → creative-fatigue review.

Recommendations persist rationale, severity, proposed mutation and canonical payload hash. They expire or can be dismissed through audited, permission-scoped admin actions. They are never auto-applied.

## Approval-only mutation contract

Campaign, ad-set, creative and ad write routes now require:

1. `META_OPS_OPERATE` permission;
2. a non-empty approval ID;
3. the critical `META_AD_MUTATION` policy;
4. a separate valid approver through the Phase 9 two-person approval service;
5. exact canonical payload equality;
6. a stable read-only ingestion gate;
7. an unused approval-specific execution reservation.

The legacy direct provider write path was removed from all four route families.

Supported operation types:

```text
CREATE_CAMPAIGN
UPDATE_CAMPAIGN
CREATE_ADSET
UPDATE_ADSET
CREATE_CREATIVE
UPDATE_CREATIVE
CREATE_AD
UPDATE_AD
```

## Server-side safety controls

The mutation normalizer:

- rejects every field outside operation-specific allowlists;
- requires resource IDs for updates;
- forces newly created campaigns, ad sets and ads to `PAUSED`;
- enforces positive environment-configured caps;
- checks existing provider minor-unit values before allowing an increase;
- rejects any single approval that increases daily budget, lifetime budget or bid by more than the configured percentage.

Default caps:

```text
META_ADS_MAX_DAILY_BUDGET_BDT=50000
META_ADS_MAX_LIFETIME_BUDGET_BDT=500000
META_ADS_MAX_BID_BDT=10000
META_ADS_MAX_BUDGET_INCREASE_PERCENT=25
```

These are server controls, not trusted client values.

## Before/after and partial-failure safety

Before provider mutation, the service fetches and redacts current state for updates. It then reserves a unique execution row by approval ID.

After provider success:

- the entity ID is resolved;
- the provider object is re-read;
- redacted provider result and after-state are persisted;
- the execution becomes `SUCCEEDED` only when the post-write state can be read.

If the provider write returns success but the entity ID or re-read cannot be proven, the execution becomes `RECONCILIATION_REQUIRED`. The service does not blindly retry a potentially successful mutation. A database create error is reported as approval reuse only when an existing execution row is actually found; unrelated database failures are rethrown.

## Operations Center

`/admin/meta` now includes an Ads Insights area that shows:

- aggregate spend, purchases, ROAS and CTR;
- latest read-only stability state and run count;
- server-side safety caps;
- normalized insight snapshots;
- human-reviewed recommendations;
- exact mutation approval requests;
- approved mutation execution controls;
- mutation execution and reconciliation ledger.

## Automated evidence

```text
Phase 13 semantic tests                    15/15 passed
Phase 13 static audit                      56/56 passed
Global Meta v6 strict blocker gate          14/14 passed
Admin API security scan                 92 routes passed
Meta Business platform audit               22/22 passed
Phase 12 regression                  14/14 + 51/51 passed
Phase 11 regression                  13/13 + 41/41 passed
Phase 10 regression                  12/12 + 40/40 passed
Phase 09 regression                  11/11 + 30/30 passed
Phase 08 regression                  14/14 + 68/68 passed
Repository npm test                         16/16 passed
Direct TypeScript compiler                       passed
Targeted ESLint                    0 errors / 0 warnings
```

Full validation logs:

- `docs/release/meta-v6/phase-13-validation.log`
- `docs/release/meta-v6/phase-13-prisma-validation.log`
- `docs/release/meta-v6/phase-13-master-tracking.log`

## Master tracking gate status

`qa:master-tracking` remains **66 passed / 8 failed**. The failures are inherited historical documentation/runtime-proof checks for tracking lifecycle, product URL reporting, production QA, deploy-runtime health and TikTok documentation. They are not caused by the Phase 13 Ads implementation and are not represented as passing.

## Generation and migration hold

Both `npx prisma validate` and `npm run db:generate` were attempted. They failed before schema-engine validation because the environment could not resolve the Prisma binary host:

```text
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

The generated-client freshness guard was not bypassed. Direct TypeScript validation passes, but release generation and database migration proof remain outstanding.

Before deployment:

```bash
npm ci
npm run db:generate
npx prisma validate
npx prisma migrate deploy
npm run qa:meta-v6-phase13
npm run qa:admin-api-security
npm run qa:meta-business-platform
npm run qa:meta-v6-gap
npm run typecheck:ts
npm test
npm run build
```

## Remaining evidence

1. Generate Prisma Client and apply/rollback the migration in disposable PostgreSQL.
2. Complete three consecutive live read-only Insights syncs and attach run/snapshot evidence.
3. Prove the write gate stays closed after a failed or stale sync.
4. Execute a separate-requester/separate-approver mutation against an owned Meta ad account.
5. Attach exact approval payload, provider before-state, provider result, after-state and immutable audit/execution rows.
6. Exercise absolute cap, percentage-increase cap and provider re-read failure in a production-like environment.
7. Run the six-hour worker repeatedly with production Redis and attach scheduling/idempotency evidence.
8. Resolve the eight inherited master-tracking documentation/runtime-proof failures.

## Acceptance criteria status

- [x] Normalized, idempotent read-only insight persistence is implemented and statically/semantically tested.
- [x] Three-run freshness gate is implemented and tested for success, failure and stale cases.
- [x] No campaign/ad-set/creative/ad mutation route can bypass exact critical approval.
- [x] New mutable ad entities are forced to `PAUSED`.
- [x] Absolute and per-approval relative budget/bid caps are enforced server-side.
- [x] Before/provider/after execution evidence and safe reconciliation state are implemented.
- [x] Recommendations are human-review-only and never auto-applied.
- [ ] Prisma generation and disposable-database migration evidence attached.
- [ ] Three consecutive live Insights runs attached.
- [ ] Live two-person provider mutation and before/after evidence attached.
- [ ] Production worker and reconciliation runtime evidence attached.
