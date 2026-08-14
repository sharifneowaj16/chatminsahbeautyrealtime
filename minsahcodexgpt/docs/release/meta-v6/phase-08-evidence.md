# Meta v6 Phase 8 Evidence — Lead Ads Webhook, Retrieval & CRM

Date: 17 July 2026  
State: `READY_FOR_RUNTIME_QA`  
Branch label: `artifact/meta-v6-phase-08`

## Scope delivered

Phase 8 now provides a canonical, durable Lead Ads pipeline:

```text
Meta Page leadgen notification
→ GET challenge / POST HMAC verification
→ bounded payload and Page/form ownership validation
→ encrypted database webhook receipt
→ durable BullMQ lead job
→ Graph lead retrieval
→ freshness and failure classification
→ normalized CRM record
→ leadgen/phone/email deduplication
→ capacity-aware assignment
→ contact / qualification / conversion lifecycle
→ SLA, recovery and retention jobs
```

## Main implementation

- Canonical webhook endpoint at `app/api/webhooks/meta/route.ts`.
- Compatibility re-export at `app/api/webhooks/meta/leadgen/route.ts`.
- Timing-safe `X-Hub-Signature-256` HMAC verification and GET challenge verification.
- 256 KB payload ceiling, expected Page object/change validation, Page ownership and form allowlist.
- Database-first `MetaWebhookReceipt` persistence before Redis enqueue.
- AES-256-GCM encrypted webhook and retrieved lead payloads.
- Dedicated production encryption key contract through `META_LEAD_DATA_KEY`.
- Secret-free and PII-free lead queue payloads carrying durable receipt IDs.
- Graph retrieval for lead, campaign, ad set, ad, form and source attribution fields.
- Explicit retryable, token, not-found and permanent retrieval states.
- Bangladesh phone normalization, email normalization, identity hashing and masked operational fields.
- Deterministic deduplication priority: `leadgenId → phone hash → email hash`.
- Assignment rules for campaign, form, city, area and product interest.
- Agent capacity and round-robin assignment.
- Typed CRM lifecycle with explicit order requirement for conversion.
- Contact attempt history, webhook failure view and Lead CRM admin page.
- Five-minute receipt recovery, five-minute SLA scan and daily retention cleanup.
- Raw phone/email and custom-field values remain inside encrypted provider payloads; normalized database metadata does not duplicate those raw values.

## Schema and migration

Migration:

```text
prisma/migrations/20260717060000_meta_v6_phase8_lead_crm/migration.sql
```

Added typed enums:

- `MetaLeadStatus`
- `MetaLeadRetrievalStatus`
- `MetaWebhookProcessingStatus`
- `MetaLeadDuplicateReason`
- `MetaLeadContactChannel`

Added/expanded models:

- `MetaWebhookReceipt`
- `MetaLead`
- `MetaLeadDuplicate`
- `MetaLeadContactAttempt`
- `MetaLeadAssignmentRule`
- `MetaLeadAgentProfile`

The migration preserves existing `MetaLead` rows, converts legacy status values conservatively, removes legacy raw JSON PII instead of pretending it is encrypted, and adds forward-only indexes and foreign keys.

## Main changed files

```text
app/api/webhooks/meta/route.ts
app/api/webhooks/meta/leadgen/route.ts
app/api/admin/meta/leads/route.ts
app/api/admin/meta/leads/[leadId]/route.ts
app/api/admin/meta/webhooks/leads/route.ts
app/admin/meta-business/leads/page.tsx
lib/meta/leads/*
lib/meta-business/leads.ts
lib/jobs/job-types.ts
lib/jobs/idempotency.ts
lib/jobs/queues.ts
lib/jobs/scheduler.ts
workers/meta-lead.worker.ts
lib/privacy/retention-worker.ts
prisma/schema.prisma
prisma/migrations/20260717060000_meta_v6_phase8_lead_crm/migration.sql
scripts/meta-v6-phase8-leads-audit.mjs
tests/meta-v6/phase8-lead-ads-crm.test.ts
config/meta-v6-phase-manifest.json
docs/release/meta-v6/phase-dashboard.json
```

Phase 8 integration also fixed explicit generic method typing in `lib/meta/connection/client.ts` for the pinned TypeScript compiler and updated stale Phase 5 regression assertions to recognize the canonical webhook route and required receipt ID.

## Automated evidence

```text
Phase 1 tests/audit             4/4 + 9/9 passed
Phase 2 tests/audit             8/8 + 20/20 passed
Phase 3 tests/audit             9/9 + 20/20 passed
Phase 4 tests/audit            11/11 + 27/27 passed
Phase 5 tests/audit            11/11 + 43/43 passed
Phase 6 tests/audit            12/12 + 45/45 passed
Phase 7 tests/audit            11/11 + 50/50 passed
Graph version policy                    16/16 passed
Phase 8 tests/audit            14/14 + 68/68 passed
Meta Business platform                   22/22 passed
Catalog semantic                         23/23 passed
Repository tests                         16/16 passed
Full TypeScript compiler                  passed
Targeted ESLint                  0 errors / 0 warnings
Changed-entry syntax integration          29/29 passed
Global v6 blocker audit                   12/14 passed
```

