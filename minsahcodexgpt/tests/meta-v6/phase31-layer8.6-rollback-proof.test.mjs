import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  buildMetaPhase31RollbackProof,
  compareMetaRollbackDurableSnapshots,
  getMetaPhase31RollbackControlSnapshot,
} from '../../lib/meta-platform/config/phase31-rollback-proof.ts';
import {
  assertInstagramCutoverWriteAuthority,
  getMetaInstagramCutoverStatus,
} from '../../lib/meta-platform/domains/instagram/cutover.ts';
import { assertInstagramReplyWriteEnabledAtExecution } from '../../lib/meta-platform/domains/instagram/send-reply.ts';
import { executeMetaLeadCutover } from '../../lib/meta-platform/domains/leads/cutover.ts';
import { resolveFacebookRealtimeCutover } from '../../packages/meta-facebook-cutover-contract/src/index.ts';

const rollbackEnv = Object.freeze({
  META_PLATFORM_LEADS: 'false',
  META_PLATFORM_INSTAGRAM: 'false',
  META_PLATFORM_LEGACY_FACEBOOK: 'true',
  META_PLATFORM_SOCIAL_REALTIME: 'false',
  META_PLATFORM_SOCIAL_WEBHOOKS: 'false',
  META_PLATFORM_INSTAGRAM_WRITES: 'false',
  META_PLATFORM_INSTAGRAM_PRIVATE_REPLY: 'false',
  META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS: 'false',
  META_PLATFORM_SOCIAL_REPLAY: 'false',
  META_PHASE31_LEAD_RUNTIME: 'LEGACY_ROLLBACK',
  META_PHASE31_INSTAGRAM_INBOUND_RUNTIME: 'LEGACY_ROLLBACK',
  META_PHASE31_INSTAGRAM_OUTBOUND_RUNTIME: 'LEGACY_ROLLBACK',
  META_PHASE31_INSTAGRAM_MEDIA_RUNTIME: 'LEGACY_ROLLBACK',
  META_PHASE31_FACEBOOK_INBOX_RUNTIME: 'LEGACY_ROLLBACK',
  REALTIME_FACEBOOK_MODE: 'legacy',
  REALTIME_RUNTIME_FLAVOR: 'legacy',
  REALTIME_FACEBOOK_LEGACY_ROLLBACK_ENABLED: 'true',
  META_PLATFORM_GLOBAL_KILL_SWITCH: 'true',
});

const digest = (character) => character.repeat(64);
const before = Object.freeze({
  receiptCount: 12,
  leadCount: 5,
  leadHandoffCount: 5,
  instagramConversationCount: 4,
  instagramMessageCount: 21,
  instagramOutboundRequestCount: 3,
  facebookMessageCount: 8,
  providerWriteCount: 3,
  auditRecordCount: 40,
  duplicateLeadHandoffs: 0,
  duplicateInstagramMessages: 0,
  duplicateProviderWrites: 0,
  duplicateFacebookEvents: 0,
  receiptDigest: digest('a'),
  leadDigest: digest('b'),
  instagramDigest: digest('c'),
  facebookDigest: digest('d'),
});
const after = Object.freeze({ ...before, auditRecordCount: 41 });

test('8.6 control snapshot proves every platform/write/realtime authority is off with explicit legacy fallback', () => {
  const snapshot = getMetaPhase31RollbackControlSnapshot(rollbackEnv);
  assert.equal(snapshot.lead.authority, 'LEGACY');
  assert.equal(snapshot.lead.platformEnabled, false);
  assert.equal(snapshot.instagram.readAuthority, 'LEGACY');
  assert.equal(snapshot.instagram.standardReplyEnabled, false);
  assert.equal(snapshot.instagram.privateReplyEnabled, false);
  assert.equal(snapshot.instagram.mediaDownloadsEnabled, false);
  assert.equal(snapshot.facebook.realtimeBridgeEnabled, false);
  assert.equal(snapshot.facebook.legacyDirectClientEnabled, true);
  assert.equal(snapshot.facebook.retryOwner, 'REALTIME_LEGACY');
  assert.equal(snapshot.replay.enabled, false);
});

