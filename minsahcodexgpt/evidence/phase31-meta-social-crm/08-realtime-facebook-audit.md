# Phase 31 Item 6.1 — Realtime Facebook Service Audit

## Status

**AUDIT PASS — MIGRATION REQUIRED.** The Layer 5 package was used as the immutable base. Item 6.1 changed no runtime implementation, Prisma schema or migration. It inventories the existing realtime Facebook/WebSocket ownership and defines the exact migration map for Items 6.2–6.5.

## Authoritative scope

```text
realtime-service/src/facebook/*
realtime-service/src/routes/webhook.router.ts
```

Supporting boundaries were inspected where they determine ownership or consumer compatibility:

```text
realtime-service/src/realtime/*
realtime-service/src/routes/reply.router.ts
realtime-service/src/routes/sync.router.ts
realtime-service/src/app.ts
realtime-service/src/index.ts
hooks/useInboxSocket.ts
app/api/social/messages/route.ts
lib/meta-platform/**
prisma/schema.prisma
realtime-service/prisma/schema.prisma
```

## Executive finding

The realtime service is not a thin bridge. It currently owns a second Facebook runtime: direct Graph reads/writes, local webhook persistence, legacy inbox state, three custom retry queues, dead-letter replay, media download/storage, token refresh/health, and a local WebSocket contract. Layer 5 introduced normalized main-app domain and queue ownership, so both stacks can operate in parallel and produce divergent state.

The migration must therefore be staged. Item 6.2 should normalize events and eliminate duplicate WebSocket delivery first; 6.3 should replace or isolate direct Graph authority; 6.4 should consolidate retry/dead-letter ownership; and 6.5 should align media and token/permission health. No full Layer 6 implementation belongs in this audit item.

## Audited inventory

