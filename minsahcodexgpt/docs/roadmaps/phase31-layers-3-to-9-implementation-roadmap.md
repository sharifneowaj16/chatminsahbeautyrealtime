# Minsah Beauty Meta v6
# Phase 31 Remaining Implementation Roadmap
## Current continuation: Layer 5.1 থেকে Phase 31 Complete পর্যন্ত

**Prepared:** 2026-07-24  
**Current completed checkpoint:** Phase 31 Layer 4.8  
**Latest project archive:** `minsahbeauty_phase31_layer4_complete_second_brain_v3.zip`  
**Execution mode:** sequential numbered-item gates; same-session continuation allowed after each truthful gate  
**Packaging mode:** completed layer → full project ZIP + SHA-256 + layer verification/evidence  
**Next item:** `Layer 5.1`  
**Policy addendum:** `docs/roadmaps/phase31-fast-execution-policy.md`

---

# 1. Mandatory working rules

## 1.1 Sequential numbered-item gates

প্রতিটি numbered item আলাদাভাবে implementation/audit এবং focused verification gate complete করবে। Current item gate complete না হওয়া পর্যন্ত next item শুরু করা যাবে না।

একটি capable AI একই session-এ sequential next item-এ যেতে পারবে, কিন্তু item skip, gate skip বা combined unsupported PASS claim করা যাবে না।

উদাহরণ:

```txt
5.1 implementation/audit
→ focused verification
→ progress/checkpoint update
→ 5.2
```

ZIP প্রতি item-এ নয়; completed layer gate-এর পরে তৈরি হবে।

---

## 1.2 Prisma migration rule

`prisma/schema.prisma`-তে যেকোনো পরিবর্তন হলে একই item-এর মধ্যে অবশ্যই তৈরি করতে হবে:

```txt
prisma/migrations/<migration_name>/migration.sql
prisma/migrations/<migration_name>/recovery.sql
```

প্রয়োজনে অতিরিক্তভাবে:

```txt
prisma/migrations/<migration_name>/README.md
```

Migration rules:

- Additive change অগ্রাধিকার পাবে।
- Existing production field rename/delete এড়িয়ে চলতে হবে।
- Unique constraint যোগ করার আগে duplicate-data detection query থাকতে হবে।
- Backfill প্রয়োজন হলে deterministic ও resumable হতে হবে।
- Recovery SQL destructive হলে warning এবং precondition লিখতে হবে।
- Schema touch না হলে migration বানানো যাবে না।
- Production Prisma setup unnecessary ভাবে পরিবর্তন করা যাবে না।

---

## 1.3 Item and layer artifact policy

প্রতিটি numbered item শেষে থাকবে:

```txt
implementation বা required audit artifact
focused test/audit evidence
concise item result
Prisma/migration status
known blocker
exact next item
updated .ai/layer-progress.json and checkpoint surfaces
```

প্রতিটি completed layer gate শেষে তৈরি করতে হবে:

```txt
minsahbeauty_phase31_layerX_complete.zip
minsahbeauty_phase31_layerX_complete.zip.sha256
phase31_layerX_verification.log
layer evidence report
```

ZIP-এ complete project থাকবে, শুধু changed files নয়।

---

## 1.4 Current known runtime blocker

আগের `npm ci` attempt registry `503` দিয়ে blocked হয়েছিল।

তাই:

- dependency-backed full app typecheck pass দাবি করা যাবে না;
- lint pass দাবি করা যাবে না;
- production build pass দাবি করা যাবে না;
- যতক্ষণ না dependencies install করে command সত্যিই pass করে।

Dependency-independent source tests, audits, schema checks, migration governance এবং focused TypeScript checks চালানো যাবে।

---

# 2. Current completion status

```txt
Layer 1 — Contracts and policies: PASS
Layer 2 — Webhook transport: PASS through 2.3
Layer 3 — Persistence, receipt and dedupe: PASS through 3.8
Layer 4 — Queue and jobs: PASS through 4.8
Layer 5 — Domain services: IN_PROGRESS; current item 5.1
Layer 6 — Realtime bridge: NOT STARTED
Layer 7 — Admin/API: NOT STARTED
Layer 8 — Feature flags/cutover/rollback: NOT STARTED
Layer 9 — QA/evidence/release gate: NOT STARTED
```

---

# Layer 3 — Persistence, Receipt and Dedupe

## Layer 3 objective

Meta webhook event প্রথমে durable storage-এ থাকবে, DB-level dedupe হবে, process crash-এর পর resume করা যাবে এবং lead/message/conversation/outbound state traceable হবে।

---

## 3.1 Existing persistence and dedupe model audit

### Objective

বর্তমান Prisma models, repositories এবং webhook handoff flow audit করে exact storage gaps নির্ধারণ করা।

### Tasks

- [ ] `prisma/schema.prisma` থেকে existing Meta/Lead/Instagram/Social/Job models map করা
- [ ] Existing webhook receipt models identify করা
- [ ] Existing lead receipt এবং normalized lead models identify করা
- [ ] Existing Instagram conversation/message models identify করা
- [ ] Existing outbound message/provider ID fields identify করা
- [ ] Existing queue/job status fields identify করা
- [ ] Existing unique indexes এবং composite constraints inventory করা
- [ ] Existing payload storage raw/sanitized/hashed/encrypted কিনা audit করা
- [ ] Existing repository methods এবং transaction boundaries audit করা
- [ ] Process crash-এর পর resume সম্ভব কিনা যাচাই করা
- [ ] Duplicate event কোথায় blocked হয় তা তিন স্তরে map করা:
  - shared handoff;
  - service;
  - database
- [ ] Lead এবং Instagram persistence-এর overlap/duplication বের করা
- [ ] Gap matrix তৈরি করা

### Minimum paths to inspect

```txt
prisma/schema.prisma
prisma/migrations/*
lib/meta-platform/repositories/*
lib/meta-platform/transports/webhook/*
lib/meta-platform/domains/leads/*
lib/meta-platform/domains/instagram/*
lib/meta/leads/*
lib/meta/instagram/*
app/api/webhooks/meta/leadgen/route.ts
app/api/webhooks/meta/instagram/route.ts
```

### Required audit output

```txt
Current model
Current purpose
Current unique key
Current processing state
Current payload handling
Current repository
Gap
Recommended action
```

### Schema decision

এই item ideally audit-only হবে।

```txt
Expected schema change: NO
Expected migration: NO
```

### Done criteria

