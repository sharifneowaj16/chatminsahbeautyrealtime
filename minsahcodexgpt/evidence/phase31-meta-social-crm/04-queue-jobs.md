# Phase 31 Layer 4 — Queue and Jobs

## Item: 4.2 — Shared social queue contract and adapter

**Status: COMPLETE**

### Implemented

- Added the eight canonical social job types required by Phase 31.
- Added a versioned, bounded queue envelope containing receipt ID, attempt number, correlation ID, scheduled time, canonical dedupe key, durable payload reference and safe observability metadata.
- Added strict validation that rejects raw provider payloads, tokens, secrets, PII, message/comment text, URLs and unknown fields.
- Added provider-agnostic enqueue, claim, ACK and NACK contracts.
- Added explicit transient/rate-limit retry semantics and an `UNKNOWN_WRITE` reconciliation-required outcome that cannot be blind-retried.
- Added a BullMQ adapter over the existing `lib/jobs` infrastructure, including `scheduledAt` to BullMQ delay mapping.
- Preserved production-compatible mappings:
  - `PROCESS_META_LEAD` → `meta-leads` / `lead-fetch`
  - `PROCESS_INSTAGRAM_INBOUND` → `meta-instagram` / `instagram-message`
  - `REFRESH_META_PERMISSION_HEALTH` → `meta-connection-health` / `connection-health`
- Added additive transport mappings for Instagram reply/private reply, social attachment validation, social event replay and Facebook Page inbox sync.
- Added structured queue-unavailable behavior returning a recoverable `DEFERRED` result while leaving the durable DB source/audit record available for later recovery.
- Added the `social-queue-jobs` source-inventory capability and regenerated architecture inventory documents.

### Tests executed

| Command | Result |
|---|---|
| `npm run qa:phase31-meta-layer4.2` | PASS — 13/13 focused tests, 18/18 static checks, 49/49 inventory checks |
| Focused TypeScript check for changed queue contracts and adapter | PASS |
| Node syntax checks for changed TypeScript and audit/test scripts | PASS |
| `npm run qa:phase31-meta-layer4.1` | PASS — Layer 4.1 regression preserved |
| `npm run qa:meta-v6-phase19` | PASS — 49/49 inventory checks; 526 paths / 25 capabilities |
| `npm run test:meta-v6-phase31-contracts` | PASS — 35/35 |
| `npm run qa:phase31-meta-webhooks` | PASS |
| `npm run test:meta-v6-phase31-persistence` | PASS — 17/17 |
| `npm run test:meta-v6-phase31-layer3-gate` | PASS — 6/6 |
| `npm run qa:prisma-schema-migration-pair` | PASS — schema unchanged; archive has no Git metadata |
| `npm run qa:meta-v6-migrations` | PASS — 427/427 |

### Runtime verification honesty

- Dependency-backed full application `typecheck`, `lint` and production `build` were not claimed for this numbered item.
- The archive does not contain installed project dependencies; the focused TypeScript check used the available global TypeScript compiler against only the changed dependency-independent queue contract files.
- No live Redis, worker deployment or Meta provider write was claimed by this contract-only item.

### Schema

- Schema: unchanged
- Prisma schema: unchanged
- Migration: none
- Production Prisma configuration: unchanged

### Known follow-on work

- Job execution lease/idempotency primitives, standardized retry scheduling and durable reconstruction begin in Layer 4.3 and continue through 4.7.
- New outbound/media/replay/Facebook jobs have contract and transport mappings but no business worker handlers until their numbered items.
- Realtime custom Redis queues remain unchanged until Layer 6.

### Exact next item

```text
Layer 4.3 — Lead processing job (including the shared execution primitives required by Layers 4.3–4.7)
```

---

## Item: 4.3 — Lead processing job

**Status: COMPLETE**

### Implemented

- Wired Lead webhook handoff to the canonical `PROCESS_META_LEAD` queue envelope and shared BullMQ adapter.
- Added deterministic namespaced Lead job dedupe keys derived from durable receipt/provider identifiers.
- Added the canonical Lead queue producer and consumer contract without embedding raw webhook payloads, tokens, PII or Graph response data.
- Reused the existing receipt-first Lead service for canonical receipt lease claim, provider Page/Form identity resolution, full Lead fetch, normalization, encrypted storage, DB-backed duplicate prevention, CRM handoff and terminal completion.
- Added explicit Lead job failure classification for rate limit, transient dependency, authentication, policy-blocked and permanent outcomes.
- Preserved provider `Retry-After` on retryable queue NACKs.
- Updated the Lead worker to claim canonical BullMQ envelopes and translate ACK/NACK outcomes into existing BullMQ retry/dead-letter behavior.
- Added canonical queue usage to Lead receipt recovery while retaining legacy payload compatibility for already queued jobs.
- Added immediate canonical receipt dead-letter transition for permanent Lead failures.
- Added retry-budget exhaustion handling so the canonical receipt and `MetaJobAudit` converge on dead-letter state.

