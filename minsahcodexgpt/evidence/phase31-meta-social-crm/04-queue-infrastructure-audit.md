# Phase 31 Layer 4.1 — Existing Queue and Job Infrastructure Audit

**Generated:** 2026-07-25T16:31:37Z  
**Input archive:** `minsahbeauty_phase31_layer3.8_runtime_blocked.zip`  
**Input SHA-256:** `9ca99762561b3026397a0cd381aca419bb3467bc12fe0ef0cfda64f139d438f1`  
**Numbered item:** `4.1 Existing queue/job infrastructure audit`  
**Execution type:** audit-only  
**Schema change:** NO  
**Migration:** NO

## Checkpoint note

The input archive's Layer 3.8 verification log records the earlier sandbox verdict `Layer 3 final status: BLOCKED` because `psql`, a PostgreSQL server and Docker were unavailable there. The project operator subsequently confirmed that the production PostgreSQL/Prisma drill is working and authorized Layer 4.1. This Layer 4.1 package records that statement as **operator-confirmed prerequisite evidence**; it does not claim that the database drill was independently rerun in this workspace.

## Executive verdict

```text
Layer 4.1 status: PASS

Primary main-app queue provider: BullMQ 5.79.2 + Redis through ioredis 5.10.1
Reuse vs new decision: REUSE existing BullMQ/Redis and lib/jobs framework
Durable webhook source: MetaSocialWebhookReceipt plus legacy receipt compatibility records
Durable job execution audit: MetaJobAudit
Lead processing worker: PRESENT
Instagram inbound worker: PRESENT
Connection/permission health worker: PRESENT
Shared Instagram outbound jobs: MISSING
Shared social media validation job: MISSING
Generic Redis-enqueue recovery: MISSING
Instagram deferred receipt recovery: MISSING
Retry-After support: PRESENT
Retry jitter: MISSING
Main-app/realtime retry overlap: PRESENT
Realtime custom queue crash-safe claim: MISSING
Production startup ownership for all social workers: NOT PROVEN BY ARCHIVE
Schema change: NO
Migration: NO
Exact next item: Layer 4.2 — Shared social queue contract and adapter
```

The existing foundation is strong enough to reuse. Layer 4 must not introduce Kafka, RabbitMQ, SQS or a second main-app queue provider. The main design problem is not queue availability; it is ownership, durable reconstruction, provider-agnostic contracts and removing parallel retry semantics over time.

## 1. Audit scope

The audit inspected:

```text
package.json
prisma/schema.prisma
lib/jobs/*
workers/*
lib/meta/leads/handoff.ts
lib/meta/leads/service.ts
lib/meta/instagram/service.ts
lib/meta/instagram/messages.ts
instrumentation.ts
docker-entrypoint.sh
Dockerfile
nixpacks.toml
realtime-service/src/index.ts
realtime-service/src/routes/webhook.router.ts
realtime-service/src/facebook/*
realtime-service/prisma/schema.prisma
app/api/admin/meta/jobs/route.ts
app/api/admin/meta/operations/summary/route.ts
```

No queue behavior, worker processor, provider call, schema, migration or deployment configuration was changed by this item.

## 2. Existing queue provider decision

| Runtime | Provider | Persistence mechanism | Decision |
|---|---|---|---|
| Main application | BullMQ `5.79.2` | Redis via ioredis plus PostgreSQL `MetaJobAudit` | Reuse |
| Realtime Facebook service | Custom Redis sorted sets | Redis members plus PostgreSQL `FbOutboxMessage` / `FbDeadLetterJob` | Keep temporarily; align in Layer 6 |
| Legacy embedded CAPI/product workers | Existing application-specific worker implementations | Mixed existing stores | Do not redesign in 4.1 |

### Why BullMQ is retained

- It is already a production dependency.
- Queue names, payload validation, idempotency, worker runtime limits, retries, heartbeats, health and admin replay already exist.
- Lead Ads and Instagram webhook paths already use durable receipt-first enqueue handoff.
- Introducing another provider would increase operational and data consistency risk without solving the current ownership gaps.

## 3. Main-app queue inventory