- [ ] Existing models-এর complete map আছে
- [ ] DB dedupe gaps documented
- [ ] Replay/crash-recovery gaps documented
- [ ] Raw sensitive payload risk documented
- [ ] Exact 3.2 schema decision documented
- [ ] No unnecessary Prisma change করা হয়েছে

### Output

```txt
evidence/phase31-meta-social-crm/03-persistence-audit.md
```

---

## 3.2 Unified webhook receipt persistence model

### Objective

Lead Ads, Instagram এবং Facebook Page events-এর জন্য একক durable receipt model বা safe compatible extension তৈরি করা।

### Tasks

- [ ] Unified receipt model design করা
- [ ] Receipt-এর canonical fields নির্ধারণ করা
- [ ] Provider/platform/environment/connection scope রাখা
- [ ] Provider delivery ID এবং event key রাখা
- [ ] Payload digest রাখা
- [ ] Sanitized metadata রাখা
- [ ] Raw secret-bearing payload persist না করা
- [ ] Received timestamp রাখা
- [ ] First-seen এবং last-seen timestamp রাখা
- [ ] Duplicate count রাখা
- [ ] Receipt processing state রাখা
- [ ] Queue/job reference রাখা
- [ ] Failure/retry/dead-letter metadata রাখা
- [ ] Correlation ID রাখা
- [ ] Parent receipt/replay reference রাখা
- [ ] Existing Lead/Instagram receipt compatibility plan করা
- [ ] DB unique constraint যোগ করা

### Recommended canonical states

```txt
RECEIVED
QUEUED
PROCESSING
PROCESSED
BLOCKED
FAILED
DEAD_LETTERED
```

### Recommended unique boundary

At minimum:

```txt
provider
environment
connection_id
provider_delivery_id
provider_event_key
```

Actual constraint existing provider guarantees দেখে final করতে হবে।

### Suggested files

```txt
prisma/schema.prisma
prisma/migrations/<phase31_unified_webhook_receipts>/migration.sql
prisma/migrations/<phase31_unified_webhook_receipts>/recovery.sql
lib/meta-platform/repositories/webhook-receipts.ts
lib/meta-platform/repositories/webhook-receipt-state.ts
```

### Required migration safety checks

- [ ] Existing duplicates detection query
- [ ] Existing receipt data compatibility
- [ ] Constraint creation order
- [ ] Index creation plan
- [ ] Recovery constraint/index removal
- [ ] Data-loss warning if any

### Tests

- [ ] First receipt creates one row
- [ ] Same delivery/event creates no second row
- [ ] Duplicate increments safe duplicate metadata if supported
- [ ] Different connection does not collide
- [ ] Different environment does not collide
- [ ] Payload digest mismatch for same provider key is surfaced
- [ ] Invalid state transition rejected
- [ ] Raw token/secret not persisted

### Done criteria

- [ ] Durable unified receipt exists
- [ ] DB-level dedupe exists
- [ ] Existing route handoff can use repository
- [ ] Migration and recovery file present if schema changed
- [ ] Existing production data has a safe migration path

---

## 3.3 Receipt repository and state-transition service

### Objective

Receipt state changes route/domain code থেকে সরিয়ে one transactional repository/service boundary-তে নেওয়া।

### Tasks

- [ ] Receipt create-or-get transaction implement করা
- [ ] State transition matrix implement করা
- [ ] Optimistic concurrency বা guarded update implement করা
- [ ] Queue handoff state update implement করা
- [ ] Processing lease/claim implement করা
- [ ] Processed terminal state implement করা
- [ ] Blocked terminal state implement করা
- [ ] Retryable failure state implement করা
- [ ] Dead-letter transition implement করা
- [ ] Duplicate delivery behavior implement করা
- [ ] Replay relationship implement করা
- [ ] Audit metadata update implement করা
- [ ] Repository result standardized platform result contract ব্যবহার করা

### Suggested transition rules

```txt
RECEIVED → QUEUED
RECEIVED → BLOCKED
QUEUED → PROCESSING
PROCESSING → PROCESSED
PROCESSING → FAILED
FAILED → QUEUED
FAILED → DEAD_LETTERED
BLOCKED → terminal
PROCESSED → terminal
DEAD_LETTERED → replay creates new controlled attempt
```

### Suggested files

```txt
lib/meta-platform/repositories/webhook-receipts.ts
lib/meta-platform/repositories/webhook-receipt-transitions.ts
lib/meta-platform/repositories/webhook-receipt-claims.ts
```

### Tests

- [ ] Valid transition pass
- [ ] Invalid reverse transition fail
- [ ] Two workers cannot claim same receipt
- [ ] Expired processing lease can be reclaimed safely
- [ ] Processed receipt cannot be processed again
- [ ] Blocked receipt cannot be retried blindly
- [ ] Dead-letter replay creates audited relationship
- [ ] Transition failure rolls back transaction

### Schema decision

```txt
Schema change: only if 3.2 did not already add all required fields
Migration required: YES only when schema changes
```

### Done criteria

- [ ] Route does not manipulate Prisma receipt state directly
- [ ] Domain job does not invent states
- [ ] All receipt transitions are guarded
- [ ] Concurrency behavior tested

---

## 3.4 Provider identity and object mapping persistence

### Objective

Business, Page, Instagram account, ad account, app, lead form এবং connection mapping durable করা।

### Tasks

- [ ] Existing provider/account models audit result apply করা
- [ ] Meta App identity mapping
- [ ] Business identity mapping
- [ ] Page identity mapping
- [ ] Instagram account identity mapping
- [ ] Ad account identity mapping
- [ ] Lead form identity mapping
- [ ] Page ↔ Instagram relationship persist করা
- [ ] Business/app ownership relationship রাখা
- [ ] Environment এবং connection scope রাখা
- [ ] Active/inactive/permission-health metadata রাখা
- [ ] Last verified timestamp রাখা
- [ ] Unique provider identity constraints রাখা
- [ ] Soft disable/revocation support রাখা

### Suggested models/repositories

Actual existing schema অনুযায়ী reuse বা extension করতে হবে।

```txt
lib/meta-platform/repositories/provider-identities.ts
lib/meta-platform/repositories/page-identities.ts
lib/meta-platform/repositories/instagram-identities.ts
lib/meta-platform/repositories/lead-form-identities.ts
```

### Tests

- [ ] Same provider ID different environment does not collide
- [ ] Same provider ID different connection does not collide
- [ ] Page cannot bind to wrong IG account scope
- [ ] Revoked identity is not selected for writes
- [ ] Duplicate mapping blocked at DB level
- [ ] Identity lookup uses canonical IDs

