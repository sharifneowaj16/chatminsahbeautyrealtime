# Phase 31 Layer 3.5 — Lead receipt and normalized Lead storage

**Status:** PASS for numbered source scope and dependency-independent verification  
**Implementation date:** 2026-07-25  
**Input checkpoint:** Phase 31 Layer 3.4 COMPLETE  
**Exact next item:** Layer 3.6 — Instagram conversation, message and outbound mapping persistence

## Executive conclusion

Layer 3.5 preserves the existing `MetaLead` business model and makes it receipt-first, replay-safe and identity-scoped rather than creating a parallel Lead table. A canonical `MetaSocialWebhookReceipt` can now trace to a durable `MetaLeadProcessingAttempt` and, after a successful provider fetch, to exactly one normalized `MetaLead`. Provider Lead ID uniqueness remains database-backed through `MetaLead.leadgenId`; replay receipts resolve the same business Lead and the same deterministic handoff reference.

The implementation adds Page/Form canonical identity references, scoped versioned HMAC fingerprints for phone/email dedupe, durable retrieval/failure state even when no Lead row can be created, tri-state test-Lead classification, canonical receipt linkage for duplicate evidence and a generic handoff persistence boundary for later CRM execution. Existing encrypted raw payload storage, masked safe projections, legacy Lead assignment/lifecycle and queued manual sync remain compatible.

No plaintext phone/email, access token, app secret, webhook secret, raw Graph error body or raw `field_data` value is added to safe receipt, attempt, handoff or failure metadata.

## What changed

### Receipt-first Lead persistence

Added a nullable canonical relation:

```text
MetaSocialWebhookReceipt.normalizedLeadId
  → MetaLead.id
```

A receipt may be linked once. Linking the same Lead is idempotent; attempting to replace it with another Lead fails with `META_LEAD_RECEIPT_LINK_CONFLICT`.

Added `MetaLeadProcessingAttempt` with one durable row per canonical receipt:

```text
receiptId @unique
providerLeadId
environment
connectionKey
pageId / formId
pageIdentityReferenceId / formIdentityReferenceId
retrievalStatus
retrievalAttempt
lastRetrievalAt
nextRetrievalAt
normalizedLeadId
duplicateReason
isTestLead
failureCode / failureCategory / failureSummary
```

This stores retrieval state for missing, expired, token-blocked, transient and permanent provider outcomes even when a normalized `MetaLead` does not yet exist.

### Existing `MetaLead` extension

The existing business model remains authoritative and gains additive trace fields:

```text
provider = META
environment
connectionKey
pageIdentityReferenceId
formIdentityReferenceId
phoneFingerprint
emailFingerprint
fingerprintVersion
isTestLead
```

Historical environment/connection and test classification remain nullable because the migration does not guess production scope or classify unknown historical records as live/test.

Existing attribution remains intact:

```text
pageId / formId
adId / adName
adsetId / adsetName
campaignId / campaignName
isOrganic / platform / partnerName / retailerItemId
```

### Provider Lead ID and duplicate behavior

`MetaLead.leadgenId @unique` remains the authoritative provider idempotency key.

The persistence transaction uses deterministic PostgreSQL advisory locks for:

```text
provider Lead ID
scoped phone fingerprint
scoped email fingerprint
```

Resolution priority is:

```text
LEADGEN_ID → PHONE → EMAIL
```

Behavior:

- same provider Lead ID resolves one `MetaLead`;
- different provider Lead IDs with the same scoped phone/email resolve the existing canonical Lead and create/update `MetaLeadDuplicate`;
- `MetaLeadDuplicate` now carries an optional canonical receipt FK in addition to its legacy receipt identifier;
- conflicting duplicate mappings are rejected instead of silently remapped.

### Scoped PII fingerprints

Canonical webhook writes create versioned keyed fingerprints:

```text
fingerprintVersion = hmac-sha256:v1
HMAC input scope = environment + connectionKey + normalized value
```

The key comes from `META_LEAD_FINGERPRINT_KEY`, with the existing Lead encryption key available as a compatibility fallback. The key is never persisted.

