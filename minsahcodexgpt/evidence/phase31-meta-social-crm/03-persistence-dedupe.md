# Phase 31 Meta Social CRM — Layer 3.2 unified webhook receipt persistence

**Item:** Layer 3.2 — Unified webhook receipt persistence model  
**Status:** PASS for source and dependency-independent verification  
**Implementation date:** 2026-07-24  
**Input checkpoint:** Phase 31 Layer 3.1 COMPLETE

## Executive conclusion

Layer 3.2 adds one additive, environment-and-connection-scoped `MetaSocialWebhookReceipt` model for Lead Ads, Instagram and future Facebook Page webhook adoption. The database unique boundary is the final dedupe authority. The canonical receipt stores a SHA-256 payload digest and a bounded allowlisted metadata projection; it does not store raw webhook bodies, complete provider envelopes, message text, email, phone, access tokens, app secrets or signed attachment URLs.

Active Lead Ads and Instagram paths now create-or-get the canonical receipt before writing their existing legacy receipt. Existing `MetaWebhookReceipt` and `MetaInstagramWebhookReceipt` behavior remains in place and each canonical row is linked to the durable legacy receipt identity. Realtime Facebook cutover is intentionally deferred to its numbered realtime layer.

This item does not implement the Layer 3.3 state-transition matrix, processing lease, worker claim/reclaim or dead-letter replay execution.

## What changed

### Canonical schema

Added:

```text
MetaSocialWebhookProvider
MetaSocialWebhookPlatform
MetaSocialWebhookReceiptState
MetaSocialWebhookReceipt
```

The canonical states are:

```text
RECEIVED
QUEUED
PROCESSING
PROCESSED
BLOCKED
FAILED
DEAD_LETTERED
```

A receipt may be created only in `RECEIVED` or `BLOCKED`. Later lifecycle changes are reserved for the guarded Layer 3.3 transition service.

### Canonical receipt field map

| Field group | Fields | Purpose |
|---|---|---|
| Scope | `provider`, `platform`, `environment`, `connectionKey` | Isolate provider, channel, deployment environment and configured Meta connection |
| Provider identity | `providerDeliveryId`, `providerEventKey` | Retain best available provider delivery/object identity and one deterministic event identity |
| Payload evidence | `payloadDigest`, `lastPayloadDigest`, `digestMismatchCount`, `safeMetadata` | Preserve first digest, surface changed duplicates and retain only an allowlisted diagnostic projection |
| Delivery evidence | `receivedAt`, `firstSeenAt`, `lastSeenAt`, `duplicateCount` | Trace first delivery and later duplicate deliveries without creating another row |
| Processing reservation | `state`, `queueName`, `jobReference`, `attemptCount`, `lastAttemptAt`, `nextRetryAt` | Provide fields needed by Layers 3.3 and 4 without implementing their lifecycle yet |
| Failure/dead letter | `failureCode`, `failureCategory`, `failureSummary`, `deadLetteredAt` | Reserve normalized safe operational failure evidence |
| Trace/replay | `correlationId`, `parentReceiptId`, `replayAttempt`, `replayReason`, `replayRequestedBy`, `replayRequestedAt` | Support traceability and a controlled future replay chain |
| Compatibility | `legacyReceiptType`, `legacyReceiptId` | Link the canonical receipt to the current Lead or Instagram receipt during migration |

## DB dedupe decision

The authoritative unique boundary is:

```text
provider + platform + environment + connectionKey + providerEventKey
```

Rationale:

1. Meta does not expose one reliable non-null request delivery ID across all Lead Ads, Instagram and Page event shapes.
2. The shared webhook parser or channel normalizer already produces a deterministic event key.
3. `platform`, `environment` and `connectionKey` prevent legitimate cross-channel, staging/production or multi-connection collisions.
4. `providerDeliveryId` remains nullable diagnostic evidence and is not the sole dedupe authority.

The repository uses one PostgreSQL `INSERT ... ON CONFLICT` statement. It does not perform a vulnerable select-then-insert sequence.

