# Meta v6 Phase 16 — Production Readiness & Evidence Closure Runbook

Phase 16 is a post-spec release-closure workstream. It does not add a sixteenth product feature phase and does not change the 15-phase completion policy. Its purpose is to replace ambiguous release blockers with hashed command evidence, named owners, executable closure commands, and explicit completion rules.

## 1. Capture local or CI command evidence

```bash
npm run capture:meta-v6-command-evidence
```

The collector runs TypeScript, ESLint, master tracking, and build commands. It continues after a failed command so the ledger records the complete release state. Add `-- --strict` when CI should fail if any captured command fails.

Artifacts:

- `config/meta-v6-command-evidence.json`
- `docs/release/meta-v6/phase-16-command-typecheck.log`
- `docs/release/meta-v6/phase-16-command-lint.log`
- `docs/release/meta-v6/phase-16-command-master-tracking.log`
- `docs/release/meta-v6/phase-16-command-build.log`

Evidence expires after 24 hours. Logs and summaries redact bearer credentials, secret-like environment values, database URL credentials, email addresses, and Bangladesh phone numbers. A changed source file, log, or ledger digest invalidates the gate.

## 2. Generate the production report from evidence

```bash
node --import tsx scripts/meta-v6-release-gate.mjs --production --evidence-only --write-report
```

Evidence-only mode no longer marks TypeScript, lint, build, and master tracking as automatically pending. It verifies the command ledger and log hashes, then reports the captured PASS or FAIL state. Prisma freshness, provider evidence, Graph version, migrations, and phase completion remain independent gates.

## 3. Map every blocker to a closure workstream

```bash
npm run qa:meta-v6-closure-status -- --write
```

The command fails if a production blocker has no owner, command, evidence requirement, or completion rule in `config/meta-v6-production-closure-plan.json`.

## 4. Production completion order

1. Generate Prisma Client from the final schema and pass the build from the same commit.
2. Apply all migrations to disposable PostgreSQL and exercise rollback or the documented forward-fix path.
3. Approve the target Meta Graph version only after catalog, CAPI, leads, diagnostics, ads, and Instagram regressions.
4. Attach runtime provider evidence with environment, capture time, artifact path, and SHA-256.
5. Promote phases to `COMPLETE` only through reviewed evidence.
6. Run the production release gate and rehearse rollback.
7. Generate a release claim only from a fresh production `PASS` evaluation.

## Safety boundaries

- A captured failure remains a release failure; the collector never converts it to pending or pass.
- Stale Prisma generation is not bypassed by source-only TypeScript success.
- Static tests cannot satisfy live Meta, Redis, storage, or database evidence.
- Raw tokens, PII, and unredacted payloads are forbidden in artifacts.
