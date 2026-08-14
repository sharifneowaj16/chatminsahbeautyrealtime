# Phase 31 Meta Social CRM — Layer 2 webhook transport evidence

## Layer 2.1 — Shared raw-body, signature and challenge request boundary

**Status:** PASS for dependency-independent source and route-cutover scope.

Implemented:

- Added `lib/meta-platform/transports/webhook/route-handler.ts` as the shared Next-compatible but framework-independent request boundary.
- Extracts canonical `hub.mode`, `hub.verify_token` and `hub.challenge` query values before delegating to the timing-safe challenge verifier.
- Rejects malformed or oversized declared `Content-Length` before consuming the body.
- Enforces the actual UTF-8 body byte limit after reading when the declared length is absent or smaller.
- Computes a non-secret SHA-256 payload digest and verifies `X-Hub-Signature-256` against the exact raw body before JSON/domain parsing.
- Returns bounded transport failures for invalid content length, oversized body, body-read failure, missing/invalid signature and missing app-secret configuration.
- Cut `app/api/webhooks/meta/route.ts` and `app/api/webhooks/meta/instagram/route.ts` over to the same request boundary.
- Preserved existing Lead Ads receipt/queue behavior and Instagram receipt/queue behavior; no persistence, job or domain migration was performed in this unit.
- Kept moved legacy Facebook/social routes as non-processing tombstones.
- Updated the inherited Phase 14 audit to validate the centralized transport rather than require duplicated local HMAC code.

## Failure and rollback behavior

- Invalid signatures are rejected before JSON parsing or receipt/domain work.
- Oversized declared payloads are rejected without reading the request body.
- Missing app-secret configuration returns a service-unavailable transport result rather than accepting or misclassifying the request.
- Rollback is restoring the Layer 1.9 route files and removing the new shared route helper/export; no database rollback is required.

## Verification

```text
Phase 31 webhook runtime tests: 10/10 PASS
Phase 31 webhook transport audit: 17/17 PASS
Phase 31 Layer 1 runtime regression: 35/35 PASS
Phase 31 Layer 1 contract/policy audit: 72/72 PASS
Phase 24 Graph/webhook/media static regression: 74/74 PASS
Phase 14 Instagram static regression: 81/81 PASS
Meta source inventory: 47/47 PASS (483 active paths)
Phase 19 source inventory tests: PASS
Migration governance: 397/397 PASS
Prisma schema/migration pair audit: PASS
Focused shared transport TypeScript: PASS
Changed-file syntax: PASS
```

The exact dependency-backed Phase 24 TypeScript runtime command remains unavailable because the archive has no installed `tsx` package after the npm registry blocker. Its static transport regression passes 74/74; this unit's dependency-independent request-boundary runtime suite passes 10/10.

## Database impact

No Prisma schema, migration or generated Prisma file changed.

```text
schema SHA-256: 0dca14d4966868c434f43db8a64ab377cc3dbf8a6ce98be2bbb8cf84ee991ef0
migration tree digest: 005582153729f4e81003c94282df1f9592329c7b763d7dcc51eb3d1eb5119264
generated Prisma tree digest: dab7ec0b923e675fd0555cb4a33af460f736ed548a22d3c99c206b561c4d85bf
```

All three values match the Layer 1.9 input archive.

## Layer 2.2 — Shared envelope normalization and object/event routing

**Status:** PASS for dependency-independent source and active-route normalization scope.

Implemented:

- Added bounded shared Meta webhook envelope parsing in `lib/meta-platform/transports/webhook/parser.ts`.
- Requires a canonical object name, bounded entry arrays and bounded `changes`, `messaging` and `standby` event groups; malformed groups and entry/event/total limit breaches fail closed instead of truncating.
- Normalizes object names and change fields to lower case, provider timestamps to ISO-8601 and every event to the versioned `MetaNormalizedWebhookEvent` contract.
- Binds parsing to the SHA-256 digest produced by the verified raw-body transport boundary; a mismatched expected digest is rejected.
- Added `lib/meta-platform/transports/webhook/routing.ts` with deterministic routing to `LEAD_ADS`, `INSTAGRAM`, `FACEBOOK_PAGE` or `UNSUPPORTED`, plus normalized event kinds for leadgen, message, comment, change, standby and unknown events.
- Added selection helpers so route/domain adapters consume routing decisions rather than inspect raw provider object/entry/change/message shapes.
- Cut the active Lead Ads route over to shared parsing and a normalized Lead Ads compatibility adapter while preserving its existing ownership/form validation, stable domain key, receipt and queue behavior.
- Cut the active Instagram route over to shared parsing and a normalized Instagram compatibility adapter; missing provider timestamps are no longer replaced with processing time.
- Preserved current receipt persistence and queue/domain behavior; no database receipt model or job topology changed in this unit.

### Layer 2.2 failure and rollback behavior

- Malformed JSON/envelopes, unsupported structure, invalid event groups, excessive entries/events and payload-digest mismatches are rejected before receipt/domain work.
- Unsupported Meta objects are normalized and explicitly routed to `UNSUPPORTED`; they are not silently treated as Lead Ads or Instagram events.
- Compatibility adapters ignore events outside their assigned routing target and supported event kinds.
- Rollback is restoring the Layer 2.1 parser, route and domain adapter files and removing `routing.ts`/its exports; no database rollback is required.

### Layer 2.2 verification