test('8.6 queued Lead execution re-reads rollback authority and never runs platform processor', async () => {
  let legacyCalls = 0;
  let platformCalls = 0;
  const result = await executeMetaLeadCutover({
    source: rollbackEnv,
    runLegacy: async ({ captureShadow }) => {
      legacyCalls += 1;
      assert.equal(captureShadow, false);
      return { value: 'legacy-result' };
    },
    runPlatform: async () => {
      platformCalls += 1;
      return 'platform-result';
    },
  });
  assert.equal(result.value, 'legacy-result');
  assert.equal(result.cutover.mode, 'LEGACY_ROLLBACK');
  assert.equal(legacyCalls, 1);
  assert.equal(platformCalls, 0);
});

test('8.6 queued Instagram standard and private writes are blocked at execution time', () => {
  assert.throws(() => assertInstagramCutoverWriteAuthority('STANDARD', rollbackEnv), /META_PLATFORM_INSTAGRAM_WRITES_DISABLED/);
  assert.throws(() => assertInstagramCutoverWriteAuthority('PRIVATE', rollbackEnv), /META_PLATFORM_INSTAGRAM_PRIVATE_REPLY_DISABLED|META_PLATFORM_INSTAGRAM_WRITES_DISABLED/);
  assert.throws(() => assertInstagramReplyWriteEnabledAtExecution('MESSAGE', rollbackEnv), /KILL_SWITCH|WRITES_DISABLED/);
  assert.throws(() => assertInstagramReplyWriteEnabledAtExecution('PRIVATE_REPLY', rollbackEnv), /KILL_SWITCH|WRITES_DISABLED/);
});

test('8.6 private reply can be rolled back independently while controlled standard reply remains enabled', () => {
  const env = {
    META_PLATFORM_INSTAGRAM: 'true',
    META_PLATFORM_INSTAGRAM_WRITES: 'true',
    META_PLATFORM_INSTAGRAM_PRIVATE_REPLY: 'false',
    META_PHASE31_INSTAGRAM_OUTBOUND_RUNTIME: 'PLATFORM',
  };
  const status = getMetaInstagramCutoverStatus(env);
  assert.equal(status.outbound.standardReplyEnabled, true);
  assert.equal(status.outbound.privateReplyEnabled, false);
  assert.doesNotThrow(() => assertInstagramCutoverWriteAuthority('STANDARD', env));
  assert.throws(() => assertInstagramCutoverWriteAuthority('PRIVATE', env), /META_PLATFORM_INSTAGRAM_PRIVATE_REPLY_DISABLED/);
});

test('8.6 realtime bridge rollback restores one legacy provider and retry owner', () => {
  const status = resolveFacebookRealtimeCutover(rollbackEnv, { role: 'REALTIME' });
  assert.equal(status.mode, 'LEGACY_ROLLBACK');
  assert.equal(status.authority, 'LEGACY');
  assert.equal(status.realtimeBridgeEnabled, false);
  assert.equal(status.providerIngressOwner, 'REALTIME_LEGACY');
  assert.equal(status.retryOwner, 'REALTIME_LEGACY');
  assert.equal(status.platformSyncEnabled, false);
});

test('8.6 invalid rollback controls fail safe without enabling platform writes or bridge', () => {
  const snapshot = getMetaPhase31RollbackControlSnapshot({
    ...rollbackEnv,
    META_PLATFORM_INSTAGRAM_WRITES: 'maybe',
    META_PLATFORM_SOCIAL_REALTIME: 'maybe',
  });
  assert.equal(snapshot.instagram.standardReplyEnabled, false);
  assert.equal(snapshot.instagram.privateReplyEnabled, false);
  assert.equal(snapshot.facebook.realtimeBridgeEnabled, false);
  assert.equal(snapshot.facebook.retryOwner, 'NONE');
});

test('8.6 control-only toggle preserves canonical data and records audit evidence', () => {
  const result = compareMetaRollbackDurableSnapshots(before, after);
  assert.equal(result.passed, true);
  assert.equal(result.auditEvidenceCaptured, true);
  assert.equal(result.auditRecordDelta, 1);
  assert.deepEqual(result.blockers, []);
});