### Done criteria

- [ ] Webhook event resolves canonical provider identity
- [ ] Page/form/account context is deterministic
- [ ] Permission-health state can be attached later
- [ ] Schema migration pair exists if schema changed

---

## 3.5 Lead receipt and normalized lead storage

### Objective

Stored receipt থেকে deterministic normalized Lead record তৈরি করা এবং duplicate Lead ID prevent করা।

### Tasks

- [ ] Lead receipt ↔ unified webhook receipt relationship
- [ ] Provider lead ID unique constraint
- [ ] Page/form/ad/adset/campaign references
- [ ] Normalized field storage
- [ ] Sensitive field handling design
- [ ] PII hash/mask projection persist করা
- [ ] Raw provider response storage policy
- [ ] Lead processing status
- [ ] CRM/customer/contact handoff reference
- [ ] Missing/expired lead fetch status
- [ ] Test lead marker
- [ ] Lead duplicate handling
- [ ] Lead replay-safe processing metadata

### Sensitive-data rule

Preferred:

```txt
Raw access token: never store
Raw webhook secret: never store
Raw unbounded provider payload: avoid
Sanitized structured fields: allowed
PII hash/mask: preferred for diagnostics
Encrypted PII: only if existing production architecture requires it
```

### Suggested files

```txt
lib/meta-platform/repositories/leads.ts
lib/meta-platform/repositories/lead-receipts.ts
lib/meta-platform/repositories/lead-attribution.ts
```

### Tests

- [ ] Duplicate provider lead ID creates one business lead
- [ ] Same lead replay does not duplicate CRM handoff
- [ ] Missing form mapping is blocked or parked safely
- [ ] Expired lead access produces safe state
- [ ] PII does not appear in logs/admin audit payload
- [ ] Receipt can trace to normalized lead

### Done criteria

- [ ] Lead persistence is receipt-first
- [ ] Lead ID is DB-idempotent
- [ ] CRM handoff can be retried safely
- [ ] Schema/migration governance passes

---

## 3.6 Instagram conversation, message and outbound mapping persistence

### Objective

Instagram inbound conversation/message এবং outbound reply provider IDs durable ও idempotent করা।

### Tasks

- [ ] Conversation model/extension
- [ ] Participant mapping
- [ ] Inbound provider message unique constraint
- [ ] Outbound send idempotency unique constraint
- [ ] Provider outbound message ID storage
- [ ] Comment/post/story source references
- [ ] Private reply one-shot tracking
- [ ] Reply-window state storage
- [ ] Attachment policy decision relationship
- [ ] Message direction/state
- [ ] Delivery/read/failure status if supported
- [ ] Receipt ↔ message relationship
- [ ] Conversation last-activity ordering
- [ ] Out-of-order event handling fields

### Suggested repositories

```txt
lib/meta-platform/repositories/instagram-conversations.ts
lib/meta-platform/repositories/instagram-messages.ts
lib/meta-platform/repositories/instagram-outbound.ts
lib/meta-platform/repositories/instagram-private-replies.ts
```

### Tests

- [ ] Same inbound provider message creates one row
- [ ] Same outbound idempotency key sends/stores once
- [ ] Provider message ID captured
- [ ] Conversation participant mismatch rejected
- [ ] Private reply second attempt blocked
- [ ] Late message does not corrupt conversation order
- [ ] Reply-window timestamps remain canonical
- [ ] Receipt traces to message

### Done criteria

- [ ] Conversation/message state is durable
- [ ] Inbound and outbound dedupe is DB-backed
- [ ] Private reply one-shot state is durable
- [ ] Schema migration pair exists if changed

---

## 3.7 Sanitized payload digest, retention and replay metadata

### Objective

Sensitive raw payload exposure কমিয়ে audit/replay capability রাখা।

### Tasks

- [ ] Canonical payload digest standardize করা
- [ ] Sanitized event metadata projection define করা
- [ ] Secret/token key denylist করা
- [ ] PII redaction rules করা
- [ ] Admin-visible payload summary define করা
- [ ] Retention classification define করা
- [ ] Replay eligibility metadata রাখা
- [ ] Original receipt/replay attempt relationship রাখা
- [ ] Replay approval actor/reference রাখা
- [ ] Replay reason রাখা
- [ ] Replay result রাখা
- [ ] Payload digest mismatch alertable করা

### Tests

- [ ] Tokens removed
- [ ] Email/phone raw value absent from safe summary
- [ ] Digest deterministic
- [ ] Different payload produces different digest
- [ ] Replay points to original receipt
- [ ] Replay cannot bypass dedupe
- [ ] Unauthorized replay metadata rejected

### Done criteria

- [ ] Admin/log safe projection আছে
- [ ] Replay audit chain durable
- [ ] Sensitive payload leakage tests pass

---

## 3.8 Layer 3 migration drill, regression and evidence gate

### Objective

Layer 3-এর সব schema/repository পরিবর্তন verify এবং evidence seal করা।

### Tasks

- [ ] All new migrations ordered correctly
- [ ] Every migration has recovery SQL
- [ ] Disposable PostgreSQL apply drill
- [ ] Recovery drill
- [ ] Apply again after recovery
- [ ] Duplicate precondition queries verify
- [ ] Repository concurrency tests
- [ ] Crash/reclaim tests
- [ ] Lead idempotency tests
- [ ] Instagram message idempotency tests
- [ ] Payload redaction tests
- [ ] Existing Layer 1/2 regressions
- [ ] Source inventory update
- [ ] Migration governance update
- [ ] Evidence documents finalize

### Evidence files

```txt
evidence/phase31-meta-social-crm/03-persistence-dedupe.md
evidence/phase31-meta-social-crm/logs/layer3-migration-apply.log
evidence/phase31-meta-social-crm/logs/layer3-migration-recovery.log
evidence/phase31-meta-social-crm/logs/layer3-idempotency.log
```

### Done criteria

- [ ] DB apply/recovery drill pass
- [ ] Duplicate receipt/business record impossible
- [ ] Crash recovery demonstrated
- [ ] Layer 3 status explicitly PASS
- [ ] Exact next item is 4.1

---

# Layer 4 — Queue and Job Layer

## Layer 4 objective

Webhook request দ্রুত acknowledge করবে; durable processing queue/job workers retry, backoff, dead-letter এবং replay control করবে।

---

