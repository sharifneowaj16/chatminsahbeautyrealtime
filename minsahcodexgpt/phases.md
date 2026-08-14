# phases.md — Minsah Beauty Project Phase Plan

> **Document role:** Dependency-ordered implementation and release roadmap.  
> **Last update:** 2026-07-25.  
> **Important:** Code complete, runtime ready and production complete are different states.

---

## 1. Status model

```text
NOT_STARTED          no implementation started
IN_PROGRESS          active scoped work
CODE_COMPLETE        source/tests implemented, external evidence may remain
READY_FOR_GENERATION schema work needs generated client/migration proof
READY_FOR_RUNTIME_QA code gates pass; live/runtime proof remains
BLOCKED              an explicit dependency or evidence blocks progress
COMPLETE             all acceptance and evidence gates pass
DEPRECATED           replaced; no new use allowed
```

## 2. Existing product baseline

The uploaded repository already contains a broad commerce platform. These capability groups are treated as existing baseline and must remain regression-protected during all future phases:

1. storefront/catalog/search;
2. authentication and customer account;
3. cart/checkout/order idempotency;
4. COD and online payment routes;
5. inventory, suppliers and purchase orders;
6. Pathao and Steadfast delivery;
7. reviews, returns, loyalty and referrals;
8. content, homepage and media administration;
9. Elasticsearch and search analytics;
10. tracking, attribution, GA4 and TikTok;
11. admin security, operations and QA;
12. realtime/social inbox service.

Changes to baseline capabilities require their existing phase/audit commands plus the active phase gates.

## 3. Existing Meta v6 phase status from repository manifest

| Phase | Title | Snapshot status |
|---:|---|---|
| 1 | Canonical Product Identity | COMPLETE |
| 2 | Catalog Domain Model, Field Mapping & Lifecycle | READY_FOR_GENERATION |
| 3 | Pixel & Browser Tracking Contract | READY_FOR_RUNTIME_QA |
| 4 | Conversions API Transactional Outbox & Deduplication | READY_FOR_GENERATION |
| 5 | Durable Queue, Scheduling & Rate Control | READY_FOR_GENERATION |
| 6 | Consent, Privacy, Retention & Data Governance | READY_FOR_GENERATION |
| 7 | Meta Connection, API Version, Token & Permission Health | READY_FOR_RUNTIME_QA |
| 8 | Lead Ads Webhook, Retrieval & CRM | READY_FOR_RUNTIME_QA |
| 9 | Admin Meta Operations Center | PARTIAL / must be reconciled to allowed statuses |
| 10 | Observability, Diagnostics & Alerting | PARTIAL / must be reconciled to allowed statuses |
| 11 | First-Party Attribution & Growth Analytics | READY_FOR_GENERATION |
| 12 | Product Sets, Categories & Merchandising | READY_FOR_GENERATION |
| 13 | Ads Insights & Approval-Based Automation | READY_FOR_GENERATION |
| 14 | Instagram Messaging & Social CRM | READY_FOR_GENERATION |
| 15 | Testing, CI, Migration & Release Governance | READY_FOR_GENERATION |
| 16 | Production Readiness & Evidence Closure | BLOCKED by release evidence/workstreams |

### Phase 17 — Build and module compatibility closure

**Status:** `BLOCKED` — source/test scope passes; Prisma generation and terminal production build evidence require a network-enabled, sufficiently provisioned environment.

**Goal:** Remove current build warnings/errors caused by SDK import contract, route config, eager queue bootstrap, Redis protocol assumption and framework-owned cache headers.

**Primary locations:**

```text
lib/meta-business/sdk.ts
lib/tracking/meta-business-sdk.ts
types/facebook-nodejs-business-sdk.d.ts
app/api/webhooks/meta/leadgen/route.ts
lib/queue/metaCapiOutboxQueue.ts
lib/jobs/connection.ts
next.config.ts
```

**Before:** capture clean build log and verify working copy differs from uploaded snapshot.  
**Work:** namespace SDK imports; truthful type declaration; direct route config exports; lazy queue/client creation; accept valid `redis://` or `rediss://`; remove custom headers on framework routes.  
**After:** clean `.next`, typecheck, lint, tests, build; update `memory.md`.  
**Exit:** no default-export warning, no route-config warning, no build-time Redis failure, no framework cache warning.

