import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createReleaseClaim,
  evaluateReleaseReadiness,
  pendingRuntimeEvidence,
  sha256Canonical,
  validateRuntimeEvidenceLedger,
  type PhaseManifest,
  type RuntimeEvidenceLedger,
} from '../../lib/meta/release/governance';

const manifest = (statuses = Array.from({ length: 15 }, () => 'COMPLETE')): PhaseManifest => ({
  schemaVersion: 'meta_v6_loop_manifest_v1',
  phases: statuses.map((status, index) => ({
    id: index + 1,
    title: `Phase ${index + 1}`,
    runtimeEvidenceRequired: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(index + 1),
    state: { status, evidenceFile: `docs/release/meta-v6/phase-${String(index + 1).padStart(2, '0')}-evidence.md` },
  })),
});

const ledger = (status: 'ATTACHED' | 'PENDING' = 'ATTACHED'): RuntimeEvidenceLedger => ({
  schemaVersion: 1,
  generatedAt: '2026-07-18T00:00:00.000Z',
  phases: Array.from({ length: 15 }, (_, index) => ({
    phaseId: index + 1,
    evidence: [{
      key: 'runtime-proof',
      status: [1, 2].includes(index + 1) ? 'NOT_REQUIRED' : status,
      ...(status === 'ATTACHED' && ![1, 2].includes(index + 1)
        ? { environment: 'staging', artifact: `evidence/phase-${index + 1}.json`, capturedAt: '2026-07-18T00:00:00.000Z', sha256: 'a'.repeat(64) }
        : {}),
    }],
  })),
});

const passedGates = [
  { id: 'global-blockers', status: 'PASS' as const },
  { id: 'migration-governance', status: 'PASS' as const },
  { id: 'prisma-client-freshness', status: 'PASS' as const },
  { id: 'graph-version-release', status: 'PASS' as const },
  { id: 'build', status: 'PASS' as const },
  { id: 'critical-e2e', status: 'PASS' as const },
];

test('canonical hash is stable across object key order', () => {
  assert.equal(sha256Canonical({ b: 2, a: 1 }), sha256Canonical({ a: 1, b: 2 }));
});

test('canonical hash changes when evidence changes', () => {
  assert.notEqual(sha256Canonical({ status: 'PASS' }), sha256Canonical({ status: 'FAIL' }));
});

test('valid runtime evidence ledger has no issues', () => {
  assert.deepEqual(validateRuntimeEvidenceLedger(manifest(), ledger()), []);
});

test('duplicate phase rows are rejected', () => {
  const value = ledger(); value.phases.push(value.phases[0]);
  assert.ok(validateRuntimeEvidenceLedger(manifest(), value).some((issue) => issue.startsWith('RUNTIME_LEDGER_DUPLICATE_PHASE')));
});

test('unknown phase rows are rejected', () => {
  const value = ledger(); value.phases.push({ phaseId: 99, evidence: [] });
  assert.ok(validateRuntimeEvidenceLedger(manifest(), value).includes('RUNTIME_LEDGER_UNKNOWN_PHASE:99'));
});

test('attached evidence requires artifact, environment, timestamp and SHA-256', () => {
  const value = ledger(); value.phases[2].evidence[0] = { key: 'broken', status: 'ATTACHED' };
  const issues = validateRuntimeEvidenceLedger(manifest(), value);
  assert.ok(issues.some((issue) => issue.includes('ARTIFACT_MISSING')));
  assert.ok(issues.some((issue) => issue.includes('ENVIRONMENT_MISSING')));
  assert.ok(issues.some((issue) => issue.includes('CAPTURED_AT_INVALID')));
  assert.ok(issues.some((issue) => issue.includes('SHA256_INVALID')));
});

test('duplicate evidence keys within a phase are rejected', () => {
  const value = ledger(); value.phases[2].evidence.push(value.phases[2].evidence[0]);
  assert.ok(validateRuntimeEvidenceLedger(manifest(), value).some((issue) => issue.includes('DUPLICATE_KEY')));
});

test('pending runtime evidence is listed with phase and key', () => {
  const blockers = pendingRuntimeEvidence(manifest(), ledger('PENDING'));
  assert.ok(blockers.includes('phase-03:runtime-proof:pending'));
  assert.equal(blockers.some((item) => item.startsWith('phase-01')), false);
});

test('engineering evaluation warns on pending runtime evidence without approving production', () => {
  const result = evaluateReleaseReadiness({ mode: 'engineering', manifest: manifest(Array(15).fill('READY_FOR_RUNTIME_QA')), runtimeLedger: ledger('PENDING'), gates: passedGates });
  assert.equal(result.decision, 'PASS');
  assert.ok(result.warnings.some((item) => item.includes('phase-03')));
});