## 4.1 Existing queue/job infrastructure audit

### Tasks

- [ ] Existing queue provider identify করা
- [ ] Existing database-backed jobs identify করা
- [ ] Existing worker runtime identify করা
- [ ] Existing retry/backoff implementation map করা
- [ ] Existing dead-letter implementation map করা
- [ ] Existing cron/scheduler dependencies map করা
- [ ] Existing job uniqueness/idempotency map করা
- [ ] Main app এবং realtime service queue overlap audit করা
- [ ] Queue outage behavior audit করা
- [ ] Worker crash behavior audit করা
- [ ] Layer 4 design decision লিখা

### Expected schema change

```txt
Audit-only preferred
```

### Done criteria

- [ ] Reuse vs new queue decision documented
- [ ] Every required job type mapped
- [ ] 4.2 implementation boundary fixed

---

## 4.2 Shared social queue contract and adapter

### Tasks

- [ ] Queue job envelope contract
- [ ] Job type enum
- [ ] Receipt ID
- [ ] Attempt number
- [ ] Correlation ID
- [ ] Scheduled timestamp
- [ ] Dedupe key
- [ ] Safe payload reference
- [ ] Queue adapter interface
- [ ] Enqueue result contract
- [ ] Claim/ack/nack contract
- [ ] Queue unavailable behavior
- [ ] Observability metadata

### Job types

```txt
PROCESS_META_LEAD
PROCESS_INSTAGRAM_INBOUND
SEND_INSTAGRAM_REPLY
SEND_INSTAGRAM_PRIVATE_REPLY
VALIDATE_SOCIAL_ATTACHMENT
REPLAY_SOCIAL_EVENT
SYNC_FACEBOOK_PAGE_INBOX
REFRESH_META_PERMISSION_HEALTH
```

### Done criteria

- [ ] Domain code is queue-provider agnostic
- [ ] Queue jobs reference durable DB state
- [ ] Secret payload is not embedded in jobs

---

## 4.3 Lead processing job

### Tasks

- [ ] Claim receipt
- [ ] Load normalized event
- [ ] Resolve provider/page/form identity
- [ ] Fetch full Lead data when required
- [ ] Normalize Lead
- [ ] Persist normalized Lead
- [ ] CRM handoff
- [ ] Mark processed
- [ ] Classify provider error
- [ ] Retry/permanent/dead-letter handling
- [ ] Duplicate-safe completion

### Tests

- [ ] Success
- [ ] Duplicate
- [ ] Missing form mapping
- [ ] Expired access
- [ ] Rate limit retry
- [ ] Auth block
- [ ] Worker crash and reclaim
- [ ] CRM handoff replay safety

---

## 4.4 Instagram inbound message job

### Tasks

- [ ] Claim receipt
- [ ] Resolve account identity
- [ ] Normalize inbound event
- [ ] Persist conversation/message
- [ ] Schedule media validation
- [ ] Update conversation ordering
- [ ] Emit normalized realtime event
- [ ] Mark processed
- [ ] Handle duplicates and out-of-order events

### Tests

- [ ] Text message
- [ ] Media message
- [ ] Duplicate provider message
- [ ] Missing account mapping
- [ ] Late event
- [ ] Malformed participant identity
- [ ] Worker crash and resume

---

## 4.5 Instagram reply and private-reply jobs

### Tasks

- [ ] Load durable send request
- [ ] Re-evaluate reply-window policy at execution time
- [ ] Re-evaluate media policy
- [ ] Check kill switch
- [ ] Check idempotency key
- [ ] Execute Graph write
- [ ] Capture provider message ID
- [ ] Handle unknown write outcome
- [ ] Reconcile before retry when possible success
- [ ] Persist result
- [ ] Emit admin/realtime state update

### Tests

- [ ] Valid standard reply
- [ ] Expired standard reply
- [ ] Valid private reply
- [ ] Second private reply blocked
- [ ] Kill switch blocked
- [ ] Rate limit retry
- [ ] Timeout after possible success → reconciliation
- [ ] Provider message ID stored

---

## 4.6 Media validation job

### Tasks

- [ ] Resolve provider attachment metadata
- [ ] URL validation
- [ ] Bounded download
- [ ] MIME sniffing
- [ ] Size verification
- [ ] SHA-256 digest
- [ ] Malware scan
- [ ] Quarantine unsafe media
- [ ] Store verified media reference
- [ ] Update message/attachment state
- [ ] Retry transient download/scan errors
- [ ] Permanent-block invalid media

### Tests

- [ ] Safe image
- [ ] Safe video
- [ ] Oversize
- [ ] MIME confusion
- [ ] Malware
- [ ] Timeout
- [ ] Host redirect attack
- [ ] Duplicate media digest

---

## 4.7 Retry, dead-letter and replay control

### Tasks

- [ ] Standard retry policy
- [ ] Exponential backoff
- [ ] Jitter
- [ ] Maximum attempts
- [ ] Retry-after support
- [ ] Permanent failure classification
- [ ] Dead-letter state
- [ ] Replay approval contract
- [ ] Replay audit record
- [ ] Replay dedupe protection
- [ ] Unknown-write reconciliation requirement
- [ ] Admin-visible safe reason

### Done criteria

- [ ] Blind retry is prevented for possible-success writes
- [ ] Dead-letter records are durable
- [ ] Replay cannot bypass policy/dedupe
- [ ] Retry schedule deterministic enough to audit

---

## 4.8 Layer 4 worker and queue evidence gate

### Tasks

- [ ] Queue unavailable test
- [ ] Worker crash test
- [ ] Retry test
- [ ] Dead-letter test
- [ ] Replay test
- [ ] Possible-success reconciliation test
- [ ] Main app worker startup test
- [ ] Source inventory update
- [ ] Evidence log
- [ ] Layer 4 PASS/BLOCKED verdict

### Evidence

```txt
evidence/phase31-meta-social-crm/04-queue-jobs.md
```

---

# Layer 5 — Domain Service Layer

## Layer 5 objective

Lead Ads, Instagram এবং Facebook Page business logic route/worker adapter থেকে পৃথক platform domain services-এ নেওয়া।

---

## 5.1 Lead Ads legacy-domain audit and migration map

### Tasks

- [ ] `lib/meta/leads/*` complete audit
- [ ] Direct Graph calls map
- [ ] Existing normalization map
- [ ] Existing lead duplicate logic map
- [ ] Existing CRM/customer/contact handoff map
- [ ] Existing test-lead flow map
- [ ] Legacy functions classify:
  - migrate;
  - wrap;
  - deprecate;
  - delete later