### Phase 18 — Environment, documentation and evidence alignment

**Status:** `CODE_COMPLETE` — documentation, correction notes, build-evidence contract and executable audit are implemented; final build evidence remains dependent on Phase 17 blockers.

**Goal:** Ensure samples/runbooks describe actual private-network/TLS Redis behavior and current build contract.

**Primary locations:** `.env.example`, production deployment docs, Phase 5 evidence/correction notes, build-evidence contract and executable documentation audit.  
**Exit:** no absolute false statement that all production Redis must use TLS; no secret in docs; final build evidence bound to current commit.

---

# Unified Meta Platform — 15 implementation phases

The following phases are Phase 19–33. Every phase must follow `rules.md` and update `memory.md` after every change.

## Phase 19 — Complete Meta inventory, freeze and migration manifest

**Status:** `CODE_COMPLETE` — 302 active paths across 21 capabilities are frozen; the zero-unmapped audit passes 45/45 and focused tests pass 4/4. Repository-wide standard typecheck/build remain blocked by the pre-existing Prisma freshness gate, so `COMPLETE` is not claimed.

**Why:** Prevent hidden SDK, Graph, token, webhook, queue or realtime paths from escaping migration.

**Before:** repository clean; generated/dependency files excluded; Phase 18 evidence available.

**Create/update:**

```text
docs/architecture/meta/current-source-inventory.md
docs/architecture/meta/capability-manifest.md
docs/architecture/meta/legacy-to-target-map.md
config/meta-capability-manifest.json
scripts/meta-platform-source-inventory.mjs
```

**Work:** map every Meta file/capability to owner, token role, transport, asset, target phase, cutover flag and final action.

**Validation:** zero active unmapped Meta paths; realtime service included.

**Exit:** machine-readable inventory frozen and reviewed.

## Phase 20 — MetaPlatform core, facade and repository boundaries

**Status:** `CODE_COMPLETE` — provider-neutral facade/core, server-only compatibility boundary, import-side-effect audit and focused tests pass; repository-standard typecheck/build remain blocked by the pre-existing Prisma freshness gate, so `COMPLETE` is not claimed.

**Why:** Give application one stable internal API and stop new provider coupling.

**Create:** `lib/meta-platform/{index,platform,server,types}.ts`, core result/error/context, capability registry, legacy compatibility facade.

**Work:** define domain interfaces, stable result/error model, server-only boundaries and static import audits.

**Validation:** client bundle contains no SDK/secrets; imports create no external connection.

**Exit:** facade compiles and existing functionality continues through compatibility layer.

## Phase 21 — Canonical models, environment/asset context and external references

**Status:** `READY_FOR_GENERATION` — canonical models, explicit environment/asset context, scoped external-reference repository, forward migration, recovery plan, focused tests and static audits pass. Prisma generation and disposable PostgreSQL apply/recovery evidence remain blocked, so `CODE_COMPLETE` or `COMPLETE` is not claimed.

**Why:** Raw SDK/Graph objects and scattered provider IDs make upgrades unsafe.

**Create:** canonical models, execution context and reference repository. Add `MetaExternalReference` migration.

**Work:** normalize provider responses; map local/provider IDs; block staging-to-production asset mismatch; backfill unambiguous mappings.

**Validation:** snapshot mapping tests, uniqueness, environment guard and migration drill.

**Exit:** new domain code consumes only canonical models.

## Phase 22 — Credential isolation, rotation, permissions and version governance

**Status:** `READY_FOR_GENERATION` — source implementation and dependency-independent gates pass; fresh Prisma generation, exact dependency-backed tests, PostgreSQL apply/recovery and live rotation evidence remain.

**Why:** Cross-token fallback and duplicated version constants can send requests with wrong permission/version.

**Create:** credential provider/roles/rotation, appsecret proof, version registry, feature compatibility and permission matrix.

**Work:** no token fallback; database stores only secret references/metadata; token-version client invalidation; central SDK/Graph version policy.

**Validation:** missing/wrong credential fails before provider request; no secret leakage.