Resolved Phase 8 implementation requirements include typed lead/webhook lifecycle states. Global A13 remains open because the aggregate blocker also requires the future Phase 13 approval enum. A14 remains Phase 10 Catalog Diagnostics scope.

## Security and privacy evidence

- Invalid or malformed webhook signatures are rejected before business processing.
- Signature comparison is timing-safe.
- Replayed notifications converge through a deterministic event key and unique database constraint.
- Valid notifications are persisted before queue enqueue, so a Redis outage does not require Meta to resend.
- Raw webhook and lead Graph payloads are encrypted with authenticated encryption.
- Production fails closed without a dedicated lead encryption key.
- Queue payload validation rejects access tokens, app secrets, email, phone, raw fields and normalized raw-data objects.
- Safe admin queries select masked phone/email and exclude encrypted/raw payload columns.
- Operational error objects are bounded and redact token-shaped values.
- Retention timestamps and cleanup workers exist for receipts and lead data.

## Build, generation and migration hold

A clean offline dependency installation completed successfully and full TypeScript/targeted ESLint passed. Prisma validation and generation could not complete because the schema engine host was not resolvable from this environment:

```text
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

The production build correctly stopped at its freshness guard:

```text
Generated Prisma client is stale for prisma/schema.prisma.
Run `npm run db:generate` and commit the refreshed generated/prisma snapshot.
```

This is retained as a release hold and was not bypassed.

## Runtime evidence required before `COMPLETE`

1. Generate and commit the Prisma client from the Phase 8 schema.
2. Apply the Phase 8 migration to a disposable PostgreSQL database and capture row/backfill/index evidence.
3. Configure the Page token, verify token, Page ID, allowed form IDs and dedicated encryption key from the production secret manager.
4. Create a Meta Test Lead and capture notification, receipt, retrieval, dedupe, assignment and CRM lifecycle evidence.
5. Test invalid signature, duplicate delivery, missing/deleted lead and token failure against the deployed endpoint.
6. Stop Redis, accept a signed notification, restore Redis and prove recovery enqueue/process behavior.
7. Capture SLA alert and retention cleanup executions with secret-free logs.
8. Approve retention duration and encryption-key rotation/recovery runbooks.
9. Regenerate Prisma, then run the production build.

Recommended release commands:

```bash
npm ci
npm run db:generate
npx prisma validate
npx prisma migrate deploy
npm run typecheck:ts
npm run lint
npm run qa:meta-v6-phase8
npm run qa:meta-business-platform
npm run qa:meta-v6-gap
npm test
npm run build
```

## Operational handoff

Worker:

```bash
npm run worker:meta-lead
npm run worker:meta-scheduler
```

Admin surfaces:

```text
GET/PATCH /api/admin/meta/leads/[leadId]
GET/POST  /api/admin/meta/leads
GET       /api/admin/meta/webhooks/leads
/admin/meta-business/leads
```

Required environment contract:

```text
META_WEBHOOK_VERIFY_TOKEN
META_PAGE_ACCESS_TOKEN
META_PAGE_ID
META_LEAD_ALLOWED_FORM_IDS
META_LEAD_DATA_KEY
META_LEAD_RETENTION_DAYS
META_LEAD_RAW_RETENTION_DAYS
META_LEAD_RESPONSE_SLA_MINUTES
```

## Rollback / forward-fix

- Prefer a forward corrective migration; do not silently cast new enum values back to unrestricted strings.
- Stop `meta-leads` workers during an incident without deleting webhook receipts.
- Keep receipts and encrypted payloads until the approved retention deadline so recovery is possible.
- Rotate a compromised Page token or encryption key through the secret manager, never through queue/admin payloads.
- Preserve duplicate/contact/assignment audit rows during corrective work.
- Do not mark provider submission as final success; use receipt and CRM final states.

## Acceptance criteria

- [x] GET verification and signed POST verification implemented.
- [x] Invalid signature rejected.
- [x] Receipt persisted before enqueue and fast acknowledgement returned.
- [x] Duplicate notification/lead constraints implemented.
- [x] Full attribution field retrieval implemented.
- [x] Phone/email normalization and deterministic dedupe implemented.
- [x] Assignment, capacity, contact history and conversion lifecycle implemented.
- [x] Raw lead payload encryption, masked admin output and retention implemented.
- [x] Recovery, SLA and retention workers implemented.
- [x] Phase 1–8 code regression gates, TypeScript, targeted ESLint and repository tests pass.
- [ ] Prisma client generated and migration applied in a disposable database.
- [ ] Live Meta Test Lead end-to-end evidence attached.
- [ ] Live Redis recovery/SLA/retention evidence attached.
- [ ] Production build passes after generated-client refresh.