- [ ] Target file map তৈরি করা

### Done criteria

- [ ] No unknown legacy lead path remains
- [ ] 5.2–5.4 exact work split defined

---

## 5.2 Lead normalize and mapping domain

### Tasks

- [ ] Stored receipt → normalized Lead contract
- [ ] Page/form/ad/adset/campaign mapping
- [ ] Field mapping
- [ ] Phone/email handling
- [ ] Missing field handling
- [ ] Test Lead detection
- [ ] Provider timestamp handling
- [ ] Safe domain result

### Suggested files

```txt
lib/meta-platform/domains/leads/normalize-lead.ts
lib/meta-platform/domains/leads/lead-mapper.ts
```

---

## 5.3 Lead processing and CRM handoff domain

### Tasks

- [ ] Lead fetch abstraction
- [ ] Access/token error taxonomy
- [ ] Normalized Lead persistence
- [ ] CRM contact/customer handoff
- [ ] Duplicate-safe handoff
- [ ] Audit/correlation
- [ ] Retry-safe result
- [ ] Terminal failure behavior

### Suggested file

```txt
lib/meta-platform/domains/leads/process-lead.ts
```

---

## 5.4 Meta test-lead domain and evidence path

### Tasks

- [ ] Test lead creation/identification flow
- [ ] Test lead processing path
- [ ] Safe test fixture
- [ ] Evidence capture
- [ ] Production/test separation
- [ ] Test cleanup policy

### Suggested file

```txt
lib/meta-platform/domains/leads/test-lead.ts
```

---

## 5.5 Instagram legacy-domain audit and migration map

### Tasks

- [ ] `lib/meta/instagram/*` audit
- [ ] Existing Graph calls map
- [ ] Conversation sync map
- [ ] Inbound message processing map
- [ ] Reply/private reply map
- [ ] Attachment handling map
- [ ] Existing reply-window assumptions map
- [ ] Legacy functions classify
- [ ] Target platform files map

---

## 5.6 Instagram inbound conversation domain

### Tasks

- [ ] Stored receipt → normalized inbound message
- [ ] Account/page identity resolution
- [ ] Participant resolution
- [ ] Conversation upsert
- [ ] Message upsert
- [ ] Out-of-order handling
- [ ] Attachment validation scheduling
- [ ] Realtime event creation
- [ ] Safe result

### Suggested files

```txt
lib/meta-platform/domains/instagram/normalize-message.ts
lib/meta-platform/domains/instagram/conversations.ts
```

---

## 5.7 Instagram standard reply domain

### Tasks

- [ ] Durable send request validation
- [ ] Reply-window evaluation
- [ ] Idempotency
- [ ] Kill-switch check
- [ ] Graph transport call
- [ ] Provider message ID
- [ ] Error taxonomy
- [ ] Unknown result reconciliation
- [ ] Persistence update
- [ ] Realtime/admin event

### Suggested file

```txt
lib/meta-platform/domains/instagram/send-reply.ts
```

---

## 5.8 Instagram private reply domain

### Tasks

- [ ] Comment/post relationship
- [ ] Seven-day policy
- [ ] One-shot persistence
- [ ] Instagram Live active-state requirement
- [ ] Idempotency
- [ ] Provider response capture
- [ ] Expired/duplicate blocked result
- [ ] Reconciliation for possible success

### Suggested file

```txt
lib/meta-platform/domains/instagram/private-reply.ts
```

---

## 5.9 Instagram attachment/media domain integration

### Tasks

- [ ] Attachment metadata normalization
- [ ] Media validation job integration
- [ ] Quarantine state
- [ ] Safe display projection
- [ ] Outbound attachment validation
- [ ] Unsafe media block result
- [ ] Admin-visible reason without unsafe payload

### Suggested file

```txt
lib/meta-platform/domains/instagram/media-policy.ts
```

---

## 5.10 Facebook Page identity and permission domain

### Tasks

- [ ] `lib/facebook/*` audit
- [ ] Direct Graph client use map
- [ ] Page token health
- [ ] Required permissions map
- [ ] Page/app/business/account identity checks
- [ ] Revoked/expired permission state
- [ ] Admin health projection
- [ ] Shared Graph transport usage

### Suggested files

```txt
lib/meta-platform/domains/pages/page-identity.ts
lib/meta-platform/domains/pages/permissions.ts
```

---

## 5.11 Legacy Facebook inbox sync bridge

### Tasks

- [ ] Existing inbox sync behavior preserve
- [ ] Direct legacy Graph access replace
- [ ] Platform repository/transport use
- [ ] Feature flag boundary
- [ ] Shadow comparison option
- [ ] Duplicate-safe message sync
- [ ] Rollback-compatible adapter
- [ ] Legacy route platform-backed করা

### Suggested files

```txt
lib/meta-platform/domains/facebook/legacy-bridge.ts
lib/meta-platform/domains/facebook/inbox-sync.ts
app/api/admin/social/facebook/sync/route.ts
```

---

## 5.12 Layer 5 domain release gate

### Required tests

- [ ] Lead receipt processing
- [ ] Duplicate lead
- [ ] Missing/expired lead access
- [ ] Test lead
- [ ] Instagram inbound text
- [ ] Instagram inbound media
- [ ] Valid reply
- [ ] Expired reply
- [ ] Valid private reply
- [ ] Second private reply blocked
- [ ] Unsafe media blocked/quarantined
- [ ] Facebook permission error
- [ ] Legacy Graph direct usage audit
- [ ] Domain services use platform contracts only

### Evidence

```txt
evidence/phase31-meta-social-crm/05-leads-domain.md
evidence/phase31-meta-social-crm/06-instagram-domain.md
evidence/phase31-meta-social-crm/07-facebook-pages-domain.md
```

---

# Layer 6 — Realtime Bridge Layer

## Layer 6 objective

Realtime service একই normalized events, persistence state, retry/dead-letter এবং policy results ব্যবহার করবে।

---

## 6.1 Realtime Facebook service audit

### Paths

```txt
realtime-service/src/facebook/*
realtime-service/src/routes/webhook.router.ts
```

### Tasks

- [ ] Direct Graph calls
- [ ] Signature verification
- [ ] Inbox processor
- [ ] Outgoing retry
- [ ] Dead-letter
- [ ] Media retry
- [ ] Attachment handling
- [ ] Token health
- [ ] Replay queue
- [ ] Event payloads
- [ ] Websocket schemas
- [ ] Main-app state mismatch audit

