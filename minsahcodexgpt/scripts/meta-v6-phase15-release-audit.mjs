#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
let passed = 0; let failed = 0;
function expect(label, condition) {
  if (condition) { passed += 1; console.log(`PASS ${label}`); }
  else { failed += 1; console.error(`FAIL ${label}`); }
}

const requiredFiles = [
  'lib/meta/release/governance.ts',
  'config/meta-v6-release-policy.json',
  'config/meta-v6-runtime-evidence.json',
  'config/meta-v6-migration-manifest.json',
  'scripts/meta-v6-migration-governance-audit.mjs',
  'scripts/meta-v6-evidence-gate.mjs',
  'scripts/meta-v6-release-gate.mjs',
  'scripts/meta-v6-release-claim.mjs',
  'tests/meta-v6/phase15-release-governance.test.ts',
  '.github/workflows/meta-v6-release.yml',
  'docs/release/meta-v6/PHASE15_RELEASE_GOVERNANCE_RUNBOOK.md',
  'docs/release/meta-v6/phase-15-evidence.md',
];
for (const file of requiredFiles) expect(`required file ${file}`, exists(file));

const governance = read('lib/meta/release/governance.ts');
for (const token of ['validateRuntimeEvidenceLedger', 'pendingRuntimeEvidence', 'evaluateReleaseReadiness', 'createReleaseClaim', 'sha256Canonical']) expect(`governance exports ${token}`, governance.includes(`function ${token}`) || governance.includes(`function ${token}`));
expect('production mode requires COMPLETE phases', governance.includes("phase.state.status !== 'COMPLETE'"));
expect('production mode blocks pending runtime evidence', governance.includes("input.mode === 'production'") && governance.includes('pendingRuntimeEvidence'));
expect('engineering mode preserves pending evidence as warning', governance.includes('warnings.push(...runtimePending)'));
expect('failed gates are release blockers', governance.includes("gate.status === 'FAIL'"));
expect('pending production gates are blockers', governance.includes("gate.status === 'PENDING'") && governance.includes("gate:${gate.id}:pending"));
expect('release claims require production mode', governance.includes('RELEASE_CLAIM_REQUIRES_PRODUCTION_MODE'));
expect('release claims require passing decision', governance.includes('RELEASE_CLAIM_BLOCKED'));
expect('release claims reject forged passing evaluations', governance.includes('RELEASE_CLAIM_EVALUATION_INVALID'));
expect('release claims require all gates pass', governance.includes("gate.status === 'PASS' || gate.status === 'NOT_REQUIRED'"));
expect('release IDs are path-safe', governance.includes('RELEASE_ID_INVALID'));
expect('claim is evidence-digest bound', governance.includes('evidenceDigest: evaluation.evidenceDigest'));
expect('claim includes self hash', governance.includes('claimDigest: sha256Canonical(claim)'));
expect('attached evidence requires SHA-256', governance.includes('RUNTIME_EVIDENCE_SHA256_INVALID'));
expect('attached evidence requires environment', governance.includes('RUNTIME_EVIDENCE_ENVIRONMENT_MISSING'));
expect('attached evidence requires capturedAt', governance.includes('RUNTIME_EVIDENCE_CAPTURED_AT_INVALID'));
expect('duplicate evidence keys rejected', governance.includes('RUNTIME_EVIDENCE_DUPLICATE_KEY'));
expect('unknown phase rows rejected', governance.includes('RUNTIME_LEDGER_UNKNOWN_PHASE'));

const policy = JSON.parse(read('config/meta-v6-release-policy.json'));
expect('release policy schema v1', policy.schemaVersion === 1);
expect('release policy has engineering gates', policy.requiredEngineeringGates.length >= 8);
expect('release policy has production gates', policy.requiredProductionGates.length >= 8);
for (const token of ['prisma-client-freshness', 'migration-apply', 'graph-version-release', 'critical-e2e', 'runtime-evidence', 'release-claim']) expect(`production policy includes ${token}`, policy.requiredProductionGates.includes(token));
for (const token of ['COMPLETE_WITH_PENDING_RUNTIME_EVIDENCE', 'RELEASE_WITH_STALE_PRISMA_CLIENT', 'RELEASE_WITH_UNHASHED_MIGRATION', 'RELEASE_WITH_EXPIRED_GRAPH_VERSION']) expect(`forbidden claim ${token}`, policy.forbiddenClaims.includes(token));
expect('CI evidence is synthetic only', policy.evidence.syntheticOnlyInCi === true);
expect('raw secrets forbidden', policy.evidence.rawSecretsForbidden === true);
expect('raw PII forbidden', policy.evidence.rawPiiForbidden === true);

const ledger = JSON.parse(read('config/meta-v6-runtime-evidence.json'));
expect('runtime ledger schema v1', ledger.schemaVersion === 1);
expect('runtime ledger has all 15 phases', ledger.phases.length === 15);
expect('runtime ledger phase IDs unique', new Set(ledger.phases.map((row) => row.phaseId)).size === 15);
expect('runtime evidence is explicit, not silently omitted', ledger.phases.every((row) => row.evidence.length > 0));
expect('runtime evidence statuses are controlled', ledger.phases.every((row) => row.evidence.every((item) => ['ATTACHED', 'PENDING', 'NOT_REQUIRED', 'EXPIRED'].includes(item.status))));
expect('no fake attached evidence in baseline ledger', ledger.phases.every((row) => row.evidence.every((item) => item.status !== 'ATTACHED')));