Existing SHA-256 columns are retained for compatibility and migration safety. No destructive rewrite or plaintext reconstruction is performed. New scoped fingerprints are preferred for canonical receipt-first dedupe.

Safe persisted projections contain:

- masked phone/email;
- keyed fingerprints and existing compatibility hashes;
- bounded normalized name/location/product-interest fields;
- safe attribution IDs/names;
- field names and value counts only.

Raw provider Lead data remains AES-GCM encrypted with a payload digest. `normalizedData` and `rawFields` do not contain raw phone/email or raw `field_data` values.

### Page/Form identity enforcement

The processing flow resolves the Layer 3.4 Page and optional Lead Form identities in the receipt environment/connection scope. It validates the Page→Lead Form relationship and verifies that the fetched provider `form_id` does not conflict with the receipt/form identity.

A mismatch fails before Lead mutation with safe codes such as:

```text
META_LEAD_RECEIPT_FORM_MISMATCH
META_LEAD_IDENTITY_SCOPE_MISMATCH
META_LEAD_FORM_PAGE_MISMATCH
```

`MetaLead` and `MetaLeadProcessingAttempt` retain nullable Page/Form identity FKs with `ON DELETE SET NULL`, preserving historical Lead evidence if a mapping is later retired.

### Durable retrieval lifecycle

The repository exposes receipt-scoped operations to:

```text
begin processing attempt
mark FETCHING
mark RETRYING / NOT_FOUND / TOKEN_ERROR / PERMANENT_FAILURE
persist FETCHED normalized Lead
attach normalized Lead to attempt and receipt
```

Failure details are bounded and redacted. URL, email, phone, token-like and secret-bearing material is removed before persistence. Retry scheduling is stored through `nextRetrievalAt`; Layer 4 remains responsible for retry policy and queue execution.

### Replay-safe handoff persistence

Added `MetaLeadHandoff` with:

```text
leadId
destination
idempotencyKey @unique
status
attemptCount
lastAttemptAt / nextRetryAt
failureCode / failureSummary
targetType / targetId
completedAt
```

The deterministic key is:

```text
META_LEAD:<leadId>:<destination>
```

The database also enforces one handoff per `leadId + destination`. A replay receipt therefore creates a new audited processing attempt but resolves the same `MetaLead` and the same handoff row.

Layer 3.5 creates the persistence boundary only. Actual CRM/customer/contact execution and retry orchestration remain Layer 5.3/Layer 4 work.

### Test Lead marker

`isTestLead` is nullable on both Lead and processing attempt:

```text
true  = provider payload explicitly classified as test
false = provider payload explicitly classified as non-test
null  = unknown/historical
```

The migration does not mark historical rows as live.

## Transaction boundary

Successful normalized persistence executes in one database transaction:

```text
1. lock provider Lead and scoped fingerprints
2. load provider/phone/email candidates
3. insert or update the canonical MetaLead
4. create/update duplicate evidence when required
5. attach MetaLead to canonical receipt
6. attach MetaLead to processing attempt
7. create/get deterministic handoff
8. commit
```

A receipt conflict, attempt conflict or duplicate-mapping conflict rolls the transaction back.

## Compatibility decisions

- Existing `MetaLead`, `MetaWebhookReceipt`, assignment, lifecycle, notification and retention models remain.
- Existing `leadgenId` uniqueness is not replaced.
- Existing AES-GCM raw Lead payload storage is retained.
- Legacy/manual form sync remains queued and may use its existing compatibility persistence path; no fake webhook receipt is created for manual imports.
- The Layer 3.3 canonical receipt lease/state machine remains unchanged.
- The Layer 3.4 provider identity registry remains the Page/Form authority.
- No Instagram conversation/message, outbound, queue-policy, realtime, admin or cutover work is included.

## Migration and recovery

Created:

```text
prisma/migrations/20260725063000_phase31_lead_normalized_storage/migration.sql
prisma/migrations/20260725063000_phase31_lead_normalized_storage/recovery.sql
prisma/migrations/20260725063000_phase31_lead_normalized_storage/README.md
```

Migration properties:

- additive enums, columns, models, indexes and FKs only;
- duplicate `leadgenId` precondition is documented before relying on the existing unique key;
- canonical receipt→Lead backfill occurs only through unambiguous legacy receipt/Lead ID matches;
- environment/connection scope is backfilled only from a unique canonical receipt relationship;
- deterministic processing-attempt IDs make backfill resumable;
- no historical phone/email fingerprint is fabricated without normalized plaintext and a runtime secret;
- no historical Lead is classified as test/live by guess;
- migration is registered in the governed migration manifest.

Recovery properties:

- explicitly warns that processing-attempt, handoff and receipt/Lead trace evidence will be lost;
- removes only Layer 3.5 FKs, indexes, tables, fields and enums;
- does not drop existing `MetaLead`, encrypted payloads, legacy receipts, canonical receipts, identity mappings or Layer 3.3 lifecycle fields.

## Verification

Focused dependency-independent verification completed:

```text
Layer 3.5 Lead storage runtime: 13/13 PASS
Layer 3.5 Lead storage audit:   65/65 PASS
Legacy Phase 8 Lead audit:     68/68 PASS
```

Focused runtime scenarios cover:

- deterministic scoped HMAC fingerprints;
- secret/PII-safe failure sanitization and attribution projection;
- one processing attempt per receipt;
- guarded retrieval-state updates and retries;
- provider-ID idempotency;
- phone/email duplicate resolution;
- replay receipt resolving the same Lead;
- one deterministic handoff per Lead/destination;
- receipt and attempt conflict protection;
- tri-state test-Lead classification.

Final dependency-independent verification:

```text
Layer 3.2/3.3 receipt runtime:    17/17 PASS
Layer 3.2 persistence audit:      37/37 PASS
Layer 3.3 lifecycle audit:        43/43 PASS
Layer 3.4 identity runtime:       11/11 PASS
Layer 3.4 identity audit:         58/58 PASS
Layer 3.5 Lead storage runtime:   13/13 PASS
Layer 3.5 Lead storage audit:     65/65 PASS
Layer 1 contracts runtime/audit:  35/35 + 72/72 PASS
Layer 2 webhook runtime/audit:    26/26 + 37/37 PASS
Legacy Phase 8 Lead audit:        68/68 PASS
Phase 24 transport audit:         74/74 PASS
Phase 14 Instagram audit:         81/81 PASS
Phase 21 reference audit:         47/47 PASS
Migration governance:            417/417 PASS
Source inventory:                 48/48 PASS over 511 paths
Changed TypeScript syntax:        11/11 PASS
Prisma schema/migration pair:     PASS
```

The complete command output is recorded in `phase31_layer3.5_verification.log`.

## What did not change

- No new queue provider, retry/backoff policy or Lead worker scheduler was created.
- No full Lead domain or Graph transport migration was performed.
- No actual Customer/Contact/CRM side effect was executed.
- No assignment, conversion, admin UI or retention redesign was performed.
- No Instagram, Facebook realtime, feature-flag or cutover work was started.
- No plaintext Lead PII was added to safe storage.

## Prisma/runtime status

```text
Schema change: YES — additive only
Migration pair: PRESENT
Prisma generated client: NOT GENERATED in this environment
Disposable PostgreSQL apply/recovery/re-apply: NOT RUN
Full dependency-backed typecheck/lint/build: NOT RUN
```

`node_modules`, Prisma CLI, `psql` and Docker are unavailable in this working environment. Those gates are not claimed as passing.

## Known blockers

- Generate Prisma Client after dependencies are available.
- Apply, recover and reapply Layer 3 migrations on disposable PostgreSQL.
- Run real PostgreSQL concurrent provider/fingerprint idempotency tests.
- Run full typecheck, lint and production build after a successful locked dependency install.
- Collect live Meta test-Lead and provider fetch evidence in later release gates.

## Completion decision

Layer 3.5 is complete for its numbered source scope: canonical receipts have durable Lead attempts, successful receipts trace to one DB-idempotent normalized Lead, scoped Page/Form identities are enforced, safe encrypted/hashed/masked PII policy is retained, replay resolves the same Lead/handoff, migration/recovery and focused evidence exist, and legacy behavior remains compatible.

## Exact next item

```text
Layer 3.6 — Instagram conversation, message and outbound mapping persistence
```
