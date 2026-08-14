# Phase 31 Layer 8.3 Result — Lead Ads cutover sequence

Status: COMPLETE / PASS

## What changed

- Added a machine-readable Lead Ads cutover contract with `LEGACY`, `SHADOW`, `PLATFORM`/`DOMAIN`, and `LEGACY_ROLLBACK` modes.
- Reconciled the canonical `META_PLATFORM_LEADS` and `META_PLATFORM_SOCIAL_WEBHOOKS` prerequisites with the lower-level Lead runtime selector.
- Made the safe default legacy authority and made invalid runtime/canonical values fail safe to legacy rollback semantics.
- Added a single-authority execution dispatcher: legacy/shadow/rollback invoke one legacy full processor; platform invokes one platform full processor.
- Added side-effect-free shadow comparison using the provider payload already fetched by legacy authority. Shadow does not persist a second Lead or execute a second CRM handoff.
- Added safe parity metrics and deterministic legacy-disable criteria for samples, mismatch rate, duplicate handoffs, permanent failures, observation duration and rollback drill.
- Added environment enum validation, admin health visibility, runbook, focused tests and static audit.

## What did not change

- No Instagram or Facebook cutover authority changed.
- No live Meta Lead was fetched and no CRM handoff was executed during offline verification.
- Legacy code was not deleted; rollback availability remains required.
- No full Layer 8 ZIP was created because sub-layers produce patch/checksum/log only.

## Prisma status

- `prisma/schema.prisma`: unchanged.
- Schema SHA-256 remains `d3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce`.
- `prisma/migrations/`: unchanged.
- Migration required: NO.

## Verification status

- Focused Layer 8.3 tests: PASS.
- Layer 8.3 static audit: PASS.
- Lead Layer 5.3 regression gate: PASS.
- Layer 8.1 and 8.2 regression gates: PASS.
- Layer 7 cumulative regression gate: PASS.
- Base `.env.example` validation: PASS.
- Patch fresh-apply verification: PASS.

## Claim boundary / known blocker

Live PostgreSQL, Redis/BullMQ, Meta provider delivery, real CRM handoff and observation-window evidence remain Layer 9 work. Item 8.3 proves deterministic source/offline cutover behavior and does not claim live production cutover.

## Exact next item

`8.4 — Instagram cutover sequence`