---

## 6.2 Realtime normalized event bridge

### Tasks

- [ ] Shared normalized event contract adoption
- [ ] Main app → realtime bridge
- [ ] Realtime → websocket safe payload
- [ ] Receipt/message/conversation IDs
- [ ] Correlation identity
- [ ] Duplicate websocket event control
- [ ] Out-of-order delivery handling

---

## 6.3 Realtime Graph client replacement or isolation

### Tasks

- [ ] Replace direct Graph client where possible
- [ ] Use platform Graph HTTP transport
- [ ] Central error taxonomy
- [ ] Central permission health
- [ ] Feature-flagged legacy fallback
- [ ] Direct client audit enforcement

---

## 6.4 Realtime retry/dead-letter alignment

### Tasks

- [ ] Main app job state mapping
- [ ] Realtime retry state mapping
- [ ] Dead-letter state alignment
- [ ] Replay authorization alignment
- [ ] Unknown-write reconciliation
- [ ] No parallel retry loops

---

## 6.5 Realtime media and token-health alignment

### Tasks

- [ ] Shared attachment policy
- [ ] Shared media validation status
- [ ] Shared Page/account permission model
- [ ] Revoked token behavior
- [ ] Safe admin/realtime health output

---

## 6.6 Realtime independent build and evidence gate

### Required checks

- [ ] Realtime typecheck
- [ ] Realtime build
- [ ] Websocket contract tests
- [ ] Duplicate event tests
- [ ] Retry/dead-letter alignment tests
- [ ] Direct Graph client audit
- [ ] Feature-flag fallback test

### Evidence

```txt
evidence/phase31-meta-social-crm/08-realtime-bridge.md
```

---

# Layer 7 — Admin and API Presentation Layer

## Layer 7 objective

Admin UI scattered legacy details নয়; unified receipt, queue, domain, permission এবং reply-policy state দেখাবে।

---

## 7.1 Admin/API data contract audit

### Tasks

- [ ] Existing admin endpoints list
- [ ] Existing response shapes
- [ ] Raw payload exposure audit
- [ ] Permission checks audit
- [ ] Pagination/filtering audit
- [ ] Legacy model coupling audit
- [ ] New shared admin DTO design

---

## 7.2 Admin inbox platform-backed API

### Tasks

- [ ] Conversation list
- [ ] Message list
- [ ] Participant summary
- [ ] Attachment safe state
- [ ] Reply eligibility
- [ ] Last activity
- [ ] Processing status
- [ ] Failure/block reason
- [ ] Pagination/filtering
- [ ] Sensitive redaction

### Paths

```txt
app/api/admin/inbox/*
app/admin/inbox/page.tsx
```

---

## 7.3 Instagram admin health and operations API

### Tasks

- [ ] Webhook status
- [ ] Account/Page binding
- [ ] Permission health
- [ ] Queue health
- [ ] Message processing state
- [ ] Reply-window state
- [ ] Private reply state
- [ ] Provider message ID
- [ ] Dead-letter count
- [ ] Safe operation details

### Paths

```txt
app/api/admin/meta/instagram/*
app/admin/meta/instagram/page.tsx
```

---

## 7.4 Lead Ads admin status API

### Tasks

- [ ] Receipt state
- [ ] Lead fetch state
- [ ] Normalized lead state
- [ ] CRM handoff state
- [ ] Duplicate count
- [ ] Form/Page mapping
- [ ] Test lead marker
- [ ] Failure/dead-letter reason
- [ ] Safe PII projection

### Paths

```txt
app/api/admin/meta/leads/*
app/admin/meta-business/leads/page.tsx
```

---

## 7.5 Provider permission/account health API

### Tasks

- [ ] App health
- [ ] Business health
- [ ] Page health
- [ ] Instagram account health
- [ ] Ad account/form health where relevant
- [ ] Missing permission
- [ ] Expired/revoked access
- [ ] Last verified timestamp
- [ ] Safe remediation hint

### Suggested path

```txt
app/api/admin/meta/health/route.ts
```

---

## 7.6 Queue, dead-letter and replay visibility

### Tasks

- [ ] Queue summary
- [ ] Processing count
- [ ] Failed count
- [ ] Dead-letter count
- [ ] Retry schedule
- [ ] Safe error reason
- [ ] Replay eligibility
- [ ] Replay approval requirement
- [ ] Audit trail
- [ ] No raw secret payload

### Suggested paths

```txt
app/api/admin/meta/jobs/route.ts
app/api/admin/meta/operations/summary/route.ts
```

---

## 7.7 Admin replay/action controls

### Tasks

- [ ] Authorization
- [ ] CSRF/request validation
- [ ] Approval reason
- [ ] Actor audit
- [ ] Replay-safe endpoint
- [ ] Kill-switch respect
- [ ] No dedupe bypass
- [ ] No direct provider write from UI route
- [ ] Safe response contract

---

## 7.8 Layer 7 admin/API evidence gate

### Tests

- [ ] Admin can trace receipt → job → business record
- [ ] Blocked reply reason visible
- [ ] Permission health visible
- [ ] Dead-letter visible
- [ ] Replay audited
- [ ] Raw token/secret absent
- [ ] Raw webhook PII absent
- [ ] Unauthorized access rejected
- [ ] Pagination/filtering safe

### Evidence

```txt
evidence/phase31-meta-social-crm/09-admin-api.md
```

---

# Layer 8 — Feature Flags, Cutover and Rollback

## Layer 8 objective

Migration observable, reversible এবং write-safe করা।

---

## 8.1 Feature flag inventory and configuration contract

### Required flags

```txt
META_PLATFORM_LEADS
META_PLATFORM_INSTAGRAM
META_PLATFORM_LEGACY_FACEBOOK
META_PLATFORM_SOCIAL_REALTIME
META_PLATFORM_SOCIAL_WEBHOOKS
```

### Optional finer flags

```txt
META_PLATFORM_INSTAGRAM_WRITES
META_PLATFORM_INSTAGRAM_PRIVATE_REPLY
META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS
META_PLATFORM_SOCIAL_REPLAY
```

### Tasks

- [ ] Env schema
- [ ] Default values
- [ ] Production-safe defaults
- [ ] Config manifest
- [ ] Env docs
- [ ] Runtime visibility without secret exposure
- [ ] Invalid flag fail-safe behavior

---

## 8.2 Global outbound-write kill switch

### Tasks