| Queue | Existing jobs | Consumer | Runtime policy | Layer 4 relevance |
|---|---|---|---|---|
| `meta-capi-events` | `meta-capi-outbox` | `workers/meta-capi-sender.worker.ts` | concurrency 4, 90s timeout, one BullMQ attempt | Existing non-social framework proof |
| `meta-catalog-sync` | `catalog-sync` | `workers/meta-catalog.worker.ts` | concurrency 1, 10m timeout | Existing shared framework |
| `meta-catalog-status` | `catalog-status` | `workers/meta-batch-status.worker.ts` | concurrency 2, 2m timeout | Existing shared framework |
| `meta-leads` | `lead-fetch`, `lead-form-sync`, `lead-assign`, `lead-receipt-recovery`, `lead-sla-alert`, `lead-retention` | `workers/meta-lead.worker.ts` | concurrency 4, 60s timeout | Reuse for Lead social jobs |
| `meta-diagnostics` | `catalog-diagnostics` | `workers/meta-diagnostics.worker.ts` | concurrency 1, 2m timeout | Existing shared framework |
| `meta-connection-health` | `connection-health` | `workers/meta-token-health.worker.ts` | concurrency 1, 60s timeout | Reuse for permission health |
| `meta-product-sets` | `product-set-reconcile` | `workers/meta-product-sets.worker.ts` | concurrency 1, 10m timeout | Existing framework; startup gap noted |
| `meta-ads-insights` | `ads-insights-sync` | `workers/meta-ads-insights.worker.ts` | concurrency 1, 5m timeout | Existing framework |
| `meta-instagram` | `instagram-message`, `instagram-retention` | `workers/meta-instagram.worker.ts` | concurrency 4, 2m timeout | Reuse for Instagram inbound; extend through canonical adapter |

### Queue/job validation already present

`lib/jobs/job-types.ts` provides:

- schema version `1`;
- maximum payload size `32 KiB`;
- queue-to-job allowlist;
- payload-type-to-job mapping;
- required idempotency key and ISO request time;
- bounded correlation ID validation;
- denylist detection for access tokens, secrets, authorization, email, phone, raw Lead fields, normalized data and raw payloads.

This satisfies the principle that queue entries should contain durable references, not secret-bearing webhook bodies.

## 4. Durable job audit and idempotency

The Prisma `MetaJobAudit` model stores:

```text
queueName
jobName
externalJobId
idempotencyKey UNIQUE
correlationId
status
attempts / maxAttempts
progress
sourceId
payload
lastError
rateLimitState
replayOfId / replayCount
requestedBy
nextRunAt
startedAt / completedAt / lastHeartbeatAt
```

Current execution states:

```text
QUEUED
RUNNING
RETRYING
SUCCEEDED
FAILED
CANCELLED
DEAD_LETTER
```

Current enqueue sequence:

```text
validate safe payload
→ reserve MetaJobAudit with unique idempotencyKey
→ derive deterministic BullMQ job ID from queue + idempotency key
→ add Redis/BullMQ job containing auditId and durable source IDs
→ attach externalJobId
```

The database reservation occurs before Redis enqueue. This is the correct foundation for detecting a queue handoff failure.

### Important idempotency limitation

`MetaJobAudit.idempotencyKey` is globally unique. Existing builders include a job-purpose prefix, so known keys are practically namespaced. Layer 4.2 must preserve this convention explicitly in its canonical dedupe-key contract rather than relying on every producer to remember it.

## 5. Webhook-to-queue handoff map

### Lead Ads

```text
shared verified webhook transport
→ canonical + legacy durable receipt
→ enqueueMetaLeadFetchJob(receiptId, leadgenId, pageId, formId)
→ canonical receipt RECEIVED → QUEUED
→ legacy receipt → QUEUED
→ meta-lead worker
→ receipt lease claim + normalized Lead processing
```

`lead-fetch` is the current implementation equivalent of canonical `PROCESS_META_LEAD`.

Lead handoff failure behavior:

```text
legacy receipt → FAILED
HTTP/webhook handoff record → DEFERRED / QUEUE_HANDOFF_FAILED
five-minute lead-receipt-recovery job scans recoverable Lead receipts
```

