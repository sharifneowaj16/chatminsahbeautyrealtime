import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  assertInstagramCutoverWriteAuthority,
  evaluateMetaInstagramLegacyDisable,
  getMetaInstagramCutoverStatus,
  shouldScheduleInstagramMediaDownloads,
} from '../../lib/meta-platform/domains/instagram/cutover.ts';
import {
  compareInstagramReplyPolicyParity,
  compareInstagramShadowNormalization,
} from '../../lib/meta-platform/domains/instagram/shadow-comparison.ts';

const platformReadEnv = Object.freeze({
  META_PLATFORM_INSTAGRAM: 'true',
  META_PLATFORM_SOCIAL_WEBHOOKS: 'true',
  META_PHASE31_INSTAGRAM_INBOUND_RUNTIME: 'PLATFORM',
});

function eventFixture() {
  return {
    eventKey: 'message:acct-1:mid-1', eventType: 'MESSAGE', objectType: 'instagram',
    accountId: 'acct-1', senderId: 'person-secret-1', recipientId: 'acct-1',
    conversationKey: 'ig:acct-1:person-secret-1', platformMessageId: 'mid-1',
    direction: 'INBOUND', messageType: 'IMAGE', text: 'private customer text',
    sentAt: '2026-07-27T10:00:00.000Z', replyToMessageId: 'mid-0',
    attachments: [{ externalId: 'att-1', type: 'IMAGE', url: 'https://secret.invalid/media?token=secret' }],
    correlationId: 'ig:corr-1', payloadDigest: 'a'.repeat(64),
  };
}

test('8.4 defaults to legacy authority with writes and downloads fail-closed', () => {
  const status = getMetaInstagramCutoverStatus({});
  assert.equal(status.valid, true);
  assert.equal(status.read.mode, 'LEGACY');
  assert.equal(status.read.authority, 'LEGACY');
  assert.equal(status.outbound.standardReplyEnabled, false);
  assert.equal(status.outbound.privateReplyEnabled, false);
  assert.equal(status.media.downloadsEnabled, false);
  assert.equal(status.durableStatePreservedOnRollback, true);
});

test('8.4 platform inbox requires canonical Instagram and webhook flags', () => {
  const blocked = getMetaInstagramCutoverStatus({ META_PHASE31_INSTAGRAM_INBOUND_RUNTIME: 'PLATFORM' });
  assert.equal(blocked.read.mode, 'LEGACY');
  assert.equal(blocked.read.reasonCode, 'PLATFORM_PREREQUISITES_DISABLED');
  const ready = getMetaInstagramCutoverStatus(platformReadEnv);
  assert.equal(ready.read.mode, 'PLATFORM');
  assert.equal(ready.read.authority, 'PLATFORM');
});

test('8.4 shadow keeps legacy authority and forbids shadow side effects', () => {
  const status = getMetaInstagramCutoverStatus({ ...platformReadEnv, META_PHASE31_INSTAGRAM_INBOUND_RUNTIME: 'SHADOW' });
  assert.equal(status.read.mode, 'SHADOW');
  assert.equal(status.read.authority, 'LEGACY');
  assert.equal(status.read.shadowSideEffectsAllowed, false);
});

test('8.4 invalid selectors and invalid flags fail safe to rollback', () => {
  const selector = getMetaInstagramCutoverStatus({ ...platformReadEnv, META_PHASE31_INSTAGRAM_INBOUND_RUNTIME: 'AUTO' });
  assert.equal(selector.read.mode, 'LEGACY_ROLLBACK');
  assert.equal(selector.read.valid, false);
  const flag = getMetaInstagramCutoverStatus({ META_PLATFORM_INSTAGRAM_WRITES: 'maybe' });
  assert.equal(flag.outbound.mode, 'LEGACY_ROLLBACK');
  assert.equal(flag.outbound.valid, false);
});

test('8.4 standard/private writes and media downloads are independently controlled', () => {
  assert.doesNotThrow(() => assertInstagramCutoverWriteAuthority('STANDARD', { META_PLATFORM_INSTAGRAM_WRITES: 'true' }));
  assert.throws(() => assertInstagramCutoverWriteAuthority('STANDARD', {}), /META_PLATFORM_INSTAGRAM_WRITES_DISABLED/);
  assert.throws(() => assertInstagramCutoverWriteAuthority('PRIVATE', { META_PLATFORM_INSTAGRAM_WRITES: 'true' }), /META_PLATFORM_INSTAGRAM_PRIVATE_REPLY_DISABLED/);
  assert.doesNotThrow(() => assertInstagramCutoverWriteAuthority('PRIVATE', {
    META_PLATFORM_INSTAGRAM_WRITES: 'true', META_PLATFORM_INSTAGRAM_PRIVATE_REPLY: 'true',
  }));
  assert.equal(shouldScheduleInstagramMediaDownloads({}), false);
  assert.equal(shouldScheduleInstagramMediaDownloads({ META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS: 'true' }), true);
});