### First delivery

```text
one row
state = RECEIVED or BLOCKED
duplicateCount = 0
digestMismatchCount = 0
payloadDigest = first immutable digest
lastPayloadDigest = first digest
```

### Duplicate delivery

```text
no second row
duplicateCount += 1
lastSeenAt advances monotonically
providerDeliveryId fills only when the stored value is null
lastPayloadDigest records the newest digest
```

### Same key, changed payload

```text
no second row
payloadDigest remains the first digest
lastPayloadDigest records the changed digest
digestMismatchCount += 1
repository result returns digestMatches = false
```

## Sanitized payload policy

`safeMetadata` is allowlist-based. Accepted keys are bounded scalar diagnostics such as provider object/event type, routing target, provider IDs, event position/time and signature/rejection status.

The canonical model has no columns for:

```text
rawBody
rawPayload
complete normalized event
messageText
email
phone
accessToken
appSecret
payloadEncrypted
attachment source URL
signed media URL
```

The repository ignores unknown/nested metadata keys, bounds individual strings to 512 characters and caps the serialized safe projection at 16 KiB.

Legacy Lead receipt encryption remains unchanged. Legacy Instagram normalized-event storage also remains unchanged for compatibility; Layer 3.2 prevents that sensitive content from being duplicated into the new canonical receipt.

## Repository boundary

Created:

```text
lib/meta-platform/repositories/webhook-receipts.ts
lib/meta-platform/repositories/prisma-webhook-receipts.ts
lib/meta-platform/repositories/index.ts
```

The pure repository module provides:

```text
createMetaSocialWebhookReceiptRepository
sanitizeMetaSocialWebhookMetadata
resolveMetaPlatformEnvironment
resolveMetaSocialConnectionKey
InMemoryMetaSocialWebhookReceiptStore
```

The server-only Prisma adapter provides:

```text
createOrGetMetaSocialWebhookReceipt
linkMetaSocialWebhookLegacyReceipt
```

The adapter intentionally uses the reviewed SQL boundary instead of a generated Prisma model accessor because the locked dependency install and Prisma generation are unavailable in this archive environment. A fresh generated client remains required before production runtime validation.

## Lead Ads compatibility

`createVerifiedMetaWebhookReceipt` now:

```text
create-or-get canonical LEAD_ADS receipt
→ encrypt and write existing MetaWebhookReceipt
→ link canonical receipt to MetaWebhookReceipt ID
→ continue current queue/handoff behavior
```

Rejected Lead events create a canonical `BLOCKED` receipt with a bounded rejection code before the existing rejected legacy receipt is written.

The canonical safe projection includes provider IDs and event timestamps only. The raw Lead envelope remains only in the existing encrypted legacy field.

## Instagram compatibility

`persistInstagramWebhookReceipt` now:

```text
create-or-get canonical INSTAGRAM receipt
→ find/create existing MetaInstagramWebhookReceipt
→ preserve current duplicate/race behavior
→ link canonical receipt to MetaInstagramWebhookReceipt ID
→ continue current queue/handoff behavior
```

The canonical projection excludes message text, participant profile text, attachment arrays and source URLs.

## Facebook Page compatibility decision

The schema supports `FACEBOOK_PAGE`, but this item does not write canonical receipts from the separate realtime service. That service has an independent runtime and persistence path; adopting the canonical receipt without a designed cross-service transaction/queue boundary would exceed Layer 3.2 and risk duplicate processing. The bridge remains scheduled for the realtime numbered layer.

## Migration safety

Created:

```text
prisma/migrations/20260724233000_phase31_unified_webhook_receipts/migration.sql
prisma/migrations/20260724233000_phase31_unified_webhook_receipts/recovery.sql
prisma/migrations/20260724233000_phase31_unified_webhook_receipts/README.md
```

Properties:

- additive types and table only;
- no legacy table rename, delete or column mutation;
- duplicate detection guard immediately before unique index creation;
- check constraints for connection key, event identity length, SHA-256 format, JSON object shape, non-negative counters, seen-time ordering, replay parent and legacy reference pairs;
- scoped unique index and operational read indexes;
- controlled self-reference with `ON DELETE SET NULL`;
- migration registered in the migration governance manifest;
- recovery SQL contains an explicit destructive warning and precondition and removes only Layer 3.2 objects.

Hashes:

```text
schema.prisma:
ac9a206b5ac40c56a054c03932d0926611c6dead2a935d42f03e4a77f2d55230

migration.sql:
fd1d0b4da322b01414571fb3adaa1d137acbfe5ac56459183ddca8fee2f82cb6

recovery.sql:
918c483e24095806252faa74fcb9ccc5bbb60c97a709044de829758f4e20aebc
```

## Environment/configuration

Added documented non-secret scope configuration:

```text
META_PLATFORM_ENVIRONMENT=DEVELOPMENT
META_CONNECTION_NAME=primary
```

The environment resolver accepts only `DEVELOPMENT`, `STAGING` or `PRODUCTION`. The connection key is bounded to 80 characters and accepts only letters, numbers, `.`, `_` and `-` after an alphanumeric first character.

## Tests and verification

Dependency-independent checks executed from the Layer 3.2 working copy:

```text
Phase 31 persistence runtime:       8/8 PASS
Phase 31 persistence static audit: 37/37 PASS
Phase 31 Layer 1 runtime:          35/35 PASS
Phase 31 Layer 1 audit:            72/72 PASS
Phase 31 webhook runtime:          26/26 PASS
Phase 31 webhook audit:            37/37 PASS
Phase 24 transport audit:          74/74 PASS
Phase 14 Instagram audit:          81/81 PASS
Migration governance:             402/402 PASS
Source inventory:                  48/48 PASS
Prisma schema/migration pair:      PASS
Changed TypeScript syntax:         4/4 PASS
```

Source inventory now governs 491 active paths across 24 capabilities, including the new `social-webhook-persistence` capability.

### Focused persistence scenarios

- first receipt creates one identity;
- duplicate creates no second row and increments duplicate evidence;
- same event under another connection does not collide;
- same event under another environment does not collide;
- changed duplicate digest is surfaced;
- secret, PII, message text and nested raw payload metadata are excluded;
- unsupported initial state and replay without parent fail closed;
- environment and connection resolution fail closed.

## What did not change

- Existing Lead, Instagram, Facebook, generic social, conversation, message, attachment, outbound and job models were not deleted or renamed.
- Existing Lead and Instagram business processing and queue contracts were not redesigned.
- Canonical receipt state is not advanced to `QUEUED`, `PROCESSING`, terminal failure or dead letter in this item.
- No processing lease, worker claim/reclaim or transition matrix was implemented.
- No normalized Lead storage, Instagram conversation/message schema redesign, outbound idempotency redesign, realtime bridge, admin UI, replay authorization or cutover flag was implemented.
- No production data backfill was performed.

## Prisma status

```text
Schema change: YES
Migration pair: PRESENT
Migration governance: PASS 402/402
Prisma generated client: NOT GENERATED in this environment
Disposable PostgreSQL apply/recovery/re-apply: NOT RUN in this environment
```

`node_modules`, Prisma CLI, `psql` and Docker are absent. Therefore Prisma generation, dependency-backed typecheck/lint/build and a real PostgreSQL migration drill are not claimed. The migration is statically governed and ready for the Layer 3 migration drill/runtime environment.

## Known blocker

```text
The earlier locked npm install was blocked by registry 503 and node_modules remains absent.
No local PostgreSQL client/container runtime is available for apply/recovery execution.
```

## Completion decision

Layer 3.2 is complete for its numbered source scope because the durable canonical schema, scoped DB uniqueness, atomic create-or-get repository, digest/mismatch behavior, sanitized projection, compatibility write-through, migration/recovery pair, tests, governance and evidence are present.

Runtime database application and recovery proof remains a Layer 3 evidence-gate requirement and is not falsely claimed here.

## Exact next item

```text
Layer 3.3 — Receipt repository and state-transition service
```

