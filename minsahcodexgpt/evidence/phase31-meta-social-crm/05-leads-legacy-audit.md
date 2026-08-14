# Phase 31 Layer 5.1 — Lead Ads legacy-domain audit and migration map

**Authoritative input:** `minsahbeauty_phase31_layer4_complete_second_brain_v3.zip`  
**Verified predecessor:** Layer 4.8 PASS (`phase31_layer4_verification.log`)  
**Runtime behavior changed by 5.1:** No  
**Prisma schema changed:** No  
**Migration/recovery SQL required:** No

## End-to-end production path at the 5.1 checkpoint

1. `app/api/webhooks/meta/route.ts` verifies the challenge/signature, bounds the body, normalizes notifications and calls `handoffMetaLeadWebhookNotifications`.
2. `lib/meta/leads/handoff.ts` stores the legacy receipt plus canonical `MetaSocialWebhookReceipt`, then enqueues `PROCESS_META_LEAD` by reference only.
3. `lib/meta-platform/queue/lead-processing-job.ts` validates the receipt/reference envelope, dedupes by receipt/provider Lead ID and classifies worker failures.
4. `workers/meta-lead.worker.ts` claims the durable job and currently delegates domain work to `lib/meta/leads/service.ts#processMetaLeadReceipt`.
5. `lib/meta/leads/service.ts` claims the canonical receipt, fetches the provider Lead, verifies Page/Form ownership, normalizes fields, fingerprints contact identifiers, encrypts raw payload, persists normalized storage, assigns the Lead, emits a masked notification and completes the receipt.
6. `lib/meta-platform/repositories/prisma-leads.ts` owns the canonical transaction for processing-attempt linkage, scoped duplicate resolution, normalized persistence, receipt linkage and idempotent `MetaLeadHandoff` creation.

## Parallel/legacy path discovered

`workers/meta-lead.worker.ts` also consumes `LEAD_FORM_SYNC` and calls `lib/meta-business/leads.ts#fetchFormLeads`. That function uses `LeadgenForm#getLeads` and persists each row through the older `persistRetrievedMetaLead` path in `lib/meta/leads/repository.ts`. It bypasses canonical webhook receipts, `MetaLeadProcessingAttempt`, scoped HMAC fingerprints, canonical receipt linkage and the durable `MetaLeadHandoff` transaction. This path must not remain authoritative after Layer 5 cutover.

## Complete legacy module classification