### Tests executed

| Command | Result |
|---|---|
| `npm run test:meta-v6-phase31-layer4.3` | PASS — 12/12 focused tests |
| `npm run qa:meta-platform-phase31-layer4.3` | PASS — static implementation checks |
| `npm run qa:meta-platform-inventory` | PASS — governed source inventory updated |
| Focused dependency-independent TypeScript/syntax checks | PASS |
| Layer 4.2 contract regression | PASS |
| Lead normalized-storage regression | PASS |
| Webhook transport regression | PASS |
| Receipt lifecycle and migration governance | PASS |

### Schema

- Schema: unchanged
- Prisma migration: none
- Production Prisma configuration: unchanged

### Runtime verification honesty

- No full dependency-backed application typecheck, lint or production build is claimed for this numbered item because the project archive has no installed dependencies.
- No live Redis worker execution or live Meta Lead fetch is claimed.
- PostgreSQL/Prisma production readiness remains the operator-confirmed Layer 3.8 checkpoint.

### Known blocker

- Live worker/process-manager startup and Redis crash/restart behavior remain operational evidence for the Layer 4.8 gate.
- Standardized exponential backoff with jitter and generic durable queue reconstruction remain Layer 4.7 work.

### Exact next item

```text
Layer 4.4 — Instagram inbound message job
```

---

## Item: 4.4 — Instagram inbound message job

**Status: COMPLETE**

### Implemented

- Wired Instagram webhook handoff to the canonical `PROCESS_INSTAGRAM_INBOUND` queue envelope and shared BullMQ adapter.
- Added deterministic receipt/provider-message dedupe keys and durable account/message references without raw webhook payloads, tokens, participant PII, message text or media URLs.
- Updated the Instagram worker to claim canonical social envelopes while preserving compatibility with already queued legacy `instagram-message` payloads.
- Reused canonical webhook receipt leases and guarded terminal transitions for crash-safe processing.
- Verified envelope provider-message and account scope against the normalized durable receipt before persistence.
- Reused DB-backed account identity resolution, conversation/participant scope validation and provider-message uniqueness.
- Made conversation ordering outcome explicit so late events persist without moving `lastActivityAt` or incrementing ordering state.
- Replaced inline attachment download with durable attachment persistence plus canonical `VALIDATE_SOCIAL_ATTACHMENT` scheduling.
- Added a deterministic safe realtime `INSTAGRAM_MESSAGE_UPSERTED` event containing receipt, conversation, message, correlation, direction, message type and out-of-order/dedupe state only.
- Published realtime state before terminal receipt completion so publish failures remain retryable through the durable receipt/job path.
- Added rate-limit, transient, authentication, policy-blocked and permanent failure classification with Retry-After preservation.
- Added canonical receipt dead-letter convergence for permanent failures and retry-budget exhaustion.

### Tests executed

| Command | Result |
|---|---|
| `npm run test:meta-v6-phase31-layer4.4` | PASS — 14/14 focused tests |
| `npm run qa:meta-platform-phase31-layer4.4` | PASS — static implementation checks |
| Dependency-independent TypeScript syntax/import checks | PASS |
| Layer 4.1–4.3 regression gates | PASS |
| Instagram persistence and Layer 3 regression gates | PASS |
| Migration governance | PASS — schema unchanged |

### Schema

- Prisma schema: unchanged
- Migration: none
- Recovery SQL: not required
- Production Prisma configuration: unchanged

### Runtime verification honesty

- No full dependency-backed application typecheck, lint or production build is claimed because the extracted project does not include installed dependencies.
- No live Redis publish, deployed worker crash/restart or live Instagram webhook delivery is claimed for this numbered item.
- The focused tests verify queue contracts, failure behavior, deterministic realtime payloads and source integration without requiring provider secrets.

### Known follow-on work

- `VALIDATE_SOCIAL_ATTACHMENT` now has a safe producer and durable reference, but its bounded download/MIME/malware/quarantine worker is Layer 4.6.
- Realtime-service subscription and cross-process dedupe alignment remain Layer 6 work.
- Standard reply and private-reply jobs, including unknown-write reconciliation, are Layer 4.5.

