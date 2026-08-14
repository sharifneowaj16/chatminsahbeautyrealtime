# Phase 31 Layer 7 — Admin/API Contract Audit

Date: 2026-07-27  
Scope: `app/api/admin/`, `app/api/social/`, `app/admin/`, `lib/meta-platform/`, `lib/jobs/`

## Executive finding

Layer 6 left durable receipts, normalized social records, queues, replay state and provider identity health available in the main application, but the admin presentation surface was inconsistent. The most material gaps were: the admin inbox still reading through a legacy social route; reply routes performing mutations without one shared CSRF contract; Instagram, Lead Ads, provider health and job APIs returning different shapes; and several operations endpoints exposing provider-shaped failure or payload fields.

Layer 7 establishes one presentation boundary: authorized routes read durable normalized records, project them through explicit admin DTOs, apply bounded pagination, reject sensitive keys, emit no-store responses, and delegate provider/queue side effects to audited domain services.

## Shared contracts

| Concern | Layer 7 boundary |
|---|---|
| Authorization | Read permissions use `requireAdminPermission`; mutations use `requireAdminMutationPermission` or `requireSuperAdminMutation`. |
| CSRF | Cookie-backed mutations require `X-Admin-Request: 1`, same-origin `Origin`/`Referer`, and non-cross-site `Sec-Fetch-Site`. Bearer-authenticated service calls are allowed. |
| Redaction | `assertMetaAdminSafeDto` blocks sensitive keys and token-like values; provider failures are reduced to code/classification/retryability/safe summary. |
| Pagination | `parseMetaAdminLimit`, opaque cursor validation and maximum list sizes prevent unbounded admin reads. |
| Caching | Primary Layer 7 responses use private `no-store` headers. |
| Mutation boundary | UI/API routes validate and authorize only; provider writes, queue cancellation and replay execute in isolated domain services with audit and approval policy. |
| Legacy ownership | Durable normalized repositories are authoritative. Legacy paths remain only as explicitly isolated bridges/rollback paths and are not the admin read model. |

## Endpoint inventory and decision record

