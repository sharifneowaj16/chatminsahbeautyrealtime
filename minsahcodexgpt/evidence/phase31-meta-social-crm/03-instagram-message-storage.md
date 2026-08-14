# Phase 31 Layer 3.6 — Instagram conversation, message and outbound mapping persistence

**Status:** PASS for numbered source scope and dependency-independent verification  
**Implementation date:** 2026-07-25  
**Input checkpoint:** Phase 31 Layer 3.5 COMPLETE  
**Exact next item:** Layer 3.7 — Sanitized payload digest, retention and replay metadata

## Executive conclusion

Layer 3.6 preserves the existing Instagram Social CRM models and converts them into environment/connection/account-scoped durable persistence. Canonical Instagram webhook receipts now trace directly to one scoped message. Participants and conversations have canonical account identity context, inbound provider message IDs are database-idempotent, late events cannot regress conversation activity or reply windows, and payload-digest mismatches are surfaced without silently rewriting the original message.

Outbound reply attempts now use scoped idempotency and provider-message constraints. Local message keys are separate from actual provider IDs, missing or uncertain provider results become `UNKNOWN_OUTCOME` with reconciliation required, and private replies use a database-unique source-comment reservation rather than a race-prone conversation timestamp. Attachment rows gain digest/job fields and a one-to-one policy decision boundary for the later media-validation worker.

No legacy Instagram conversation/message table is deleted. No queue provider, reconciliation worker, malware scanner, realtime bridge, admin redesign or feature cutover is included.

## What changed

### Scoped participant and conversation identity

Added `MetaInstagramParticipant` with unique scope:

```text
environment
connectionKey
accountIdentityReferenceId
providerParticipantId
```

`MetaConversation` now carries:

```text
environment / connectionKey
accountIdentityReferenceId
participantIdentityId
providerConversationKey
conversationKind
```

New conversations enforce account and participant immutability. Existing conversations are not silently reassigned to another account or participant.

### Monotonic ordering and reply-window state

Conversation state now includes:

```text
lastActivityAt
lastActivityProviderMessageId
lastActivityMessageId
lastInboundAt
replyWindowOpenedAt
replyWindowExpiresAt
replyWindowSourceMessageId
orderingVersion
```

Message persistence and conversation advancement execute transactionally. Activity advances only when the incoming provider timestamp is newer, or when an equal timestamp has the deterministic higher provider-message key. Older events are still stored but cannot move `lastActivityAt`, `lastInboundAt` or the reply-window expiry backwards.

### Scoped inbound message dedupe and receipt trace

`MetaMessage` now separates:

```text
providerMessageId
localMessageKey
legacy platformId
```

The DB dedupe boundary is:

```text
environment
connectionKey
accountIdentityReferenceId
providerMessageId
```

`MetaSocialWebhookReceipt.instagramMessageId` gives direct receipt → message → conversation → participant → account-identity trace. The relation is null-or-same guarded, so a receipt cannot be remapped to another message.

If the same provider message arrives with a changed payload digest:

```text
no second message row
original content remains unchanged
digestMismatchCount increments
lastDigestMismatchAt is recorded
```

### Outbound idempotency and provider identity

`MetaInstagramReplyAttempt` now carries scoped identity, provider delivery state and reconciliation state. The DB boundaries are:

```text
environment + connectionKey + accountIdentityReferenceId + idempotencyKey
environment + connectionKey + accountIdentityReferenceId + providerMessageId
```

The same idempotency key and payload returns the existing attempt. The same key with a different payload fails before any provider call.

Provider success requires a real provider message ID. The old synthetic `outbound:<attempt>` value is no longer written as a provider ID. Local durable identity remains in `localMessageKey`.

### Unknown provider-write outcome

Network timeout/reset or a successful-looking provider response without an ID is persisted as:

```text
providerStatus = UNKNOWN_OUTCOME
reconciliationStatus = REQUIRED
providerMessageId = null
```

The attempt and any private-reply reservation remain durable. Blind retry is not allowed; Layer 4.5 will perform reconciliation before retry decisions.

### Private-reply one-shot authority

Added `MetaInstagramPrivateReplyReservation` with the DB-unique boundary:

```text
environment
connectionKey
accountIdentityReferenceId
sourceCommentId
```

Reservation is created before the provider call. A second concurrent request receives a unique-conflict result and cannot call Meta. Unknown outcomes retain the reservation. `MetaConversation.privateReplySentAt` remains a compatibility/admin projection, not the one-shot authority.

### Attachment policy persistence

`MetaMessageAttachment` gains:

