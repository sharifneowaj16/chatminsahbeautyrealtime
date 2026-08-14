# Meta v6 Phase 15 Release Governance Runbook

## Purpose

This runbook is the controlling release procedure for Meta v6. A green source audit is not a production release. Production requires generated-client freshness, disposable migration evidence, passing phase gates, current Graph API policy, critical runtime E2E evidence, and a write-once evidence-bound release claim.

## Release states

- `READY_FOR_GENERATION`: source and semantic gates pass; Prisma generation or migration proof is missing.
- `READY_FOR_RUNTIME_QA`: generated/migration/static engineering evidence is ready, but provider/runtime proof is pending.
- `COMPLETE`: phase acceptance evidence is attached and verified.
- Production release: all 15 phases are `COMPLETE`, every production gate passes, and a claim is generated from the passing production report.

## CI sequence

1. Install exact lockfile dependencies with lifecycle scripts disabled.
2. Generate and stamp Prisma Client.
3. Validate the Prisma schema.
4. Apply all migrations to disposable PostgreSQL.
5. Verify every committed migration SHA-256 and rollback/forward-fix note.
6. Run Meta Phase 1–15 semantic and static gates.
7. Run global blocker, Graph API policy, security, dependency, typecheck, lint, tests, and build gates.
8. Produce an engineering release evaluation. This may contain runtime warnings and is not a production claim.

## Runtime evidence procedure

Update `config/meta-v6-runtime-evidence.json` only with synthetic-safe metadata. Each `ATTACHED` row must include:

- environment (`staging` or `production`),
- artifact path or immutable evidence reference,
- UTC capture timestamp,
- SHA-256 digest.

Do not store tokens, raw webhook bodies, customer identifiers, email addresses, phone numbers, or provider payloads containing PII in the ledger.

## Migration procedure

- Never modify a migration after it is recorded in `config/meta-v6-migration-manifest.json`.
- Apply migrations to a disposable database before staging.
- Capture `prisma migrate status`, apply output, schema checks, and smoke-test output.
- Before data dependency, transactional rollback may be used where safe.
- After deployment/data dependency, prefer a reviewed forward-fix migration.
- Destructive statements require explicit backup/restore and data-loss review evidence.

## Production release procedure

```bash
npm ci --ignore-scripts
npm run db:generate
npx prisma validate
npx prisma migrate deploy
npm run qa:meta-v6-all-phases
npm run qa:meta-v6-migrations
npm run qa:meta-v6-evidence -- --production
npm run qa:meta-v6-release -- --write-report
npm run release:meta-v6-claim -- --release-id=<immutable-release-id>
```

The production release gate is expected to fail until all runtime evidence is attached and every phase is `COMPLETE`. Never bypass it or manually edit a release report/claim.

## Rollback and incident handoff

Before deployment, record application image digest, database backup reference, migration head, Graph API version, worker versions, and on-call owner. For provider mutation incidents, disable write permissions/schedulers first, preserve audit ledgers, then reconcile provider state. For schema incidents after data dependency, use a forward-fix migration rather than deleting migration history.