Layer 3.3 must centralize guarded transitions, optimistic concurrency, queue handoff state, processing claim/lease/reclaim, retry/dead-letter behavior and controlled replay relationships. It must not invent another receipt model.

---

## Layer 3.3 cumulative update — guarded receipt lifecycle

Layer 3.3 is now complete for dependency-independent source scope. The Layer 3.2 canonical receipt remains the single dedupe boundary and now has guarded queue, processing, success, failure, retry, dead-letter and controlled replay transitions. Processing ownership is fenced by an expiring lease token; expired work can be reclaimed and stale workers cannot complete or fail a newer lease. Lead Ads and Instagram queue/worker paths use this central lifecycle while their existing business persistence remains compatible.

Detailed evidence: `evidence/phase31-meta-social-crm/03-receipt-state-transitions.md`.

Current verification:

```text
Persistence/lifecycle runtime 17/17 PASS
Layer 3.2 persistence audit 37/37 PASS
Layer 3.3 lifecycle audit 43/43 PASS
Migration governance 407/407 PASS
Source inventory 48/48 PASS
Inherited Layer 1/2, Phase 24 and Phase 14 regressions PASS
```

Runtime Prisma generation, PostgreSQL apply/recovery/re-apply and full dependency-backed build gates remain unclaimed because the required tooling is absent.

**Exact next item:** Layer 3.4 — Provider identity and object mapping persistence.

---

## Layer 3.4 cumulative update — provider identity and object mapping persistence

Layer 3.4 is complete for dependency-independent source scope. `MetaExternalReference` is now the environment/connection-scoped canonical identity registry for Meta App, Business, Ad Account, Page, Instagram Account and Lead Form assets. Typed identity lifecycle and permission-health fields, DB-unique typed relationship edges and nullable receipt primary-identity tracing were added without replacing `MetaConnection` or any legacy Lead/Instagram model.

Lead Ads attaches Page or Lead Form identity and persists the Page→Lead Form edge before continuing existing encrypted receipt persistence. Instagram attaches the Instagram account identity, persists the configured Page→Instagram edge and blocks configured account-scope mismatches before queue handoff. Safe identity metadata is allowlist-based and excludes credentials, raw payloads and PII.

Detailed evidence: `evidence/phase31-meta-social-crm/03-provider-identity-mapping.md`.

Current verification:

```text
Layer 3.2/3.3 lifecycle runtime 17/17 PASS
Layer 3.2 persistence audit 37/37 PASS
Layer 3.3 lifecycle audit 43/43 PASS
Layer 3.4 identity runtime 11/11 PASS
Layer 3.4 identity audit 58/58 PASS
Layer 1 contracts runtime/audit 35/35 + 72/72 PASS
Layer 2 webhook runtime/audit 26/26 + 37/37 PASS
Phase 24 static transport audit 74/74 PASS
Phase 14 Instagram static audit 81/81 PASS
Phase 21 context/reference audit 47/47 PASS
Migration governance 412/412 PASS
Source inventory 48/48 PASS over 504 active paths
Prisma pair and changed TypeScript syntax 15/15 PASS
```

Prisma generation, PostgreSQL apply/recovery/re-apply, dependency-backed Phase 24 runtime tests and full typecheck/lint/build remain unclaimed because `node_modules`/`tsx`, Prisma CLI, `psql` and Docker are unavailable.

**Exact next item:** Layer 3.5 — Lead receipt and normalized Lead storage.

---

## Layer 3.5 cumulative update — Lead receipt and normalized Lead storage

Layer 3.5 is complete for dependency-independent source scope. Canonical Lead Ads receipts now have one durable `MetaLeadProcessingAttempt`; successful provider retrieval links the attempt and receipt to the existing DB-idempotent `MetaLead`. Existing `leadgenId @unique` remains the provider identity authority, while scoped versioned HMAC phone/email fingerprints and transaction/advisory-lock handling harden business duplicate resolution. Replays create a separate audited attempt but resolve the same Lead and deterministic handoff.

