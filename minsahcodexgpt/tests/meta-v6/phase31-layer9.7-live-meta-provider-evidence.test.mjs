import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  LIVE_META_EVIDENCE_CATEGORIES,
  validateLiveMetaEvidenceManifest,
} from '../../scripts/phase31-layer9.7-evidence-contract.mjs';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function buildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-layer9.7-'));
  const records = LIVE_META_EVIDENCE_CATEGORIES.map((category, index) => {
    const artifactPath = `evidence/phase31-meta-social-crm/logs/live-${index + 1}.json`;
    const absolute = path.join(root, artifactPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    const content = JSON.stringify({ category, result: 'redacted', sequence: index + 1 });
    fs.writeFileSync(absolute, content);
    const common = {
      id: `live.record.${index + 1}`,
      category,
      artifactPath,
      artifactSha256: sha256(content),
      capturedAt: '2026-07-27T23:10:00.000Z',
      captureMethod: 'QUEUE_LOG',
      live: true,
      redacted: true,
      correlationId: `corr.layer9.7.${index + 1}`,
      receiptId: `receipt.layer9.7.${index + 1}`,
      providerObjectId: `provider.object.${index + 1}`,
      businessRecordId: `business.record.${index + 1}`,
      providerMessageId: `provider.message.${index + 1}`,
      blockedReasonCode: 'POLICY_BLOCKED',
      outcome: 'PROCESSED',
      attempts: 2,
      providerCallObserved: false,
      switchState: 'ACTIVE',
    };
    if (['INSTAGRAM_VALID_REPLY', 'INSTAGRAM_PRIVATE_REPLY'].includes(category)) common.outcome = 'SENT';
    if (category === 'INSTAGRAM_EXPIRED_REPLY_BLOCKED' || category === 'ROLLBACK_KILL_SWITCH') common.outcome = 'BLOCKED';
    if (category === 'QUEUE_RETRY') common.outcome = 'RECOVERED';
    if (category === 'DEAD_LETTER') common.outcome = 'DEAD_LETTERED';
    if (category === 'PERMISSION_ACCOUNT_HEALTH') common.outcome = 'HEALTHY';
    return common;
  });
  const manifest = {
    schemaVersion: 1,
    phase: 31,
    item: '9.7',
    evidenceMode: 'LIVE_PROVIDER',
    environment: 'LIVE_TEST',
    operatorReference: 'ops-ticket-redacted-97',
    contractFixture: true,
    records,
  };
  return { root, manifest };
}

const validateFixture = (fixture) => validateLiveMetaEvidenceManifest(fixture.manifest, {
  root: fixture.root,
  now: '2026-07-27T23:20:00.000Z',
  allowContractFixture: true,
});

test('9.7 evidence contract enumerates every roadmap live-provider category', () => {
  assert.deepEqual(LIVE_META_EVIDENCE_CATEGORIES, [
    'META_WEBHOOK_SUBSCRIPTION', 'LEADGEN_WEBHOOK_DELIVERY', 'META_TEST_LEAD_PROCESSED',
    'INSTAGRAM_WEBHOOK_DELIVERY', 'INSTAGRAM_INBOUND_MESSAGE', 'INSTAGRAM_VALID_REPLY',
    'INSTAGRAM_EXPIRED_REPLY_BLOCKED', 'INSTAGRAM_PRIVATE_REPLY', 'PROVIDER_OUTBOUND_MESSAGE_ID',
    'QUEUE_RETRY', 'DEAD_LETTER', 'ROLLBACK_KILL_SWITCH', 'PERMISSION_ACCOUNT_HEALTH',
  ]);
});

test('9.7 complete contract fixture validates all category-specific fields and artifact hashes', () => {
  const fixture = buildFixture();
  const result = validateFixture(fixture);
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(result.verifiedRecords.length, 13);
});

test('9.7 live mode rejects mock, fixture, synthetic or fabricated evidence', () => {
  const fixture = buildFixture();
  const result = validateLiveMetaEvidenceManifest(fixture.manifest, { root: fixture.root, now: '2026-07-27T23:20:00.000Z' });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((entry) => entry.code === 'NON_LIVE_EVIDENCE'));
});

test('9.7 evidence fails closed when any required live category is missing', () => {
  const fixture = buildFixture();
  fixture.manifest.records.pop();
  const result = validateFixture(fixture);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missingCategories, ['PERMISSION_ACCOUNT_HEALTH']);
});