- [ ] Standard reply write block
- [ ] Private reply write block
- [ ] Facebook Page write block
- [ ] Media outbound block
- [ ] Worker checks switch at execution time
- [ ] Admin UI displays blocked reason
- [ ] Existing queued jobs do not bypass switch
- [ ] Safe recovery after re-enable

---

## 8.3 Lead Ads cutover sequence

### Sequence

```txt
Legacy read
→ Shadow processing
→ Platform result comparison
→ Platform processing
→ Rollback proof
→ Legacy disable
```

### Tasks

- [ ] Legacy/platform duplicate prevention
- [ ] Shadow comparison metrics
- [ ] Controlled enable
- [ ] Rollback route
- [ ] Stability observation criteria
- [ ] Legacy disable criteria

---

## 8.4 Instagram cutover sequence

### Sequence

```txt
Legacy read
→ Shadow normalized message
→ Platform inbox read
→ Controlled reply write
→ Private reply write
→ Rollback proof
→ Legacy disable
```

### Tasks

- [ ] Read parity
- [ ] Conversation/message parity
- [ ] Reply policy parity
- [ ] Provider message ID parity
- [ ] Attachment state parity
- [ ] Write kill switch
- [ ] Rollback flow

---

## 8.5 Legacy Facebook and realtime cutover

### Tasks

- [ ] Legacy direct client flag
- [ ] Shadow platform path
- [ ] Platform-backed sync
- [ ] Realtime bridge enable
- [ ] Duplicate event prevention
- [ ] Retry ownership
- [ ] Rollback path
- [ ] Direct client disable

---

## 8.6 Rollback proof

### Required rollback demonstrations

- [ ] Lead platform off
- [ ] Instagram read platform off
- [ ] Instagram writes off
- [ ] Private reply off
- [ ] Realtime bridge off
- [ ] Legacy fallback where applicable
- [ ] Queue jobs honor current flags
- [ ] No data corruption after toggling
- [ ] Audit evidence captured

---

## 8.7 Layer 8 cutover gate

### Done criteria

- [ ] All flags documented
- [ ] Defaults safe
- [ ] Kill switch tested
- [ ] Rollback tested
- [ ] Legacy disable is reversible until final observation
- [ ] No direct write bypass remains
- [ ] Layer 8 verdict PASS/BLOCKED

### Evidence

```txt
evidence/phase31-meta-social-crm/10-cutover-rollback.md
```

---

# Layer 9 — QA, Evidence and Release Gate

## Layer 9 objective

Phase 31 complete বলার আগে automated checks, runtime build, migration drill, live Meta evidence, rollback proof এবং explicit release decision তৈরি করা।

---

## 9.1 Phase 31 automated audit scripts

### Add scripts

```json
{
  "qa:phase31-meta-webhooks": "node scripts/meta-v6-phase31-webhook-audit.mjs",
  "qa:phase31-meta-persistence": "node scripts/meta-v6-phase31-persistence-audit.mjs",
  "qa:phase31-meta-leads": "node scripts/meta-v6-phase31-leads-audit.mjs",
  "qa:phase31-meta-instagram": "node scripts/meta-v6-phase31-instagram-audit.mjs",
  "qa:phase31-meta-realtime": "node scripts/meta-v6-phase31-realtime-audit.mjs",
  "qa:phase31-meta-admin": "node scripts/meta-v6-phase31-admin-audit.mjs",
  "qa:phase31-meta-cutover": "node scripts/meta-v6-phase31-cutover-audit.mjs",
  "qa:phase31-meta-social-crm": "npm run qa:phase31-meta-webhooks && npm run qa:phase31-meta-persistence && npm run qa:phase31-meta-leads && npm run qa:phase31-meta-instagram && npm run qa:phase31-meta-realtime && npm run qa:phase31-meta-admin && npm run qa:phase31-meta-cutover"
}
```

### Done criteria

- [ ] Scripts are deterministic
- [ ] CI-friendly exit codes
- [ ] No live secrets required for static gates
- [ ] Live-provider checks separately marked

---

## 9.2 Webhook security and receipt tests

### Required tests

- [ ] Bad signature rejected
- [ ] Missing signature rejected
- [ ] Oversized body rejected
- [ ] Valid challenge accepted
- [ ] Invalid challenge rejected
- [ ] Receipt created before processing
- [ ] Duplicate ignored
- [ ] Receipt outage returns retryable response
- [ ] Queue outage after receipt returns deferred response
- [ ] Unsupported object handled safely
- [ ] Late/out-of-order event deterministic

---

## 9.3 Persistence and idempotency tests

### Required tests

- [ ] DB duplicate receipt blocked
- [ ] DB duplicate Lead blocked
- [ ] DB duplicate inbound message blocked
- [ ] DB duplicate outbound idempotency key blocked
- [ ] Process crash recovery
- [ ] Lease reclaim
- [ ] Invalid state transition rejected
- [ ] Dead-letter replay audited
- [ ] Payload secret redaction
- [ ] Migration apply/recovery drill

---

## 9.4 Lead Ads domain tests

### Required tests

- [ ] Leadgen receipt
- [ ] Full Lead fetch
- [ ] Duplicate Lead
- [ ] Missing form mapping
- [ ] Expired/missing access
- [ ] CRM handoff
- [ ] CRM retry safety
- [ ] Test Lead
- [ ] Safe PII logging
- [ ] Feature-flag rollback

---

## 9.5 Instagram domain tests

### Required tests

- [ ] Inbound text
- [ ] Inbound attachment
- [ ] Duplicate message
- [ ] Late message
- [ ] Valid standard reply
- [ ] Expired standard reply blocked
- [ ] Valid private reply
- [ ] Second private reply blocked
- [ ] Instagram Live inactive block
- [ ] Unsafe media blocked/quarantined
- [ ] Provider message ID captured
- [ ] Unknown write reconciliation
- [ ] Write kill switch

---

## 9.6 Realtime and admin tests

### Required tests

- [ ] Realtime independent build
- [ ] Websocket normalized payload
- [ ] Duplicate websocket event handling
- [ ] Retry/dead-letter alignment
- [ ] Token health alignment
- [ ] Admin receipt trace
- [ ] Admin blocked reason
- [ ] Admin permission health
- [ ] Admin dead-letter visibility
- [ ] Admin replay authorization
- [ ] Sensitive-data redaction

---

## 9.7 Live Meta provider evidence

### Required live evidence