### Instagram inbound

```text
shared verified webhook transport
→ canonical + legacy durable receipt
→ enqueueMetaInstagramMessageJob(receiptId)
→ canonical receipt RECEIVED → QUEUED
→ legacy receipt → QUEUED
→ meta-instagram worker
→ receipt lease claim + conversation/message persistence
```

`instagram-message` is the current implementation equivalent of canonical `PROCESS_INSTAGRAM_INBOUND`.

Instagram handoff failure behavior:

```text
legacy receipt → FAILED
HTTP/webhook handoff record → DEFERRED / QUEUE_HANDOFF_FAILED
```

No dedicated Instagram receipt-recovery job or generic social receipt recovery scanner was found. Therefore Instagram can remain durably recorded but not automatically re-enqueued after a Redis handoff failure.

## 6. Retry and backoff audit

Current main-app schedule:

```text
attempt 1: immediate
attempt 2: 1 minute
attempt 3: 5 minutes
attempt 4: 15 minutes
attempt 5: 1 hour
```

| Requirement | Current status | Evidence/impact |
|---|---|---|
| Bounded maximum attempts | Present | `META_PROVIDER_MAX_ATTEMPTS = 5` |
| Retry-After support | Present | `retryAfterMs` / `retryAfterSeconds` can extend delay |
| Provider error taxonomy | Present | `RATE_LIMIT`, `TRANSIENT`, `AUTH`, `PERMANENT` |
| BullMQ custom backoff | Present | `meta-provider` backoff strategy |
| Exponential backoff | Partial | staged deterministic schedule in main app; exponential in realtime custom queues |
| Jitter | Missing | simultaneous failures can retry together |
| Central permanent-error enforcement | Partial | shared worker only treats `UnrecoverableError` or final attempt as terminal; processors must translate errors correctly |
| Unknown-write reconciliation | Missing from shared queue layer | required before outbound retry jobs are introduced |

Although `getMetaProviderRetryDecision()` classifies permanent/auth errors, `startMetaJobWorker()` does not call that function. A domain processor that throws an ordinary 4xx/auth error can therefore retry until attempts are exhausted unless it converts the error to BullMQ `UnrecoverableError`.

## 7. Main-app worker crash behavior

BullMQ runtime protection already includes:

```text
maxStalledCount = 2
stalledInterval = 30 seconds
lockDuration = max(60 seconds, job timeout + 30 seconds)
worker heartbeat every 15 seconds with 45-second expiry
MetaJobAudit stalled state = RETRYING
```

Layer 3 receipt processing additionally has database lease claim/reclaim and stale-worker fencing. The intended combined flow is:

```text
BullMQ obtains transport lock
→ worker claims canonical receipt DB lease
→ worker performs idempotent business persistence
→ worker commits terminal receipt state
→ BullMQ acknowledges completion
```

### Crash matrix

| Failure point | Current outcome | Assessment |
|---|---|---|
| Before BullMQ claim | Job remains waiting/delayed | Safe |
| After BullMQ claim, before receipt claim | BullMQ stalled/retry path | Safe when worker restarts |
| After receipt claim, before business write | Receipt lease expires and can be reclaimed | Safe foundation |
| After idempotent DB write, before receipt completion | Retry can converge through DB uniqueness/dedupe | Safe foundation; job-specific verification still required |
| After provider write, before result persistence | No shared reconciliation contract | Unsafe for future outbound writes; must not blind-retry |
| Worker process unavailable indefinitely | Redis job and DB audit remain, but no execution | Operational startup/health dependency |

## 8. Queue outage behavior

| Scenario | Durable evidence | Automatic recovery | Verdict |
|---|---|---|---|
| Redis unavailable before queue add | `MetaJobAudit` reserved then marked `RETRYING` with `REDIS_ENQUEUE_FAILED` | No generic `MetaJobAudit` re-enqueue sweeper found | Partial |
| Lead Redis handoff fails | Lead receipt remains `FAILED`; handoff returns `DEFERRED` | Five-minute Lead receipt recovery exists | Covered for Lead |
| Instagram Redis handoff fails | Instagram receipt remains `FAILED`; handoff returns `DEFERRED` | No Instagram recovery job found | Gap |
| Worker unavailable | Redis job remains; queue health heartbeat becomes stale | Requires deployment restart/worker process | Operational gap/proof required |
| Redis data loss | DB receipts and `MetaJobAudit` can show unfinished intent | No generic reconstruction process found | Gap |
| Database unavailable before receipt/audit | Durable receipt/audit cannot be established | Webhook must remain retryable/fail closed | Expected dependency |