### Exact next item

```text
Layer 4.5 — Instagram reply and private-reply jobs
```

## Layer 4.5 — Instagram standard/private outbound jobs

Status: **PASS (dependency-independent implementation gate)**

Implemented:

- Admin reply requests now create a durable scoped `MetaInstagramReplyAttempt` and pending outbound `MetaMessage` before enqueue.
- Canonical `SEND_INSTAGRAM_REPLY` and `SEND_INSTAGRAM_PRIVATE_REPLY` envelopes contain only durable record IDs and safe scope metadata; reply text remains in PostgreSQL.
- The shared Instagram BullMQ worker consumes both outbound job types.
- Reply-window, account/permission health, private-reply one-shot state, and outbound kill switches are re-evaluated at worker execution time.
- Provider message IDs converge the pending outbound message, reply attempt, reservation, and conversation state transactionally.
- Transient/rate-limit errors return to a retryable pending state with Retry-After metadata preserved by the queue contract.
- Unknown provider write outcomes become `UNKNOWN_OUTCOME` + `REQUIRED` reconciliation state and are deliberately made unrecoverable to BullMQ so a blind retry cannot duplicate the write.
- Permanent/auth/policy failures converge to durable blocked/failed states; retry exhaustion is persisted by the worker.

Deferred:

- Provider-side reconciliation implementation is Layer 4.7.
- Media validation implementation is Layer 4.6.
- Final feature-flag manifest and rollback evidence are Layer 8.
- Live Redis/provider execution evidence is Layer 4.8/Layer 9.

Schema decision: unchanged; existing Layer 3.6 reply-attempt, outbound-message and private-reply reservation models were reused.

Crash safety refinement: a delivery that finds an existing reply attempt in `SENDING` does not call Graph again. It transitions the attempt to unknown-outcome reconciliation, covering worker termination after a possible provider success. A provider response followed by local persistence failure follows the same reconciliation-only path and preserves a returned provider message ID when available.

### Layer 4.5 recovery and state-projection hardening

- Repeating the same idempotent admin request now re-attempts queue transport when the durable attempt remains non-terminal. This closes the Redis-enqueue-failure stranding gap while the existing `MetaJobAudit` dedupe key prevents duplicate BullMQ execution.
- Private-reply reservation creation is idempotent for the same reply attempt and still rejects a different attempt for the same scoped provider comment.
- The pending outbound `MetaMessage` now converges with the reply attempt for `SENDING`, retryable `PENDING`, `BLOCKED`, definitive `FAILED`, `UNKNOWN_OUTCOME`, and `SENT` states.
- Added deterministic, text-free `INSTAGRAM_REPLY_STATE_CHANGED` realtime projections for queued, retrying, sent, blocked, failed, and reconciliation-required outcomes. Realtime publish failure does not reverse or duplicate the provider write.

### Layer 4.5 verification

| Command | Result |
|---|---|
| `npm run qa:phase31-meta-layer4.5` | PASS — 19/19 focused tests, 36/36 static checks, 49/49 source inventory checks |
| Focused TypeScript compilation of shared queue/outbound contracts | PASS |
| `npm run qa:phase31-meta-layer4.4` | PASS |
| `npm run qa:phase31-meta-layer4.3` | PASS |
| `npm run qa:phase31-meta-layer4.2` | PASS |
| `npm run qa:phase31-meta-layer4.1` | PASS |
| `npm run test:meta-v6-phase31-contracts` | PASS — 35/35 |
| `npm run qa:meta-platform-phase31-contracts` | PASS — 72/72 |
| `npm run qa:phase31-meta-webhooks` | PASS — webhook tests 26/26 and audit 37/37 |
| `npm run qa:phase31-meta-persistence` | PASS — persistence, lifecycle, identities, Lead, Instagram, replay and Layer 3 gate |
| `npm run qa:meta-v6-migrations` | PASS — 427/427 |

### Layer 4.5 runtime verification honesty

- No full dependency-backed application typecheck, lint or production build is claimed because the archive contains no installed project dependencies.
- No live Redis delivery, live Graph write, deployed worker crash or provider-side reconciliation was executed in this numbered item.
- The focused compiler gate covers the dependency-independent queue envelope, failure taxonomy, ACK/NACK and realtime event contracts. Source-level integration and cumulative persistence/security gates cover the server-only worker/service wiring.