test('9.7 evidence requires matching SHA-256 for every captured artifact', () => {
  const fixture = buildFixture();
  fixture.manifest.records[0].artifactSha256 = '0'.repeat(64);
  const result = validateFixture(fixture);
  assert.ok(result.issues.some((entry) => entry.code === 'ARTIFACT_HASH'));
});

test('9.7 evidence rejects path traversal and files outside approved evidence roots', () => {
  const fixture = buildFixture();
  fixture.manifest.records[0].artifactPath = '../outside.json';
  const result = validateFixture(fixture);
  assert.ok(result.issues.some((entry) => entry.code === 'ARTIFACT_PATH'));
});

test('9.7 textual provider evidence rejects token-like secrets and sensitive JSON keys', () => {
  const fixture = buildFixture();
  const record = fixture.manifest.records[0];
  const absolute = path.join(fixture.root, record.artifactPath);
  const unsafe = JSON.stringify({ [['access', 'token'].join('_')]: ['EA', 'this', 'must', 'not', 'survive', 'redaction'].join('-') });
  fs.writeFileSync(absolute, unsafe);
  record.artifactSha256 = sha256(unsafe);
  const result = validateFixture(fixture);
  assert.ok(result.issues.some((entry) => entry.code === 'SENSITIVE_KEY' || entry.code === 'SECRET_TEXT'));
});

test('9.7 textual provider evidence rejects unredacted customer email and phone data', () => {
  const fixture = buildFixture();
  const record = fixture.manifest.records[1];
  const absolute = path.join(fixture.root, record.artifactPath);
  const unsafe = 'customer private@example.com +8801712345678';
  fs.writeFileSync(absolute, unsafe);
  record.artifactSha256 = sha256(unsafe);
  const result = validateFixture(fixture);
  assert.ok(result.issues.some((entry) => entry.code === 'RAW_EMAIL'));
  assert.ok(result.issues.some((entry) => entry.code === 'RAW_PHONE'));
});

test('9.7 outbound reply proof requires durable provider message identifiers', () => {
  const fixture = buildFixture();
  const record = fixture.manifest.records.find((entry) => entry.category === 'INSTAGRAM_VALID_REPLY');
  delete record.providerMessageId;
  const result = validateFixture(fixture);
  assert.ok(result.issues.some((entry) => entry.code === 'REQUIRED_IDENTIFIER' && entry.recordId === record.id));
});

test('9.7 expired reply proof requires no provider call and an explicit blocked outcome', () => {
  const fixture = buildFixture();
  const record = fixture.manifest.records.find((entry) => entry.category === 'INSTAGRAM_EXPIRED_REPLY_BLOCKED');
  record.providerCallObserved = true;
  const result = validateFixture(fixture);
  assert.ok(result.issues.some((entry) => entry.code === 'POLICY_BLOCK'));
});

test('9.7 retry and dead-letter proof requires real attempt counts and terminal outcomes', () => {
  const fixture = buildFixture();
  const retry = fixture.manifest.records.find((entry) => entry.category === 'QUEUE_RETRY');
  const dead = fixture.manifest.records.find((entry) => entry.category === 'DEAD_LETTER');
  retry.attempts = 1;
  dead.outcome = 'FAILED';
  const result = validateFixture(fixture);
  assert.ok(result.issues.some((entry) => entry.code === 'RETRY_PROOF'));
  assert.ok(result.issues.some((entry) => entry.code === 'DEAD_LETTER_PROOF'));
});

test('9.7 rollback proof requires active switch, blocked result and zero provider call', () => {
  const fixture = buildFixture();
  const record = fixture.manifest.records.find((entry) => entry.category === 'ROLLBACK_KILL_SWITCH');
  record.switchState = 'INACTIVE';
  const result = validateFixture(fixture);
  assert.ok(result.issues.some((entry) => entry.code === 'KILL_SWITCH_PROOF'));
});

test('9.7 screenshot evidence requires an explicit redaction review reference', () => {
  const fixture = buildFixture();
  const record = fixture.manifest.records[0];
  const old = path.join(fixture.root, record.artifactPath);
  const artifactPath = 'evidence/phase31-meta-social-crm/screenshots/subscription.png';
  const target = path.join(fixture.root, artifactPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(old, target);
  record.artifactPath = artifactPath;
  record.artifactSha256 = sha256(fs.readFileSync(target));
  record.captureMethod = 'ADMIN_SCREENSHOT';
  const result = validateFixture(fixture);
  assert.ok(result.issues.some((entry) => entry.code === 'SCREENSHOT_REVIEW'));
});
