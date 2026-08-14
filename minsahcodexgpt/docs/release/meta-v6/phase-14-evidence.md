# Meta v6 Phase 14 Evidence — Instagram Messaging & Social CRM Expansion

Date: 18 July 2026  
State: `READY_FOR_GENERATION`  
Branch label: `artifact/meta-v6-phase-14`

## Scope delivered

Phase 14 now provides a fail-closed social CRM chain:

```text
Instagram signed webhook
→ raw-body HMAC verification before parsing
→ normalized receipt with stable event/message IDs
→ receipt-only durable queue job
→ atomic processing claim and dedupe
→ normalized conversation/message/attachment persistence
→ account, permission and reply-window policy evaluation
→ audited standard/private reply execution
→ explicit verified customer/lead/product/order links
→ retention cleanup, incidents and low-cardinality metrics
```

Unsupported events are ignored, duplicate platform IDs are idempotent, and raw provider webhook payloads are not retained by the canonical route.

## Persistence and migration

Migration:

```text
prisma/migrations/20260718060000_meta_v6_phase14_instagram_social_crm/migration.sql
```

Added typed lifecycle enums:

- `MetaInstagramWebhookStatus`
- `MetaInstagramConversationStatus`
- `MetaInstagramMessageDirection`
- `MetaInstagramMessageType`
- `MetaInstagramMessageStatus`
- `MetaInstagramAttachmentStatus`
- `MetaInstagramLinkType`
- `MetaInstagramReplyEligibility`

Added models:

- `MetaInstagramWebhookReceipt`
- `MetaConversation`
- `MetaMessage`
- `MetaMessageAttachment`
- `MetaConversationLink`
- `MetaInstagramReplyAttempt`

Stable provider message IDs, receipt event keys and reply idempotency keys are unique. Conversation/message retention deadlines are persisted. New incident types cover Instagram permission, webhook and reply failures.

## Signed webhook and dedupe contract

`app/api/webhooks/meta/instagram/route.ts` and `lib/meta/instagram/verify.ts`:

- support constant-time verification challenge comparison;
- cap POST bodies at 1 MiB;
- verify `X-Hub-Signature-256` over the exact raw request body before JSON parsing;
- return `401` on invalid signatures and `413` on oversized payloads;
- normalize supported messaging and comment events;
- preserve provider account, participant, message, comment and conversation identifiers;
- compute stable event keys and deduplicate before durable processing;
- persist normalized receipts before queue enqueue;
- never put raw payload or PII into the queue job.

## Conversation, message and attachment contract

`lib/meta/instagram/messages.ts` and related modules:

- atomically claim a pending receipt before processing;
- reject or ignore account ownership mismatches;
- upsert conversations and messages idempotently;
- distinguish inbound, outbound and echo traffic;
- retain text and normalized metadata only within the configured retention boundary;
- accept HTTPS attachment URLs only;
- reject credential-bearing URLs, unsupported MIME types and content over 25 MiB;
- store accepted media under a private Meta Instagram object path;
- enrich profiles through a server-side provider token where available;
- create redacted incidents and metrics for failed ingestion or attachment handling.

A production malware-scanning adapter and signed media-delivery runtime proof remain release holds.

## Reply policy and immutable audit

The reply service evaluates policy before contacting the provider:

- owned account required;
- supported Instagram messaging permission required;
- archived or spam conversations cannot be replied to;
- standard replies require an active 24-hour conversation window;
- comment private replies require an eligible deadline and are one-shot;
- reply text and idempotency keys are bounded;
- every blocked, successful or failed attempt is persisted in `MetaInstagramReplyAttempt`;
- provider failures and admin audit evidence are recursively redacted;
- successful sends persist the provider message ID and update the normalized conversation.

Admin reply mutation is permission-scoped and wrapped by the immutable Meta admin action audit service.

## Social CRM linking

`lib/meta/instagram/conversations.ts` supports explicit links to:

- `User`
- `MetaLead`
- `Product`
- `Order`

Every target must exist. Link creation requires an explicit verification method; unsafe fuzzy identity matching is absent. Link and unlink actions are permission-separated and immutable-audited.

## Queue, worker and retention

A dedicated queue and worker were added:

```text
queue: meta-instagram
jobs: instagram_message, instagram_retention
worker: workers/meta-instagram.worker.ts
message payload: receiptId only
retention schedule: daily
```

The worker processes durable receipts and retention cleanup. Runtime Redis, MinIO and repeated cleanup evidence must still be attached in a production-like environment.

## Admin Operations Center

`/admin/meta/instagram` now includes:

- permission-aware conversation list and detail views;
- assignment, status, tags and subject controls;
- normalized message and attachment context;
- verified CRM links;
- policy-aware standard/private reply controls;
- account/permission health;
- immutable mutation/audit integration.

The main `/admin/meta` Operations Center includes an Instagram CRM entry.