### Exact next item

```text
Layer 4.6 — Media validation job
```

## Layer 4.6 — Media validation job

Status: **PASS (source/focused gate)**

Implemented a canonical `VALIDATE_SOCIAL_ATTACHMENT` worker on the shared `meta-social` BullMQ queue. Jobs carry only durable attachment/message/conversation/account identifiers and a source URL digest; signed media URLs, access tokens and message text remain in durable server-side state and are never embedded in Redis payloads.

The worker loads and scope-checks the durable attachment, performs HTTPS/host/DNS/redirect SSRF controls, bounded streaming download (25 MiB maximum), declared-versus-sniffed MIME verification, SHA-256 content digesting, ClamAV INSTREAM malware scanning, and private MinIO storage with `private, no-store` metadata and post-write size verification. Unsafe or infected content converges to rejected/quarantined state. Transient download, scanner and storage outages persist a failed validation state and remain retryable; final attempt exhaustion is terminally recorded.

Existing Prisma attachment/digest/policy fields were sufficient, so Layer 4.6 made no schema or migration change. Production requires `META_MEDIA_CLAMAV_HOST`; port and timeout have bounded defaults.

Focused evidence: 12/12 tests, 24/24 static checks, 49/49 source inventory checks. Live ClamAV, MinIO, Redis and provider media execution remain runtime evidence and were not fabricated.

Exact next item: **Layer 4.7 — Retry, dead-letter and replay control**.

## Layer 4.7 — Retry, dead-letter and replay control

Status: **PASS (dependency-independent implementation gate)**

Implemented:

- Added a single typed social-job reliability decision that all Lead, Instagram inbound/outbound and media workers use.
- Added deterministic exponential backoff with SHA-256-derived ±20% jitter, a one-hour cap, five-attempt default and provider `Retry-After` lower-bound support.
- Retry decisions now expose an exact safe delay to BullMQ and `MetaJobAudit`; retry scheduling is deterministic for the same job key and attempt.
- Authentication, permanent and policy failures are terminal; retryable failures become dead-lettered after the maximum attempt.
- Unknown provider write outcomes are reconciliation-only and cannot enter blind retry or replay paths.
- Worker audit errors now persist safe reason codes, classification, retry delay and reconciliation requirement without raw exception messages or provider payloads.
- Admin job projections expose only safe failure metadata.
- Manual dead-letter replay remains protected by the existing exact-payload, single-use `META_JOB_REPLAY` approval action and now requires a bounded reason.
- Approved replay first creates a canonical `REPLAY_SOCIAL_EVENT` durable job referencing only the source `MetaJobAudit` ID and an approval digest.
- The social replay worker verifies terminal source state, blocks replay recursion and unknown outcomes, validates the stored payload, creates a fresh namespaced dedupe key, preserves `replayOfId`, records the actor, and increments the source replay count only after successful enqueue.
- Repeating the same source/approval replay request is queue-idempotent.

Verification:

| Command | Result |
|---|---|
| `npm run test:meta-v6-phase31-layer4.7` | PASS — 12/12 focused tests |
| `npm run qa:meta-platform-phase31-layer4.7` | PASS — 24/24 static checks |
| Layer 4.1–4.6 focused regressions | PASS |
| Persistence, payload-redaction and migration governance gates | PASS |

Schema:

- Prisma schema: unchanged
- Migration: none
- Recovery SQL: not required

Runtime verification honesty:

- No live Redis/BullMQ replay, provider reconciliation or deployed dead-letter operation was executed in this numbered item.
- Full dependency-backed typecheck, lint and production build are not claimed without installed project dependencies.
- Live queue outage, worker crash and replay evidence remain the Layer 4.8 runtime/evidence gate.

Exact next item: **Layer 4.8 — Layer 4 worker and queue evidence gate**.

## Layer 4.8 — Worker and queue evidence gate

Status: **PASS (dependency-independent Layer 4 release gate)**

### Gate scenarios