| Module / exported behavior | Current responsibility | Provider / transaction boundary | Classification | Layer target |
|---|---|---|---|---|
| `lib/meta/leads/config.ts` | Lead runtime limits, allowlist and encryption/fingerprint secret resolution | Environment/config boundary | `WRAP` | Domain runtime factory/config adapter; no secrets in domain values |
| `lib/meta/leads/crypto.ts` | Encrypt/decrypt retained raw Lead payload | Cryptographic boundary | `WRAP` | Processing adapter dependency |
| `lib/meta/leads/fetch.ts#fetchMetaLeadGraphRecord` | Lead-by-ID Graph fetch and provider error taxonomy | Direct legacy Graph client call | `MIGRATE` | `domains/leads/process-lead.ts` fetch port + production adapter |
| `lib/meta/leads/fetch.ts#validateMetaLeadFreshness` | Source-age validation | Pure domain rule | `MIGRATE` | Lead mapping/processing domain |
| `lib/meta/leads/normalize.ts` | Field normalization, phone/email parsing, masks and raw generic custom values | Pure logic; currently permits PII-shaped custom values | `MIGRATE` | `normalize-lead.ts` + `lead-mapper.ts`; legacy wrapper only |
| `lib/meta/leads/deduplicate.ts` | Legacy SHA-256 duplicate candidate selection | Legacy repository path | `DEPRECATE` | Canonical scoped fingerprint transaction already supersedes it |
| `lib/meta/leads/assign.ts` | Assignment rules and round robin | Pure domain rule | `WRAP` | CRM handoff/assignment adapter |
| `lib/meta/leads/lifecycle.ts` | Lead lifecycle transition policy | Pure domain rule | `WRAP` | Existing admin lifecycle remains outside ingestion migration |
| `lib/meta/leads/notify.ts` | Masked assignment webhook | External notification write | `WRAP` | Post-persistence CRM side-effect port |
| `lib/meta/leads/receipt.ts` | Legacy receipt compatibility plus canonical receipt creation/identity binding | Durable receipt transaction | `WRAP` | Preserve Layer 2/3 behavior; route via domain handoff facade |
| `lib/meta/leads/handoff.ts` | Notification validation, receipt persistence and queue enqueue | Receipt/queue handoff boundary | `WRAP` | Production webhook facade; domain service remains queue consumer |
| `lib/meta/leads/service.ts#processMetaLeadReceipt` | Monolithic production orchestration | Canonical receipt claim plus provider/storage/notification boundaries | `MIGRATE` | `domains/leads/process-lead.ts`; legacy export becomes rollback facade |
| `lib/meta/leads/legacy-service.ts#processMetaLeadReceipt` | Frozen pre-domain orchestration retained only for emergency rollback | Provider, canonical receipt, storage, CRM assignment and notification boundaries | `DEPRECATE` | Explicit `LEGACY_ROLLBACK` adapter only; never default or SHADOW authority |
| `lib/meta/leads/service.ts` maintenance functions | Receipt recovery, SLA alerts and retention | Worker/repository boundary | `WRAP` | Keep maintenance ownership; use domain processing entrypoint for replay |
| `lib/meta/leads/repository.ts#persistRetrievedMetaLead` | Older unscoped normalization persistence | Separate transaction; legacy SHA hashes | `DEPRECATE` | Manual sync must use canonical domain processing/import path |
| `lib/meta/leads/repository.ts#assignMetaLead` | Atomic assignment | Database transaction | `WRAP` | CRM handoff dependency |
| `lib/meta/leads/repository.ts` safe list/get/lifecycle/SLA/retention | Admin CRM read/write and maintenance | Database boundary | `WRAP` | Existing admin domain; not duplicated in ingestion service |
| `lib/meta/leads/verify.ts` | Compatibility parser/challenge exports for centralized webhook transport | Webhook transport | `DELETE_LATER` | Keep until import inventory reaches zero; canonical transport is authoritative |
| `lib/meta/leads/signature.ts` | Compatibility signature exports for centralized webhook transport | Webhook transport | `DELETE_LATER` | Keep until import inventory reaches zero; canonical transport is authoritative |
| `lib/meta/leads/types.ts` | Legacy Lead shapes | Shared compile-time contract | `DEPRECATE` | New domain types are authoritative; adapters translate at boundary |
| `lib/meta-business/leads.ts#persistMetaLead` | Ad-hoc/manual direct persistence | Bypasses canonical attempt/handoff | `DEPRECATE` | Replace with controlled import through Lead domain |
| `lib/meta-business/leads.ts#fetchLeadById` | Direct fetch + legacy persistence | Provider + legacy DB path | `DEPRECATE` | Domain processing/reconciliation entrypoint |
| `lib/meta-business/leads.ts#fetchFormLeads` | SDK form listing + legacy persistence | Direct Business SDK + legacy DB path | `MIGRATE` | Provider list adapter feeding controlled domain import |
| `lib/meta-business/leads.ts#subscribePageToLeadgen` | Page webhook subscription write | Direct Business SDK write | `WRAP` | Page permission/domain service in 5.10 |
| `lib/meta-platform/repositories/prisma-leads.ts` | Canonical processing, scoped dedupe and handoff transaction | Authoritative DB transaction | `WRAP` | Production persistence adapter for Lead domain |
| `lib/meta-platform/repositories/leads.ts` | Pure storage contracts/fingerprints and in-memory repository | Canonical repository contract | `WRAP` | Reused by Lead domain tests/adapters |
| `lib/meta-platform/queue/lead-processing-job.ts` | Safe reference-only queue contract and failure classification | Queue/worker boundary | `WRAP` | Worker invokes domain service through this gate |
| `workers/meta-lead.worker.ts` | Production Lead job dispatch | Runtime worker boundary | `MIGRATE` | Wire new Lead domain runtime; legacy only behind rollback flag |
| `app/api/webhooks/meta/route.ts` | Production Lead webhook route | HTTP/receipt handoff boundary | `WRAP` | Keep route thin; new domain enters at worker execution |
| `app/api/admin/meta/leads/subscribe/route.ts` | Provider subscription route | Provider write | `MIGRATE` | Page domain service in 5.10 |
| Admin Lead list/detail/failure routes | Safe CRM administration | Read/lifecycle boundary | `WRAP` | Keep existing safe repository surfaces |

