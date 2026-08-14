# Phase 29 evidence — Ads, creatives, insights, targeting and audiences migration

## Status

`CODE_COMPLETE` for repository source and dependency-independent verification scope. Production `COMPLETE` is not claimed.

## Implemented source evidence

- Unified Business SDK adapters own account, campaign, ad set, creative, ad, synchronous/async insight and custom/lookalike/website-audience provider operations.
- `lib/meta-business/marketing.ts` and `lib/meta-business/audiences.ts` are compatibility facades with no direct SDK/token access.
- Ads and Audience reads have explicit `LEGACY`, `SHADOW` and `PLATFORM` modes. Cache entries are mode-aware: a cutover-mode change forces a provider attempt and permits the prior value only as bounded stale fallback.
- Writes have test-asset selection, explicit platform enable, independent legacy-disable flags, global/domain kill switches and fail-closed blocking.
- Existing Phase 13 exact approval, payload allowlisting, budget limits, PAUSED-on-create, provider before/after and reconciliation controls remain active.
- Every audience write is an exact two-person `CRITICAL` approval. Direct rows require explicit consent and at least one strong identifier (email, phone or external ID); identifiers are normalized and deterministically SHA-256 hashed before approval, and canonical approval/audit payloads reject raw PII.
- Audience member sync locks the complete canonical hashed batch with an explicit SHA-256 digest. Approval hashing uses the complete sanitized payload without the display/audit redactor's 100-item or 4,000-character truncation and fails closed on cyclic/deep payloads.
- Stale insight fallback cannot be persisted as a successful fresh synchronization.
- No Prisma schema change or fabricated migration was introduced for Phase 29.

## Fresh local command evidence — 2026-07-23

```text
Dependency-independent compiled Phase 29 runtime tests: 7/7 PASS
Phase 29 TypeScript syntax transpilation: 35/35 PASS
Filtered global tsc: 0 Phase 29 non-dependency diagnostics
Phase 29 static audit: 28/28 PASS
Inherited Phase 13 Ads audit: 56/56 PASS
Phase 26 audit: 124/124 PASS
Phase 27 audit: 89/89 PASS
Phase 28 audit: 86/86 PASS
MetaPlatform boundary audit: 83/83 PASS; 2 dependency-backed smoke imports blocked
Migration governance: 392/392 PASS
Meta source inventory: 47/47 PASS; 460 active paths, 23 capabilities, 15 realtime paths
Security audit comparison: 23 inherited issues in both clean Phase 28 baseline and Phase 29 working copy; 0 added, 0 removed
```

The exact package gate `npm run test:meta-v6-phase29` is blocked before loading because package `tsx` is absent. `npm run typecheck` and `npm run build` stop at the pre-existing stale generated Prisma snapshot; `npm run lint` cannot start because `eslint` is absent with `node_modules`. These are dependency/environment blockers, not recorded as passing tests. Pending approvals created before this full-payload hashing hardening must be re-requested if their payload contains large arrays/strings; hash mismatch is intentionally fail-closed.

## Runtime evidence still required

1. Shadow-read match evidence for campaigns, ad sets, ads, creatives, insights and audiences.
2. A paused owned test-asset mutation with independent approval, exact payload hash and provider before/after proof.
3. A consented audience sync showing hashed-only persisted approval/audit data.
4. Async report start/status/results against an owned ad account.
5. Kill-switch denial and rollback drill, followed by observed legacy disable.
6. Fresh locked dependency install, Prisma generation, exact Phase 29/cumulative tests, standard typecheck/lint/build and CI evidence.

Until those items are attached, production writes and legacy disable must remain off.

## Rollback artifact

Pre-change rollback archive SHA-256: `c021798f36d32c4d8be7fe5b96eb6f78d528a29a6d1ff40a2faa004f1ea35bb9`.
