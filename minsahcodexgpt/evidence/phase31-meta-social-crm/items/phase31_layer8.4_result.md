# Phase 31 Layer 8.4 Result — Instagram cutover sequence

Status: COMPLETE / PASS

## What changed

- Added a machine-readable Instagram cutover contract covering inbound read authority, standard/private outbound authority, media-download authority, rollback semantics, parity fields and legacy-disable criteria.
- Added fail-safe `LEGACY`, side-effect-free `SHADOW`, prerequisite-gated `PLATFORM`/`DOMAIN`, and explicit `LEGACY_ROLLBACK` handling for Instagram inbound processing.
- Ensured only one full inbound processor owns durable persistence and side effects: legacy remains authoritative in legacy/shadow/rollback modes; platform is authoritative only in platform mode.
- Added shadow comparison projections for conversation/message identity, participant scope, provider ID presence, timestamps, attachment state, source references and reply-policy parity without exposing raw text, raw provider IDs or URLs.
- Added independent standard-reply, private-reply and media-download cutover controls, re-evaluated at request/worker execution boundaries where applicable.
- Preserved the Layer 8.2 global/social/Instagram kill-switch checks beneath the cutover authority check.
- Prevented media download scheduling while retaining safe attachment metadata when media cutover is disabled.
- Added secret-free Instagram cutover visibility to admin health and the Instagram operations UI.
- Added environment enum validation, safe defaults, runbook, focused tests and static audit.

## What did not change

- No Facebook/realtime cutover authority changed.
- No live Instagram provider write, webhook delivery or media download was executed during offline verification.
- Legacy Instagram code was not deleted; explicit rollback remains available.
- Durable conversation/message/send records are preserved across selector changes.
- No full Layer 8 ZIP was created because sub-layers produce patch/checksum/log only.

## Prisma status

- `prisma/schema.prisma`: unchanged.
- Schema SHA-256 remains `d3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce`.
- `prisma/migrations/`: unchanged.
- Migration required: NO.

## Verification status

- Focused Layer 8.4 tests: 10/10 PASS.
- Layer 8.4 static audit: PASS.
- Instagram Layer 5.6, 5.7, 5.8 and 5.9 regression gates: PASS.
- Layer 8.1, 8.2 and 8.3 regression gates: PASS.
- Layer 7 cumulative regression gate: PASS.
- Phase 18 environment/docs audit: 18/18 PASS on both baseline and modified tree.
- Prisma baseline hash comparison: PASS.
- Fresh patch-apply verification: PASS; applied tree exactly matches the verified working tree.

## Claim boundary / known blocker

Live PostgreSQL, Redis/BullMQ, Instagram webhook/provider writes, real media downloads and production observation-window evidence remain Layer 9 work. Item 8.4 proves deterministic source/offline cutover behavior and does not claim live production cutover.

## Exact next item

`8.5 — Legacy Facebook and realtime cutover`