```text
sourceUrlDigest
sourceUrlExpiresAt
contentDigest
validationJobReference
quarantinedAt
```

Added one `MetaInstagramAttachmentPolicyDecision` per attachment with:

```text
PENDING
ALLOWED
QUARANTINED
REJECTED
FAILED
```

Source URLs are represented in safe audit paths by a SHA-256 digest. Actual bounded download, MIME sniffing, digest verification and malware scanning remain Layer 4.6 work.

## Existing model compatibility

- Existing `MetaConversation`, `MetaMessage`, `MetaMessageAttachment`, `MetaInstagramReplyAttempt` and admin APIs remain.
- `platformId` remains as a legacy compatibility field, but is no longer the global canonical dedupe boundary.
- Historical rows are scoped only through one unambiguous canonical receipt/account identity.
- Historical fake `outbound:*` IDs remain in legacy `platformId` but are not copied into `providerMessageId`.
- Generic `SocialMessage` is not made a second Instagram business-message authority.
- Layer 3.3 receipt lifecycle and Layer 3.4 account identity remain authoritative.

## Transaction boundaries

### Inbound

```text
lock canonical receipt
create/get scoped participant
create/get scoped conversation
validate account/participant immutability
create/get scoped provider message
record digest mismatch without content overwrite
attach receipt to message
monotonically advance conversation
commit
```

### Outbound success

```text
lock send attempt
verify sendable state
require actual provider message ID
create scoped outbound message
complete send attempt
complete private-reply reservation when applicable
monotonically advance conversation
commit
```

### Private reply

```text
validate source comment and expiry
insert scoped unique reservation
create/use durable send attempt
provider call only after reservation
```

## Migration and recovery

Created:

```text
prisma/migrations/20260725093000_phase31_instagram_message_persistence/migration.sql
prisma/migrations/20260725093000_phase31_instagram_message_persistence/recovery.sql
prisma/migrations/20260725093000_phase31_instagram_message_persistence/README.md
```

Migration properties:

- additive models, enums and fields;
- reviewed replacement of old global uniqueness with scoped composite uniqueness;
- duplicate precondition queries before old indexes are removed;
- deterministic/resumable receipt, scope and participant backfill;
- no guessed environment/connection/account scope;
- no business row deletion;
- account, participant, receipt-message, reply-chain, reservation and attachment-policy foreign keys;
- explicit check constraints for scope pairs, ordering counters and reservation expiry.

Recovery preserves existing Instagram conversation/message/reply tables. It requires duplicate checks before restoring old global unique indexes because scoped production data may legitimately reuse provider IDs across environments or connections.

## What did not change

- No new queue provider or worker topology.
- No retry/backoff/dead-letter policy implementation.
- No provider reconciliation worker.
- No malware scanner or full media-validation job.
- No realtime-service bridge.
- No admin inbox/API redesign.
- No feature flag, cutover or legacy deletion.
- No live Meta provider call evidence.

## Verification

```text
Layer 3.6 focused runtime:        16/16 PASS
Layer 3.6 static storage audit:   75/75 PASS
Layer 3.2/3.3 runtime:            17/17 PASS
Layer 3.2 persistence audit:      37/37 PASS
Layer 3.3 lifecycle audit:        43/43 PASS
Layer 3.4 identity runtime:       11/11 PASS
Layer 3.4 identity audit:         58/58 PASS
Layer 3.5 Lead runtime:           13/13 PASS
Layer 3.5 Lead audit:             65/65 PASS
Layer 1 contracts runtime:        35/35 PASS
Layer 1 contracts audit:          72/72 PASS
Layer 2 webhook runtime:          26/26 PASS
Layer 2 webhook audit:            37/37 PASS
Phase 24 transport audit:         74/74 PASS
Phase 14 Instagram audit:         81/81 PASS
Phase 21 reference audit:         47/47 PASS
Migration governance:            422/422 PASS
Source inventory:                 48/48 PASS
Governed active paths:                520
Prisma schema/migration pair:          PASS
Changed TypeScript syntax:             PASS
```

## Known blockers

The archive environment does not contain installed dependencies, generated Prisma Client, `tsx`, `psql` or Docker. Therefore these are not claimed:

- Prisma Client generation;
- disposable PostgreSQL apply/recovery/re-apply;
- real database concurrent insert/reservation drill;
- dependency-backed Phase 14 runtime test;
- full typecheck, lint or production build;
- live Instagram inbound/reply/private-reply evidence.

## Exact next item

```text
Layer 3.7 — Sanitized payload digest, retention and replay metadata
```