**Exit:** every capability has explicit credential and permission requirements.

## Phase 23 — Unified Meta Business SDK transport

**Status:** `READY_FOR_RUNTIME_QA` — unified server-only SDK transport, lazy runtime validation, authorized rotation-aware client factory, app-secret proof decoration, normalization, focused adapters, compatibility facades, strict focused compilation and static/regression gates pass. Exact locked-dependency runtime tests, standard build and live provider evidence remain.

**Why:** Replace duplicate wrappers and verify real runtime exports.

**Create:** lazy client factory/registry, runtime contract, response/error normalizer and focused SDK adapters for business, ads, insights, audiences, catalog, pixels, CAPI, pages and leads.

**Work:** only namespace import; no fake default declaration; no module-level initialization.

**Validation:** actual installed SDK runtime contract and adapter tests.

**Exit:** SDK import exists only in the transport directory.

## Phase 24 — Graph HTTP, webhook, pagination, batch and media transports

**Status:** `READY_FOR_RUNTIME_QA` — Graph HTTP, cursor pagination, item-level batch, webhook HMAC/parser/receipt ordering and secure media source boundaries are implemented. Focused strict TypeScript, dependency-independent runtime tests and static/source-governance gates pass; clean locked-dependency execution, standard build and live provider/DNS/scanner/storage evidence remain.

**Why:** Centralize SDK gaps/new endpoints, raw-body security and media safety.

**Create:** Graph client/adapters, webhook signature/parser/receipt/ordering, secure media downloader/storage/uploader.

**Work:** central auth/version/appsecret proof/timeouts; normalized pagination; item-level batch results; receipt-first webhooks; SSRF/MIME/size/malware controls.

**Validation:** HMAC negative tests, pagination/batch partial failure, SSRF and media tests.

**Exit:** direct Graph calls and webhook signature logic exist only in transports.

## Phase 25 — Immutable operation ledger, transactional outbox and payload versioning

**Status:** `READY_FOR_GENERATION` — immutable operation/event/outbox source, payload codecs, dispatcher/execution leases, Prisma schema/migration, tests and static gates are implemented; fresh Prisma generation, PostgreSQL apply/recovery, locked-dependency tests and live Redis/worker drills remain.

**Why:** Committed provider work must survive Redis/provider failure.

**Create:** `MetaOperation`, `MetaOperationEvent`, `MetaOutboxMessage`, event store, dispatcher, schema-version decoders and poison-message handling.

**Work:** transactionally persist business change + operation + outbox; at-least-once/idempotent execution; quarantine unsupported payloads.

**Validation:** DB rollback, Redis outage, duplicate dispatch, worker crash and redispatch tests.

**Exit:** every Meta command is durable and auditable before provider execution.

## Phase 26 — Circuit breakers, retry, rate limits, cache, backpressure and deadlines

**Status:** `READY_FOR_GENERATION` — distributed circuit/rate-limit state, centralized retry/deadline policy, priority admission, stale-read cache, durable defer integration, Prisma schema/migration, tests and static gates are implemented; fresh Prisma/PostgreSQL/Redis, locked-dependency, provider-throttle and production load evidence remain.

**Why:** Stop retry storms and protect Purchase/lead/reply workloads.

**Create:** domain/asset circuit registry, distributed state, retry classifier, rate limiter, health probe, queue admission, priority and cache policy.

**Work:** read stale fallback; write durable defer; provider retry-after; P0–P4 priorities; operation expiry.

**Validation:** open/half-open/recovery, one distributed probe, priority isolation and deadline tests.

**Exit:** provider outage cannot create request storm or starve critical jobs.

## Phase 27 — Workflows, concurrency, reconciliation and controlled replay

**Status:** `CODE_COMPLETE` — source-level Phase 27 implementation is complete: provider job plus reconciliation are transactionally durable before provider mutation; terminal provider outcomes update workflow/step/job/reconciliation atomically; execution and compensation use distinct immutable command identities; lock counters remain monotonic after release with DB-authoritative time and heartbeat renewal; interrupted writes enter reconciliation; replay uses separate request/authorized approval/execute stages with immutable digest and exact expiry. Fresh Prisma generation, PostgreSQL apply/recovery, multi-process fencing and live provider reconciliation remain runtime evidence, so this phase is not `COMPLETE`.