Page and Lead Form identities from Layer 3.4 are persisted on the Lead and attempt, and fetched Form scope is validated before mutation. Raw provider payload remains AES-GCM encrypted; safe metadata contains masks, keyed fingerprints, bounded normalized fields and attribution only. Missing, token-blocked, retryable and permanent outcomes remain durable even when no Lead row exists.

Detailed evidence: `evidence/phase31-meta-social-crm/03-lead-normalized-storage.md`.

Current focused verification:

```text
Layer 3.5 Lead storage runtime 13/13 PASS
Layer 3.5 Lead storage audit 65/65 PASS
Legacy Phase 8 Lead audit 68/68 PASS
```

Prisma generation, disposable PostgreSQL apply/recovery/re-apply and full dependency-backed typecheck/lint/build remain unclaimed because required dependencies/database tooling are unavailable.

**Exact next item:** Layer 3.6 — Instagram conversation, message and outbound mapping persistence.

---

# Layer 3.6 checkpoint — Instagram conversation/message/outbound persistence

Layer 3.6 extends the canonical persistence boundary with scoped Instagram participants, conversations, inbound/outbound messages, receipt-to-message trace, monotonic activity/reply-window state, DB-backed outbound idempotency, actual provider-message identity, unknown-write reconciliation state, one-shot private-reply reservations and attachment policy decisions.

Detailed evidence: `evidence/phase31-meta-social-crm/03-instagram-message-storage.md`.

Verification: focused runtime 16/16, storage audit 75/75, Phase 14 audit 81/81, migration governance 422/422 and source inventory 48/48 PASS. Prisma generation, PostgreSQL drill, full build and live provider evidence remain blocked/unclaimed.

Exact next item: Layer 3.7.

---

## Layer 3.8 cumulative update — migration drill, regression and evidence gate

**Item:** Layer 3.8 — Layer 3 migration drill, regression and evidence gate  
**Implementation date:** 2026-07-25  
**Input checkpoint:** Phase 31 Layer 3.7 source scope PASS  
**Current verdict:** SOURCE/EVIDENCE HARNESS PASS; DISPOSABLE POSTGRESQL RUNTIME GATE BLOCKED

### What changed

Layer 3.8 adds a fail-closed, disposable-PostgreSQL-only release-gate harness without changing `prisma/schema.prisma` and without creating another migration:

```text
scripts/phase31-layer3-db-drill.sh
scripts/phase31-sql/layer3-preconditions.sql
scripts/phase31-sql/layer3-idempotency.sql
scripts/phase31-sql/layer3-claim.sql
scripts/phase31-sql/layer3-post-recovery.sql
scripts/meta-platform-phase31-layer3-gate-audit.mjs
tests/meta-v6/phase31-layer3-gate.test.mjs
```

The database runner:

1. requires `PHASE31_LAYER3_CONFIRM_DISPOSABLE=YES`;
2. rejects a non-empty target database;
3. applies the complete ordered Prisma SQL migration history;
4. verifies Layer 3 duplicate-data and retention preconditions;
5. verifies canonical receipt, Lead, CRM handoff, Instagram conversation/message/outbound and private-reply DB idempotency;
6. starts two independent PostgreSQL sessions to prove one-worker receipt claim using `FOR UPDATE SKIP LOCKED`;
7. expires the winning lease, reclaims it, and verifies stale-worker fencing;
8. runs Layer 3.7 → 3.2 recovery SQL in reverse dependency order;
9. verifies Layer 3 objects were removed while legacy receipt and business tables remain;
10. reapplies Layer 3.2 → 3.7 and reruns the complete assertion set.

Package commands:

```text
npm run test:meta-v6-phase31-layer3-gate
npm run qa:meta-platform-phase31-layer3-gate
npm run qa:phase31-meta-layer3-source
npm run qa:phase31-meta-layer3-db
npm run qa:phase31-meta-layer3
```

`qa:phase31-meta-layer3` is intentionally the complete gate: source/regression verification followed by the real PostgreSQL drill. The DB command is not hidden inside the dependency-independent persistence aggregate.

