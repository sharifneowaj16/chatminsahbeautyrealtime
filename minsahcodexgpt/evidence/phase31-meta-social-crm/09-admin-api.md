# Phase 31 Layer 7 — Admin and API Presentation Layer

Date: 2026-07-27  
Status: **SOURCE/OFFLINE GATE PASS — FULL REMEDIATION**

## Final remediation scope

Layer 7 now presents the durable Meta social/CRM state through bounded, redacted admin DTOs and policy-checked action routes. The remediation closes the prior API-to-UI and legacy-coupling gaps rather than only asserting that backend endpoints exist.

### 7.1 — Admin/API contract audit

- Existing endpoint, DTO, RBAC, pagination and legacy coupling inventory retained.
- Shared cursor, limit, provider-ID, failure-sanitization, sensitive DTO scan and no-store contracts remain active.
- New full-fix gate verifies the actual UI consumers and route-to-projector health wiring.

### 7.2 — Facebook admin inbox

- Both admin layouts now use `/api/admin/inbox/messages?mode=unread_count&platform=facebook`; the legacy unread-count call is removed.
- Conversation DTOs expose deterministic 24-hour reply eligibility plus safe processing/failure state.
- Attachment state derives from validated private storage and bounded policy metadata; raw provider URL/metadata is never projected.
- Inbox UI displays reply and processing reason codes, displays safe failures and fail-closes text, attachment and product sends when eligibility is absent or blocked.
- Realtime inbound messages locally reopen the 24-hour window while subsequent API refresh remains authoritative.

### 7.3 — Instagram operations

- Conversation list/detail/PATCH projection receives current permission and account-health state.
- Missing health data is fail-closed rather than implicitly eligible.
- Admin UI renders webhook, conversation, message, provider-delivery, reply, reconciliation, private-reply and job state groups.
- Dead-letter safe failures, message/attachment state, provider status, reply attempts and standard/private reply eligibility are visible.

### 7.4 — Lead Ads status

- Lead UI calls the detail trace endpoint and renders receipt, processing/fetch attempts, test-lead state, CRM handoffs and duplicate records.
- Webhook failure rendering uses the API `failure` contract rather than the obsolete `error` field.
- Contact data remains masked and DTO scanning remains active.

### 7.5 — Provider permission/account health

- Provider health UI consumes `/api/admin/meta/health`.
- App, Business, Page, Instagram account, ad account and form scopes display identity/permission state, verification timestamps, revoked/disabled state, provider fingerprints and safe remediation actions.

### 7.6 — Queue, dead-letter and replay visibility

- Operations UI consumes `/api/admin/meta/jobs` with bounded filtering and cursor pagination.
- Queue/status counts, attempts, next retry, heartbeat, correlation, safe failure, reconciliation requirement, replay relationship and replay/cancel eligibility are visible.

### 7.7 — Admin replay/action controls

- Replay and cancel requests are approval-backed and remain protected by RBAC, CSRF, audited execution and global/narrow kill switches.
- Approved `META_JOB_REPLAY` and `META_JOB_CANCEL` actions can be executed from the operations approval flow.
- UI routes do not instantiate provider, Redis or queue clients.

### 7.8 — Evidence and artifact gate

- Existing 7.1–7.8 tests/audits pass.
- New `phase31-layer7-full-fix.test.mjs` verifies the remediated behavioral/source contracts and baseline item artifacts.
- Item-scoped ZIP/checksum/verification artifacts are included under `artifacts/phase31-layer7-items/` for 7.1 through 7.8.
- Prisma schema remains unchanged for this presentation-only remediation.
- Checkpoint metadata consistently identifies the remediated Layer 7 archive and Layer 8.1 as the next item.

## Verification commands

```bash
npm run qa:phase31-meta-layer7-final
npm run ai:sync-context
```

## Runtime boundary

A dependency-backed `npm ci` was attempted and the configured registry returned HTTP 503. Therefore full Next.js typecheck, lint, production build and live PostgreSQL/Redis/Meta validation are **not claimed**. These remain explicit Layer 9 runtime/provider gates. See `evidence/phase31-meta-social-crm/logs/layer7-full-fix-npm-ci.log`.

## Final Layer 7 verdict

```txt
Admin/API source implementation: PASS
Admin UI consumption/visibility: PASS
Legacy admin inbox coupling: REMOVED
Reply-policy fail-closed behavior: PASS
Sensitive-data projection: PASS
RBAC/CSRF/approval/kill-switch controls: PASS
Baseline item artifact presence: PASS
Prisma change: NONE
Dependency-backed build/runtime: BLOCKED_BY_REGISTRY_503
Live provider evidence: PENDING_LAYER_9

Layer 7 source/offline release decision: PASS
Exact next item: 8.1 — Feature flag inventory and configuration contract
```
