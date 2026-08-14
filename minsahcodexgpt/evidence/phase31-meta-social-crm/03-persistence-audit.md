# Phase 31 Meta Social CRM — Layer 3.1 persistence and dedupe audit

**Item:** Layer 3.1 — Existing persistence and dedupe model audit  
**Status:** PASS (audit-only)  
**Audit date:** 2026-07-24  
**Input checkpoint:** Phase 31 Layer 2.3 COMPLETE

## Executive conclusion

The repository already has durable persistence for Lead Ads, Instagram, Facebook realtime inbox, BullMQ job audits, Meta operation/outbox reliability and provider identity references. However, social webhook persistence is split across three incompatible receipt families:

1. `MetaWebhookReceipt` for Lead Ads;
2. `MetaInstagramWebhookReceipt` for Instagram;
3. `FbWebhookAudit` for realtime Facebook Page events.

DB-backed business-record dedupe exists in several places, but there is no unified receipt scope, state machine, queue reference, lease/reclaim contract, replay relationship or safe payload projection across the three flows. Layer 3.2 therefore requires an additive canonical receipt model and compatibility adapters. Existing production models should remain in place during migration.

No Prisma schema or migration file was changed in Layer 3.1.

## Inspected paths

```text
prisma/schema.prisma
prisma/migrations/*
lib/meta-platform/repositories/*
lib/meta-platform/transports/webhook/*
lib/meta-platform/domains/leads/*
lib/meta-platform/domains/instagram/*
lib/meta/leads/*
lib/meta/instagram/*
lib/jobs/*
workers/meta-lead.worker.ts
workers/meta-instagram.worker.ts
lib/social/*
lib/facebook/*
app/api/webhooks/meta/route.ts
app/api/webhooks/meta/leadgen/route.ts
app/api/webhooks/meta/instagram/route.ts
app/api/webhook/facebook/route.ts
app/api/social/webhook/route.ts
realtime-service/src/routes/webhook.router.ts
realtime-service/src/db/repository.ts
realtime-service/src/facebook/*
```

`lib/meta-platform/repositories/`, `lib/meta-platform/domains/leads/` and `lib/meta-platform/domains/instagram/` currently contain no persistence/domain implementation files. Active persistence remains in legacy compatibility modules.

## Current model map and gap matrix

