import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { FINAL_RELEASE_CHECKS, validateFinalReleaseManifest } from '../../scripts/phase31-layer9.8-release-contract.mjs';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function fixture(statusOverride = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-layer9.8-'));
  const checks = FINAL_RELEASE_CHECKS.map((check) => {
    const artifactPath = `evidence/phase31-meta-social-crm/logs/${check.toLowerCase()}.log`;
    const content = `${check}: executed\nresult=${statusOverride[check] ?? 'PASS'}\n`;
    const absolute = path.join(root, artifactPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
    return {
      check,
      status: statusOverride[check] ?? 'PASS',
      reasonCode: statusOverride[check] === 'BLOCKED' ? 'RUNTIME_PREREQUISITE_UNAVAILABLE' : 'EXECUTED_PASS',
      artifactPath,
      artifactSha256: sha256(content),
    };
  });
  const blocked = checks.filter((item) => item.status !== 'PASS').map((item) => item.check);
  return {
    root,
    manifest: {
      schemaVersion: 1,
      phase: 31,
      item: '9.8',
      evidenceMode: 'EXECUTED_FINAL_GATE',
      phase31Status: blocked.length ? 'BLOCKED' : 'COMPLETE',
      releaseDecision: blocked.length ? 'BLOCKED' : 'PASS',
      checks,
      remainingBlockers: blocked,
    },
  };
}

test('9.8 contract enumerates every mandatory final release check', () => {
  assert.equal(FINAL_RELEASE_CHECKS.length, 14);
  for (const check of ['MAIN_APP_NPM_CI', 'MAIN_APP_BUILD', 'POSTGRESQL_MIGRATION_IDEMPOTENCY', 'LIVE_META_PROVIDER', 'FRESH_PACKAGE_REPRODUCIBILITY']) {
    assert.ok(FINAL_RELEASE_CHECKS.includes(check));
  }
});

test('9.8 all executed checks PASS yields Phase 31 COMPLETE and release PASS', () => {
  const item = fixture();
  const result = validateFinalReleaseManifest(item.manifest, { root: item.root });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(result.computedVerdict, 'PASS');
  assert.deepEqual(result.blockedChecks, []);
});

test('9.8 one blocked mandatory check blocks the release', () => {
  const item = fixture({ MAIN_APP_NPM_CI: 'BLOCKED' });
  const result = validateFinalReleaseManifest(item.manifest, { root: item.root });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(result.computedVerdict, 'BLOCKED');
  assert.deepEqual(result.blockedChecks, ['MAIN_APP_NPM_CI']);
});

test('9.8 missing mandatory check fails closed', () => {
  const item = fixture();
  item.manifest.checks.pop();
  item.manifest.releaseDecision = 'BLOCKED';
  item.manifest.phase31Status = 'BLOCKED';
  item.manifest.remainingBlockers = ['MISSING_CHECK'];
  const result = validateFinalReleaseManifest(item.manifest, { root: item.root });
  assert.ok(result.issues.some((issue) => issue.code === 'MISSING_CHECKS'));
});

test('9.8 skipped or unknown status is never release evidence', () => {
  const item = fixture();
  item.manifest.checks[0].status = 'SKIPPED';
  item.manifest.releaseDecision = 'BLOCKED';
  item.manifest.phase31Status = 'BLOCKED';
  item.manifest.remainingBlockers = ['STATIC_SOURCE_QA'];
  const result = validateFinalReleaseManifest(item.manifest, { root: item.root });
  assert.ok(result.issues.some((issue) => issue.code === 'CHECK_STATUS'));
});

test('9.8 artifact hashes and approved paths are mandatory', () => {
  const item = fixture();
  item.manifest.checks[0].artifactSha256 = '0'.repeat(64);
  const result = validateFinalReleaseManifest(item.manifest, { root: item.root });
  assert.ok(result.issues.some((issue) => issue.code === 'ARTIFACT_HASH'));
});

test('9.8 evidence rejects credential-like connection URLs', () => {
  const item = fixture();
  const record = item.manifest.checks[0];
  const absolute = path.join(item.root, record.artifactPath);
  const unsafe = 'database=' + ['postgresql:', '', 'name:password@example.invalid:5432/db'].join('/');
  fs.writeFileSync(absolute, unsafe);
  record.artifactSha256 = sha256(unsafe);
  const result = validateFinalReleaseManifest(item.manifest, { root: item.root });
  assert.ok(result.issues.some((issue) => issue.code === 'SECRET_TEXT'));
});

test('9.8 declared PASS cannot retain blockers or disagree with computed verdict', () => {
  const item = fixture({ LIVE_META_PROVIDER: 'BLOCKED' });
  item.manifest.releaseDecision = 'PASS';
  item.manifest.phase31Status = 'COMPLETE';
  item.manifest.remainingBlockers = ['LIVE_META_PROVIDER'];
  const result = validateFinalReleaseManifest(item.manifest, { root: item.root });
  assert.ok(result.issues.some((issue) => issue.code === 'VERDICT_MISMATCH'));
  assert.ok(result.issues.some((issue) => issue.code === 'PHASE_STATUS_MISMATCH'));
});