```text
Phase 31 webhook runtime tests: 18/18 PASS
Phase 31 webhook transport audit: 27/27 PASS
Phase 31 Layer 1 runtime regression: 35/35 PASS
Phase 31 Layer 1 contract/policy audit: 72/72 PASS
Phase 24 Graph/webhook/media static regression: 74/74 PASS
Phase 14 Instagram static regression: 81/81 PASS
Meta source inventory: 47/47 PASS (484 active paths)
Phase 19 source inventory tests: 4/4 PASS
Migration governance: 397/397 PASS
Prisma schema/migration pair audit: PASS
Focused shared webhook TypeScript: PASS
Changed-file syntax: PASS
```

The exact dependency-backed application typecheck, lint, build and `tsx` runtime suites remain unavailable because the archive has no installed dependencies after the npm registry `503` blocker. Layer 2.2's dependency-independent runtime and strict focused TypeScript gates pass.

## Layer 2.2 database impact

No Prisma schema, migration or generated Prisma file changed. The schema, migration-tree and generated-client digests match the Layer 2.1 input archive.

## Deferred work

Layer 2.3 must provide one normalized receipt handoff and consistent accepted/rejected/duplicate response contract without bypassing the stored-receipt, dedupe and queue controls. Database-level receipt/dedupe unification remains Layer 3 and requires a timestamped migration plus `recovery.sql` if `prisma/schema.prisma` changes.

## Layer 2.3 — Unified normalized receipt handoff and webhook responses

**Status:** PASS for dependency-independent source, active-route handoff and duplicate-safety scope.

Implemented:

- Added `lib/meta-platform/transports/webhook/handoff.ts` as the shared normalized receipt-first handoff boundary.
- Added one bounded disposition/result vocabulary: `ACCEPTED`, `DUPLICATE`, `DEFERRED`, `REJECTED` and `IGNORED`, with canonical aggregate counts and `MIXED` support.
- Enforced a maximum of 1,000 handoff items and fail-closed runtime validation for event keys, receipt IDs, correlation IDs, result codes, counts and extra fields.
- Detects repeated normalized event keys inside the same provider delivery before invoking a domain receiver a second time; repeats are reported as `DUPLICATE_IN_DELIVERY`.
- Added one response body for accepted, duplicate, deferred, rejected and ignored outcomes across active Meta webhook routes.
- Preserved provider retry semantics: inability to create/read a durable receipt returns `503`; queue failure after a durable receipt returns a `200` handoff acknowledgment with `DEFERRED`, because the stored receipt can be retried internally.
- Moved Lead Ads receipt/queue iteration from the route into `lib/meta/leads/handoff.ts`; signed rejected Lead Ads events now return the real durable receipt identity even on conflict.
- Made Instagram webhook receipts immutable on duplicate delivery: an existing `QUEUED`, `PROCESSING`, `PROCESSED` or `IGNORED` receipt is no longer reset to `VERIFIED` or re-enqueued.
- Moved Instagram event handoff to the shared boundary while retaining its existing receipt table, queue and worker/domain contracts.
- Updated the inherited Phase 14 audit to recognize centralized delivery dedupe rather than require adapter-local `Map` dedupe.

### Layer 2.3 response behavior

```text
Bad transport signature/body/envelope     -> bounded 4xx response
Receipt store unavailable                 -> 503, provider may retry
Durable receipt + queued                   -> 200 ACCEPTED
Durable receipt already terminal/queued    -> 200 DUPLICATE
Durable receipt + queue handoff failed     -> 200 DEFERRED
Unsupported/irrelevant normalized event    -> 200 IGNORED
Signed event rejected by domain validation -> 200 REJECTED after durable receipt
```

### Layer 2.3 rollback behavior

Rollback restores the Layer 2.2 route, Lead Ads receipt loop and Instagram service/receipt behavior, and removes the shared handoff module/export. No database rollback is required because no Prisma model or migration changed.

### Layer 2.3 verification

```text
Phase 31 webhook runtime tests: 26/26 PASS
Phase 31 Layer 2 transport/handoff audit: 37/37 PASS
Phase 31 Layer 1 runtime regression: 35/35 PASS
Phase 31 Layer 1 contract/policy audit: 72/72 PASS
Phase 24 Graph/webhook/media static regression: 74/74 PASS
Phase 14 Instagram static regression: 81/81 PASS
Meta source inventory: 47/47 PASS (486 active paths)
Phase 19 source inventory tests: 4/4 PASS
Migration governance: 397/397 PASS
Prisma schema/migration pair audit: PASS
Focused shared-handoff TypeScript: PASS
Changed-source syntax: PASS
```

The exact dependency-backed application typecheck, lint, production build and `tsx` suites remain unavailable because the archive has no installed dependencies after the npm registry `503` blocker. The dependency-independent runtime, static, syntax and focused TypeScript gates above pass.

## Layer 2.3 database impact

No Prisma schema, migration or generated Prisma file changed. Comparison with the Layer 2.2 input archive is byte-for-byte identical:

```text
schema SHA-256: 0dca14d4966868c434f43db8a64ab377cc3dbf8a6ce98be2bbb8cf84ee991ef0
migration tree digest: 69d30f23fbebac1bb65cc1342f1709fa0598b5fba0be7e3fa08b88e5934ecad6
generated Prisma tree digest: 015541692990a62b5a5711a25080ff4411db6c85153da663ce1caf7e36db5629
```

## Next exact unit

Layer 3.1 — audit and define the unified receipt persistence/dedupe model against the existing Lead Ads and Instagram tables. Any `prisma/schema.prisma` change must ship in the same unit with timestamped `migration.sql` and `recovery.sql`.

