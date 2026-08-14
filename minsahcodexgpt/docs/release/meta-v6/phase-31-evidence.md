# Phase 31 — Meta Social CRM Platform Migration Evidence

> Status: `IN_PROGRESS`
> Evidence date: 2026-07-24 Asia/Dhaka
> Current completed units: Layer 1.1 — normalized webhook event; Layer 1.2 — provider identity and Page↔Instagram binding; Layer 1.3 — normalized Lead Ads payload; Layer 1.4 — normalized Instagram conversation/message; Layer 1.5 — normalized Instagram send/reply; Layer 1.6 — shared social provider error taxonomy; Layer 1.7 — normalized social platform result; Layer 1.8 — shared reply-window policy

## Layer 1.1 objective

Establish one versioned, provider-independent event envelope for Meta webhook transport output so Lead Ads, Instagram, Facebook/Page and realtime consumers can migrate without depending on raw provider route shapes.

## Implemented

- Added `MetaNormalizedWebhookEvent` with schema version, provider/transport identity, stable event key, provider event ID, payload digest, object/field/group routing, ordering metadata and normalized payload.
- Added a fail-closed runtime contract guard.
- Updated the shared webhook parser to emit the new contract.
- Preserved the existing `MetaWebhookNotification` name as a compatibility alias.
- Exported the contract through webhook and public MetaPlatform boundaries.
- Registered focused runtime and static audit scripts.
- Updated the frozen Meta source inventory from 470 to 472 governed paths.

## Schema and migration

- `prisma/schema.prisma`: unchanged.
- New Prisma migration: not required for this unit.
- Production Prisma state: not modified.

## Verification

```text
npm run test:meta-v6-phase31-contracts
PASS — 3/3 tests

npm run qa:meta-platform-phase31-contracts
PASS — 12/12 checks

npm run qa:meta-platform-phase24
PASS — 74/74 inherited webhook/media checks

npm run qa:meta-platform-inventory
PASS — 47/47 checks; 472 governed paths

Changed TypeScript syntax transpilation
PASS — 6/6 files

Focused contract TypeScript
PASS — 2/2 files
```

The full repository TypeScript command remains dependency-blocked because the locked install could not complete through the sandbox npm registry. Diagnostics on the changed parser are limited to missing Node type declarations caused by absent dependencies; the parser executed successfully in the dependency-independent runtime tests.

## Rollback

Pre-change archive SHA-256:

```text
c372cfe9ee5061f01d6eaa55c3a871565521c42b81d6be25846e904cdfdf4d21
```

Rollback removes the new contract exports/files and restores the original webhook parser/types. No database rollback is involved.

## Layer 1.2 objective

Define one normalized, runtime-validated provider identity contract for Meta app, business, ad account, Page and Instagram account assets, plus an explicit Page↔Instagram binding that cannot cross environment or connection boundaries.

## Layer 1.2 implemented

- Added a versioned `MetaProviderIdentity` covering `APP`, `BUSINESS`, `AD_ACCOUNT`, `PAGE` and `INSTAGRAM_ACCOUNT`.
- Scoped every identity by environment and connection key and added a stable identity key.
- Normalized ad-account identity so canonical IDs omit `act_` while Graph node IDs include it.
- Enforced self-identity consistency for app, business and Page assets.
- Added a versioned Page↔Instagram binding with fail-closed environment, connection, Page, business and app relationship checks.
- Exported both contracts through the contract and public MetaPlatform boundaries.
- Updated the governed source inventory from 472 to 474 active paths.

## Layer 1.2 schema and migration

- `prisma/schema.prisma`: byte-for-byte unchanged from the Layer 1.1 archive.
- Schema SHA-256: `0dca14d4966868c434f43db8a64ab377cc3dbf8a6ce98be2bbb8cf84ee991ef0`.
- New Prisma migration: not required.
- Production Prisma state: not modified.

## Layer 1.2 verification

```text
Phase 31 contract runtime tests
PASS — 6/6 tests

Phase 31 Layer 1 contract audit
PASS — 19/19 checks

Inherited Phase 24 Graph/webhook/media audit
PASS — 74/74 checks

Meta source inventory
PASS — 47/47 checks; 474 governed paths

Focused TypeScript
PASS — asset context + social identity + Page binding

Prisma schema/migration pair audit
PASS — archive scope; CI retains Git change-set enforcement
```