## Direct provider calls

| Call site | Operation | Risk | Required remediation |
|---|---|---|---|
| `lib/meta/leads/fetch.ts` | `GET /{leadgenId}` via legacy `createMetaGraphClient` | Legacy client is authoritative in production worker | Inject through Lead fetch port; keep adapter only as rollback implementation |
| `lib/meta-business/leads.ts` | `LeadgenForm#getLeads` | Parallel persistence path | List only, then import each Lead through canonical domain processing with deterministic synthetic receipt/import identity |
| `lib/meta-business/leads.ts` | `POST /{pageId}/subscribed_apps` | Page permission/write outside Page domain | Move authority to 5.10 Page domain |

## Duplicate, transaction and replay map

- Queue dedupe: receipt ID + provider Lead ID, reference-only payload.
- Canonical receipt claim: leased and state-transitioned before provider fetch.
- Processing attempt: unique by canonical receipt; retries reuse the attempt.
- Canonical duplicate identity: provider Lead ID first, then environment/connection-scoped HMAC phone/email fingerprints under transaction advisory locks.
- Canonical persistence + receipt linkage + handoff creation: one Prisma transaction.
- CRM replay key: `META_LEAD:{leadId}:{destination}` and unique `(leadId,destination)`.
- Gap at 5.1: handoff row creation exists, but explicit execution/claim semantics are not a Lead domain service; 5.3 must make replay-safe execution authoritative.
- Legacy manual sync gap: unscoped SHA-256 identity hashes, no canonical processing attempt, no canonical receipt link and no durable handoff execution boundary.

## PII and secret findings

- Queue payloads are reference-only and contain no Lead fields, email, phone or tokens.
- Canonical persisted `rawFields` and `normalizedData` are count/metadata projections; raw provider payload is encrypted.
- Existing legacy `NormalizedMetaLead.customFields` can contain arbitrary raw values. This is not acceptable as a generic domain field and is remediated in 5.2.
- Assignment notifications use masked phone/email only.
- Safe error code/summary sanitizers redact tokens, URLs, email and phone-like strings; 5.2/5.3 must centralize projection rules rather than depend on every caller.

## Test-lead finding

The schema and canonical persistence support nullable `isTestLead`, but there is no production test-lead creation service, isolation decision, cleanup service or evidence route. A provider marker alone currently does not prevent normal assignment/notification/CRM handling. Item 5.4 must make test isolation explicit and default-safe.

## Frozen implementation split

### 5.2 — Lead normalize and mapping domain

- Introduce canonical Lead domain types and provider-field mapper.
- Separate sensitive contact values from safe projections.
- Reject PII/token/secret-shaped values from generic custom fields.
- Preserve campaign/ad/adset/form/Page attribution and missing-field behavior.
- Add focused strict TypeScript and PII projection tests.

### 5.3 — Lead processing and CRM handoff domain

- Introduce dependency-injected receipt processing service and production runtime adapter.
- Wire `workers/meta-lead.worker.ts` and manual form sync through the new domain entrypoint.
- Put old processing behind an explicit rollback flag only.
- Make CRM handoff execution idempotent/claimable and replay-safe.
- Classify fetch/auth/not-found/retry errors without leaking provider payloads.

### 5.4 — Meta test-lead domain and evidence path

- Define deterministic test-lead identification and explicit test execution context.
- Default test Leads to isolated storage/handoff policy; no normal assignment, notification or CRM handoff.
- Add controlled cleanup and evidence projection containing no PII.
- Wire production Lead processing to the test policy.

## 5.1 gate result

All Lead runtime, provider, normalization, duplicate, persistence, CRM, manual-sync, recovery and test-marker paths are classified. No runtime behavior or Prisma schema was changed. Exact implementation ownership for 5.2–5.4 is frozen above.
