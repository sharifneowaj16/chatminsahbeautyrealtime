# Meta v6 Phase 11 Evidence — First-Party Attribution & Growth Analytics

Date: 18 July 2026  
State: `READY_FOR_GENERATION`  
Branch label: `artifact/meta-v6-phase-11`

## Scope delivered

Phase 11 now provides a consent-aware, reproducible first-party attribution chain:

```text
Landing/session capture
→ normalized UTM + Meta browser/click identifiers
→ immutable first touch + eligible last touch
→ transactional checkout/order snapshot
→ optional Meta lead inheritance
→ daily campaign aggregates and data-quality coverage
→ protected aggregate-only /admin/meta attribution report
```

## Persistence and migration

Migration:

```text
prisma/migrations/20260718030000_meta_v6_phase11_attribution/migration.sql
```

Added:

- `MarketingAttributionConversionType`: `SESSION`, `LEAD`, `ORDER`
- `MarketingAttributionSourceModel`: `FIRST_PARTY`, `META_REPORTED`
- `MarketingAttribution`
- `MarketingAttributionDailyAggregate`

The attribution record has a unique `attributionKey` and separate fields for session, visitor, customer, order and lead linkage. It persists `_fbp`, `_fbc`, `fbclid`, normalized UTM dimensions, sanitized landing page, first/last touch JSON, immutable checkout snapshot, data-quality evidence and explicit correction audit history.

## Capture contract

`POST /api/attribution/capture`:

- is blocked unless advertising consent is granted with a consent version
- applies existing bot/internal/test traffic exclusions
- accepts a bounded session/visitor identity
- normalizes source/medium and bounds campaign/term/content values
- validates `_fbp`, `_fbc` and `fbclid` formats/lengths
- removes sensitive landing URL parameters
- rejects captures older than 90 days or more than five minutes in the future
- never returns or logs raw identifiers

`AttributionCookieCapture.tsx` now creates/refreshes a 30-minute `mb_sid` session cookie, reuses `mb_vid`, and sends the safe capture with `keepalive`. `mb_sid` is included in consent-withdrawal cleanup.

## First-touch and last-touch rules

- First touch is write-once. Later conflicting captures do not overwrite it.
- Conflicting first-touch attempts produce `FIRST_TOUCH_CONFLICT_IGNORED` data-quality evidence and a low-cardinality counter.
- Last touch updates for eligible marketing touches.
- Direct traffic does not overwrite an existing eligible paid/marketing touch.
- Capture rows are locked with `FOR UPDATE` before mutation.

## Order and lead reproducibility

Order creation now writes one `ORDER` attribution snapshot inside the same Prisma transaction as the order. The unique `order:{orderId}` key and `ON CONFLICT DO NOTHING` make the checkout snapshot immutable.

Meta lead conversion links attribution in the same lead lifecycle transaction:

- existing paid first touch is preserved
- direct/missing last touch can inherit the lead campaign touch
- lead/order mismatch is rejected
- inheritance writes an explicit `LEAD_ATTRIBUTION_INHERITANCE` correction audit entry
- a separate `lead:{leadId}` conversion row is persisted

The backfill worker intentionally returns candidates only. It will not silently reconstruct historical checkout state without request context or an explicit correction audit.

## Aggregation and reporting

Added:

```text
lib/attribution/aggregation-worker.ts
lib/attribution/reports.ts
workers/meta-attribution.worker.ts
```

Worker entry points:

- `ATTRIBUTION_DAILY_AGGREGATE`
- `ATTRIBUTION_ORDER_BACKFILL`
- `ATTRIBUTION_LEAD_CONVERSION_LINK`
- `ATTRIBUTION_DATA_QUALITY`

The protected `GET /api/admin/meta/attribution` endpoint returns aggregate-only campaign/session/lead/order/revenue rows, order coverage and missing-identifier/first-touch quality counts. It does not select email, phone, IP or user-agent fields.

`/admin/meta` now shows:

- first-party order coverage
- attributed/unattributed and lead-linked order counts
- campaign → sessions, leads, orders and revenue
- missing click ID, `_fbp`, first-touch and consent quality counts
- separate panels/labels for **First-party attribution** and **Meta-reported attribution**

The two measurement models are explicitly marked non-comparable and are never merged.

## Metrics

Added exact low-cardinality metric contracts:

```text
meta_attribution_capture_total
meta_attribution_order_snapshot_total
meta_attribution_lead_order_link_total
meta_attribution_first_touch_conflict_total
meta_attribution_order_coverage_ratio
```

## Global blocker A13

The schema already used the typed approval lifecycle enum `MetaAdminApprovalStatus`. The global A13 audit incorrectly accepted only the exact name `MetaApprovalStatus`, producing a false negative. The gate now accepts either explicit typed approval enum name. No raw-string approval status was introduced or retained.

Global blockers now pass **A1–A14**.

## Automated evidence

```text
Phase 11 semantic tests                    13/13 passed
Phase 11 static audit                      41/41 passed
Legacy attribution audit                 106/106 passed
Global Meta v6 strict blocker gate          14/14 passed
Admin API security scan                 87 routes passed
Meta Business platform audit               22/22 passed
Phase 10 regression                  12/12 + 40/40 passed
Phase 09 regression                  11/11 + 30/30 passed
Phase 08 regression                  14/14 + 68/68 passed
Phase 04 outbox regression           11/11 + 27/27 passed
Repository npm test                         16/16 passed
Direct TypeScript compiler                       passed
Targeted ESLint                    0 errors / 0 warnings
```

## Master tracking gate status

`qa:master-tracking` currently reports **66 passed / 8 failed**. The Phase 11 attribution child audit passes. Remaining failures are inherited historical release-document/runtime-proof checks involving lifecycle documentation, product URL report documentation, production QA documentation, deploy-runtime health proof and TikTok tracking documentation. They are not caused by the Phase 11 attribution implementation and are not represented as passing.

## Generation and migration hold

Prisma generation was attempted and failed before schema validation because the environment could not resolve the Prisma binary host:

```text
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

The generated-client freshness guard was not bypassed or falsely stamped. Therefore `npm run typecheck` remains blocked at the freshness precheck; direct `npm run typecheck:ts` passes.

Before deployment:

```bash
npm ci
npm run db:generate
npx prisma validate
npx prisma migrate deploy
npm run qa:meta-v6-phase11
npm run qa:tracking-attribution
npm run qa:meta-v6-gate
npm run qa:admin-api-security
npm run typecheck
npm run build
```

## Remaining evidence

1. Generate Prisma Client and apply the migration to disposable PostgreSQL.
2. Run capture → order and lead → order fixtures against the database.
3. Schedule daily aggregation/data-quality workers and confirm idempotent reruns.
4. Establish production coverage baselines and investigate unattributed conversion thresholds.
5. Reconcile first-party aggregates with separately labelled Meta Insights without combining attribution models.
6. Resolve the eight inherited master tracking release/runtime evidence failures.

## Acceptance criteria status

- [x] Order attribution is reproducible through an immutable transactional snapshot.
- [x] Lead-to-order attribution inheritance is deterministic and audited.
- [x] First touch cannot be silently overwritten.
- [x] Direct traffic policy is explicit and tested.
- [x] First-party and Meta-reported models are separately labelled.
- [x] Coverage and data-quality metrics are visible in protected admin reporting.
- [x] Consent denial prevents capture and clears the attribution session cookie.
- [x] A1–A14 strict blocker gate passes.
- [ ] Prisma generation and disposable-database migration evidence attached.
- [ ] Production aggregate scheduling and reconciliation evidence attached.