The full repository install/typecheck/build remains externally blocked by the npm registry failure recorded in Layer 0. No dependency, provider, route, database or production Prisma mutation was performed in Layer 1.2.

## Layer 1.2 rollback

Remove `contracts/social.ts` and `contracts/pages.ts`, restore their public exports and restore the Layer 1.1 inventory/evidence files. No database rollback is involved.

## Layer 1.3 objective

Define one versioned Lead Ads payload contract that converts a retrieved Meta lead into a canonical Page-scoped record without exposing raw Graph response shapes to routes, jobs or downstream CRM services.

## Layer 1.3 implemented

- Added `MetaNormalizedLeadPayload` with a stable environment/connection/Page-scoped lead key.
- Added canonical Page identity, provider-created time and form/ad/ad-set/campaign attribution.
- Added bounded provider field normalization with deterministic duplicate-field merging.
- Added normalized contact data for name, Bangladesh-default phone, email and location.
- Added SHA-256 and masked phone/email projections for safe operational use.
- Added explicit source-channel normalization for Facebook, Instagram and unknown provider variants.
- Added fallback form identity support and configurable, contract-visible phone country code.
- Added a fail-closed runtime guard that reconstructs the canonical payload and rejects forged or extra fields.
- Exported the Lead Ads contract through the contract and public MetaPlatform boundaries.
- Updated the governed source inventory from 474 to 475 active paths.

## Layer 1.3 schema and migration

- `prisma/schema.prisma`: byte-for-byte unchanged from Layers 1.1–1.2.
- Schema SHA-256: `0dca14d4966868c434f43db8a64ab377cc3dbf8a6ce98be2bbb8cf84ee991ef0`.
- New Prisma migration: not required.
- Production Prisma state: not modified.

## Layer 1.3 verification

```text
Phase 31 contract runtime tests
PASS — 9/9 tests

Phase 31 Layer 1 contract audit
PASS — 26/26 checks

Focused TypeScript
PASS — asset context + provider identity + Page binding + Lead Ads payload

Inherited Phase 24 Graph/webhook/media audit
PASS — 74/74 checks

Meta source inventory
PASS — 47/47 checks; 475 governed paths

Prisma schema/migration pair audit
PASS — archive scope; CI retains Git change-set enforcement
```

The legacy `lib/meta/leads/*` retrieval, persistence and processing flow remains active and unchanged. Layer 1.3 establishes the shared contract only; it performs no route cutover, provider call, database write or production mutation.

## Layer 1.3 rollback

Remove `contracts/leads.ts`, restore its contract/public exports and restore the Layer 1.2 inventory/evidence files. No database rollback is involved.

## Layer 1.4 objective

Define one provider-independent Instagram conversation/message boundary that is scoped to the canonical Page↔Instagram binding and can be consumed by receipt, queue, domain, realtime and admin layers without importing legacy webhook or Prisma row shapes.

## Layer 1.4 implemented

- Added independently versioned normalized Instagram conversation and message contracts.
- Required the canonical Page↔Instagram binding before either contract can be created.
- Added stable environment/connection/account-scoped participant, conversation, message and attachment keys.
- Added normalized participant profile, provider conversation/message IDs, sender/recipient direction, message/event type and reply relationship metadata.
- Added receipt trace fields for source event key and sanitized payload digest.
- Added bounded text and attachment metadata, deterministic attachment keys, duplicate external-ID rejection and safe integer size validation.
- Added conversation status plus last-message, last-inbound, standard-reply and private-reply timestamps.
- Added fail-closed account-direction validation and runtime guards that reconstruct canonical values and reject forged or extra fields.
- Exported the Instagram contracts through the contract and public MetaPlatform boundaries.
- Updated the governed source inventory from 475 to 476 active paths.

## Layer 1.4 schema and migration

- `prisma/schema.prisma`: byte-for-byte unchanged from Layers 1.1–1.3.
- Schema SHA-256: `0dca14d4966868c434f43db8a64ab377cc3dbf8a6ce98be2bbb8cf84ee991ef0`.
- Complete migration-directory digest: `005582153729f4e81003c94282df1f9592329c7b763d7dcc51eb3d1eb5119264`.
- New Prisma migration: not required.
- Production Prisma state: not modified.

