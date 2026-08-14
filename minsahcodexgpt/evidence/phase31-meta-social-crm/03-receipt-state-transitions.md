# Phase 31 Meta Social CRM — Layer 3.3 guarded receipt lifecycle

**Item:** Layer 3.3 — Receipt repository and state-transition service  
**Status:** PASS for source and dependency-independent verification  
**Implementation date:** 2026-07-25  
**Input checkpoint:** Phase 31 Layer 3.2 COMPLETE

## Executive conclusion

Layer 3.3 turns the Layer 3.2 `MetaSocialWebhookReceipt` into the central transactional lifecycle boundary for Meta Lead Ads and Instagram webhook processing. Queue handoff, worker claim, lease renewal, stale-worker fencing, success, retryable failure, due retry, dead-letter and controlled replay now pass through one guarded repository/service layer. Routes and domain workers do not directly update the canonical Prisma receipt state.

The implementation is additive. The Layer 3.2 dedupe key and payload policy are unchanged, and the legacy `MetaWebhookReceipt`, `MetaInstagramWebhookReceipt`, Lead, conversation, message and queue models are not renamed or deleted. A new migration adds only lease, lifecycle timestamp, transition-audit and state-version fields plus one reclaim index.

## What changed

### Guarded state machine

The only allowed business-state edges are:

```text
RECEIVED → QUEUED
RECEIVED → BLOCKED
QUEUED → PROCESSING
PROCESSING → PROCESSED
PROCESSING → FAILED
FAILED → QUEUED
FAILED → DEAD_LETTERED
```

`PROCESSED`, `BLOCKED` and `DEAD_LETTERED` are terminal. A dead-letter receipt is not reopened; controlled replay creates an audited child receipt.

### Lease and transition fields

Added to `MetaSocialWebhookReceipt`:

```text
leaseToken
leaseOwner
leaseExpiresAt
queuedAt
processingStartedAt
processedAt
blockedAt
failedAt
lastTransitionAt
lastTransitionCode
lastTransitionActor
stateVersion
```

Added index:

```text
state + leaseExpiresAt
```

The database enforces that a `PROCESSING` row has the complete lease triplet and that every non-processing row has no lease. Transition actor/code lengths, non-negative state version and lifecycle timestamp ordering are also checked.

### Repository boundaries

Added:

```text
lib/meta-platform/repositories/webhook-receipt-transitions.ts
lib/meta-platform/repositories/webhook-receipt-claims.ts
lib/meta-platform/repositories/webhook-receipt-lifecycle.ts
```

Extended:

```text
lib/meta-platform/repositories/webhook-receipts.ts
lib/meta-platform/repositories/prisma-webhook-receipts.ts
lib/meta-platform/repositories/index.ts
```

The lifecycle repository exposes standardized platform results for:

```text
find by canonical or legacy receipt identity
mark queued
mark blocked
claim/reclaim processing lease
renew processing lease
mark processed
mark failed
requeue a due failure
mark dead-lettered
create controlled replay child
```

### Queue handoff

Lead Ads and Instagram mark the canonical receipt `QUEUED` only after the current durable queue adapter accepts the job. The exact same queue/job reference is idempotent. A conflicting reference or invalid source state fails closed.

Queue-provider design, backoff policy and job taxonomy remain Layer 4 scope.

### Worker claim and crash recovery

A worker must atomically claim the canonical receipt before provider/domain processing. PostgreSQL uses a guarded row lock with `FOR UPDATE SKIP LOCKED`; only `QUEUED` or expired `PROCESSING` rows qualify.

A successful claim:

```text
state = PROCESSING
fresh cryptographic leaseToken
leaseOwner = bounded worker identity
leaseExpiresAt = now + bounded lease duration
attemptCount += 1
lastAttemptAt = now
processingStartedAt = now
stateVersion += 1
```

Two workers cannot hold one active lease. After expiry, another worker can reclaim with a new token. Completion/failure requires the exact current token, so a stale worker cannot overwrite a newer worker result.

### Failure, retry and dead letter

`PROCESSING → FAILED` clears the lease and stores only a bounded normalized failure code/category/summary and optional retry time. Bearer tokens, Meta tokens, email and phone are redacted before persistence.

A failed receipt can return to `QUEUED` only when `nextRetryAt` is due and a durable queue reference is supplied. Retry policy and maximum attempts are deliberately left to Layer 4.

Only `FAILED` can transition to `DEAD_LETTERED`; retry metadata is terminalized and the row cannot be reopened directly.

### Controlled replay

Replay requires a `DEAD_LETTERED` original, bounded actor and reason. The repository locks the original and transactionally inserts a child receipt with:

```text
parentReceiptId = original receipt
replayAttempt = next attempt
payloadDigest and safeMetadata inherited
providerEventKey = controlled replay key
state = RECEIVED
```

A SHA-256 request key makes the same replay request idempotent. The original remains terminal, and business-level idempotency is not bypassed.

### Lead Ads integration

Current Lead processing now:

```text
canonical receipt created
→ legacy receipt created/linked
→ queue accepted
→ canonical QUEUED
→ worker resolves canonical via legacy link
→ atomic claim/reclaim
→ existing Lead processing
→ canonical PROCESSED or FAILED with lease fencing
```

No normalized Lead/CRM storage redesign was performed.

### Instagram integration

Current Instagram processing now:

```text
canonical receipt created
→ legacy Instagram receipt created/linked
→ queue accepted
→ canonical QUEUED
→ worker resolves canonical via legacy link
→ atomic claim/reclaim
→ existing Instagram processing
→ canonical terminal/failure state synchronized
```

No conversation/message/outbound schema redesign was performed.

## Migration safety

Created:

```text
prisma/migrations/20260725003000_phase31_webhook_receipt_transitions/migration.sql
prisma/migrations/20260725003000_phase31_webhook_receipt_transitions/recovery.sql
prisma/migrations/20260725003000_phase31_webhook_receipt_transitions/README.md
```

Safety properties:

- additive columns and index only;
- Layer 3.2 dedupe unique index unchanged;
- no legacy receipt/table mutation;
- fail-closed precondition if an out-of-band canonical `PROCESSING` row exists before lease support;
- existing `BLOCKED` rows deterministically backfilled from `firstSeenAt` without inventing a later historical time;
- recovery refuses to run while any processing lease exists;
- recovery removes only Layer 3.3 fields/checks/index and does not drop the canonical receipt table.

Hashes:

```text
schema.prisma:
620a8f57fa9a378bed611e5f6dc5da926a37f029b9f0681b2da4082cb645c424

migration.sql:
331b168f7eeb0b26f949af7e8c2d19758bc60954938bf6682333040760cfaafa

recovery.sql:
f790c0807bcbb7a28eed880e204832ed13eec601b64e1730343a5ee61ea057f7
```

## Verification

Dependency-independent checks executed:

```text
Layer 3.3 persistence/lifecycle runtime: 17/17 PASS
Layer 3.2 persistence static audit:      37/37 PASS
Layer 3.3 lifecycle static audit:        43/43 PASS
Layer 1 contracts runtime:               35/35 PASS
Layer 1 contracts audit:                 72/72 PASS
Layer 2 webhook runtime:                 26/26 PASS
Layer 2 webhook audit:                   37/37 PASS
Phase 24 transport audit:                74/74 PASS
Phase 14 Instagram audit:                81/81 PASS
Migration governance:                  407/407 PASS
Source inventory:                        48/48 PASS
Prisma schema/migration pair:                 PASS
Changed TypeScript syntax:                    PASS
```

Focused scenarios include valid/invalid transitions, idempotent queue handoff, conflicting queue reference, two-worker exclusion, active lease rejection, expired lease reclaim, renewal, stale-token fencing, success/failure lease clearing, retry due-time guard, sanitized failure persistence, dead-letter terminal behavior and replay idempotency.

## What did not change

- No queue provider, worker scheduler, retry/backoff policy or maximum-attempt policy was introduced.
- No Lead normalized storage, CRM handoff model, Instagram conversation/message/outbound model or provider identity model was redesigned.
- No realtime Facebook bridge, admin replay endpoint, feature flag or provider cutover was implemented.
- No legacy receipt model was removed or renamed.
- No raw webhook body, message text, token, email or phone was added to the canonical receipt.
- No production migration was applied in this environment.

## Prisma/runtime status

```text
Schema change: YES
Migration pair: PRESENT
Migration governance: PASS 407/407
Prisma generated client: NOT GENERATED
Disposable PostgreSQL apply/recovery/re-apply: NOT RUN
Full dependency-backed typecheck/lint/build: NOT RUN
```

`node_modules`, Prisma CLI, `psql` and Docker are unavailable in this environment. These runtime gates are therefore explicitly unclaimed.

## Known blocker

The known dependency registry blocker left `node_modules` absent, and no PostgreSQL client/container runtime is present. Production migration application, recovery drill, generated Prisma validation and full application gates remain required at Layer 3.8/final release.

## Completion decision

Layer 3.3 is complete for its numbered source scope: all canonical lifecycle changes are centralized, guarded transitions and lease ownership are implemented, concurrent/stale workers are fenced, retry/dead-letter/replay persistence is controlled, Lead/Instagram compatibility is preserved, and migration/evidence/regression gates pass.

## Exact next item

```text
Layer 3.4 — Provider identity and object mapping persistence
```