- [ ] Meta webhook subscription screenshot/log
- [ ] Leadgen webhook delivery
- [ ] Meta test Lead processed
- [ ] Instagram webhook delivery
- [ ] Instagram inbound message
- [ ] Instagram valid reply
- [ ] Instagram expired reply blocked
- [ ] Instagram private reply
- [ ] Provider outbound message ID captured
- [ ] Queue retry evidence
- [ ] Dead-letter evidence
- [ ] Rollback/kill-switch evidence
- [ ] Permission/account health evidence

### Evidence folders

```txt
evidence/phase31-meta-social-crm/screenshots/
evidence/phase31-meta-social-crm/logs/
evidence/phase31-meta-social-crm/provider-responses/
```

Secrets এবং raw tokens evidence-এ redact করতে হবে।

---

## 9.8 Final runtime and release gate

### Runtime commands

Registry blocker clear হওয়ার পর:

```bash
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm run build
```

Realtime service:

```bash
cd realtime-service
npm ci
npm run typecheck
npm run build
```

Database:

```txt
Disposable PostgreSQL migration apply
Recovery
Re-apply
Application smoke test
```

### Final release criteria

Phase 31 `COMPLETE` হবে only when:

- [ ] Phase 30 runtime blockers closed
- [ ] Main app typecheck pass
- [ ] Main app lint pass
- [ ] Main app production build pass
- [ ] Realtime typecheck/build pass
- [ ] All migrations apply/recover
- [ ] Shared webhook transport active
- [ ] Receipt-first durable processing active
- [ ] DB-level dedupe active
- [ ] Queue retry/dead-letter/replay active
- [ ] Lead Ads platform domain active
- [ ] Instagram platform domain active
- [ ] Facebook legacy path disabled or rollback-controlled
- [ ] Realtime platform bridge active
- [ ] Admin platform state visible
- [ ] Flags and kill switches tested
- [ ] Rollback proof attached
- [ ] Live Lead Ads evidence attached
- [ ] Live Instagram evidence attached
- [ ] Security/media/idempotency tests pass
- [ ] Final release decision explicitly `PASS`

### Final verdict format

```txt
Phase 31 status: COMPLETE / BLOCKED

Runtime foundation: PASS/BLOCKED
Contracts: PASS
Webhook transport: PASS
Persistence/dedupe: PASS/BLOCKED
Queue/jobs: PASS/BLOCKED
Lead Ads domain: PASS/BLOCKED
Instagram domain: PASS/BLOCKED
Facebook/Page domain: PASS/BLOCKED
Realtime bridge: PASS/BLOCKED
Admin/API: PASS/BLOCKED
Flags/cutover/rollback: PASS/BLOCKED
Live provider evidence: PASS/BLOCKED

Release decision: PASS/BLOCKED

Remaining blockers:
- ...
```

### Final artifacts

```txt
minsahbeauty_phase31_complete.zip
minsahbeauty_phase31_complete.zip.sha256
phase31_final_verification.log
evidence/phase31-meta-social-crm/11-final-release-gate.md
```

---

# 3. Recommended exact execution sequence

```txt
3.1 Existing persistence and dedupe audit
3.2 Unified webhook receipt persistence
3.3 Receipt repository and state transitions
3.4 Provider identity/object mapping persistence
3.5 Lead normalized storage
3.6 Instagram conversation/message/outbound storage
3.7 Sanitized payload/replay metadata
3.8 Layer 3 migration and evidence gate

4.1 Existing queue audit
4.2 Shared queue contract
4.3 Lead job
4.4 Instagram inbound job
4.5 Reply/private-reply jobs
4.6 Media validation job
4.7 Retry/dead-letter/replay
4.8 Layer 4 evidence gate

5.1 Lead legacy audit
5.2 Lead normalization domain
5.3 Lead processing/CRM domain
5.4 Test-lead domain
5.5 Instagram legacy audit
5.6 Instagram inbound domain
5.7 Standard reply domain
5.8 Private reply domain
5.9 Media domain integration
5.10 Page identity/permission domain
5.11 Legacy Facebook inbox bridge
5.12 Layer 5 evidence gate

6.1 Realtime audit
6.2 Normalized event bridge
6.3 Graph client replacement/isolation
6.4 Retry/dead-letter alignment
6.5 Media/token-health alignment
6.6 Realtime build/evidence gate

7.1 Admin/API audit
7.2 Admin inbox
7.3 Instagram admin
7.4 Lead Ads admin
7.5 Permission/account health
7.6 Queue/dead-letter/replay visibility
7.7 Admin action controls
7.8 Admin evidence gate

8.1 Feature flag contract
8.2 Write kill switch
8.3 Lead cutover
8.4 Instagram cutover
8.5 Facebook/realtime cutover
8.6 Rollback proof
8.7 Cutover evidence gate

9.1 QA scripts
9.2 Webhook tests
9.3 Persistence/idempotency tests
9.4 Lead tests
9.5 Instagram tests
9.6 Realtime/admin tests
9.7 Live Meta evidence
9.8 Final runtime and release gate
```

---

# 4. Next-session start marker

```txt
CURRENT CHECKPOINT:
Phase 31 Layer 4.8 COMPLETE / Layer 4 PASS

LATEST PROJECT:
minsahbeauty_phase31_layer4_complete_second_brain_v3.zip

START NOW:
Layer 5.1 — Lead Ads legacy-domain audit and migration map

EXECUTION:
- prove full repository access with npm run ai:preflight
- complete numbered items sequentially
- verify each item before the next
- package only after the completed Layer 5.12 gate

DO NOT:
- restart Layers 1-4
- create per-item ZIPs
- make unnecessary Prisma changes
- change schema without migration.sql and recovery.sql
- claim full build/typecheck/lint/runtime/provider PASS without successful evidence
- skip numbered item gates
```

---

# 5. Layer 5.1 starter message

নতুন chat-এ শুরু করার জন্য:

> Complete project ZIP extract করে `minsahbeauty-meta-v6-update/` repository root ব্যবহার করো। `AGENTS.md` পড়ো, `npm run ai:preflight` এবং `npm run qa:second-brain` চালাও। Phase 31 Layer 4.8 PASS checkpoint preserve করে Layer 5.1 Lead Ads legacy-domain audit and migration map complete করো। Item gate truthfully complete হলে checkpoint update করে 5.2-তে continue করা যাবে। Per-item ZIP তৈরি করবে না; Layer 5.12 gate pass-এর পরে full Layer 5 project ZIP, checksum, verification log এবং evidence তৈরি করবে।