## Layer 1.4 verification

```text
Phase 31 contract runtime tests
PASS — 13/13 tests

Phase 31 Layer 1 contract audit
PASS — 34/34 checks

Focused TypeScript
PASS — asset context + provider identity + Page binding + Instagram contracts

Inherited Phase 24 Graph/webhook/media audit
PASS — 74/74 checks

Meta source inventory
PASS — 47/47 checks; 476 governed paths

Meta v6 migration governance
PASS — 397/397 checks

Prisma schema/migration pair audit
PASS — archive scope; CI retains Git change-set enforcement
```

The legacy `lib/meta/instagram/*` webhook, persistence, queue, reply and admin behavior remains active and unchanged. Layer 1.4 adds a shared canonical boundary only; it performs no route cutover, provider call, database write or production mutation. Attachment URL safety/download policy and reply eligibility remain separate Layer 1 policy units.

## Layer 1.4 rollback

Remove `contracts/instagram.ts`, restore its contract/public exports and restore the Layer 1.3 inventory/evidence files. No database rollback is involved.

## Layer 1.5 objective

Define one provider-independent Instagram send/reply request boundary that is scoped to the canonical Page↔Instagram conversation identity and can be persisted or queued without importing route bodies, Prisma rows or raw Graph request shapes.

## Layer 1.5 implemented

- Added a versioned `MetaNormalizedInstagramSendRequest` contract for standard message replies and one-shot private replies.
- Reused the canonical Page↔Instagram binding, participant and conversation identity from Layer 1.4.
- Added an account-scoped stable send key and bounded legacy-compatible idempotency key.
- Added normalized reply text plus SHA-256 text hash for safe audit correlation.
- Added explicit source message, provider message, comment and post references.
- Required private replies to carry an explicit source comment ID.
- Rejected source message keys that belong to another conversation or disagree with the declared provider message ID.
- Added normalized request time, correlation ID and explicit `ADMIN`, `SYSTEM` or `AUTOMATION` actor metadata; admin requests require an actor ID.
- Added a fail-closed runtime guard that reconstructs the canonical request and rejects forged or extra fields.
- Exported the send/reply contract through the contract and public MetaPlatform boundaries.
- Updated the governed source inventory from 476 to 477 active paths.

## Layer 1.5 schema and migration

- `prisma/schema.prisma`: byte-for-byte unchanged from Layers 1.1–1.4.
- Schema SHA-256: `0dca14d4966868c434f43db8a64ab377cc3dbf8a6ce98be2bbb8cf84ee991ef0`.
- Complete migration-directory digest: `005582153729f4e81003c94282df1f9592329c7b763d7dcc51eb3d1eb5119264`.
- New Prisma migration: not required.
- Production Prisma state: not modified.

## Layer 1.5 verification

```text
Phase 31 contract runtime tests
PASS — 16/16 tests

Phase 31 Layer 1 contract audit
PASS — 41/41 checks

Focused TypeScript
PASS — asset context + provider identity + Page binding + Instagram conversation/message/send contracts

Changed-file syntax checks
PASS — 5/5 files

Inherited Phase 24 Graph/webhook/media audit
PASS — 74/74 checks

Meta source inventory
PASS — 47/47 checks; 477 governed paths

Phase 19 inventory tests
PASS — 4/4 tests

Meta v6 migration governance
PASS — 397/397 checks

Prisma schema/migration pair audit
PASS — archive scope; CI retains Git change-set enforcement
```

The legacy Phase 14 Instagram static audit remains at its Layer 1.4 baseline of 79/81 because two old checks still expect HMAC implementation details inside `lib/meta/instagram/verify.ts`; signature verification has already been centralized and is covered by the passing Phase 24 audit. Layer 1.5 did not modify that legacy verifier or audit.

The legacy `lib/meta/instagram/messages.ts` provider call, reply policy, persistence and admin route remain active and unchanged. Layer 1.5 defines the normalized send request only; it performs no route cutover, provider call, database write or production mutation.

## Layer 1.5 rollback

Remove `contracts/instagram-send.ts`, restore its contract/public exports and restore the Layer 1.4 inventory/evidence files. No database rollback is involved.