`nextRunAt` is recorded and indexed, but no source path was found that selects due `MetaJobAudit` rows with `REDIS_ENQUEUE_FAILED` and reconstructs the BullMQ job. Layer 4.7 must provide a standard recovery owner, or Layer 4.2 must expose the contract that 4.7 will implement.

## 9. Scheduler and cron dependencies

The main scheduler is a standalone process using `setInterval` and UTC schedule calculations. It schedules:

- Lead receipt recovery every 5 minutes;
- Lead SLA scan every 5 minutes;
- Lead retention daily;
- Instagram retention daily;
- connection/token/permission/asset health daily;
- API version health weekly;
- several catalog/ads maintenance jobs.

### Scheduler findings

| Concern | Current behavior | Status |
|---|---|---|
| Time basis | UTC | Good |
| Same-process overlap | in-memory `running` guard | Good for one process |
| Multi-replica overlap | no distributed scheduler lock | Depends on idempotency keys; not an ownership lock |
| Duplicate schedule protection | time-window/day/week idempotency keys | Present |
| Missed-run backfill | no generic catch-up scan | Missing |
| Scheduler health | no scheduler-specific durable heartbeat found | Gap |
| Startup | `worker:meta-scheduler` standalone script | Present; deployment proof absent |

## 10. Worker startup and production ownership

Available standalone scripts include:

```text
worker:meta-lead
worker:meta-instagram
worker:meta-scheduler
worker:meta-token-health
worker:all
```

`worker:all` includes Lead, Instagram, scheduler and connection-health workers. It does **not** include `worker:meta-product-sets`, despite that queue and worker existing.

The Next.js `instrumentation.ts` embedded path starts only:

```text
lib/workers/productWorker
lib/workers/metaCapiWorker
```

It does not start:

```text
workers/meta-lead.worker.ts
workers/meta-instagram.worker.ts
workers/meta-scheduler.worker.ts
workers/meta-token-health.worker.ts
workers/meta-product-sets.worker.ts
```

`docker-entrypoint.sh` says “embedded BullMQ workers,” but that message is broader than the actual embedded worker set. `nixpacks.toml` only runs `npm run start`. No Dokploy, PM2, systemd or other deployment definition proving a separate `worker:all` process was found in the archive.

### Operational decision

Layer 4.1 does not edit deployment behavior. It records that production must have explicit process ownership for at least:

```text
main web process
social queue worker process(es)
scheduler process
realtime service process
```

A queue implementation cannot be considered operational merely because worker source files and npm scripts exist.

## 11. Dead-letter and replay audit

### Main application

`MetaJobAudit` supports `DEAD_LETTER`, `replayOfId`, `replayCount` and `requestedBy`. `replayMetaDeadLetter()`:

- permits replay from `DEAD_LETTER`, `FAILED` or `CANCELLED`;
- creates a new random replay idempotency key;
- revalidates the stored payload;
- enqueues a new job linked to the original audit;
- increments original replay count.

Admin APIs provide queue health, cancellation and replay operations under existing admin action controls.

### Main replay gaps for social writes

Generic replay does not itself prove:

- reply-window re-evaluation;
- private-reply one-shot enforcement;
- kill-switch re-evaluation;
- unknown-write reconciliation;
- approval reason stored on the canonical receipt replay chain;
- replay cannot bypass the business-record dedupe boundary.

These must be enforced by the social job/domain contract, not only by the generic queue replay helper.

## 12. Realtime Facebook queue overlap

The realtime service independently starts three Redis sorted-set workers:

```text
fb:outgoing:retry
fb:media:retry
fb:replay:queue
```