**Why:** Multi-step writes and unknown outcomes cannot be handled by blind retry.

**Create:** workflow/step/provider-job models, optimistic concurrency, locks/fencing, reconciliation, replay and projections.

**Work:** before/after provider state; resume/compensate; unknown-success resolver per capability; new-operation replay.

**Validation:** partial campaign workflow, stale mutation, lost response and replay safety.

**Exit:** critical operations are verifiable, resumable and reconcilable.

## Phase 28 — Connection health and CAPI migration

**Status:** `CODE_COMPLETE` — source migration and cutover controls are implemented. Production cutover remains blocked until Phase 27 runtime prerequisites plus Phase 28 shadow/test-event/canary/rollback evidence are attached.

**Why:** Start cutover with read-heavy connection checks and revenue-critical event delivery.

**Migrate:** connection/token/permission modules; CAPI core/COD/online-paid and offline/dataset delivery; CAPI route, durable outbox sender/worker and admin event monitor.

**Implemented:** role-isolated unified connection health; legacy/shadow/platform read facade; unified lazy Business SDK CAPI transport; deterministic event-ID test/canary/full cutover; outbox-first API behavior; offline/dataset facade migration; safe delivery/cutover/version/credential evidence.

**Cutover:** shadow connection reads → platform reads → disable legacy health; test-event CAPI → deterministic canary → full platform writes → disable legacy producer. CAPI has no shadow-write mode.

**Validation:** source tests/audits; shared event ID, duplicate Purchase, old event, Redis outage, token rotation, circuit recovery, rollback and live provider evidence.

**Exit:** all CAPI writes and connection checks use MetaPlatform, legacy paths are disabled after observation, and runtime evidence is attached.

## Phase 29 — Ads, creatives, insights, targeting and audiences migration

**Status:** `CODE_COMPLETE` — unified Ads/creative/insight/targeting/audience source migration, exact approval and consent controls, mode-aware stale-read behavior, cutover flags, rollback documentation and dependency-independent gates are implemented. Production `COMPLETE` is not claimed: locked dependencies/`tsx` are absent, the generated Prisma snapshot is stale, standard lint/build cannot run, and live shadow/test-asset/provider/rollback evidence remains required.

**Why:** Consolidate the Marketing API family under approvals and canonical state.

**Migrate:** campaigns, ad sets, ads, creatives, insights, async reports, targeting, custom/lookalike/website-retargeting audiences.

**Controls:** two-person approval, full sanitized payload hash without display truncation, provider before/after state, consent plus a strong identifier and deterministic SHA-256 hashing for audiences, complete audience-batch digest, PII-safe audit metadata, budget/paused-create safeguards, mode-aware bounded stale insight cache and kill switches.

**Cutover:** logical legacy reads → shadow reads → platform reads → paused test asset → controlled writes → observed rollback → legacy disable. Writes are never shadowed.

**Validation:** Phase 29 dependency-independent runtime tests 7/7, syntax transpilation 35/35, Phase 29 audit 28/28, inherited Phase 13 audit 56/56, Phase 26 audit 124/124, Phase 27 audit 89/89, Phase 28 audit 86/86, boundary audit 83/83 with two dependency-blocked smoke imports, migration governance 392/392 and source inventory 47/47. Exact `tsx` tests, standard lint/typecheck/build and live provider drills remain blocked/pending.

**Exit:** no legacy Ads/Audience SDK access; platform reads/writes are observed on owned test assets; kill switch and rollback are proven; legacy paths are disabled; runtime evidence is attached.

## Phase 30 — Catalog, feeds, product items, product sets and commerce migration

**Status:** `CODE_COMPLETE` — unified catalog/feed/item/product-set/diagnostics provider boundaries, canonical SKU enforcement, immutable deletion plans with independent approval, item-level reconciliation/retry lineage, schema migration/recovery, cutover flags and dependency-independent gates are implemented. Production `COMPLETE` is not claimed: dependencies/generated Prisma are absent or stale, disposable PostgreSQL and live test-catalog/provider drills remain required.