| Endpoint | Method | Permission / guard | Durable source | DTO / output boundary | Layer 7 decision |
|---|---|---|---|---|---|
| `/api/admin/inbox/messages` | GET | `META_SOCIAL_VIEW` | `SocialMessage` and validated attachments | Admin inbox message DTO, cursor page info | Replaces admin use of `/api/social/messages`; no provider source URLs or raw attachment metadata. |
| `/api/admin/inbox/messages` | PATCH | `META_SOCIAL_OPERATE` + mutation CSRF | `SocialMessage` | Safe update summary | Centralized admin mutation contract. |
| `/api/admin/inbox/reply` | POST | `META_SOCIAL_OPERATE` + mutation CSRF | Durable conversation/message state | Safe reply result and audit ID | Route delegates to Facebook domain; no direct provider fetch in UI route. |
| `/api/admin/meta/instagram/health` | GET | `META_OPS_VIEW` | receipt, message, reply, reconciliation and job tables | Instagram health DTO | Exposes processing state without raw webhook/provider data. |
| `/api/admin/meta/instagram/conversations` | GET | `META_SOCIAL_VIEW` | normalized Instagram conversation/message records | Safe conversation DTO + bounded cursor | Raw `policyData`, `failureData`, provider media source URL and metadata are omitted. |
| `/api/admin/meta/instagram/conversations/[conversationId]` | GET | `META_SOCIAL_VIEW` | normalized conversation/messages | Safe detail DTO | Explicit reply eligibility and storage-only media projection. |
| `/api/admin/meta/instagram/conversations/[conversationId]` | PATCH | `META_SOCIAL_OPERATE` + mutation CSRF | normalized conversation | Safe projected result | Audited state mutation. |
| `/api/admin/meta/instagram/conversations/[conversationId]/links` | POST/DELETE | `META_SOCIAL_OPERATE` + mutation CSRF | durable relationship/link records | Safe link projection | No raw evidence object returned. |
| `/api/admin/meta/instagram/reply` | POST | `META_SOCIAL_OPERATE` + mutation CSRF | reply reservation/attempt records | Safe reply-attempt DTO | Provider response and reservation internals are not returned. |
| `/api/admin/meta/leads` | GET | `META_OPS_VIEW` | normalized Meta lead repository | Masked lead DTO + bounded page | Includes test-lead status; excludes encrypted/raw field data. |
| `/api/admin/meta/leads/[leadId]` | GET | `META_OPS_VIEW` | lead + receipt + processing + handoff + duplicate records | `{ lead, trace }` safe DTO | Receipt-to-business-record trace is visible. |
| `/api/admin/meta/leads` | POST | superadmin mutation CSRF | durable lead test/subscription workflow | Safe queued/result summary | Privileged operational action. |
| `/api/admin/meta/leads/[leadId]` | PATCH | superadmin mutation CSRF | normalized lead lifecycle | Safe lifecycle projection | Audited lifecycle-only changes. |
| `/api/admin/meta/webhooks/leads` | GET | `META_OPS_VIEW` | legacy webhook failure store | Sanitized failure DTO | Legacy diagnostics retained without raw payload/error exposure. |
| `/api/admin/meta/health` | GET | `META_OPS_VIEW` | connection, credential metadata, checks, external references and relationships | Provider health DTO | Covers app, business, Page, Instagram account, ad account and form health. Secret/token references are not selected. |
| `/api/admin/meta/jobs` | GET | `META_OPS_VIEW` | `MetaJobAudit` | Safe job DTO, counts, controls and cursor | No queue payload, rate-limit state or raw error returned. |
| `/api/admin/meta/jobs` | POST | `META_OPS_OPERATE` + mutation CSRF | job audit + approval/audit records | Safe replay/cancel result | Approval-backed, kill-switch aware; replay policy blocks recursion and unknown outcomes. |
| `/api/admin/meta/operations/summary` | GET | `META_OPS_VIEW` | durable operation tables | Sanitized summary DTO | Failure output uses safe failure projector and no-store headers. |
| `/api/admin/meta/events` | GET | superadmin | event outbox | Safe event status DTO | Removes event source URL, safe payload, provider response and raw error from response. |
| `/api/admin/meta/events` | POST | superadmin mutation CSRF | event outbox + approval/audit | Safe replay summary | Provider dispatch remains behind action service. |
| `/api/admin/meta/approvals` | POST | mutation permission guard | approval records | Existing redacted approval contract | CSRF now required for approval creation. |
| `/api/admin/meta/approvals/[approvalId]` | PATCH | mutation permission guard | approval records | Existing redacted approval contract | CSRF now required for approve/reject actions. |

## Legacy and compatibility audit

- `/api/social/messages` remains available for non-admin compatibility, but the admin inbox no longer uses it.
- The Facebook reply bridge remains an isolated compatibility transport. The admin route does not own provider transport, token access or retry behavior.
- Existing provider-domain write services remain authoritative for Instagram replies and Lead Ads operations.
- No Prisma schema change was introduced for Layer 7; the immutable schema digest remains `d3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce`.

## Acceptance mapping

- **Authorization:** all primary read surfaces require explicit permissions; mutation surfaces use the CSRF-aware guard.
- **Redaction:** primary DTOs are scanned and sensitive provider-shaped fields are omitted before serialization.
- **Pagination:** inbox, Instagram conversations, leads and jobs use bounded limits; cursor-based surfaces return page information.
- **Traceability:** Instagram and Lead Ads health endpoints connect receipts, attempts, business records, replies/handoffs and jobs.
- **Replay safety:** policy-backed eligibility, approval requirements, dedupe ownership, unknown-outcome blocks and emergency kill switches are visible and enforced.