It also persists dead letters in `FbDeadLetterJob`, separate from main-app `MetaJobAudit`.

### Realtime queue characteristics

| Capability | Implementation | Retry | Dead letter |
|---|---|---|---|
| Facebook outgoing send | custom sorted set | exponential delay, bounded attempts | `FbDeadLetterJob` |
| Facebook media persistence | custom sorted set | exponential delay, bounded attempts | `FbDeadLetterJob` |
| Inbox replay/persistence | custom sorted set | exponential delay, bounded attempts | `FbDeadLetterJob` |

### Critical claim/crash gap

All three custom workers claim by:

```text
ZRANGEBYSCORE due members
→ ZREM member
→ JSON.parse
→ process
```

The item is removed from Redis before processing and there is no processing lease/visibility-timeout queue. A process crash after `ZREM` and before explicit re-enqueue can lose the transport job. The database may retain partial business evidence, but the sorted-set member itself has no automatic reclaim path.

### Sensitive payload gap

Realtime sorted-set and dead-letter payloads embed message text and attachment/source URLs. This differs from the main queue rule that jobs should carry durable IDs and safe references only. Layer 6 must align or isolate this behavior; Layer 4.1 does not copy it into the new shared social queue contract.

### Webhook ownership overlap

The realtime Facebook webhook route acknowledges first and then processes events in-process with `void processWebhookBatch(...)`; it does not use the main BullMQ receipt/job contract. Failures may enter the custom replay queue. This remains a separate reliability domain until the planned realtime bridge layer.

## 13. Required Layer 4 job gap matrix

| Canonical required job | Existing equivalent | Current owner | Durable source | Status | Planned numbered item |
|---|---|---|---|---|---|
| `PROCESS_META_LEAD` | `lead-fetch` | main `meta-leads` worker | canonical/legacy receipt | Partial foundation present | 4.2 mapping, 4.3 completion |
| `PROCESS_INSTAGRAM_INBOUND` | `instagram-message` | main `meta-instagram` worker | canonical/legacy receipt | Partial foundation present | 4.2 mapping, 4.4 completion |
| `SEND_INSTAGRAM_REPLY` | none in shared queue | synchronous legacy Instagram domain path | durable reply attempt/message state exists | Missing queue job | 4.2 contract, 4.5 worker |
| `SEND_INSTAGRAM_PRIVATE_REPLY` | none in shared queue | synchronous legacy Instagram domain path | private-reply reservation/attempt state exists | Missing queue job | 4.2 contract, 4.5 worker |
| `VALIDATE_SOCIAL_ATTACHMENT` | realtime `fb:media:retry` is not compatible | realtime service/custom | embedded URL/text payload | Missing shared job | 4.2 contract, 4.6 worker |
| `REPLAY_SOCIAL_EVENT` | generic `replayMetaDeadLetter`; realtime custom replay | split ownership | job audit or embedded realtime payload | Policy-specific job missing | 4.2 contract, 4.7 controls |
| `SYNC_FACEBOOK_PAGE_INBOX` | realtime inbox sync scheduler | realtime service | Facebook/realtime DB state | Shared main job missing | 4.2 contract; domain bridge later |
| `REFRESH_META_PERMISSION_HEALTH` | `connection-health` | main `meta-connection-health` worker | connection identity/config | Mostly present | 4.2 canonical mapping |

## 14. Main app and realtime ownership decision

Until Layer 6:

```text
Lead Ads processing ownership:
  main application BullMQ only

Instagram inbound processing ownership:
  main application BullMQ only

Instagram outbound jobs introduced in Layer 4:
  main application BullMQ only

Facebook Page outgoing/media/replay ownership:
  existing realtime service remains temporary owner

Rule:
  main and realtime runtimes must not concurrently own the same provider write
  or independently retry the same durable action.
```

Layer 4 must expose a provider-agnostic contract, but it must not silently migrate or delete the realtime queues. Their final bridge/replacement/alignment belongs to Layer 6 with cutover and rollback evidence.

## 15. Reuse-versus-new final decision