| Current model | Current purpose | Current unique key | Current processing state | Current payload handling | Current repository / flow | Gap | Recommended action |
|---|---|---|---|---|---|---|---|
| `MetaWebhookReceipt` | Lead Ads verified/rejected webhook receipt | Global `eventKey` | `RECEIVED`, `VERIFIED`, `QUEUED`, `PROCESSED`, `FAILED`, `REJECTED` | Safe summary in `payload`; full envelope encrypted in `payloadEncrypted`; digest retained | `lib/meta/leads/receipt.ts`, `lib/meta/leads/handoff.ts`, `lib/meta/leads/service.ts` | No provider/environment/connection scope; no `PROCESSING`, lease, dead-letter or replay link; no direct job/lead relation; arbitrary state updates | Preserve as legacy source; write-through to canonical receipt in 3.2; move transitions to guarded repository in 3.3 |
| `MetaLead` | Normalized Lead Ads business record | Global `leadgenId` | Business lifecycle plus retrieval status | Fetched provider payload encrypted; field metadata/counts safe; phone/email hashed and masked; selected PII columns remain plaintext under retention | `lib/meta/leads/repository.ts` | No receipt FK; no CRM handoff reference/state; phone/email dedupe is query-based, not DB-unique; processing and notification are not one transaction | Keep `leadgenId` idempotency; add canonical receipt relation/handoff metadata in 3.5 after receipt model exists |
| `MetaLeadDuplicate` | Map duplicate provider lead IDs to canonical Lead | Global `sourceLeadgenId` | No workflow state | Hash and receipt ID string only | `lib/meta/leads/repository.ts` | `receiptId` is not a foreign key; no connection/environment scope | Attach to canonical receipt and scoped provider identity in 3.5 |
| `MetaInstagramWebhookReceipt` | Instagram normalized event receipt | Global `eventKey` | `RECEIVED`, `VERIFIED`, `QUEUED`, `PROCESSING`, `PROCESSED`, `IGNORED`, `FAILED` | Entire normalized event stored in plaintext JSON, including message text, profile fields and attachment URLs; digest retained | `lib/meta/instagram/messages.ts`, `lib/meta/instagram/service.ts` | No environment/connection scope; no lease expiry/reclaim; no dead-letter/replay relation; no job reference; plaintext content exceeds safe receipt metadata | Preserve as legacy source; canonical receipt stores only sanitized projection/digest; 3.3 adds guarded lease/reclaim |
| `MetaConversation` | Instagram conversation state | Global `platformId` | Conversation status and reply-window fields | Participant profile, policy JSON and message relationship | `lib/meta/instagram/messages.ts`, `lib/meta/instagram/conversations.ts` | Unique key not explicitly scoped by account/environment; late events overwrite last activity and may regress reply window; no receipt relation | Use scoped identity/unique boundary and monotonic timestamp updates in 3.6 |
| `MetaMessage` | Instagram inbound/outbound message | Global `platformId` | `RECEIVED`, `QUEUED`, `PROCESSED`, `SENT`, `FAILED`, `BLOCKED` | Message text plaintext; digest optional; provider/source references present | `lib/meta/instagram/messages.ts` | No receipt FK; account scope is indirect through conversation; receipt/message/final state is not transactional | Add receipt relation and scoped provider message uniqueness in 3.6 |
| `MetaMessageAttachment` | Instagram attachment metadata/storage state | `(messageId, externalId)` | `PENDING`, `READY`, `REJECTED`, `FAILED` | Source/storage URLs and metadata retained | `lib/meta/instagram/messages.ts`, `lib/meta/instagram/attachments.ts` | Attachment work occurs inline with receipt processing; receipt may remain inconsistent after crash | Link validation decision/job state and separate durable media work in Layers 3.6/4.6 |
| `MetaInstagramReplyAttempt` | Instagram outbound idempotency and provider ID | Global `idempotencyKey` | Reuses message statuses | Text/payload hashes, safe failure data, provider message ID | `lib/meta/instagram/messages.ts` | Provider call and DB completion are non-transactional; unknown-success reconciliation absent; private-reply one-shot is not concurrency guarded | Add durable send/one-shot mapping and reconciliation metadata in 3.6; job execution in 4.5 |
| `MetaJobAudit` | BullMQ durable audit, retry and dead-letter visibility | Global `idempotencyKey` | `QUEUED`, `RUNNING`, `RETRYING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `DEAD_LETTER` | Job payload JSON; Lead/Instagram jobs currently carry receipt IDs and identifiers, not raw webhook envelopes | `lib/jobs/audit-repository.ts`, `lib/jobs/queues.ts`, `lib/jobs/worker.ts` | Receipt has no FK/reference back to job; idempotency scope is global rather than `(queue, key)`; DB record and Redis enqueue are not atomic | Canonical receipt stores current job audit ID/reference; audit queue reuse in Layer 4 before adding a new provider |
| `SocialMessage` / `SocialMessageAttachment` | Legacy generic Facebook/social inbox storage | `(platform, externalId)` and `(messageId, externalId)` | Read/unread only | Full `rawPayload` plaintext; external URLs and metadata retained | `lib/social/socialMessageIngest.ts`, `lib/facebook/inboxSync.ts` | Overlaps with `Fb*` and `MetaConversation`/`MetaMessage`; no receipt trace; media download is not bounded by the shared policy | Classify as legacy compatibility storage; do not make it canonical for Layer 3 |
| `FbWebhookAudit` | Realtime Facebook delivery-level audit | None beyond primary key | `RECEIVED`, `PROCESSED`, `PARTIAL_ERROR`, `FAILED` | Full raw body and parsed payload stored plaintext | `realtime-service/src/routes/webhook.router.ts`, `realtime-service/src/db/repository.ts` | No delivery/event dedupe key; no per-event state; no queue/job reference; no retention field; raw PII exposure; no crash resume | Canonical receipt must replace/bridge it; stop storing raw body/payload in new records |
| `FbConversation` / `FbMessage` | Realtime Facebook inbox records | Global `threadId`; global `fbMessageId` | Conversation unread/replied flags | Message `rawPayload` plaintext | `realtime-service/src/db/repository.ts` | Keys are not page/environment scoped; receipt-to-message trace absent | Add canonical identity/receipt mapping during Facebook/realtime migration |
| `FbOutboxMessage` / `FbOutboxStatusEvent` | Facebook outbound state and provider ID tracking | Global `clientMessageId`; global `fbMessageId` | `PENDING` through `FAILED` | Message text, attachment URL, status metadata | Realtime DB repository and retry modules | Separate retry/state vocabulary from Meta platform; no canonical operation/receipt link | Reuse data during bridge; align with platform operation/job state in later layers |
| `FbDeadLetterJob` | Facebook replay/media/outgoing dead-letter | Global `dedupeKey` | `OPEN`, `REQUEUED`, `RESOLVED` | Replay payload JSON | Realtime dead-letter/replay modules | Parallel DLQ/replay system; approval and canonical receipt relation absent | Do not delete yet; bridge to shared job/replay controls in Layers 4 and 6 |
| `MetaExternalReference` | Scoped provider/local identity mapping | Composite environment + connection + asset + object + local/provider ID | No processing state | Metadata only | Meta platform Prisma model; platform stores | Good reusable scoped identity foundation; not used by active Lead/Instagram receipt paths | Reuse in 3.4; canonical receipt should carry environment/connection and resolved identity references |
| `MetaOperation`, `MetaOutboxMessage`, `MetaWorkflow`, `MetaReconciliation`, `MetaReplay`, `MetaWorkflowLock` | Platform operation ledger, outbox, leases, reconciliation and approved replay | Operation idempotency scoped by environment + connection; other model-specific unique keys | Rich operation/workflow/outbox/replay states | Operation/outbox JSON plus digests and safe events | `lib/meta-platform/operations/*`, reliability/workflow/replay stores | Designed primarily for platform operations, not provider webhook receipt semantics; active social paths do not use them | Reuse state/lease/replay patterns and services; do not overload an operation row as the webhook receipt |

## Dedupe map by layer

### 1. Shared handoff

`lib/meta-platform/transports/webhook/handoff.ts` uses an in-memory `Map` for one request and reports repeated `eventKey` values as `DUPLICATE_IN_DELIVERY`. This prevents duplicate receiver calls only inside the current delivery process. It is not durable and provides no cross-request or cross-process protection.

### 2. Service/repository

- Lead receipt creation uses `INSERT ... ON CONFLICT (eventKey)` and queue job reservation uses `MetaJobAudit.idempotencyKey`.
- Lead business persistence first queries `leadgenId`, phone hash and email hash, then upserts by `leadgenId`. Phone/email matching is service-level only.
- Instagram receipt creation catches the unique-key race and message/conversation persistence uses Prisma upserts.
- Instagram reply checks an idempotency row before create; the unique index is the final DB protection, but the race error is not normalized to a duplicate result.
- Facebook realtime inbox checks `fbMessageId` inside a DB transaction before create.

### 3. Database

Current strong DB boundaries include:

```text
MetaWebhookReceipt.eventKey
MetaLead.leadgenId
MetaLeadDuplicate.sourceLeadgenId
MetaInstagramWebhookReceipt.eventKey
MetaConversation.platformId
MetaMessage.platformId
MetaMessageAttachment(messageId, externalId)
MetaInstagramReplyAttempt.idempotencyKey
MetaJobAudit.idempotencyKey
SocialMessage(platform, externalId)
FbConversation.threadId
FbMessage.fbMessageId
FbOutboxMessage.clientMessageId
FbOutboxMessage.fbMessageId
FbDeadLetterJob.dedupeKey
MetaOperation(environment, connectionKey, idempotencyKey)
MetaExternalReference scoped local/provider keys
```

The social receipt/message keys are mostly global. Explicit provider, environment and connection scope is absent from the Lead, Instagram, Facebook and generic social tables.

## Transaction-boundary audit

### Lead Ads

- Receipt insert is durable before queue enqueue.
- Receipt insert, `MetaJobAudit` reservation, Redis enqueue and receipt `QUEUED` update are separate operations.
- `processMetaLeadReceipt` does not atomically claim a receipt. It sets the status back to `QUEUED` and increments attempts without a conditional update or lease.
- Lead persistence is a separate operation; assignment has its own advisory-lock transaction; receipt completion and assignment notification are outside those transactions.
- A crash after Lead persistence/assignment but before receipt completion can repeat processing/notification. A crash after marking the receipt processed but before notification can lose the notification.

### Instagram

- Receipt insert is durable before queue enqueue.
- Receipt claim uses a conditional `updateMany`, so two active workers cannot both enter from `VERIFIED`, `QUEUED` or `FAILED`.
- The claim has no lease token or expiration. `PROCESSING` is neither reclaimable nor recoverable.
- Conversation upsert, message upsert, attachment processing and receipt completion are separate writes without a transaction.
- Provider reply, outbound message insert, reply-attempt completion and conversation update are separate writes without reconciliation.

### Facebook realtime

- A delivery audit is created before HTTP acknowledgment.
- Processing then runs in an unawaited in-process promise after the `200` response.
- There is no durable per-event queue handoff. A process crash after acknowledgment can leave `FbWebhookAudit` in `RECEIVED` with no automatic resume path.
- Message/conversation writes are transactional and dedupe by `fbMessageId`, but they are not linked to the delivery audit.

## Crash recovery and replay findings

| Flow | Existing recovery | Result |
|---|---|---|
| Lead receipt before/after queue failure | Scanner selects `VERIFIED`/`FAILED`, attempts below five and older than five minutes | Partial recovery exists, but concurrent claim is not guarded and `PROCESSING` is not represented |
| Lead worker crash during business processing | BullMQ may retry; Lead provider ID upsert prevents a second Lead row | Side effects outside the business-row upsert can repeat or be lost |
| Instagram receipt before queue failure | Failed receipt can be re-enqueued by another provider delivery | No scheduled receipt recovery was found |
| Instagram worker crash after claim | BullMQ retries, but receipt remains `PROCESSING`; claim rejects it and worker returns a deduplicated success | Critical permanent-stuck path |
| Instagram provider write with unknown outcome | Existing attempt causes subsequent same-key call to return deduplicated | No provider reconciliation; provider ID/message state can be lost |
| Facebook realtime process crash after ACK | Delivery audit remains available | No scanner/queue replays `RECEIVED` audits, so event processing can be lost |
| Generic job dead-letter replay | `replayMetaDeadLetter` creates a new random replay idempotency key and links `replayOfId` | Job replay exists, but it is not linked to a canonical webhook receipt and has no approval workflow in this legacy helper |
| Platform operation replay | `MetaReplay` supports request, approval and source/target operation relation | Strong reusable pattern, currently disconnected from social receipts |

## Ordering findings

The shared parser produces deterministic ordering keys and sorts events by provider time and source position. Persistence does not consistently preserve monotonic business ordering:

- Instagram conversation updates assign `lastMessageAt`, `lastInboundAt` and `replyWindowExpiresAt` directly from every processed event. A late event can move these timestamps backwards.
- Facebook conversation updates also set `lastMessageAt` directly from the incoming event.
- Neither receipt family stores an explicit sequence/version or last-applied ordering guard.

Layer 3.6 must use monotonic timestamp updates or a guarded event-order/version field.

## Sensitive payload audit

### Lower-risk handling already present

- Shared transport verifies the signature on the exact raw body and computes a SHA-256 digest before business parsing.
- Lead receipt `payload` is a bounded summary, while the full envelope is encrypted.
- Fetched Lead payload is encrypted; phone/email hashes and masks are stored; raw lead field values are not copied into `rawFields`.
- Lead retention cleanup removes encrypted raw payload and later clears selected PII fields.
- Lead/Instagram job payloads primarily contain receipt/identity references rather than full webhook payloads.

### Material risks

- `MetaInstagramWebhookReceipt.normalizedEvent` stores plaintext message text, participant details and source URLs.
- `FbWebhookAudit.rawBody` and `FbWebhookAudit.payload` store the full signed provider delivery in plaintext with no model-level retention timestamp.
- `FbMessage.rawPayload` and `SocialMessage.rawPayload` store raw event data in plaintext.
- Instagram/Facebook message text and profile fields are business data that may need retention, but they must not be duplicated again in the canonical receipt safe summary.
- Several generic JSON error/payload fields rely on caller discipline rather than a receipt-level denylist/redaction contract.

## Persistence overlap and duplication

There are three parallel inbox/message persistence families:

```text
SocialMessage / SocialMessageAttachment
FbConversation / FbMessage / FbOutboxMessage / FbDeadLetterJob
MetaConversation / MetaMessage / MetaInstagramReplyAttempt
```

There are also three webhook persistence approaches:

```text
MetaWebhookReceipt
MetaInstagramWebhookReceipt
FbWebhookAudit
```

The overlap makes admin traceability, retention, replay and cross-channel state inconsistent. Layer 3 should introduce one canonical receipt while leaving channel-specific business records intact until later cutover layers.

## Migration history observations

- The original durable-job, Lead CRM and Instagram CRM migrations created the current models but do not contain `recovery.sql` files.
- Later platform migrations do contain paired recovery SQL, establishing the current governance standard.
- Layer 3.1 does not retroactively modify old migrations.
- Every new Layer 3 schema change must have a new timestamped `migration.sql` and `recovery.sql`, with duplicate precondition queries before unique constraints.

## Exact Layer 3.2 schema decision

**Decision: create an additive canonical model; do not rename or delete the existing receipt/audit tables in 3.2.**

Recommended canonical model name:

```text
MetaSocialWebhookReceipt
```

Recommended non-null dedupe boundary:

```text
provider + environment + connectionKey + dedupeKey
```

`dedupeKey` should be the validated canonical provider event key. Store provider delivery ID and provider event ID as nullable diagnostic fields, but do not depend on a nullable delivery ID as the only unique boundary.

Required fields for 3.2:

```text
id
provider
environment
connectionKey
routingTarget
objectType
eventKind
providerDeliveryId?
providerEventId?
dedupeKey
orderingKey
payloadDigest
safePayload
correlationId
status
firstSeenAt
lastSeenAt
duplicateCount
attemptCount
jobAuditId?
leaseToken?
leaseExpiresAt?
nextAttemptAt?
processedAt?
blockedAt?
failedAt?
deadLetteredAt?
safeError?
retentionUntil
replayOfReceiptId?
legacySourceType?
legacySourceId?
createdAt
updatedAt
```

Recommended canonical states:

```text
RECEIVED
QUEUED
PROCESSING
PROCESSED
BLOCKED
FAILED
DEAD_LETTERED
```

Compatibility plan:

1. Active Lead/Instagram/Facebook adapters create-or-get the canonical receipt first.
2. Existing legacy receipt/audit rows may continue to be written temporarily and are linked through `legacySourceType`/`legacySourceId` during cutover.
3. Canonical receipt stores only digest plus an allowlisted safe projection; no raw body, token, secret, complete provider envelope or duplicated message text.
4. `jobAuditId` references the current durable job audit logically; a foreign key may be added only after existing-data compatibility is verified.
5. Legacy table deletion/renaming is explicitly deferred beyond 3.2.
6. 3.2 migration must include duplicate-detection queries, index creation order, `migration.sql`, `recovery.sql` and a destructive-recovery warning if rollback drops canonical rows.

## What changed

- Added this complete persistence, dedupe, payload, transaction, crash-recovery, replay and overlap audit.
- Documented the exact additive Layer 3.2 schema decision.

## What did not change

- No application source behavior changed.
- No webhook route, worker, queue, Lead, Instagram, Facebook or realtime implementation changed.
- No Prisma model, generated client or migration changed.
- No production data migration or backfill was attempted.

## Prisma status

```text
Schema change: NO
Migration created: NO
Reason: Layer 3.1 is audit-only; implementation is deferred to Layer 3.2.
```

## Verification status

Layer 3.1 is complete when the audit evidence exists, mandatory sections are present, relevant source paths have been inspected, and schema/migration digests remain unchanged. Dependency-independent regressions and governance checks are recorded in `phase31_layer3.1_verification.log`.

Full dependency-backed application typecheck, lint and production build are not claimed because dependencies are not installed after the known npm registry `503` blocker.

## Known blocker

```text
npm ci previously failed with registry 503; node_modules is absent.
```

This does not block the audit-only Layer 3.1 evidence or dependency-independent verification.

## Exact next item

```text
Layer 3.2 — Unified webhook receipt persistence model
```
