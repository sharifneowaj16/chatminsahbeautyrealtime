# Meta v6 Phase 04 Evidence — Conversions API Transactional Outbox & Deduplication

**Date:** 17 July 2026  
**Project snapshot:** `minsahbeauty_meta_v6_phase04_loop_update.zip`  
**Source specification:** `docs/spec/MinsahBeauty_Meta_AZ_Final_Spec_v6_FULL.md`  
**Manifest status:** `READY_FOR_GENERATION`

## Implemented scope

- Added a dedicated PostgreSQL-backed Meta CAPI transactional outbox with explicit lifecycle states, lease fields, retry scheduling, safe diagnostics and immutable status history.
- Added DB-level provider/event-name/event-ID uniqueness and `ON CONFLICT ... DO NOTHING` insertion so duplicate Purchase attempts resolve to the same durable event.
- Inserted Purchase outbox records inside the same Prisma transaction as online payment verification, Telegram COD confirmation and admin COD confirmation.
- Changed the public non-Purchase CAPI route to persist the canonical event before best-effort Redis dispatch; a Redis outage no longer removes the committed database event.
- Added a provider-specific dispatcher that leases due rows with `FOR UPDATE SKIP LOCKED`, recovers expired leases and releases rows to a DB-scheduled retry if Redis enqueue fails.
- Added a provider-specific BullMQ sender worker. The database is the durable source of truth; BullMQ terminal jobs are removed so the same outbox identity can be re-enqueued safely.
- Added shared website-event validation for required `event_name`, `event_time`, `event_id`, `action_source=website`, `event_source_url`, `user_data` and `custom_data` fields.
- Added seven-day event-age validation, bounded future skew, query/fragment removal from source URLs, deterministic Purchase event IDs, normalize-before-hash helpers and double-hash protection.
- Added transient/auth/permanent provider classification, a bounded five-attempt retry policy (immediate, +1m, +5m, +15m, +1h) and permanent retry-exhaustion state.
- Limited `META_TEST_EVENT_CODE` to non-production requests.
- Added a SUPER_ADMIN event monitor API with safe payloads, state filtering and manual replay that preserves the original event ID.
- Updated the existing tracking-health manual retry path to requeue the durable outbox rather than directly enqueueing the legacy provider job.

## Main changed files

```text
prisma/schema.prisma
prisma/migrations/20260717020000_meta_v6_phase4_capi_outbox/migration.sql
lib/meta/capi/types.ts
lib/meta/capi/event-id.ts
lib/meta/capi/user-data.ts
lib/meta/capi/custom-data.ts
lib/meta/capi/validator.ts
lib/meta/capi/response.ts
lib/meta/capi/diagnostics.ts
lib/meta/capi/builder.ts
lib/meta/capi/retry.ts
lib/meta/capi/outbox-repository.ts
lib/meta/capi/dispatcher.ts
lib/meta/capi/sender.ts
lib/meta/capi/purchase-outbox.ts
lib/meta/capi/core-outbox.ts
lib/queue/metaCapiOutboxQueue.ts
workers/meta-outbox-dispatcher.worker.ts
workers/meta-capi-sender.worker.ts
app/api/payments/verified/route.ts
app/api/telegram/order-callback/route.ts
app/api/admin/orders/[id]/route.ts
app/api/facebook-capi/route.ts
app/api/admin/meta/events/route.ts
app/api/admin/tracking-health/route.ts
lib/tracking/meta-business-sdk.ts
lib/tracking/meta-capi-cod-purchase.ts
lib/meta-business/offline.ts
tests/meta-v6/phase4-capi-outbox.test.ts
scripts/meta-v6-phase4-outbox-audit.mjs
scripts/meta-v6-gap-audit.mjs
scripts/tracking-phase12-capi-schema-audit.mjs
package.json
config/meta-v6-phase-manifest.json
docs/release/meta-v6/phase-dashboard.json
```

## Schema and migration evidence

Migration `20260717020000_meta_v6_phase4_capi_outbox` adds:

- `MetaEventOutboxStatus`
- `MetaEventOutbox`
- `MetaEventOutboxStatusEvent`
- unique index on `(provider, eventName, eventId)`
- dispatch, lease, order/source and history indexes
- nullable Order relation with `ON DELETE SET NULL`

