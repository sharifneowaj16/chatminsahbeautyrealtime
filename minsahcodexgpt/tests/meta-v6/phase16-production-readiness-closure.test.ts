import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  commandEvidenceToGate,
  computeReleaseSourceDigest,
  createCommandEvidenceRecord,
  redactCommandOutput,
  sha256Text,
  validateCommandEvidenceLedger,
  validateCommandEvidenceLogs,
  validateCommandEvidenceSource,
  type CommandEvidenceLedger,
} from '../../lib/meta/release/command-evidence';

const startedAt = '2026-07-18T00:00:00.000Z';
const finishedAt = '2026-07-18T00:00:01.000Z';

function record(overrides: Partial<Parameters<typeof createCommandEvidenceRecord>[0]> = {}) {
  const output = overrides.output ?? 'PASS all gates\n';
  return createCommandEvidenceRecord({
    id: 'typecheck',
    command: 'npm',
    args: ['run', 'typecheck:ts'],
    exitCode: 0,
    startedAt,
    finishedAt,
    output,
    logPath: 'docs/release/meta-v6/phase-16-command-typecheck.log',
    logSha256: sha256Text(redactCommandOutput(output)),
    sourceSha256: overrides.sourceSha256 ?? 'a'.repeat(64),
    ...overrides,
  });
}

function ledger(records = [record()]): CommandEvidenceLedger {
  return {
    schemaVersion: 1,
    generatedAt: finishedAt,
    maxAgeHours: 24,
    records,
  };
}

test('redacts tokens, credentials, email and phone from command output', () => {
  const sanitized = redactCommandOutput(
    'META_ACCESS_TOKEN=abc123 Bearer xyz.abc user@example.com +8801712345678 postgres://admin:secret@db/app',
  );
  assert.equal(sanitized.includes('abc123'), false);
  assert.equal(sanitized.includes('xyz.abc'), false);
  assert.equal(sanitized.includes('user@example.com'), false);
  assert.equal(sanitized.includes('+8801712345678'), false);
  assert.equal(sanitized.includes('admin:secret'), false);
});

test('creates deterministic PASS command evidence', () => {
  const item = record();
  assert.equal(item.status, 'PASS');
  assert.equal(item.exitCode, 0);
  assert.equal(item.durationMs, 1000);
  assert.match(item.evidenceDigest, /^[a-f0-9]{64}$/);
});

test('non-zero exit creates FAIL evidence', () => {
  const item = record({ id: 'build', args: ['run', 'build'], exitCode: 1 });
  assert.equal(item.status, 'FAIL');
});

test('valid fresh ledger passes validation', () => {
  const issues = validateCommandEvidenceLedger(ledger(), {
    now: new Date('2026-07-18T12:00:00.000Z'),
    allowedIds: ['typecheck'],
  });
  assert.deepEqual(issues, []);
});

test('tampered record digest is rejected', () => {
  const item = { ...record(), summary: 'forged pass' };
  const issues = validateCommandEvidenceLedger(ledger([item]), {
    now: new Date('2026-07-18T12:00:00.000Z'),
    allowedIds: ['typecheck'],
  });
  assert.ok(issues.includes('COMMAND_EVIDENCE_DIGEST_MISMATCH:typecheck'));
});

test('expired command evidence is rejected', () => {
  const issues = validateCommandEvidenceLedger(ledger(), {
    now: new Date('2026-07-20T00:00:02.000Z'),
    allowedIds: ['typecheck'],
  });
  assert.ok(issues.includes('COMMAND_EVIDENCE_EXPIRED:typecheck'));
});

test('duplicate and unknown command IDs are rejected', () => {
  const duplicate = record();
  const issues = validateCommandEvidenceLedger(ledger([duplicate, duplicate]), {
    now: new Date('2026-07-18T12:00:00.000Z'),
    allowedIds: ['lint'],
  });
  assert.ok(issues.includes('COMMAND_EVIDENCE_DUPLICATE_ID:typecheck'));
  assert.ok(issues.includes('COMMAND_EVIDENCE_ID_NOT_ALLOWED:typecheck'));
});

test('unsafe log paths are rejected', () => {
  const unsafe = record({ logPath: '../secret.log' });
  const issues = validateCommandEvidenceLedger(ledger([unsafe]), {
    now: new Date('2026-07-18T12:00:00.000Z'),
    allowedIds: ['typecheck'],
  });
  assert.ok(issues.includes('COMMAND_EVIDENCE_LOG_PATH_INVALID:typecheck'));
});

test('log hash verification detects tampering', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-v6-command-evidence-'));
  const logPath = 'docs/release/meta-v6/phase-16-command-typecheck.log';
  fs.mkdirSync(path.dirname(path.join(root, logPath)), { recursive: true });
  fs.writeFileSync(path.join(root, logPath), 'PASS all gates\n', 'utf8');
  const item = record({ output: 'PASS all gates\n', logPath });
  assert.deepEqual(validateCommandEvidenceLogs(root, ledger([item])), []);
  fs.writeFileSync(path.join(root, logPath), 'tampered\n', 'utf8');
  assert.ok(validateCommandEvidenceLogs(root, ledger([item])).some((issue) => issue.includes('HASH_MISMATCH')));
});



test('source digest changes when release-controlled source changes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-v6-source-digest-'));
  fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'lib/example.ts'), 'export const value = 1;\n');
  const first = computeReleaseSourceDigest(root);
  fs.writeFileSync(path.join(root, 'lib/example.ts'), 'export const value = 2;\n');
  const second = computeReleaseSourceDigest(root);
  assert.notEqual(first, second);
});

test('source-bound command evidence rejects a changed checkout', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-v6-source-evidence-'));
  fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'lib/example.ts'), 'export const value = 1;\n');
  const sourceSha256 = computeReleaseSourceDigest(root);
  const item = record({ sourceSha256 });
  assert.deepEqual(validateCommandEvidenceSource(root, ledger([item])), []);
  fs.writeFileSync(path.join(root, 'lib/example.ts'), 'export const value = 2;\n');
  assert.deepEqual(validateCommandEvidenceSource(root, ledger([item])), ['COMMAND_EVIDENCE_SOURCE_MISMATCH:typecheck']);
});

test('command evidence maps to release gates without hiding failures', () => {
  assert.equal(commandEvidenceToGate(record(), 'typecheck').status, 'PASS');
  assert.equal(commandEvidenceToGate(record({ id: 'build', args: ['run', 'build'], exitCode: 1 }), 'build').status, 'FAIL');
  assert.equal(commandEvidenceToGate(undefined, 'lint').status, 'PENDING');
});