**Why:** Make catalog batches, diagnostics and deletion safe and recoverable.

**Migrate:** catalog mapper/adapters, items batch, feeds, product sets, diagnostics, batch polling and managed-item reconciliation.

**Controls:** canonical SKU, semantic validation, payload hash, item-level failure retry, mass-delete dry run/approval.

**Validation:** dependency-independent runtime 7/7; changed TypeScript syntax 23/23; Phase 30 audit 36/36; inherited Phase 2 catalog 20/20, catalog semantic 23/23, Phase 5 jobs 43/43, Phase 10 diagnostics 40/40 and Phase 12 product sets 51/51; Phase 26–29 audits pass; boundary 83/83 with two dependency-blocked import probes; migration governance 397/397; source inventory 47/47 over 470 paths; admin security passes and the Phase 29 security baseline gains zero findings.

**Exit:** source-level catalog writes and provider jobs use the unified platform. Production exit still requires observed shadow parity, test-catalog writes, database apply/recovery, partial-failure/timeout, approved deletion, kill-switch and rollback evidence.

## Phase 31 — Pages, Lead Ads, Instagram, webhooks and realtime/social CRM migration

**Status:** `IN_PROGRESS` — Phase 31 Layer 8 is verified. Latest working archive: `minsahbeauty_phase31_layer8_complete.zip`; implementation evidence: `phase31_layer8_verification.log`. **Active Layer: 9. Exact current item: 9.8 — Final runtime and release gate.** No full build/lint/database/Redis/realtime/live-provider PASS is claimed unless separately executed.

**Why:** Remove parallel Facebook/Instagram implementations and unify customer-message security.

**Migrate:** lead/Instagram modules, webhook routes, legacy `lib/facebook`, realtime Facebook handlers and inbox integration.

**Controls:** receipt-first processing, dedupe/order policy, permission/account health, reply windows, secure attachments.

**Validation:** bad signature, duplicates, late/out-of-order event, expired reply, media attack and independent realtime build.

**Exit:** direct legacy Graph/social clients disabled; live webhook/reply evidence attached.

## Phase 32 — Measurement, privacy, admin control plane and governance

**Why:** Operators need safe visibility/control and privacy must cover new operation data.

**Migrate/create:** pixels/datasets/offline events/attribution, feature flags, RBAC, config audit, retention, metrics, incidents and admin platform screens.

**Admin screens:** capability health, assets, credential metadata, operation timeline, workflows, circuits, queues, provider jobs, reconciliation, replay, flags, permissions and subscriptions.

**Validation:** role matrix, redaction, deletion, flag/kill switch, replay approval and metrics cardinality.

**Exit:** platform is operable without direct database/provider access.

## Phase 33 — Deployment, load, disaster recovery, legacy removal and release closure

**Why:** Architecture is not complete until deployed topology and recovery are proven.

**Work:** Dokploy process definitions, separate worker/scheduler commands, health probes, load/outage tests, PostgreSQL restore, Redis reconstruction, SDK canary/rollback, final legacy deletion and repository enforcement.

**Deletion only after observation:** duplicate SDK wrappers, legacy queues/workers, scattered Graph clients, `lib/facebook`, duplicate version constants and realtime legacy provider code.

**Validation:** typecheck, lint, tests, build, migration drill, load tests, recovery drills, bundle/secret scan, realtime build and live provider evidence.

**Exit:** all 18 final release criteria pass and release gate reports `PASS`.

---

## 4. Universal phase checklist

### Before phase

- [ ] Previous phase evidence reviewed
- [ ] Branch and rollback point created
- [ ] Scope and affected files frozen
- [ ] Schema/provider/permission impact reviewed
- [ ] `memory.md` active task updated

### During phase

- [ ] Implementation and tests stay within scope
- [ ] No legacy deletion before cutover
- [ ] No new direct provider/secret access
- [ ] Decisions captured in ADR/memory

### After phase

- [ ] Phase-specific tests pass
- [ ] Typecheck/lint/tests/build run as applicable
- [ ] Migration/runtime evidence attached
- [ ] `memory.md` updated after every change
- [ ] `phases.md` status updated
- [ ] Rollback verified
- [ ] Remaining blockers explicitly owned