```text
Decision: REUSE

Reuse:
- BullMQ and ioredis connection
- lib/jobs queue registry and payload validation
- deterministic BullMQ job IDs
- MetaJobAudit reservation and execution audit
- worker heartbeat, stall detection, timeout and rate limits
- existing Lead and Instagram inbound job names during compatibility period
- admin queue health and generic replay foundation

Do not reuse as target design:
- realtime ZSET remove-before-process claim pattern
- embedded message text/source URL job payloads
- parallel main/realtime retry ownership
- processor-specific responsibility to remember all permanent error rules
```

## 16. Exact Layer 4.2 implementation boundary

Layer 4.2 must create a social-specific provider-agnostic contract over the existing `lib/jobs` infrastructure. Recommended paths:

```text
lib/meta-platform/queue/social-job-types.ts
lib/meta-platform/queue/social-job-envelope.ts
lib/meta-platform/queue/social-queue-adapter.ts
lib/meta-platform/queue/bullmq-social-adapter.ts
```

Required Layer 4.2 scope:

1. Define the eight canonical social job types.
2. Define a versioned envelope containing:
   - canonical job type;
   - durable receipt/business request ID;
   - attempt number;
   - correlation ID;
   - scheduled timestamp;
   - namespaced dedupe key;
   - safe payload reference only;
   - observability metadata.
3. Define enqueue, claim, acknowledge and negative-acknowledge result contracts without coupling domain code to BullMQ types.
4. Implement a BullMQ adapter that wraps existing `enqueueMetaJob()` and existing worker primitives.
5. Map canonical `PROCESS_META_LEAD` to existing `lead-fetch` and canonical `PROCESS_INSTAGRAM_INBOUND` to existing `instagram-message` without immediate production job renaming.
6. Map `REFRESH_META_PERMISSION_HEALTH` to existing `connection-health` where compatible.
7. Define queue-unavailable outcomes so the caller can leave the durable receipt/request recoverable.
8. Enforce ID/reference-only payloads and prohibit tokens, raw provider payloads, PII, message text and source URLs.
9. Record that recovery scanning, jitter, DLQ policy, replay approval and unknown-write reconciliation are implemented in later numbered items, not hidden inside the adapter.

Explicitly out of Layer 4.2:

```text
Lead business processing changes
Instagram conversation/message processing changes
provider outbound write execution
media download/scanning
retry/dead-letter policy completion
realtime queue deletion
admin UI work
feature flags/cutover
Prisma schema changes unless a newly proven persistence requirement is first documented
```

## 17. Schema decision

```text
Expected schema change for 4.1: NO
Actual schema change for 4.1: NO
Expected migration for 4.1: NO
Actual migration for 4.1: NO

Input prisma/schema.prisma SHA-256:
d3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce
```

Existing `MetaJobAudit`, Layer 3 canonical receipt fields, Lead storage, Instagram message/outbound/private-reply storage and realtime Facebook outbox/dead-letter tables are sufficient for the 4.1 decision. Layer 4.2 is also expected to be schema-free because it is a contract/adapter item.

## 18. Verification

Added dependency-independent Layer 4.1 controls:

```text
tests/meta-v6/phase31-layer4-queue-audit.test.mjs
scripts/meta-platform-phase31-layer4-queue-audit.mjs
```

Package commands:

```text
npm run test:meta-v6-phase31-layer4-queue-audit
npm run qa:meta-platform-phase31-layer4-queue-audit
npm run qa:phase31-meta-layer4.1
```

The static gate validates the existing queue provider, safe envelope rules, DB-first audit reservation, Redis failure marking, worker ownership, retry/stall behavior, scheduler gaps, deployment mismatch, realtime queue overlap, canonical job matrix, schema freeze and exact 4.2 boundary.

### Executed verification results