test('engineering evaluation blocks failed static gate', () => {
  const result = evaluateReleaseReadiness({ mode: 'engineering', manifest: manifest(), runtimeLedger: ledger(), gates: [{ id: 'typecheck', status: 'FAIL' }] });
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.blockers.includes('gate:typecheck'));
});

test('engineering evaluation treats pending gate as warning', () => {
  const result = evaluateReleaseReadiness({ mode: 'engineering', manifest: manifest(), runtimeLedger: ledger(), gates: [{ id: 'live-e2e', status: 'PENDING' }] });
  assert.equal(result.decision, 'PASS');
  assert.ok(result.warnings.includes('gate:live-e2e:pending'));
});

test('production evaluation blocks pending gate', () => {
  const result = evaluateReleaseReadiness({ mode: 'production', manifest: manifest(), runtimeLedger: ledger(), gates: [{ id: 'live-e2e', status: 'PENDING' }] });
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.blockers.includes('gate:live-e2e:pending'));
});

test('production evaluation blocks non-COMPLETE phase', () => {
  const statuses = Array(15).fill('COMPLETE'); statuses[14] = 'READY_FOR_RUNTIME_QA';
  const result = evaluateReleaseReadiness({ mode: 'production', manifest: manifest(statuses), runtimeLedger: ledger(), gates: passedGates });
  assert.ok(result.blockers.includes('phase-15:status:READY_FOR_RUNTIME_QA'));
});

test('production evaluation blocks pending runtime evidence', () => {
  const result = evaluateReleaseReadiness({ mode: 'production', manifest: manifest(), runtimeLedger: ledger('PENDING'), gates: passedGates });
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.blockers.includes('phase-03:runtime-proof:pending'));
});

test('production evaluation passes only with complete phases, attached runtime evidence and passing gates', () => {
  const result = evaluateReleaseReadiness({ mode: 'production', manifest: manifest(), runtimeLedger: ledger(), gates: passedGates });
  assert.equal(result.decision, 'PASS');
  assert.equal(result.blockers.length, 0);
});

test('release claim refuses engineering evaluation', () => {
  const evaluation = evaluateReleaseReadiness({ mode: 'engineering', manifest: manifest(), runtimeLedger: ledger(), gates: passedGates });
  assert.throws(() => createReleaseClaim(evaluation, 'release-2026-07-18'), /RELEASE_CLAIM_REQUIRES_PRODUCTION_MODE/);
});

test('release claim refuses blocked production evaluation', () => {
  const evaluation = evaluateReleaseReadiness({ mode: 'production', manifest: manifest(), runtimeLedger: ledger('PENDING'), gates: passedGates });
  assert.throws(() => createReleaseClaim(evaluation, 'release-2026-07-18'), /RELEASE_CLAIM_BLOCKED/);
});

test('release claim is deterministic about evidence digest and self-hashed', () => {
  const evaluation = evaluateReleaseReadiness({ mode: 'production', manifest: manifest(), runtimeLedger: ledger(), gates: passedGates });
  const claim = createReleaseClaim(evaluation, 'release-2026-07-18');
  assert.equal(claim.decision, 'APPROVED');
  assert.equal(claim.evidenceDigest, evaluation.evidenceDigest);
  assert.match(claim.claimDigest, /^[a-f0-9]{64}$/);
});

test('release ID rejects unsafe path characters', () => {
  const evaluation = evaluateReleaseReadiness({ mode: 'production', manifest: manifest(), runtimeLedger: ledger(), gates: passedGates });
  assert.throws(() => createReleaseClaim(evaluation, '../escape'), /RELEASE_ID_INVALID/);
});

test('release claim rejects forged PASS with failed gate', () => {
  const evaluation = evaluateReleaseReadiness({ mode: 'production', manifest: manifest(), runtimeLedger: ledger(), gates: passedGates });
  const forged = { ...evaluation, decision: 'PASS' as const, gates: [{ id: 'forged', status: 'FAIL' as const }] };
  assert.throws(() => createReleaseClaim(forged, 'release-2026-07-18'), /RELEASE_CLAIM_EVALUATION_INVALID/);
});

test('release claim rejects forged PASS with incomplete phases', () => {
  const evaluation = evaluateReleaseReadiness({ mode: 'production', manifest: manifest(), runtimeLedger: ledger(), gates: passedGates });
  const forged = { ...evaluation, decision: 'PASS' as const, phaseSummary: { ...evaluation.phaseSummary, complete: 14 } };
  assert.throws(() => createReleaseClaim(forged, 'release-2026-07-18'), /RELEASE_CLAIM_EVALUATION_INVALID/);
});
