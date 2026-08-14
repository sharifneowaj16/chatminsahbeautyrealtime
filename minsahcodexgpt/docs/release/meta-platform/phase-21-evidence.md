# Phase 21 evidence — canonical models, context, and external references

## Source status

`READY_FOR_GENERATION`

The canonical model, normalization boundary, environment/asset context, reference repository, forward migration, recovery SQL, explicit backfill builder, tests, audits, inventory entries, ADR, and runbook are present. No provider call, credential lookup, live backfill, UI change, or legacy cutover occurred.

## Verified commands

```text
npm ci --ignore-scripts
PASS — 631 packages installed; npm reported 3 high-severity audit findings.

npm run test:meta-v6-phase21
PASS — 6/6 tests.

npm run qa:meta-platform-phase21
PASS — 47/47 checks.

npm run qa:meta-v6-migrations
PASS — 367/367 checks; 72 committed migrations hashed.

npm run qa:meta-platform-inventory
PASS — 45/45 checks; 321 active paths, 21 capabilities, 15 realtime-service paths.

npm run typecheck:ts
PASS.

npm run qa:meta-v6-phase20
PASS — Phase 20 tests 9/9, boundary audit 81/81, inventory 45/45.

npm run qa:meta-v6-phase19
PASS — tests 4/4 and inventory 45/45.

npm run qa:phase18-env-docs
PASS — 18/18.

npm run test:phase17-compat
PASS — 5/5.

npm test
PASS — 16/16.

npm run lint
PASS — 0 errors, 474 existing warnings.
```

## Blocked evidence

```text
npx prisma validate --schema prisma/schema.prisma
BLOCKED — binaries.prisma.sh DNS resolution failed with EAI_AGAIN.

npm run db:generate
BLOCKED — same Prisma engine download failure.

npm run typecheck
BLOCKED — generated Prisma client freshness gate.

npm run build
BLOCKED — same freshness gate before Next.js starts.

Disposable PostgreSQL migration apply/recovery drill
BLOCKED — psql, Docker, and Podman are unavailable in this sandbox.
```

## Migration and backfill boundary

The migration intentionally performs no automatic backfill because current connection rows do not prove environment provenance. The explicit backfill builder requires a verified `MetaAssetContext`; uniqueness conflicts stop rather than overwrite mappings.

## Required next evidence

1. Generate and review the Prisma client in an environment that can reach the official Prisma engine host.
2. Apply the migration to disposable PostgreSQL, inspect schema/index parity, exercise uniqueness, run `recovery.sql`, and reapply.
3. Produce an explicit environment-scoped backfill dry run and conflict report.
4. Re-run standard typecheck and production build with immutable source identity.
