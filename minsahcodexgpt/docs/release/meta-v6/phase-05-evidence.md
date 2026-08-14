# Meta v6 Phase 05 Evidence — Durable Queue, Scheduling & Rate Control

**Date:** 17 July 2026  
**Project snapshot:** `minsahbeauty_meta_v6_phase05_loop_update.zip`  
**Source specification:** `docs/spec/MinsahBeauty_Meta_AZ_Final_Spec_v6_FULL.md`  
**Manifest status:** `READY_FOR_GENERATION`

## Implemented scope

- Added provider-isolated BullMQ queues for Meta CAPI, catalog sync, catalog batch status, Lead Ads, diagnostics and connection health.
- Split GA4 and TikTok jobs out of the legacy Meta queue and added dedicated provider workers.
- Added versioned, size-bounded job payloads with known queue/job/type validation and recursive secret-key rejection.
- Added PostgreSQL `MetaJobAudit` persistence with a typed lifecycle, unique idempotency key, attempts, progress, heartbeat, rate-limit state, replay lineage and terminal DLQ status.
- Added deterministic BullMQ job IDs and schedule-window idempotency keys for 5-minute, 15-minute, hourly, nightly, daily and weekly jobs.
- Changed admin/cron catalog sync, catalog batch polling and Lead webhook request paths to enqueue durable work and return HTTP 202 instead of running Graph calls inline.
- Added worker concurrency, timeout, heartbeat, custom provider backoff, lock duration and `maxStalledCount=2` recovery policy.
- Added the official engineering retry window: initial immediate attempt, then 1 minute, 5 minutes, 15 minutes and 1 hour.
- Added provider error classification, distributed fixed-window limiting, adaptive cooldown from `Retry-After` and Meta usage headers, and durable DB retry timestamps.
- Added a SUPER_ADMIN job operations API with backlog/oldest-age/heartbeat health, cancellation and audited dead-letter replay.
- Added a scheduler worker and separate catalog, batch-status, lead, diagnostics, token-health, GA4 and TikTok workers.

## Main changed files

```text
prisma/schema.prisma
prisma/migrations/20260717030000_meta_v6_phase5_durable_jobs/migration.sql
lib/jobs/connection.ts
lib/jobs/job-types.ts
lib/jobs/idempotency.ts
lib/jobs/retry-policy.ts
lib/jobs/rate-limit.ts
lib/jobs/audit-repository.ts
lib/jobs/queues.ts
lib/jobs/worker.ts
lib/jobs/scheduler.ts
lib/jobs/dead-letter.ts
lib/jobs/health.ts
lib/queue/metaCapiOutboxQueue.ts
lib/queue/metaCapiQueue.ts
lib/meta/capi/retry.ts
lib/meta/capi/sender.ts
lib/tracking/meta-business-sdk.ts
lib/tracking/meta-capi-core-event.ts
lib/tracking/meta-capi-cod-purchase.ts
workers/meta-capi-sender.worker.ts
workers/meta-catalog.worker.ts
workers/meta-batch-status.worker.ts
workers/meta-lead.worker.ts
workers/meta-diagnostics.worker.ts
workers/meta-token-health.worker.ts
workers/meta-scheduler.worker.ts
workers/ga4-events.worker.ts
workers/tiktok-events.worker.ts
app/api/admin/meta/jobs/route.ts
app/api/admin/meta/catalogs/sync/route.ts
app/api/internal/meta/catalog-sync/route.ts
app/api/internal/meta/catalog-batch-status/route.ts
app/api/webhooks/meta/leadgen/route.ts
tests/meta-v6/phase5-durable-jobs.test.ts
scripts/meta-v6-phase5-jobs-audit.mjs
scripts/tracking-runtime-health-check.mjs
scripts/meta-v6-gap-audit.mjs
package.json
config/meta-v6-phase-manifest.json
docs/release/meta-v6/phase-dashboard.json
```

## Schema and migration evidence

Migration `20260717030000_meta_v6_phase5_durable_jobs` adds:

- `MetaJobStatus`: `QUEUED`, `RUNNING`, `RETRYING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `DEAD_LETTER`
- `MetaJobAudit`
- unique `idempotencyKey` scheduler/enqueue deduplication
- queue/status, source, replay, next-run and created-time indexes
- safe JSON payload/error/rate-limit fields without provider tokens

The queue repository uses parameterized raw PostgreSQL through Prisma so Phase 5 code compiles before generated-client refresh.

## Automated gate evidence

```text
npm run qa:meta-v6-phase5
11/11 tests passed
43/43 static checks passed