const migrations = JSON.parse(read('config/meta-v6-migration-manifest.json'));
expect('migration manifest schema v1', migrations.schemaVersion === 1);
expect('migration manifest covers many migrations', migrations.migrations.length >= 30);
expect('every migration has SHA-256', migrations.migrations.every((row) => /^[a-f0-9]{64}$/.test(row.sha256)));
expect('every migration has rollback strategy', migrations.migrations.every((row) => row.rollbackStrategy.length >= 20));
expect('every migration has verification note', migrations.migrations.every((row) => row.verification.length >= 20));
expect('destructive classification is boolean', migrations.migrations.every((row) => typeof row.destructive === 'boolean'));
expect('phase migrations are associated to phase IDs', migrations.migrations.filter((row) => row.migration.includes('meta_v6_phase')).every((row) => Number.isInteger(row.phase)));

const releaseGate = read('scripts/meta-v6-release-gate.mjs');
expect('release gate runs blocker audit', releaseGate.includes('meta-v6-gap-audit.mjs') && releaseGate.includes('--strict'));
expect('release gate runs migration audit', releaseGate.includes('meta-v6-migration-governance-audit.mjs'));
expect('release gate runs evidence gate', releaseGate.includes('meta-v6-evidence-gate.mjs'));
expect('release gate runs version gate', releaseGate.includes('meta-graph-version-policy-audit.mjs'));
expect('production release uses version release mode', releaseGate.includes("production ? ['--release']"));
expect('release gate checks Prisma freshness', releaseGate.includes('prisma-client-freshness.mjs'));
expect('production gate checks typecheck', releaseGate.includes("['typecheck', ['run', 'typecheck']]"));
expect('production gate checks lint', releaseGate.includes("['lint', ['run', 'lint']]"));
expect('production gate checks build', releaseGate.includes("['build', ['run', 'build']]"));
expect('production gate checks master tracking', releaseGate.includes("['master-tracking', ['run', 'qa:master-tracking']]"));
expect('evidence-only mode verifies fresh command evidence', releaseGate.includes("evidenceOnly") && releaseGate.includes('validateCommandEvidenceLedger') && releaseGate.includes('validateCommandEvidenceLogs') && releaseGate.includes('commandEvidenceToGate'));
expect('critical E2E remains explicit pending without evidence', releaseGate.includes("id: 'critical-e2e', status: 'PENDING'"));
expect('migration runtime proof remains explicit pending', releaseGate.includes("id: 'migration-apply-rollback', status: 'PENDING'"));
expect('release report is machine-readable JSON', releaseGate.includes('JSON.stringify(evaluation, null, 2)'));
expect('blocked release exits nonzero', releaseGate.includes("evaluation.decision !== 'PASS'"));

const claim = read('scripts/meta-v6-release-claim.mjs');
expect('claim consumes production report only', claim.includes('phase-15-production-release-report.json'));
expect('claim reruns fresh production gate', claim.includes('meta-v6-release-gate.mjs') && claim.includes('PRODUCTION_RELEASE_GATE_FAILED'));
expect('claim file is write-once', claim.includes("flag: 'wx'"));
expect('claim requires explicit release ID', claim.includes('--release-id='));

const workflow = read('.github/workflows/meta-v6-release.yml');
expect('workflow pins Node from .node-version', workflow.includes('node-version-file: .node-version'));
expect('workflow uses npm ci', workflow.includes('npm ci'));
expect('workflow has PostgreSQL service', workflow.includes('postgres:') && workflow.includes('POSTGRES_DB'));
expect('workflow has Redis service', workflow.includes('redis:'));
expect('workflow generates Prisma client', workflow.includes('npm run db:generate'));
expect('workflow validates Prisma schema', workflow.includes('npx prisma validate'));
expect('workflow deploys migrations to disposable database', workflow.includes('npx prisma migrate deploy'));
expect('workflow runs migration governance', workflow.includes('qa:meta-v6-migrations'));
expect('workflow runs all Meta phase gates', workflow.includes('qa:meta-v6-all-phases'));
expect('workflow runs security gate', workflow.includes('audit:security'));
expect('workflow runs production evidence gate', workflow.includes('qa:meta-v6-evidence'));
expect('workflow runs inherited master tracking gate', workflow.includes('qa:master-tracking'));
expect('workflow runs typecheck', workflow.includes('npm run typecheck'));
expect('workflow runs lint', workflow.includes('npm run lint'));
expect('workflow runs build', workflow.includes('npm run build'));
expect('workflow never embeds a real Meta token', !/EA[A-Za-z0-9]{30,}/.test(workflow));
expect('workflow does not auto-generate production claim', !workflow.includes('release:meta-v6-claim'));

const packageJson = JSON.parse(read('package.json'));
for (const script of ['test:meta-v6-phase15', 'qa:meta-v6-phase15', 'qa:meta-v6-migrations', 'qa:meta-v6-evidence', 'qa:meta-v6-release', 'release:meta-v6-claim', 'qa:meta-v6-all-phases']) expect(`package script ${script}`, Boolean(packageJson.scripts[script]));
expect('combined phase15 gate runs semantic and static', packageJson.scripts['qa:meta-v6-phase15'].includes('test:meta-v6-phase15') && packageJson.scripts['qa:meta-v6-phase15'].includes('meta-v6-phase15-release-audit.mjs'));
expect('production release gate is explicit', packageJson.scripts['qa:meta-v6-release'].includes('--production'));
expect('claim script does not run automatically in predeploy', !packageJson.scripts['qa:predeploy'].includes('release:meta-v6-claim'));

console.log(`\nPhase 15 release governance static audit: ${passed}/${passed + failed} passed`);
if (failed) process.exit(1);
