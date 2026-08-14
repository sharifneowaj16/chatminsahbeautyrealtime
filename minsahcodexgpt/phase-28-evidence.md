# Phase 28 — Connection health and CAPI migration evidence

**Status:** `CODE_COMPLETE`

Source implementation is complete. Production cutover and `COMPLETE` status remain blocked until Phase 27 runtime prerequisites and Phase 28 live/runtime evidence are attached.

## Implemented

- unified connection health domain using role-isolated credentials, token debug, normalized permissions/assets and central version policy;
- legacy/shadow/platform connection facade with explicit legacy-disable control;
- unified CAPI domain and Business SDK adapter loaded only in worker runtime;
- stable event-ID test/canary/full cutover with exactly one write transport;
- public CAPI route commits the transactional outbox without requiring a live provider token;
- core, COD, online paid Purchase and offline/dataset conversion delivery use the Phase 28 facade;
- sender persists transport, cutover mode, Graph/SDK version and credential-version evidence;
- admin connection/event endpoints expose safe cutover status;
- environment sample, CI, source inventory, tests, audit, ADR and runbook updated.

## Source verification

- `node scripts/meta-platform-phase28-audit.mjs`
- `npm run test:meta-v6-phase28` when locked dependencies are installed
- `npm run qa:meta-v6-phase28`
- `npm run qa:meta-platform-phases19-28`
- `node scripts/meta-platform-source-inventory.mjs --write-docs`

## Runtime evidence required before `COMPLETE`

- Phase 27 PostgreSQL generation/apply and multi-process fencing/reconciliation proof;
- connection shadow comparison with reviewed mismatches;
- Meta test-event delivery through the unified adapter;
- deterministic canary observation and rollback;
- shared browser/server event ID and duplicate Purchase proof;
- old-event policy proof;
- Redis outage/outbox reconstruction proof;
- CAPI token rotation/client invalidation proof;
- circuit open/half-open/recovery proof;
- final legacy producer disable approval and observation window.

No Prisma schema change was made in Phase 28, so no migration SQL is required for this phase.

## Fresh command evidence — 2026-07-23 Asia/Dhaka

```text
Phase 28 dependency-independent compiled runtime checks: 24/24 PASS
Phase 28 compiled focused repository runtime tests: 4/4 PASS
Phase 28 focused core TypeScript: PASS
Phase 28 focused test TypeScript: PASS
Phase 28 source audit: 86/86 PASS
Phase 19 inventory test: 4/4 PASS
Meta source inventory: 47/47 PASS — 441 active paths, 23 capabilities, 15 realtime paths
Phase 27 audit: 89/89 PASS
Phase 26 audit: 124/124 PASS
Phase 25 audit: 87/87 PASS
Phase 24 audit: 74/74 PASS
Phase 23 audit: 75/75 PASS
Phase 22 audit: 56/56 PASS
Phase 21 audit: 47/47 PASS
Prisma schema/migration pair: PASS — no Phase 28 schema change
Migration governance: PASS
Phase 20 structural boundary: 83/83 PASS with 2 dependency-blocked import smoke checks
Exact package-script Phase 28 test: BLOCKED before test loading because the delivered archive has no installed `tsx` dependency (`ERR_MODULE_NOT_FOUND`); the same repository test compiled with isolated dependency shims and ran 4/4 PASS
Full dependency-backed typecheck/build: NOT CLAIMED in this archive-only sandbox
```

The blocked `tsx` checks are environment/dependency availability limitations, not failed Phase 28 assertions. CI installs the exact lockfile dependencies before executing the complete test/typecheck/build pipeline.