npm run qa:meta-v6-phase4
11/11 tests passed
27/27 static checks passed

npm run qa:meta-v6-phase1
4/4 tests passed
9/9 static checks passed

npm run qa:meta-v6-phase2
8/8 tests passed
20/20 static checks passed

npm run qa:meta-v6-phase3
9/9 tests passed
20/20 static checks passed

npm run qa:meta-catalog-semantic
23/23 passed

npm run qa:phase12
50/50 passed

npm run qa:meta-business-platform
22/22 passed

npm test
16/16 passed

npm run typecheck:ts
exit 0

targeted ESLint
0 errors

node scripts/meta-v6-gap-audit.mjs
10/14 passed; A10 is green

REDIS_URL=<shape-only Redis URL used for this historical command> npm run qa:tracking-runtime-health
14 pass, 1 warning, 0 blockers
warning: live Redis ping intentionally not performed
```

## Security and privacy evidence

- Job validation rejects access-token, app-secret, authorization and password keys recursively.
- Webhook signature verification remains before Lead enqueue.
- Cron routes retain timing-safe shared-secret authorization.
- Admin health/replay/cancel operations require `SUPER_ADMIN`.
- Job monitor responses omit stored payloads and expose only safe operational state.
- Replay creates a new idempotency key and records `replayOfId` and replay count.
- Production Redis must use the protocol supported by the deployment: `redis://` on a protected private service network or `rediss://` when the endpoint provides TLS.

## Phase 18 protocol correction — 21 July 2026

The Phase 5 command above used a `rediss://`-shaped value only as test input. It was not evidence that every production deployment must use TLS. The governed rule is:

- use `redis://` only for Redis reachable through a protected private service network;
- use `rediss://` when the actual Redis endpoint provides TLS;
- never rewrite the protocol merely to satisfy a gate; validate connectivity from the worker network instead.

## Deferred generation and runtime evidence

Prisma generation is blocked in this isolated environment:

```text
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

Live Redis was not available, so the following are not claimed:

1. migration application on disposable PostgreSQL;
2. Redis restart after enqueue with no job loss;
3. real worker crash and stalled recovery;
4. real provider 429 cooldown without request storm;
5. DLQ replay through a deployed worker fleet;
6. active worker heartbeat and queue-age dashboard against production Redis.

Run in a network-enabled environment:

```bash
npm ci
npm run db:generate
npx prisma migrate deploy
npm run typecheck
npm run qa:meta-v6-phase5
TRACKING_DEPLOY_GATE_LIVE_REDIS=true npm run qa:tracking-deploy-gate
npm run build
```

## Operational handoff

```bash
npm run worker:meta-outbox-dispatcher
npm run worker:meta-capi
npm run worker:meta-catalog
npm run worker:meta-batch-status
npm run worker:meta-lead
npm run worker:meta-diagnostics
npm run worker:meta-token-health
npm run worker:meta-scheduler
npm run worker:ga4
npm run worker:tiktok
```

SUPER_ADMIN queue operations are exposed at `/api/admin/meta/jobs`.

## Rollback / forward-fix

- Stop Phase 5 workers and revert producers to the previous endpoints only as an emergency application rollback.
- Keep additive job audit tables for forensic evidence; do not drop them during an incident.
- Prefer a forward migration for enum/model changes.
- Never replay by mutating the original audit row; create a new replay record with lineage.

## Acceptance criteria

- [x] Provider queues are isolated.
- [x] Duplicate scheduled jobs are suppressed by DB idempotency and deterministic job IDs.
- [x] Workers have bounded stalled recovery, lock and timeout policy.
- [x] Provider retry policy covers immediate, 1m, 5m, 15m and 1h.
- [x] Rate limits use a distributed permit and adaptive cooldown contract.
- [x] DLQ replay is SUPER_ADMIN-only and auditable.
- [x] Catalog/Lead request paths do not execute long-running Meta calls inline.
- [x] Phase 1–4 and repository regressions pass.
- [ ] Generated Prisma client refreshed.
- [ ] Migration applied to disposable PostgreSQL.
- [ ] Live Redis restart/stall/rate-limit/DLQ replay evidence attached.