## Layer 1.6 objective

Define one safe, provider-independent error taxonomy for Meta webhook, Lead Ads, Instagram, Facebook Page and realtime social operations so routes, jobs, domain services and admin surfaces do not interpret raw Graph or legacy error shapes independently.

## Layer 1.6 implemented

- Added shared social error domains for webhook, leads, Instagram, Facebook Page and realtime processing.
- Added explicit request kinds for reads, writes and webhook handling.
- Added stable provider error kinds for invalid request, authentication, authorization, not found, conflict, rate limit, provider unavailable, timeout, configuration, expired reply window, rejected attachment, unknown outcome and internal failure.
- Added processing dispositions: `BLOCKED`, `RETRYABLE_FAILURE`, `PERMANENT_FAILURE` and `RECONCILIATION_REQUIRED`.
- Normalized raw Graph payload errors, existing `MetaPlatformError` values, legacy Lead Ads errors, Instagram wrapped `safeProvider` errors, Facebook/realtime HTTP errors and common network/timeout failures.
- Added bounded safe metadata for HTTP status, provider code/subcode/type, trace ID and retry-after; raw provider messages, tokens and URLs are not returned.
- Added fail-closed handling for writes that may have succeeded: timeout/unavailable/internal outcomes become non-retryable reconciliation requirements rather than blind retries.
- Exported the taxonomy through the public MetaPlatform boundary.
- Updated the governed source inventory from 477 to 478 active paths.

## Layer 1.6 schema and migration

- `prisma/schema.prisma`: byte-for-byte unchanged from Layers 1.1–1.5.
- Schema SHA-256: `0dca14d4966868c434f43db8a64ab377cc3dbf8a6ce98be2bbb8cf84ee991ef0`.
- Complete migration-directory digest: `005582153729f4e81003c94282df1f9592329c7b763d7dcc51eb3d1eb5119264`.
- New Prisma migration: not required.
- Production Prisma state: not modified.

## Layer 1.6 verification

```text
Phase 31 contract runtime tests
PASS — 21/21 tests

Phase 31 Layer 1 contract/error audit
PASS — 49/49 checks

Focused TypeScript
PASS — core error contract + social provider taxonomy

Inherited Phase 24 Graph/webhook/media audit
PASS — 74/74 checks

Meta source inventory
PASS — 47/47 checks; 478 governed paths

Phase 19 inventory tests
PASS — 4/4 tests

Meta v6 migration governance
PASS — 397/397 checks

Prisma schema/migration pair audit
PASS — archive scope; CI retains Git change-set enforcement
```

Layer 1.6 does not cut over existing Graph, Instagram, Facebook or realtime callers. It establishes the shared error boundary only; routes, provider calls, persistence, queues and production behavior remain unchanged.

## Layer 1.6 rollback

Remove `lib/meta-platform/errors/social-errors.ts`, restore the public exports and restore the Layer 1.5 inventory/evidence files. No database rollback is involved.

## Layer 1.7 objective

Define one versioned social operation result envelope so webhook, Lead Ads, Instagram, Facebook Page and realtime callers report success, blocked, retryable failure, permanent failure and reconciliation-required outcomes without route-specific booleans or raw provider errors.

## Layer 1.7 implemented

- Added `MetaSocialPlatformResult<T>` with explicit success and failure variants.
- Added one schema version and stable statuses: `SUCCESS`, `BLOCKED`, `RETRYABLE_FAILURE`, `PERMANENT_FAILURE` and `RECONCILIATION_REQUIRED`.
- Scoped every result by Meta provider, social domain, normalized operation and bounded correlation ID.
- Added `createMetaSocialSuccessResult` for typed success values.
- Added `createMetaSocialFailureResult` that mirrors the canonical Layer 1.6 error disposition, retryability, possible-success state and retry-after value.
- Reconstructed failure errors from allowlisted safe metadata so extra top-level provider/token fields cannot enter the result envelope.
- Hardened the Layer 1.6 runtime error guard to reject unapproved top-level fields.
- Added a fail-closed result guard that rejects extra fields and any domain, operation, correlation, disposition, retryability or retry-after mismatch between the envelope and its embedded error.
- Exported the result contract through the contract and public MetaPlatform boundaries.
- Updated the governed source inventory from 478 to 479 active paths.

