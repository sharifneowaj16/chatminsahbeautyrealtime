# Meta v6 Phase 15 Evidence — Testing, CI, Migration & Release Governance

## Status

`READY_FOR_GENERATION`

The engineering governance layer is implemented and must remain separate from production release approval. No production claim has been generated.

## Implemented controls

- Deterministic release evaluation with separate `engineering` and `production` modes.
- Runtime evidence ledger covering all 15 phases; missing provider evidence is explicit and fail-closed for production.
- SHA-256 migration inventory covering every committed Prisma migration.
- Rollback/forward-fix and verification notes for every migration.
- Evidence-bound, write-once release claims that can only be generated from a passing production report.
- Dedicated CI workflow with disposable PostgreSQL and Redis, Prisma generation/validation/migration deployment, all Meta phase gates, security, typecheck, lint, tests, and build.
- Graph API policy, global blocker, Prisma freshness, migration, evidence, and critical-E2E release blockers.
- Production rollback and operational handoff runbook.

## Primary files

- `lib/meta/release/governance.ts`
- `config/meta-v6-release-policy.json`
- `config/meta-v6-runtime-evidence.json`
- `config/meta-v6-migration-manifest.json`
- `scripts/meta-v6-migration-governance-audit.mjs`
- `scripts/meta-v6-evidence-gate.mjs`
- `scripts/meta-v6-release-gate.mjs`
- `scripts/meta-v6-release-claim.mjs`
- `scripts/meta-v6-phase15-release-audit.mjs`
- `tests/meta-v6/phase15-release-governance.test.ts`
- `.github/workflows/meta-v6-release.yml`
- `docs/release/meta-v6/PHASE15_RELEASE_GOVERNANCE_RUNBOOK.md`

## Engineering validation

Final engineering results:

```text
Phase 15 semantic tests               21/21 passed
Phase 15 static audit                109/109 passed
Migration governance                 362/362 passed
Runtime evidence ledger                    8/8 passed
Global blocker gate                        14/14 passed
Graph API policy                           16/16 passed
Admin API security                    97 routes passed
Meta Business platform                    22/22 passed
Phase 14 regression                22/22 + 81/81 passed
Phase 13 regression                15/15 + 56/56 passed
Phase 12 regression                14/14 + 51/51 passed
Phase 11 regression                13/13 + 41/41 passed
Phase 10 regression                12/12 + 40/40 passed
Phase 09 regression                11/11 + 30/30 passed
Phase 08 regression                14/14 + 68/68 passed
Repository tests                          16/16 passed
Direct TypeScript compiler                       passed
Targeted ESLint                    0 errors / 0 warnings
```

Detailed logs are stored under `docs/release/meta-v6/phase-15-*.log`. Dedicated Phase 15 tests cover canonical evidence hashing, malformed and duplicate runtime evidence, engineering warnings, production blockers, incomplete phases, failed/pending gates, release-claim refusal, and path-safe immutable claim IDs.

The engineering report is `BLOCKED` by one gate—generated Prisma client freshness—and retains 10 explicit runtime warnings. The evidence-only production report is `BLOCKED` by 32 explicit reasons. This is the intended fail-closed outcome, not a test failure.

## Expected production blockers

Production release remains blocked until all of the following are attached and green:

1. Fresh generated Prisma Client for the final schema.
2. Prisma schema validation.
3. Disposable PostgreSQL migration apply and rollback/forward-fix drill evidence.
4. All runtime-required phase evidence in staging or production.
5. Critical Catalog, Purchase/CAPI, Lead, Product Set, Ads, and Instagram E2E flows.
6. All 15 phase states changed to `COMPLETE` only after their evidence is verified.
7. Passing Graph API release-version gate.
8. Passing application build and final production release report.

The current environment cannot reach `binaries.prisma.sh`, so Prisma generation/validation and disposable migration proof are not claimed. The production release gate is intentionally expected to fail and no release claim is present.

## Rollback

Remove the Phase 15 governance files and package/workflow entries to revert the control-plane change. This phase adds no Prisma schema or data migration. Existing migrations are only inventoried and hashed; they are not edited by this phase.