### Required evidence logs

Created:

```text
evidence/phase31-meta-social-crm/logs/layer3-migration-apply.log
evidence/phase31-meta-social-crm/logs/layer3-migration-recovery.log
evidence/phase31-meta-social-crm/logs/layer3-idempotency.log
```

The current logs contain an explicit `BLOCKED` verdict because `psql` is absent in the execution environment. They do not contain fabricated apply, recovery, re-apply, concurrency or crash-reclaim PASS statements.

### What did not change

- `prisma/schema.prisma` was not changed.
- No new Prisma migration was added.
- Existing Layer 3.2–3.7 migrations or recovery files were not rewritten.
- Layer 4 queue/job implementation was not started.
- Production database configuration was not changed.
- No raw database URL, access token, secret or webhook PII is written to evidence logs.

### Prisma status

```text
Schema change: NO
New migration: NO
Existing Layer 3 migration triplets: PRESENT (3.2 through 3.7)
Disposable PostgreSQL apply: BLOCKED — psql unavailable
Layer 3 reverse recovery: BLOCKED — psql unavailable
Layer 3 re-apply: BLOCKED — psql unavailable
Real DB concurrency/crash-reclaim: BLOCKED — psql unavailable
```

### Verification status

```text
Layer 3.8 source gate test: implemented
Layer 3.8 static gate audit: implemented
Layer 1/2 and Layer 3 dependency-independent regressions: required and rerun by source gate
PostgreSQL drill runner safety checks: implemented
Required evidence logs: present with truthful BLOCKED status
```

### Layer 3 status

```text
Layer 3 source implementation: PASS
Layer 3 migration/runtime evidence gate: BLOCKED
Layer 3 final status: BLOCKED
```

Layer 3 cannot be declared PASS until the included runner exits successfully against a fresh disposable PostgreSQL database and the three evidence logs show apply, recovery, re-apply, idempotency, concurrent claim, crash reclaim and stale-worker fencing PASS.

### Exact command for runtime closure

```bash
PHASE31_LAYER3_DATABASE_URL='postgresql://<user>:<password>@<host>:<port>/<fresh_disposable_db>' \
PHASE31_LAYER3_CONFIRM_DISPOSABLE=YES \
npm run qa:phase31-meta-layer3
```

### Known blocker

```text
psql/PostgreSQL runtime is unavailable in the current container.
The configured npm registry also remained unavailable, so dependency-backed Prisma generation/typecheck/lint/build were not claimed.
```

### Exact next item

```text
Layer 3.8 runtime closure — run the included disposable PostgreSQL drill.
Layer 4.1 must not start until Layer 3 status is explicitly PASS.
```

### Layer 3.8 executed source/regression results

```text
Layer 1 contract runtime:              35/35 PASS
Layer 1 contract static audit:         72/72 PASS
Layer 2 webhook runtime:               26/26 PASS
Layer 2 webhook static audit:          37/37 PASS
Layer 3 receipt runtime:               17/17 PASS
Layer 3 receipt static audit:          37/37 PASS
Layer 3 lifecycle static audit:        43/43 PASS
Layer 3 provider identity runtime:     11/11 PASS
Layer 3 provider identity audit:       58/58 PASS
Layer 3 Lead storage runtime:          13/13 PASS
Layer 3 Lead storage audit:            65/65 PASS
Layer 3 Instagram storage runtime:     16/16 PASS
Layer 3 Instagram storage audit:       75/75 PASS
Layer 3 payload/replay runtime:         9/9 PASS
Layer 3 payload/replay audit:          41/41 PASS
Layer 3.8 source gate runtime:          6/6 PASS
Layer 3.8 source gate audit:           23/23 PASS
Prisma schema/migration pair:          PASS
Migration governance:                 427/427 PASS
Source inventory:                      48/48 PASS
Active Meta paths:                     521 across 24 capabilities
```

The real PostgreSQL portion was invoked and exited with code `2` because `psql` is unavailable. The three required logs record this exact blocker.