## Layer 1.7 schema and migration

- `prisma/schema.prisma`: byte-for-byte unchanged from Layers 1.1–1.6.
- Schema SHA-256: `0dca14d4966868c434f43db8a64ab377cc3dbf8a6ce98be2bbb8cf84ee991ef0`.
- Complete migration-directory digest: `005582153729f4e81003c94282df1f9592329c7b763d7dcc51eb3d1eb5119264`.
- New Prisma migration: not required.
- Production Prisma state: not modified.

## Layer 1.7 verification

```text
Phase 31 contract runtime tests
PASS — 25/25 tests

Phase 31 Layer 1 contract/error/result audit
PASS — 55/55 checks

Changed TypeScript syntax
PASS — 4/4 files

Inherited Phase 24 Graph/webhook/media audit
PASS — 74/74 checks

Meta source inventory
PASS — 47/47 checks; 479 governed paths

Phase 19 inventory tests
PASS — 4/4 tests

Meta v6 migration governance
PASS — 397/397 checks

Prisma schema/migration pair audit
PASS — archive scope; CI retains Git change-set enforcement
```

Layer 1.7 does not change routes, provider calls, queues, persistence or database behavior. Existing core `MetaResult` remains available for non-social platform operations; Phase 31 domains can migrate to the stronger social result boundary incrementally.

## Layer 1.7 rollback

Remove `lib/meta-platform/contracts/social-result.ts`, restore the Layer 1.6 social-error guard and public exports, then restore the Layer 1.6 inventory/evidence files. No database rollback is involved.

## Layer 1.8 objective

Define one fail-closed Instagram reply-window policy boundary so standard messages, post/reel private replies and Instagram Live private replies are evaluated consistently before any provider write.

## Layer 1.8 implemented

- Added a versioned `MetaSocialReplyWindowDecision` contract with deterministic decision identity, policy ID, allowed/blocked state, reason, account/conversation scope, source comment, evaluation time, canonical window timestamps, remaining time and correlation identity.
- Added the standard Instagram message policy using a rolling 24-hour window derived from the normalized conversation's last inbound message.
- Added stored-window consistency protection: a persisted standard expiry that does not match the canonical 24-hour derivation is blocked rather than trusted.
- Added post/reel private-reply policy using a seven-day window derived from the source comment creation time.
- Required per-comment private-reply state and blocked a second private reply to the same comment.
- Added Instagram Live private-reply policy that permits the one-shot reply only while the broadcast is explicitly active; unknown or ended live state blocks the write.
- Enforced normalized send request, conversation, account, Page and participant identity equality before policy evaluation.
- Added a fail-closed runtime guard that reconstructs canonical decision keys/timing and rejects extra fields, forged policy/reason combinations, decision mismatches and unsafe identifiers.
- Exported the policy through `lib/meta-platform/policies/index.ts` and the public MetaPlatform boundary.
- Updated the governed source inventory from 479 to 481 active paths.
- Policy constants were checked against the current official Meta Instagram API workspace: standard replies use the 24-hour messaging window; private replies are one message within seven days for post/reel comments and only during an active Live broadcast.

## Layer 1.8 schema and migration

- `prisma/schema.prisma`: byte-for-byte unchanged from Layer 1.7.
- Schema SHA-256: `0dca14d4966868c434f43db8a64ab377cc3dbf8a6ce98be2bbb8cf84ee991ef0`.
- Complete migration-directory digest: `005582153729f4e81003c94282df1f9592329c7b763d7dcc51eb3d1eb5119264`.
- New Prisma migration: not required.
- Production Prisma state: not modified.

## Layer 1.8 verification

```text
Phase 31 contract/policy runtime tests
PASS — 30/30 tests

Phase 31 Layer 1 contract/error/result/policy audit
PASS — 63/63 checks

Focused TypeScript semantic check
PASS — policy plus required Instagram identity/send dependencies; temporary node:crypto declaration used because node_modules/@types are absent

Changed code syntax
PASS — 5/5 files

Inherited Phase 24 Graph/webhook/media audit
PASS — 74/74 checks

Meta source inventory
PASS — 47/47 checks; 481 governed paths

Phase 19 inventory tests
PASS — 4/4 tests

Meta v6 migration governance
PASS — 397/397 checks

Prisma schema/migration pair audit
PASS — archive scope; CI retains Git change-set enforcement

Legacy Phase 14 Instagram static audit
BASELINE — 79/81; two old checks still expect local HMAC implementation rather than the centralized Phase 24 verifier
```

