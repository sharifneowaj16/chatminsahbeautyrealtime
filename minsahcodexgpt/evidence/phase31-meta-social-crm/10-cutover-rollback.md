# Phase 31 Layer 8 — Feature Flags, Cutover and Rollback

Status: **PASS — source/offline cutover gate**

Layer 8 makes the Phase 31 migration observable, reversible and fail-safe for provider writes. This cumulative gate verifies the feature-flag contract, execution-time outbound kill switches, Lead Ads cutover, Instagram cutover, Facebook/realtime authority, duplicate prevention and rollback proof produced by Items 8.1–8.6.

This is a source/offline release gate. It does not claim live PostgreSQL, Redis/BullMQ process interruption, production observation windows, or live Meta provider delivery/write evidence; those demonstrations remain required by Layer 9.

## 1. Feature-flag contract

The authoritative inventory contains all five required flags:

- `META_PLATFORM_LEADS`
- `META_PLATFORM_INSTAGRAM`
- `META_PLATFORM_LEGACY_FACEBOOK`
- `META_PLATFORM_SOCIAL_REALTIME`
- `META_PLATFORM_SOCIAL_WEBHOOKS`

It also contains all four finer controls:

- `META_PLATFORM_INSTAGRAM_WRITES`
- `META_PLATFORM_INSTAGRAM_PRIVATE_REPLY`
- `META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS`
- `META_PLATFORM_SOCIAL_REPLAY`

New platform authority and side-effect flags default and fail safe to `false`. The reversible legacy Facebook fallback defaults and fails safe to `true`. Invalid values are surfaced and cannot silently enable a platform write.

## 2. Global outbound-write safety

Provider writes remain guarded at the execution boundary, not only when an API request or queue item is created.

- Instagram standard replies re-check cutover authority and global/social/Instagram write controls immediately before the provider call.
- Instagram private replies additionally require the independent private-reply flag.
- Facebook Page messages, comment replies and media sends check current global/social/Facebook controls at the provider boundary.
- Existing queued Facebook retries remain deferred while blocked and do not consume a retry attempt merely because a kill switch is active.
- Admin projections expose only safe mode, boolean and reason-code status.

**No direct provider-write bypass remains in the audited production paths.**

## 3. Lead Ads cutover

The Lead path supports `LEGACY`, side-effect-free `SHADOW`, prerequisite-gated `PLATFORM`/`DOMAIN`, and explicit `LEGACY_ROLLBACK`.

- Legacy remains the only full processor in legacy, shadow and rollback modes.
- Shadow compares a safe normalized projection and cannot persist a second Lead or execute a second CRM handoff.
- Platform mode requires both `META_PLATFORM_LEADS=true` and `META_PLATFORM_SOCIAL_WEBHOOKS=true`.
- Invalid selectors fail safe to rollback semantics.
- Legacy disable requires observed samples, bounded mismatch, zero duplicate handoffs, zero unresolved permanent failures and a completed rollback drill.

## 4. Instagram cutover

Instagram read, standard reply, private reply and media download authority are independently controlled.

- Legacy is authoritative for legacy, shadow and rollback inbound modes.
- Platform is authoritative only after the platform Instagram and social-webhook prerequisites are enabled.
- Shadow comparison excludes raw message text, provider identifiers and URLs.
- Standard reply, private reply and media download remain separately fail-closed.
- Durable conversation, message and outbound-request state is preserved across selector changes.
- Legacy disable requires zero duplicate messages/provider writes and a completed rollback drill.

## 5. Facebook and realtime cutover

The shared main-app/realtime contract assigns exactly one provider-ingress owner and one retry owner.

- Legacy authority dynamically enables the realtime legacy Graph path and retry worker.
- Shadow retains legacy authority and mirrors signed input for side-effect-free platform parity.
- Platform authority uses the main-app MetaPlatform/BullMQ path and disables legacy direct clients and retry ownership.
- Duplicate ingress uses the raw-body SHA-256 digest plus Page scope.
- Retry ownership is singular: `REALTIME_LEGACY` or `MAIN_APP_BULLMQ`, never both.
- Invalid or contradictory configuration resolves to `BLOCKED` rather than selecting an unsafe owner.

## 6. Rollback proof

All roadmap-required demonstrations passed at the source/offline boundary:

| Scenario | Result |
|---|---|
| `LEAD_PLATFORM_OFF` | PASS |
| `INSTAGRAM_READ_PLATFORM_OFF` | PASS |
| `INSTAGRAM_WRITES_OFF` | PASS |
| `INSTAGRAM_PRIVATE_REPLY_OFF` | PASS |
| `REALTIME_BRIDGE_OFF` | PASS |
| `LEGACY_FALLBACK_ACTIVE` | PASS |
| `QUEUED_JOBS_HONOR_CURRENT_FLAGS` | PASS |
| `NO_DATA_CORRUPTION_AFTER_TOGGLE` | PASS |
| `AUDIT_EVIDENCE_CAPTURED` | PASS |

The rollback projection contains only modes, authorities, booleans, safe reason codes, counts and opaque SHA-256 digests. Raw environment values, secrets, provider payloads, customer names, emails, phone numbers, Lead fields and message text are excluded.

## 7. Duplicate and data-integrity boundaries

The cumulative gate requires:

- zero duplicate Lead CRM handoffs;
- zero duplicate Instagram messages;
- zero duplicate provider writes;
- zero duplicate Facebook events;
- unchanged receipt, Lead, Instagram and Facebook canonical digests during a control-only rollback;
- no provider-write count increase during rollback;
- audit history may increase but cannot decrease.

Any violation changes the rollback verdict from `PASS` to `BLOCKED`.

## 8. Verification matrix

| Gate | Result |
|---|---|
| Layer 8.1 flag contract | PASS |
| Layer 8.2 outbound kill switch | PASS |
| Layer 8.3 Lead Ads cutover | PASS |
| Layer 8.4 Instagram cutover | PASS |
| Layer 8.5 Facebook/realtime cutover | PASS |
| Layer 8.6 rollback proof | PASS |
| Layer 8.7 cumulative tests and static audit | PASS |
| Layer 7 cumulative regression | PASS |
| Second Brain consistency | PASS |
| Prisma schema invariant | PASS |

## 9. Prisma status

- Prisma schema change: **NO**
- Prisma migration: **NO**
- Baseline schema SHA-256: `d3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce`

## 10. Remaining Layer 9 evidence

Layer 9 must still provide the automated Phase 31 audit bundle, live PostgreSQL migration/runtime evidence, Redis/BullMQ crash/retry/dead-letter evidence, realtime process evidence, live Lead Ads and Instagram provider evidence, production observation-window results, and the final Phase 31 release decision.
