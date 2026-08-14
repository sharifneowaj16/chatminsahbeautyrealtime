# Meta v6 Phase 10 Evidence — Observability, Diagnostics & Alerting

Date: 18 July 2026  
State: `PARTIAL`  
Branch label: `artifact/meta-v6-phase-10`

## Scope delivered

Phase 10 now has an end-to-end observability and diagnostics foundation:

```text
Admin / API / webhook / commerce event
→ safe correlation ID
→ durable outbox or BullMQ job audit
→ Meta catalog batch / lead receipt / CAPI event
→ Catalog Diagnostics import
→ persisted item-level diagnostic
→ deduplicated incident with cooldown
→ protected health, metrics and correlation timeline
→ /admin/meta operator workflow
```

## Catalog Diagnostics and A14

Global blocker **A14 is resolved in the static blocker audit**.

- Added `MetaCatalogDiagnostic` aggregate issue persistence.
- Added `MetaCatalogDiagnosticItem` per-retailer-item persistence.
- Added typed severity (`INFO`, `WARNING`, `ERROR`, `CRITICAL`) and lifecycle (`ACTIVE`, `RESOLVED`).
- Added Meta Graph Catalog Diagnostics importer with pagination, bounded result size, normalized provider fields and sampled affected items.
- Added stable issue hashing, upsert, stale issue/item resolution and redacted raw evidence.
- ERROR/CRITICAL diagnostics create or refresh deduplicated incidents.
- Added canonical `/api/admin/meta/diagnostics` plus compatibility `/api/admin/meta/catalogs/diagnostics` routes.
- Added Diagnostics UI with affected retailer IDs, severity, status and correlation context.

## Incident engine and alert rules

Added typed `MetaIncident` persistence with:

- `OPEN → ACKNOWLEDGED → RESOLVED` lifecycle
- stable time-window deduplication key
- cooldown timestamp and occurrence counter
- affected resource and correlation ID
- redacted details and runbook URL
- audited acknowledge/resolve operations

Implemented alert evaluators for:

- catalog batch pending over 30 minutes
- invalid Meta access token
- catalog failure rate of at least 20% with a minimum 10-item sample
- Purchase event silence after historical traffic exists
- verified/processed webhook silence after historical traffic exists
- queue backlog at 100+ jobs, CRITICAL at 500+
- mass-delete candidate threshold of 20 items or 25% of catalog, whichever is greater
- ERROR/CRITICAL Catalog Diagnostics issues

## Correlation and tracing

Correlation IDs now persist and propagate through:

- `MetaEventOutbox`
- `MetaJobAudit`
- `MetaWebhookReceipt`
- `MetaCatalogBatch`
- `MetaCatalogDiagnostic`
- `MetaIncident`

CAPI outbox dispatch reuses the event correlation ID in its durable BullMQ job. Lead webhook receipts use a deterministic digest-derived correlation ID and reuse it in lead-fetch/recovery jobs. Catalog workers reuse the queued job correlation ID for batches and diagnostics.

The protected correlation timeline reads shaped, non-payload fields from admin audits, jobs, CAPI events, webhooks, batches, diagnostics and incidents. It does not query raw event payload, provider error or encrypted webhook columns.

## Logging, metrics and health

Added/extended:

```text
lib/observability/redaction.ts
lib/observability/correlation.ts
lib/observability/logger.ts
lib/observability/metrics.ts
lib/observability/tracing.ts
lib/observability/alerts.ts
lib/observability/incidents.ts
lib/observability/health.ts
```

Redaction covers access/refresh tokens, secrets, authorization, cookies, raw payload/body, email, phone, IP, user-agent and encrypted payload fields while preserving masked/hash/digest fields.

Metrics enforce exact low-cardinality label contracts and expose required catalog, CAPI, webhook, lead, token, queue and incident metric families. `/api/admin/meta/metrics` requires `META_OPS_AUDIT`; aggregate health requires `META_OPS_VIEW`.