The repository uses raw parameterized PostgreSQL operations through the active Prisma transaction client so order/payment state and outbox insertion share one transaction even before the generated client contains the new model delegate.

## Semantic fixtures

Phase 4 tests cover:

- required website CAPI fields
- seven-day age limit and future-skew rejection
- source URL query/fragment stripping
- deterministic browser/server Purchase event ID
- email/phone normalization, SHA-256 hashing and already-hashed input handling
- bounded 1m/5m/15m/1h retry schedule and five-attempt limit
- transient, auth and permanent provider response classification
- Prisma schema/migration DB uniqueness
- `SKIP LOCKED` leasing and status history
- atomic Purchase outbox calls in three business-state transaction paths
- dedicated dispatcher/sender queue identity and recovery contract

## Automated gate evidence

```text
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

npm run qa:phase12
50/50 passed

npm test
16/16 passed

npm run typecheck:ts
exit 0

node scripts/meta-business-platform-audit.mjs
22/22 passed

node scripts/meta-catalog-semantic-audit.mjs
23/23 passed

node scripts/meta-v6-gap-audit.mjs
9/14 passed; A9 and A11 are green, remaining blockers belong to later phases

targeted ESLint
0 errors
```

## Security and privacy evidence

- Meta access tokens remain server-only and are never written into outbox safe payloads or admin responses.
- Event monitor returns `safePayload`, status, timing and safe error/response metadata; it does not return the raw persisted payload.
- Website source URLs are reduced to protocol, host and pathname before persistence/send validation.
- Customer values are normalized before SHA-256 hashing; already-hashed values are not hashed again.
- Production requests cannot attach `META_TEST_EVENT_CODE`.
- Manual replay is SUPER_ADMIN-only and preserves the original provider/event-name/event-ID uniqueness key.

## Deferred generation and migration evidence

`npx prisma validate` / Prisma generation could not download the required schema engine because this isolated environment could not resolve `binaries.prisma.sh` (`getaddrinfo EAI_AGAIN`). Therefore the migration was inspected and exercised through static/semantic tests, but generated-client refresh and disposable PostgreSQL migration application are not claimed.

Run in a network-enabled build/deployment environment:

```bash
npm ci
npm run db:generate
npx prisma migrate deploy
npm run typecheck
npm run qa:meta-v6-phase4
npm run build
```

Then capture:

1. successful Prisma generation checksum update;
2. migration application on disposable PostgreSQL;
3. order rollback produces no outbox row;
4. committed order with Redis unavailable leaves a `PENDING`/`RETRY_SCHEDULED` row;
5. dispatcher recovery sends the original event ID exactly once;
6. Meta Test Events accepts the request and browser/server Purchase deduplicates.

## Operational handoff

Start the dedicated workers with:

```bash
npm run worker:meta-outbox-dispatcher
npm run worker:meta-capi-sender
```

Operational environment controls:

```text
META_OUTBOX_DISPATCH_INTERVAL_MS
META_OUTBOX_DISPATCH_BATCH_SIZE
META_CAPI_SENDER_CONCURRENCY
```

The Event Monitor API is available under `/api/admin/meta/events` for SUPER_ADMIN users. Failed non-sent rows can be manually replayed without changing the original event identity.

## Rollback / forward-fix

- Application rollback may stop the two new workers and revert call sites while leaving the additive outbox tables intact.
- Do not destructively drop outbox/history tables in production during rollback; retain events for audit and forward migration.
- Prefer a forward corrective migration for schema changes.
- Replaying a row must retain its original event name and event ID to protect Meta deduplication.

## Acceptance criteria

- [x] Purchase business-state transactions insert the outbox before commit.
- [x] Redis enqueue failure cannot delete a committed database event.
- [x] Duplicate provider/event-name/event-ID is DB-level blocked.
- [x] Core website events require action source, source URL and complete event identity.
- [x] Seven-day age and future-skew validation is enforced.
- [x] Transient retries and permanent failures are visible in durable state/history.
- [x] Manual replay preserves the original event identity.
- [x] Production test-event code is blocked.
- [x] Phase 1–3 and repository regressions pass.
- [ ] Generated Prisma client refreshed in a network-enabled environment.
- [ ] Migration deployed successfully to disposable PostgreSQL.
- [ ] Redis-outage/recovery integration evidence attached.
- [ ] Meta Test Events Purchase deduplication evidence attached.