| ID | Current behavior | Evidence | Risk / mismatch | Destination |
|---|---|---|---|---|
| RT-01 | Nine direct `fetch()` call sites exist in the target Facebook folder: inbox sync, provider media download, token/page discovery and local Graph sends/profile lookup. | `inbox-sync.ts:93`; `media-store.ts:238`; `token-health.ts:31,51,59,75`; `graph.client.ts:95,136,161` | Bypasses shared Graph transport, central timeout/error taxonomy, permission readiness and redaction. | 6.3, 6.5 |
| RT-02 | Local and shared HMAC signature verifiers coexist. | `facebook/signature.ts`; `lib/meta-platform/transports/webhook/signature.ts` | Duplicate security policy and reason-code behavior. | 6.2/6.3 |
| RT-03 | Webhook stores full raw body and payload, returns HTTP 200, then starts an unawaited in-process batch. | `webhook.router.ts:51-66` | Crash after ACK can lose events; stored payload may contain message PII and provider media URLs. | 6.2 |
| RT-04 | Failed webhook replay supports only `incoming_message`. | `webhook.router.ts:194-212` | Receipt and comment failures are not recoverable through the replay queue. | 6.2, 6.4 |
| RT-05 | The realtime service persists `FbConversation`, `FbMessage`, `FbWebhookAudit`, `FbOutboxMessage` and `FbDeadLetterJob`. | `realtime-service/src/db/repository.ts` | Parallel legacy state remains authoritative for realtime paths. | 6.2–6.4 |
| RT-06 | Layer 5 Facebook domain persistence writes normalized `SocialMessage`, while Facebook-specific admin reads still query `FbConversation`/`FbMessage`. | `lib/meta-platform/repositories/facebook-inbox.ts`; `app/api/social/messages/route.ts:295,395,470` | Main-app domain sync and realtime webhook processing can disagree about visible inbox state. | 6.2 |
| RT-07 | Root and realtime Prisma schema copies are not byte-identical. | Root SHA `d3a99c494c73…`; realtime SHA `5b3bea62b445…` | Independent generated clients can drift even when both contain legacy and normalized models. | 6.2, 6.6 |
| RT-08 | Three custom Redis sorted-set loops own replay, media retry and outgoing retry. | `fb:replay:queue`; `fb:media:retry`; `fb:outgoing:retry` | Parallel retry ownership; `ZRANGEBYSCORE` + `ZREM` has no durable lease/ack and can lose work after removal. | 6.4 |
| RT-09 | Retry/dead-letter payloads contain text, names, PSIDs and external URLs; the dead-letter list endpoint returns stored jobs directly. | replay/media/outgoing job types; `sync.router.ts:63-86` | Violates the shared ref-only queue/admin projection policy and expands PII/URL exposure. | 6.4, 6.5 |
| RT-10 | Local `GraphApiError` contains only message/status and outgoing failures are retried locally. | `graph.client.ts:4-12`; `outgoing-retry.ts` | No shared transient/permanent/rate-limit/unknown-write decision; an uncertain provider write may be duplicated. | 6.3, 6.4 |
| RT-11 | `WsInboxEvent` includes message text, sender name, attachment URL and error fields, with no schema version, event ID or correlation identity. | `facebook/types.ts:86-167` | Unsafe broad payload, no contract negotiation, dedupe or ordering key. | 6.2 |
| RT-12 | A publish invokes local listeners and also publishes to Redis; the same server registers a local listener and subscribes to that channel. | `realtime/pubsub.ts:13-24`; `realtime/ws-server.ts:37-40,140-156` | Same-process events can be broadcast twice. | 6.2 |
| RT-13 | WebSocket client messages and Redis events are parsed with TypeScript casts only. | `ws-server.ts:66-69,146-149` | No runtime schema validation or safe rejection reason. | 6.2 |
| RT-14 | WS token is passed in the query string; token role is verified structurally but not authorized per operation/resource. | `ws-server.ts:45-49`; `ws-auth.ts`; `hooks/useInboxSocket.ts:107` | Query logging leakage and over-broad `mark_read` authorization. | 6.2, 6.5 |
| RT-15 | Heartbeat sends application-level `pong`; no native ping/pong stale-client termination. Client reconnect is fixed-delay and has no cursor/gap recovery. | `ws-server.ts:126-133`; `hooks/useInboxSocket.ts` | Zombie sockets, synchronized reconnect pressure, and missed events after disconnect. | 6.2 |
| RT-16 | Incoming external media URL is persisted/published before storage retry; retry later updates the DB URL without a replacement WebSocket event. | `inbox-processor.ts`; `media-retry.ts:133-136` | Clients can retain stale provider URLs; media state is not normalized. | 6.2, 6.5 |
| RT-17 | Media is downloaded by direct fetch and `/media/facebook` is exposed as unauthenticated static content. | `media-store.ts:238`; `app.ts:45-52` | Shared validation/quarantine/signed-delivery policy is bypassed. | 6.5 |
| RT-18 | System-user token discovery includes access tokens in URL query parameters; health is local/in-memory and page-ID oriented. | `token-health.ts:51-76` | Token leakage surface and no shared permission/data-access/revocation state. | 6.3, 6.5 |
| RT-19 | Realtime inbox polling starts at service startup independently of the Layer 5 main-app queue/domain sync. | `index.ts:41`; `inbox-sync.ts:496+` | Parallel provider reads, locks and persistence ownership. | 6.3 |
| RT-20 | Internal reply/sync/dead-letter routes share one static `x-api-secret`; metrics and static media are unauthenticated. | `reply.router.ts:39-42`; `sync.router.ts:16-18`; `app.ts:45-52,68-92` | Coarse authentication, no operation permission or actor-scoped authorization; operational disclosure. | 6.4, 6.5 |
| RT-21 | Post comments are published but not persisted; direct comment reply has no outbox/unknown-write reconciliation path. | `webhook.router.ts:182-191`; `reply.router.ts:149-164` | Comments can disappear from durable state and reply duplication cannot be reconciled. | 6.2–6.4 |
| RT-22 | Delivery/read receipts locate the latest outgoing message before a watermark. | `webhook.router.ts:148-178` | Ambiguous receipt association under concurrent sends; no normalized provider receipt identity. | 6.2 |

## Ownership map

| Concern | Current realtime owner | Shared/main-app owner already present | Required authority after Layer 6 |
|---|---|---|---|
| Webhook validation | Local boolean signature helper | Shared webhook signature transport | Shared verifier/reason codes; realtime consumes durable normalized handoff |
| Inbox persistence | Legacy `Fb*` repository | Facebook domain repository → `SocialMessage` | Main app/domain persistence authoritative; realtime receives IDs/status only |
| Provider transport | Local `graph.client.ts`, inbox sync and token/media fetch | Shared Graph HTTP transport and connection readiness | Shared platform transport; local client removed or rollback-isolated |
| Retry/dead-letter | Three Redis ZSET loops + `FbDeadLetterJob` | BullMQ social envelopes and reliability policy | Single shared job-state/reconciliation authority |
| Media | Realtime direct fetch/storage/static serving | Shared attachment policy/validation pipeline | Shared media state; safe signed/admin projection |
| Token health | Local in-memory refresh/health loop | Shared account/page connection and permission readiness | Main app authoritative safe health projection |
| Realtime delivery | `fb:inbox:events` + local listener + Redis | Normalized `social-updates` channel/contracts | One normalized event bridge with runtime validation/dedupe/cursor |