test('8.6 data-integrity proof detects count, digest, provider-write and duplicate corruption', () => {
  const result = compareMetaRollbackDurableSnapshots(before, {
    ...after,
    leadCount: 6,
    providerWriteCount: 4,
    instagramDigest: digest('e'),
    duplicateProviderWrites: 1,
  });
  assert.equal(result.passed, false);
  assert.deepEqual(result.blockers, [
    'LEADCOUNT_CHANGED',
    'PROVIDERWRITECOUNT_CHANGED',
    'INSTAGRAMDIGEST_CHANGED',
    'DUPLICATEPROVIDERWRITES_DETECTED',
  ]);
});

test('8.6 complete proof covers every roadmap scenario and remains redacted', () => {
  const proof = buildMetaPhase31RollbackProof({
    proofId: 'PHASE31-ROLLBACK-DRILL-0001',
    performedAt: new Date('2026-07-27T18:30:00.000Z'),
    source: { ...rollbackEnv, META_APP_SECRET: 'top-secret-value', CUSTOMER_EMAIL: 'person@example.com' },
    before,
    after,
  });
  assert.equal(proof.verdict, 'PASS');
  assert.equal(proof.scenarios.length, 9);
  assert.equal(proof.scenarios.every((item) => item.passed), true);
  assert.deepEqual(proof.failedScenarios, []);
  assert.deepEqual(proof.missingScenarios, []);
  const serialized = JSON.stringify(proof);
  assert.doesNotMatch(serialized, /top-secret-value|person@example\.com|META_APP_SECRET|CUSTOMER_EMAIL/);
  assert.equal(proof.evidencePolicy.tokenOrSecretIncluded, false);
  assert.equal(proof.evidencePolicy.customerPiiIncluded, false);
});

test('8.6 blocked proof reports the exact unsafe scenarios without raw configuration', () => {
  const proof = buildMetaPhase31RollbackProof({
    proofId: 'PHASE31-ROLLBACK-DRILL-0002',
    performedAt: new Date('2026-07-27T18:31:00.000Z'),
    source: {
      META_PLATFORM_LEADS: 'true',
      META_PLATFORM_SOCIAL_WEBHOOKS: 'true',
      META_PHASE31_LEAD_RUNTIME: 'PLATFORM',
    },
    before,
    after: before,
  });
  assert.equal(proof.verdict, 'BLOCKED');
  assert.ok(proof.failedScenarios.includes('LEAD_PLATFORM_OFF'));
  assert.ok(proof.failedScenarios.includes('LEGACY_FALLBACK_ACTIVE'));
  assert.ok(proof.failedScenarios.includes('AUDIT_EVIDENCE_CAPTURED'));
});

test('8.6 production workers and bridges re-read current controls at execution boundaries', () => {
  const leadWorker = fs.readFileSync('workers/meta-lead.worker.ts', 'utf8');
  const leadProduction = fs.readFileSync('lib/meta-platform/domains/leads/production.ts', 'utf8');
  const instagramWorker = fs.readFileSync('workers/meta-instagram.worker.ts', 'utf8');
  const standard = fs.readFileSync('lib/meta-platform/domains/instagram/standard-reply-runtime.ts', 'utf8');
  const privateReply = fs.readFileSync('lib/meta-platform/domains/instagram/private-reply-runtime.ts', 'utf8');
  const facebookWorker = fs.readFileSync('workers/meta-social.worker.ts', 'utf8');
  const realtime = fs.readFileSync('realtime-service/src/index.ts', 'utf8');
  assert.match(leadWorker, /processMetaLeadReceiptProduction as processMetaLeadReceipt/);
  assert.match(leadProduction, /source: process\.env/);
  assert.match(instagramWorker, /executeInstagramStandardReplyProduction/);
  assert.match(instagramWorker, /executeInstagramPrivateReplyProduction/);
  assert.match(standard, /assertInstagramCutoverWriteAuthority\('STANDARD', process\.env\)/);
  assert.match(standard, /assertInstagramReplyWriteEnabledAtExecution\('MESSAGE', process\.env\)/);
  assert.match(privateReply, /assertInstagramCutoverWriteAuthority\('PRIVATE', process\.env\)/);
  assert.match(privateReply, /assertInstagramReplyWriteEnabledAtExecution\('PRIVATE_REPLY', process\.env\)/);
  assert.match(facebookWorker, /executeFacebookInboxSyncProduction/);
  assert.match(realtime, /getRealtimeFacebookCutoverStatus\(\)/);
  assert.match(realtime, /cutover\.retryOwner !== 'REALTIME_LEGACY'/);
});