Layer 1.8 does not call Meta, change route behavior, enqueue jobs, write persistence or alter database state. It defines the shared eligibility boundary only; provider/domain cutover remains deferred.

## Layer 1.8 rollback

Remove `lib/meta-platform/policies/reply-window.ts` and `lib/meta-platform/policies/index.ts`, restore the public export, tests/audit and Layer 1.7 inventory/evidence files. No database rollback is involved.

## Next exact unit

Layer 1.9 — shared Meta social attachment/media policy contract.

## Layer 2.3 objective

Route every supported normalized Meta webhook event through one bounded receipt-first handoff interface and return consistent accepted, duplicate, deferred, rejected and ignored responses without bypassing durable dedupe or queue controls.

## Layer 2.3 implemented

- Added the versioned shared handoff boundary in `lib/meta-platform/transports/webhook/handoff.ts`.
- Added canonical handoff records, aggregate summaries and public response helpers for `ACCEPTED`, `DUPLICATE`, `DEFERRED`, `REJECTED` and `IGNORED` outcomes.
- Added same-delivery event-key dedupe before domain receiver invocation.
- Moved Lead Ads receipt persistence and queue handoff out of the route into `lib/meta/leads/handoff.ts`.
- Made rejected Lead Ads conflict handling return the existing durable receipt instead of a generated non-durable identifier.
- Replaced Instagram receipt upsert/reset behavior with create-once/read-existing semantics so duplicate deliveries do not reset terminal/queued state or re-enqueue work.
- Cut the active Lead Ads and Instagram routes over to the same handoff response contract.
- Acknowledges durable queue failures as `DEFERRED` while returning `503` only when durable receipt handoff is unavailable.
- Updated the governed inventory from 484 to 486 active paths.

## Layer 2.3 schema and migration

- `prisma/schema.prisma`: byte-for-byte unchanged from Layer 2.2.
- Schema SHA-256: `0dca14d4966868c434f43db8a64ab377cc3dbf8a6ce98be2bbb8cf84ee991ef0`.
- Migration-tree digest: `69d30f23fbebac1bb65cc1342f1709fa0598b5fba0be7e3fa08b88e5934ecad6`.
- Generated Prisma tree digest: `015541692990a62b5a5711a25080ff4411db6c85153da663ce1caf7e36db5629`.
- New Prisma migration: not required.
- Production Prisma state: not modified.

## Layer 2.3 verification

```text
Phase 31 webhook runtime tests
PASS — 26/26 tests

Phase 31 Layer 2 transport/handoff audit
PASS — 37/37 checks

Phase 31 Layer 1 runtime regression
PASS — 35/35 tests

Phase 31 Layer 1 contract/policy audit
PASS — 72/72 checks

Inherited Phase 24 Graph/webhook/media audit
PASS — 74/74 checks

Inherited Phase 14 Instagram audit
PASS — 81/81 checks

Meta source inventory
PASS — 47/47 checks; 486 governed paths

Phase 19 inventory tests
PASS — 4/4 tests

Meta v6 migration governance
PASS — 397/397 checks

Prisma schema/migration pair audit
PASS — archive scope; CI retains Git change-set enforcement

Focused TypeScript and changed-source syntax
PASS
```

Dependency-backed full application typecheck, lint, production build and exact `tsx` suites remain blocked by the missing installed dependency tree and npm registry `503` response. No production-runtime completion is claimed.

## Layer 2.3 rollback

Restore the Layer 2.2 route, Lead Ads receipt loop and Instagram receipt/service files, then remove the shared handoff module/export and restore the Layer 2.2 inventory/evidence files. No database rollback is required.

## Next exact unit

Layer 3.1 — audit and define unified receipt persistence/dedupe against the existing Lead Ads and Instagram storage. Any Prisma schema edit requires a timestamped migration and matching `recovery.sql` in the same change-set.