## Exact migration map

### Item 6.2 — Realtime normalized event bridge

1. Define one versioned normalized realtime envelope with `schemaVersion`, `eventId`, `correlationId`, `platform`, `eventType`, `occurredAt`, `conversationId`, `messageId`, `receiptId`, `providerEventKey` and ordering metadata.
2. Publish only after the main-app/domain persistence transaction has committed. Payloads should carry stable IDs and safe state codes—not message text, names, tokens, raw payloads or external/signed URLs.
3. Make realtime consume the normalized `social-updates` channel (or a dedicated versioned channel) with runtime validation. Remove the simultaneous local-listener + self-Redis duplicate path.
4. Project a minimal WebSocket DTO. Client fetches message/conversation detail through authenticated APIs using IDs.
5. Add event-ID dedupe, per-conversation ordering protection, stale/out-of-order markers, reconnect cursor/gap recovery and exponential backoff with jitter.
6. Move `mark_read` through an authorized main-app command/domain boundary; include actor identity and correlation ID.
7. Normalize delivery/read/comment events and persist their receipt/comment state before publishing.
8. Preserve legacy WebSocket payloads only behind an explicit rollback flag during cutover.

### Item 6.3 — Realtime Graph client replacement or isolation

1. Route message send, comment reply, profile lookup and inbox sync through the shared Graph transport/domain boundary.
2. Centralize provider error taxonomy, timeout, redaction, retry-after, permission readiness and unknown-write classification.
3. Stop the realtime polling scheduler by default once main-app sync is authoritative.
4. Remove token-in-query usage. Realtime must not own refresh tokens or token exchange.
5. Retain `graph.client.ts` only behind a named, default-off rollback feature flag with an audit that blocks accidental production authority.

### Item 6.4 — Realtime retry/dead-letter alignment

1. Replace the three ZSET queues with shared BullMQ jobs using ref-only social envelopes.
2. Map legacy replay/media/outgoing state to shared receipt/job IDs; do not embed text, names, PSIDs or URLs.
3. Use one retry decision policy for transient/rate-limit/permanent/unknown-write outcomes.
4. Send unknown writes to reconciliation rather than blind resend.
5. Expose safe dead-letter projections and actor-authorized replay commands; retain raw diagnostic data only in protected storage.
6. Add durable claim/ack semantics, idempotency, process-kill recovery and a guard proving no parallel retry loops remain.

### Item 6.5 — Realtime media and token-health alignment

1. Adopt shared attachment validation/quarantine/status and use media IDs/status in events.
2. Eliminate unauthenticated permanent static media delivery; use authenticated or short-lived signed delivery.
3. Publish a media-state update after validation/storage so clients do not retain stale provider URLs.
4. Consume safe page/account permission and token-health projections from main app; fail closed on revoked/insufficient permission state.
5. Protect operational metrics and redact account/token/provider details.

### Item 6.6 — Independent build and evidence gate

Execute realtime dependency installation/typecheck/build plus contract, duplicate-event, retry/dead-letter and fallback tests. Live Redis/BullMQ/WebSocket/Meta/ClamAV/MinIO claims are allowed only when those environments are actually exercised and evidence is retained.

## Cutover order

```text
6.2 normalized envelope + dual-read compatibility
→ switch WebSocket consumers to normalized safe events
→ 6.3 make shared Graph/domain path authoritative; isolate legacy transport
→ 6.4 migrate retry/dead-letter and disable ZSET workers
→ 6.5 migrate media/token health and protect operational surfaces
→ 6.6 independent build, tests, fallback and evidence gate
```

## Schema and migration decision

```text
Prisma schema change: NONE
New migration: NONE
Root Prisma SHA-256: d3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce
Realtime Prisma SHA-256: 5b3bea62b4452f727dc0806701e17efab1391f3f9653170f8ae3fa38d1b76b6c
```

The differing schema hashes are an audit finding, not a schema change introduced by Item 6.1.

## Executed evidence

```text
npm run qa:phase31-meta-layer6.1
npm run ai:refresh-context
npm run qa:second-brain
```

Focused audit output: `evidence/phase31-meta-social-crm/logs/phase31_layer6.1_audit.log`.

Second Brain output: `evidence/phase31-meta-social-crm/logs/phase31_layer6.1_second_brain.log`.

## Non-claims

Item 6.1 did not execute or claim a realtime TypeScript build, production build, live PostgreSQL, Redis/BullMQ, WebSocket network session, Meta provider call, ClamAV scan or MinIO flow. No Layer 6 ZIP was created.

## Exact next item

```text
6.2 — Realtime normalized event bridge
```
