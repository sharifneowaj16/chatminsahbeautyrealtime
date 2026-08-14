# ADR-029 — Ads, insights, targeting and audiences cutover

- **Status:** Accepted for source migration
- **Date:** 2026-07-23
- **Phase:** 29

## Context

Campaign, ad set, ad, creative, insights and audience code previously called the legacy Business SDK helper directly. Ads mutations already had Phase 13 approval, budget and before/after controls, but audience writes bypassed the approval lifecycle and the audience sync route could pass raw request bodies into legacy logging.

## Decision

1. All Phase 29 provider calls live under `lib/meta-platform/transports/business-sdk/**` and use the exact `BUSINESS_SYSTEM_USER` credential role through `MetaBusinessSdkClientFactory`.
2. Application compatibility modules delegate to MetaPlatform Phase 29 facades. They no longer read a token, construct SDK entities or import the SDK helper.
3. Reads use explicit `LEGACY -> SHADOW -> PLATFORM` selection. Shadow calls both logical paths, keeps legacy-shaped output authoritative, compares canonical values and exposes mismatch metadata. Cached entries record the mode that produced them: a mode change forces a fresh provider attempt, while the prior entry remains eligible only as bounded stale fallback if that attempt fails. Bounded stale fallback is permitted for reads only.
4. Writes are never shadowed. They use approval payload hashing, a durable execution row, provider before/after reads, reconciliation-required state, a global/domain kill switch, optional test-asset selection, explicit platform enable and separate legacy-disable flags.
5. Ad set targeting is canonicalized with deterministic country ordering and safe Bangladesh defaults (`BD`, ages 18–65) when omitted.
6. Insight sync rejects stale fallback so cached data cannot be recorded as a fresh successful provider ingestion. Sync and async report creation/status/results use the unified transport.
7. Custom-audience direct rows require explicit consent and at least one strong identifier (email, phone or external ID) on every row. Identifiers are normalized and SHA-256 hashed before approval creation. Raw email, phone and names are forbidden from canonical approval/audit payloads.
8. Member sync includes a deterministic digest of the complete canonical hashed batch. The approval payload hash covers the complete sanitized payload without display-layer truncation and fails closed on cyclic or excessively deep structures.
9. Every custom, lookalike, website-retargeting, update and member-sync write is a `CRITICAL` `META_AUDIENCE_MUTATION`. The requester may create an exact hashed approval request, but a different approver must approve it before execution.

## Consequences

- Default flags preserve logical legacy selection while the provider implementation is already behind the unified transport boundary.
- Production cutover cannot be claimed from source gates alone. Shadow comparison, paused test asset, controlled writes, kill-switch rollback and provider before/after evidence remain runtime release gates.
- Existing Phase 13 Ads approval and safety behavior remains inherited and regression protected.
- Pending large-payload approvals created before the full-payload hashing change are not reusable; operators must request a new approval rather than bypassing the mismatch.