```text
Layer 4.1 focused tests:                 10/10 PASS
Layer 4.1 static audit:                  30/30 PASS
Source inventory:                        48/48 PASS (521 paths, 24 capabilities, 15 realtime paths)
Layer 2 webhook runtime regression:      26/26 PASS
Layer 2 webhook static regression:       37/37 PASS
Layer 3 receipt runtime regression:      17/17 PASS
Layer 3 persistence static regression:   37/37 PASS
Layer 3 receipt lifecycle audit:         43/43 PASS
Provider identity runtime regression:    11/11 PASS
Provider identity static regression:     58/58 PASS
Lead storage runtime regression:         13/13 PASS
Lead storage static regression:          65/65 PASS
Instagram storage runtime regression:    16/16 PASS
Instagram storage static regression:     75/75 PASS
Payload/replay runtime regression:        9/9 PASS
Payload/replay static regression:        41/41 PASS
Layer 3.8 source-gate runtime:             6/6 PASS
Layer 3.8 source-gate audit:              23/23 PASS
Migration governance:                   427/427 PASS
Prisma schema/migration pair audit:       PASS
New Node/JSON syntax validation:          PASS
```

`node_modules` remains absent in this workspace. Therefore dependency-backed typecheck, lint and production build are not claimed by Layer 4.1. The numbered item is an audit-only source gate.

## 19. What changed

- Added this complete existing queue/job infrastructure audit.
- Added a focused dependency-independent Layer 4.1 test.
- Added a deterministic Layer 4.1 static audit script.
- Registered Layer 4.1 QA commands.
- Refreshed the governed source inventory hash for the changed `package.json` and regenerated inventory documentation.

## 20. What did not change

- No queue name or existing job name changed.
- No worker implementation changed.
- No retry, backoff, dead-letter or replay behavior changed.
- No provider API write path changed.
- No Redis or deployment configuration changed.
- No realtime queue was removed or migrated.
- `prisma/schema.prisma` was not changed.
- No migration was created.
- No full dependency-backed typecheck, lint or production build pass is claimed.
- No live Redis outage/crash test is claimed by this audit-only item.

## 21. Prisma status

```text
Schema change: NO
Migration: NO
Production PostgreSQL configuration: NOT CHANGED
Layer 3.8 production PostgreSQL/Prisma closure: OPERATOR-CONFIRMED, not rerun here
```

## 22. Verification status

```text
Queue provider inventory: PASS
Queue/job inventory: PASS
Worker ownership inventory: PASS
DB audit/idempotency map: PASS
Retry/backoff map: PASS
Dead-letter/replay map: PASS
Queue outage map: PASS
Worker crash map: PASS
Scheduler map: PASS
Deployment ownership map: PASS
Realtime overlap map: PASS
Required canonical job map: PASS
Reuse-vs-new decision: PASS
Layer 4.2 boundary: PASS
Schema unchanged: PASS
Layer 4.1 audit verdict: PASS
```

## 23. Known blockers and follow-on gaps

These do not block the completion of the audit item; they are the documented implementation inputs for subsequent numbered items:

1. Production process evidence for Lead, Instagram, scheduler and connection-health workers is not included in the archive.
2. Generic reconstruction of `MetaJobAudit` rows left by Redis enqueue failure is missing.
3. Instagram deferred receipts lack an automatic recovery scheduler.
4. Main retry schedule has no jitter.
5. Shared worker permanent/auth error enforcement is processor-dependent.
6. Unknown provider write outcome reconciliation is missing from the shared queue layer.
7. Realtime sorted-set queues remove jobs before processing and have no visibility lease.
8. Realtime queues/dead letters embed text and source URLs rather than durable references only.
9. `worker:all` omits the existing product-set worker.
10. Embedded worker startup wording/configuration does not prove all social workers are running.

## 24. Exact next item

```text
Layer 4.2 — Shared social queue contract and adapter
```

## Layer 4.8 closure update

The Layer 4.1 findings above are retained as the historical input audit. The following gaps were closed by Layers 4.2–4.8:

- Retry jitter: implemented by the centralized social reliability policy.
- Instagram deferred receipt recovery: implemented as a five-minute database-backed recovery job.
- Unknown-write reconciliation boundary: implemented; possible-success writes cannot enter blind retry or replay.
- Social worker startup ownership: single-container startup now embeds Lead, Instagram, social and scheduler workers; dedicated worker deployments remain supported through `worker:all` with `DISABLE_EMBEDDED_WORKERS=true` on the web process.

The realtime custom queue ownership findings remain intentionally deferred to Layer 6.