test('8.4 shadow normalization proves message/conversation/provider/attachment parity without raw data', () => {
  const event = eventFixture();
  const comparison = compareInstagramShadowNormalization(event);
  assert.equal(comparison.status, 'MATCH');
  assert.equal(comparison.matched, true);
  assert.equal(comparison.safeMetrics.attachmentCount, 1);
  const serialized = JSON.stringify(comparison);
  assert.equal(serialized.includes(event.text), false);
  assert.equal(serialized.includes(event.senderId), false);
  assert.equal(serialized.includes(event.attachments[0].url), false);
});

test('8.4 reply policy parity reports exact safe mismatch codes', () => {
  const expiresAt = new Date('2026-07-28T10:00:00Z');
  assert.deepEqual(compareInstagramReplyPolicyParity({
    legacy: { eligible: true, code: 'ELIGIBLE', expiresAt },
    platform: { eligible: true, code: 'ELIGIBLE', expiresAt },
  }), { matched: true, differenceCodes: [] });
  const mismatch = compareInstagramReplyPolicyParity({
    legacy: { eligible: true, code: 'ELIGIBLE', expiresAt },
    platform: { eligible: false, code: 'WINDOW_EXPIRED', expiresAt: null },
  });
  assert.equal(mismatch.matched, false);
  assert.deepEqual(mismatch.differenceCodes, [
    'INSTAGRAM_REPLY_POLICY_ELIGIBILITY_MISMATCH',
    'INSTAGRAM_REPLY_POLICY_CODE_MISMATCH',
    'INSTAGRAM_REPLY_POLICY_EXPIRY_MISMATCH',
  ]);
});

test('8.4 legacy disable requires parity, zero duplicates, provider IDs, attachments and rollback proof', () => {
  const blocked = evaluateMetaInstagramLegacyDisable({
    shadowSamples: 99, shadowMismatches: 0, duplicateMessages: 0, duplicateProviderWrites: 0,
    providerMessageIdMismatches: 0, attachmentStateMismatches: 0, observationMinutes: 1440,
    rollbackDrillPassed: true,
  });
  assert.equal(blocked.eligible, false);
  assert.deepEqual(blocked.blockers, ['INSUFFICIENT_SHADOW_SAMPLES']);
  const eligible = evaluateMetaInstagramLegacyDisable({
    shadowSamples: 1000, shadowMismatches: 1, duplicateMessages: 0, duplicateProviderWrites: 0,
    providerMessageIdMismatches: 0, attachmentStateMismatches: 0, observationMinutes: 1440,
    rollbackDrillPassed: true,
  });
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.mismatchRateBasisPoints, 10);
});

test('8.4 environment validator rejects invalid Instagram selectors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-layer8.4-'));
  try {
    const envFile = path.join(dir, 'invalid.env');
    fs.writeFileSync(envFile, [
      'DATABASE_URL=postgresql://localhost:5432/app',
      `JWT_SECRET=${'a'.repeat(32)}`,
      `JWT_REFRESH_SECRET=${'b'.repeat(32)}`,
      'META_PHASE31_INSTAGRAM_INBOUND_RUNTIME=AUTO',
    ].join('\n'));
    const result = spawnSync(process.execPath, ['scripts/validate-env.mjs', '--file', envFile], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(`${result.stdout}\n${result.stderr}`, /META_PHASE31_INSTAGRAM_INBOUND_RUNTIME must be one of/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('8.4 production wiring has one full authority processor and execution-time controls', () => {
  const production = fs.readFileSync('lib/meta-platform/domains/instagram/production.ts', 'utf8');
  const messages = fs.readFileSync('lib/meta/instagram/messages.ts', 'utf8');
  const standard = fs.readFileSync('lib/meta-platform/domains/instagram/standard-reply-runtime.ts', 'utf8');
  const privateReply = fs.readFileSync('lib/meta-platform/domains/instagram/private-reply-runtime.ts', 'utf8');
  const health = fs.readFileSync('lib/meta-platform/admin/instagram-status.ts', 'utf8');
  assert.match(production, /compareInstagramShadowNormalization/);
  assert.match(production, /cutover\.read\.mode === 'PLATFORM'/);
  assert.doesNotMatch(production, /Promise\.all\([\s\S]*processInstagramInboundReceipt/);
  assert.match(messages, /observeNormalizedEvent\?\.\(event\)/);
  assert.match(messages, /allowMediaDownloads === false/);
  assert.match(standard, /assertInstagramCutoverWriteAuthority\('STANDARD', process\.env\)/);
  assert.match(privateReply, /assertInstagramCutoverWriteAuthority\('PRIVATE', process\.env\)/);
  assert.match(health, /instagramCutover/);
  assert.match(health, /stabilityCriteria/);
});