| Scenario | Evidence result |
|---|---|
| Queue unavailable | PASS — Redis connectivity failure returns a recoverable `DEFERRED` result while preserving the durable canonical envelope and retry timestamp. |
| Worker crash | PASS — expired processing lease is reclaimed by another worker. |
| Lease reclaim | PASS — stale worker completion is fenced by the replaced lease token. |
| Retry | PASS — deterministic exponential backoff with bounded jitter and provider `Retry-After` lower bound. |
| Dead letter | PASS — permanent failures and retry-budget exhaustion converge to durable dead-letter state. |
| Replay | PASS — approved replay creates one audited child job with a fresh dedupe key and parent relationship. |
| Possible-success reconciliation | PASS — unknown provider write outcome is reconciliation-only and cannot be blindly retried or replayed. |
| Job dedupe | PASS — namespaced deterministic idempotency keys remain authoritative through `MetaJobAudit` and BullMQ job IDs. |
| Safe queue payload | PASS — the eight canonical job types carry durable IDs/digests only, not raw payloads, tokens, message text, PII or media URLs. |
| Worker startup | PASS — both single-container embedded startup and dedicated `worker:all` startup include Lead, Instagram, social and scheduler workers. |

### Queue-outage recovery closure

Lead queue handoff recovery remains handled by the existing five-minute Lead receipt recovery job. Layer 4.8 adds an equivalent five-minute Instagram receipt recovery job. It selects only signature-valid legacy Instagram receipts whose durable failure code is `QUEUE_HANDOFF_FAILED`, reloads the stored normalized event, re-enqueues the canonical `PROCESS_INSTAGRAM_INBOUND` job, and moves both canonical and legacy receipt state back to `QUEUED`. Failed recovery attempts remain durable and safe for a later cycle.

### Startup closure

`instrumentation.ts` now starts the following workers once per Node.js server process when embedded workers are enabled:

- `startMetaLeadWorker`
- `startMetaInstagramWorker`
- `startMetaSocialWorker`
- `startMetaSchedulerWorker`

Dedicated worker services continue to use `npm run worker:all`; the web process must use `DISABLE_EMBEDDED_WORKERS=true` in that topology to avoid duplicate process ownership.

### Layer 4.8 verification commands

```text
npm run test:meta-v6-phase31-layer4.8
npm run qa:meta-platform-phase31-layer4.8
npm run qa:phase31-meta-layer4.8
npm run qa:phase31-meta-layer4
```

### Prisma status

```text
Prisma schema: unchanged
Migration: none
Recovery SQL: not required
Production Prisma configuration: unchanged
```

### Runtime verification honesty

The Layer 4 gate uses dependency-independent execution and deterministic source/in-memory simulations. It does not claim a live Redis outage, a deployed container kill/restart, a live Meta provider write, a live ClamAV/MinIO execution, full dependency-backed typecheck, lint or production build. Those runtime and provider checks remain explicitly separated for Layer 9.

### Layer 4 final verdict

```text
Layer 4 status: PASS

Queue contract: PASS
Lead processing job: PASS
Instagram inbound job: PASS
Instagram reply/private-reply jobs: PASS
Media validation job: PASS
Retry/dead-letter/replay: PASS
Queue-outage recovery: PASS
Crash/lease reclaim: PASS
Worker startup wiring: PASS
Safe queue payload: PASS
Prisma schema: unchanged
Migration: none

Known runtime evidence pending:
- live Redis/BullMQ outage and restart drill
- deployed worker process kill/reclaim drill
- live provider unknown-write reconciliation
- live ClamAV and MinIO media pipeline
- full dependency-backed typecheck/lint/build

Exact next item:
Layer 5.1 — Lead Ads legacy-domain audit and migration map
```

### Final cumulative Layer 4 verification

```text
Layer 4.1 tests/audit:             10/10 + 30/30 PASS
Layer 4.2 tests/audit:             13/13 + 18/18 PASS
Layer 4.3 tests/audit:             12/12 + 23/23 PASS
Layer 4.4 tests/audit:             14/14 + 26/26 PASS
Layer 4.5 tests/audit:             19/19 + 36/36 PASS
Layer 4.6 tests/audit:             12/12 + 24/24 PASS
Layer 4.7 tests/audit:             12/12 + 24/24 PASS
Layer 4.8 tests/audit:             10/10 + 16/16 PASS
Source inventory:                 49/49 PASS
Layer 1 contracts:                35/35 + 72/72 PASS
Webhook transport:                26/26 + 37/37 PASS
Persistence:                      17/17 + 37/37 PASS
Receipt lifecycle audit:          43/43 PASS
Provider identity:                11/11 + 58/58 PASS
Lead storage:                     13/13 + 65/65 PASS
Instagram storage:                16/16 + 75/75 PASS
Payload/retention/replay:           9/9 + 41/41 PASS
Layer 3 source gate:                6/6 + 23/23 PASS
Migration governance:            427/427 PASS
TypeScript no-check transpile:           PASS
```