## Admin Operations Center

`/admin/meta` now includes:

- Diagnostics tab with manual import and per-item samples
- Incident inbox with severity/status and acknowledge/resolve controls
- Trace tab for cross-domain correlation timelines
- correlation IDs on diagnostics and incidents
- existing Phase 09 approval/audit controls preserved

## Schema and migration

Migration:

```text
prisma/migrations/20260718020000_meta_v6_phase10_observability/migration.sql
```

New typed persistence:

- `MetaCatalogDiagnosticSeverity`
- `MetaCatalogDiagnosticStatus`
- `MetaCatalogDiagnostic`
- `MetaCatalogDiagnosticItem`
- `MetaIncidentType`
- `MetaIncidentSeverity`
- `MetaIncidentStatus`
- `MetaIncident`
- correlation columns/indexes for events, jobs, webhooks and catalog batches

## Automated evidence

```text
Phase 10 semantic tests                    12/12 passed
Phase 10 static audit                      40/40 passed
Admin API security scan              86 routes passed
Meta Business platform audit               22/22 passed
Phase 09 regression                  11/11 + 30/30 passed
Phase 08 regression                  14/14 + 68/68 passed
Phase 05 jobs regression             11/11 + 43/43 passed
Phase 04 outbox regression           11/11 + 27/27 passed
Direct TypeScript compiler                       passed
Targeted ESLint                    0 errors / 0 warnings
Global v6 blocker audit                    13/14 passed
```

A14 now passes. A13 remains open because the global audit expects complete lifecycle enum naming/coverage across all Meta domains, including the approval enum contract.

## Security evidence

- Diagnostics GET returns shaped issue/item fields and excludes `rawData`.
- Manual diagnostics import is SUPER_ADMIN protected and audited.
- Incident lifecycle mutations require `META_OPS_OPERATE` and create immutable Phase 09 admin audits.
- Metrics require the stronger audit permission.
- Correlation lookup validates IDs and returns generic errors without raw database/provider details.
- Trace queries exclude payload, encrypted payload, raw provider error and stack columns.
- Recursive redaction tests cover tokens, authorization, email, phone and raw payloads.
- Metric labels reject unexpected/high-cardinality keys and unsafe values.
- Existing Phase 4, 5, 8 and 9 security/semantic contracts remain passing.

## Generation, migration and runtime hold

Prisma validation/generation could not download the required schema engine:

```text
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

The repository freshness guard was not bypassed. Runtime deployment requires:

```bash
npm ci
npm run db:generate
npx prisma validate
npx prisma migrate deploy
npm run qa:meta-v6-phase10
npm run qa:admin-api-security
npm run typecheck:ts
npm run build
```

## Remaining Phase 10 evidence

1. Generate the Prisma client and apply the migration to disposable PostgreSQL.
2. Capture live Catalog Diagnostics import and item-resolution evidence from an owned Meta catalog.
3. Exercise each alert rule against production-like data and verify dedupe/cooldown database behavior.
4. Connect external paging/escalation and measure critical alert SLA.
5. Prove protected metrics scraping and multi-instance aggregation.
6. Capture browser/API evidence for incident lifecycle and correlation timeline.

## Acceptance criteria status

- [x] Catalog Diagnostics importer and persistence implemented.
- [x] Per-item diagnostic samples exposed in protected admin UI/API.
- [x] Event, job, webhook, batch, diagnostic and incident correlation implemented.
- [x] Structured redaction and low-cardinality metrics contracts implemented.
- [x] Incident dedupe, cooldown and lifecycle implemented.
- [x] Core alert evaluators implemented.
- [x] A14 blocker passes.
- [ ] Prisma generation and migration runtime evidence attached.
- [ ] Live Meta Diagnostics import evidence attached.
- [ ] External paging SLA and escalation evidence attached.
- [ ] Production-like health/metrics/trace runtime evidence attached.