## Environment contract

Documented production settings now include:

```text
META_INSTAGRAM_ACTOR_ID
META_INSTAGRAM_ACCESS_TOKEN
META_INSTAGRAM_RETENTION_DAYS=180
META_REQUIRED_PERMISSIONS=...,instagram_basic,instagram_manage_messages
```

The access token is server-only. Retention is integer-validated and bounded by the application to 7–730 days.

## Automated evidence

```text
Phase 14 semantic tests                    22/22 passed
Phase 14 static audit                      81/81 passed
Global Meta v6 strict blocker gate          14/14 passed
Admin API security scan                 97 routes passed
Meta Business platform audit               22/22 passed
Phase 13 regression                  15/15 + 56/56 passed
Phase 12 regression                  14/14 + 51/51 passed
Phase 11 regression                  13/13 + 41/41 passed
Phase 10 regression                  12/12 + 40/40 passed
Phase 09 regression                  11/11 + 30/30 passed
Phase 08 regression                  14/14 + 68/68 passed
Repository npm test                         16/16 passed
Direct TypeScript compiler                       passed
Targeted ESLint                    0 errors / 0 warnings
```

Full validation logs:

- `docs/release/meta-v6/phase-14-validation.log`
- `docs/release/meta-v6/phase-14-prisma-validation.log`
- `docs/release/meta-v6/phase-14-master-tracking.log`
- `docs/release/meta-v6/phase-14-changed-files.txt`

## Master tracking gate status

`qa:master-tracking` remains **66 passed / 8 failed**. These are inherited historical documentation/runtime-proof checks for tracking lifecycle, product URL reporting, production QA, deploy-runtime health and TikTok documentation. They are not caused by the Phase 14 Instagram implementation and are not represented as passing.

## Generation and migration hold

Both `npx prisma validate` and `npm run db:generate` were attempted. They failed before schema-engine validation because the environment could not resolve the Prisma binary host:

```text
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

The generated-client freshness guard was not bypassed. Direct TypeScript validation passes, but release generation and database migration proof remain outstanding.

Before deployment:

```bash
npm ci
npm run db:generate
npx prisma validate
npx prisma migrate deploy
npm run qa:meta-v6-phase14
npm run qa:admin-api-security
npm run qa:meta-business-platform
npm run qa:meta-v6-gate
npm run typecheck:ts
npm test
npm run build
```

## Changed file groups

New implementation groups:

- `app/api/webhooks/meta/instagram/`
- `app/api/admin/meta/instagram/`
- `app/admin/meta/instagram/`
- `lib/meta/instagram/`
- `workers/meta-instagram.worker.ts`
- `prisma/migrations/20260718060000_meta_v6_phase14_instagram_social_crm/`
- `tests/meta-v6/phase14-instagram-social-crm.test.ts`
- `scripts/meta-v6-phase14-instagram-audit.mjs`

Updated shared contracts:

- `prisma/schema.prisma`
- `lib/jobs/{job-types,queues,worker,scheduler,idempotency}.ts`
- `lib/auth/admin-permissions.ts`
- `lib/meta/admin/policy.ts`
- `lib/meta/connection/config.ts`
- `lib/observability/{incidents,metrics}.ts`
- `app/admin/meta/page.tsx`
- `.env.example`
- `config/env.manifest.json`
- `package.json`

## Remaining evidence

1. Generate Prisma Client and apply/rollback the migration in disposable PostgreSQL.
2. Complete Meta App Review and attach owned Instagram Professional account/permission health evidence.
3. Attach live signed webhook evidence for text, media, duplicate and account-mismatch cases.
4. Prove a standard reply inside the permitted window and a blocked reply outside it.
5. Prove a one-shot comment private reply and provider message-ID persistence.
6. Run Redis worker, MinIO media storage, malware scanning and retention cleanup repeatedly in a production-like environment.
7. Attach explicit customer/lead/product/order link and unlink audit rows.
8. Resolve the eight inherited master-tracking documentation/runtime-proof failures.

## Acceptance criteria status

- [x] Signed webhook ingestion and stable deduplication are implemented and tested.
- [x] Conversations, messages, attachments and reply attempts have typed persistence.
- [x] Account ownership and messaging permission checks fail closed.
- [x] Standard/private reply policy and one-shot private reply controls are implemented and tested.
- [x] Queue jobs contain receipt IDs only and exclude raw payload/PII.
- [x] Customer/lead/product/order linking is explicit, verified and audited.
- [x] Admin inbox, assignment, tags, reply status and CRM links are implemented.
- [x] Retention cleanup, incidents and metrics are implemented.
- [ ] Prisma generation and disposable-database migration evidence attached.
- [ ] Live Instagram App Review/account/webhook/reply evidence attached.
- [ ] Production worker, private media, malware scan and retention runtime evidence attached.
