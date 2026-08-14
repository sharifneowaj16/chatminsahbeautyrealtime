import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const source = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const json = (path) => JSON.parse(source(path));
const exists = (path) => fs.existsSync(new URL(path, root));
const itemIds = ['8.1', '8.2', '8.3', '8.4', '8.5', '8.6'];
const requiredFlags = [
  'META_PLATFORM_LEADS',
  'META_PLATFORM_INSTAGRAM',
  'META_PLATFORM_LEGACY_FACEBOOK',
  'META_PLATFORM_SOCIAL_REALTIME',
  'META_PLATFORM_SOCIAL_WEBHOOKS',
];
const optionalFlags = [
  'META_PLATFORM_INSTAGRAM_WRITES',
  'META_PLATFORM_INSTAGRAM_PRIVATE_REPLY',
  'META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS',
  'META_PLATFORM_SOCIAL_REPLAY',
];

const assertGreenLog = (path) => {
  assert.equal(exists(path), true, path);
  const log = source(path);
  assert.match(log, /PASS|# pass [1-9]/, path);
  assert.doesNotMatch(log, /# fail [1-9]|^not ok|npm ERR!|===== FAIL:/im, path);
};

test('8.7 all Layer 8 item evidence and prior green gate logs exist', () => {
  for (const id of itemIds) {
    assert.equal(exists(`evidence/phase31-meta-social-crm/items/phase31_layer${id}_result.md`), true, id);
    assertGreenLog(`evidence/phase31-meta-social-crm/logs/phase31_layer${id}_gate.log`);
  }
  assert.equal(exists('evidence/phase31-meta-social-crm/10-cutover-rollback.md'), true);
  assert.equal(exists('evidence/phase31-meta-social-crm/items/phase31_layer8.7_result.md'), true);
});

test('8.7 canonical flag inventory is complete and production-safe', () => {
  const contract = json('config/meta-phase31-cutover-flags.json');
  const flags = new Map(contract.flags.map((entry) => [entry.name, entry]));
  assert.deepEqual(contract.flags.filter((entry) => entry.tier === 'required').map((entry) => entry.name), requiredFlags);
  assert.deepEqual(contract.flags.filter((entry) => entry.tier === 'optional').map((entry) => entry.name), optionalFlags);
  for (const name of [...requiredFlags, ...optionalFlags]) {
    assert.equal(flags.has(name), true, name);
    const flag = flags.get(name);
    const expectedSafe = name === 'META_PLATFORM_LEGACY_FACEBOOK';
    assert.equal(flag.defaultValue, expectedSafe, `${name} default`);
    assert.equal(flag.productionDefault, expectedSafe, `${name} production default`);
    assert.equal(flag.failSafeValue, expectedSafe, `${name} fail-safe`);
  }
  assert.match(contract.invalidValuePolicy, /failSafeValue/);
  const envExample = source('.env.example');
  for (const name of [...requiredFlags, ...optionalFlags]) assert.match(envExample, new RegExp(`^${name}=`, 'm'), name);
});

test('8.7 outbound provider writes remain behind execution-time controls', () => {
  const standard = source('lib/meta-platform/domains/instagram/standard-reply-runtime.ts');
  const privateReply = source('lib/meta-platform/domains/instagram/private-reply-runtime.ts');
  const facebookClient = source('realtime-service/src/facebook/graph.client.ts');
  const facebookRetry = source('realtime-service/src/facebook/outgoing-retry.ts');
  assert.match(standard, /assertInstagramCutoverWriteAuthority\('STANDARD', process\.env\)/);
  assert.match(standard, /assertInstagramReplyWriteEnabledAtExecution\('MESSAGE', process\.env\)/);
  assert.match(privateReply, /assertInstagramCutoverWriteAuthority\('PRIVATE', process\.env\)/);
  assert.match(privateReply, /assertInstagramReplyWriteEnabledAtExecution\('PRIVATE_REPLY', process\.env\)/);
  assert.match(facebookClient, /assertFacebookOutboundWriteEnabled/);
  assert.match(facebookRetry, /getFacebookOutboundWriteControl/);
  assert.match(facebookRetry, /deferOutgoingRetryWhileBlocked/);
});

test('8.7 Lead, Instagram and Facebook cutover contracts preserve singular authority and rollback', () => {
  const lead = json('config/meta-phase31-lead-cutover.json');
  const instagram = json('config/meta-phase31-instagram-cutover.json');
  const facebook = json('config/meta-phase31-facebook-realtime-cutover.json');
  assert.equal(lead.shadowAuthority, 'LEGACY');
  assert.equal(lead.platformAuthority, 'PLATFORM');
  assert.equal(lead.invalidRuntimePolicy, 'LEGACY_ROLLBACK');
  assert.equal(lead.stabilityCriteria.maximumDuplicateHandoffs, 0);
  assert.equal(lead.stabilityCriteria.rollbackDrillRequired, true);
  assert.equal(instagram.shadowAuthority, 'LEGACY');
  assert.equal(instagram.platformAuthority, 'PLATFORM');
  assert.equal(instagram.invalidRuntimePolicy, 'LEGACY_ROLLBACK');
  assert.equal(instagram.stabilityCriteria.maximumDuplicateMessages, 0);
  assert.equal(instagram.stabilityCriteria.maximumDuplicateProviderWrites, 0);
  assert.equal(instagram.stabilityCriteria.rollbackDrillRequired, true);
  assert.equal(facebook.shadowAuthority, 'LEGACY');
  assert.equal(facebook.platformAuthority, 'PLATFORM');
  assert.equal(facebook.invalidConfigurationPolicy, 'BLOCKED');
  assert.equal(facebook.retryOwners.legacy, 'REALTIME_LEGACY');
  assert.equal(facebook.retryOwners.platform, 'MAIN_APP_BULLMQ');
  assert.equal(facebook.stabilityCriteria.maximumParallelRetryOwners, 0);
  assert.equal(facebook.stabilityCriteria.rollbackDrillRequired, true);
});

test('8.7 rollback contract covers every roadmap demonstration and forbids unsafe evidence', () => {
  const rollback = json('config/meta-phase31-rollback-proof.json');
  assert.deepEqual(rollback.requiredScenarios, [
    'LEAD_PLATFORM_OFF',
    'INSTAGRAM_READ_PLATFORM_OFF',
    'INSTAGRAM_WRITES_OFF',
    'INSTAGRAM_PRIVATE_REPLY_OFF',
    'REALTIME_BRIDGE_OFF',
    'LEGACY_FALLBACK_ACTIVE',
    'QUEUED_JOBS_HONOR_CURRENT_FLAGS',
    'NO_DATA_CORRUPTION_AFTER_TOGGLE',
    'AUDIT_EVIDENCE_CAPTURED',
  ]);
  assert.equal(rollback.duplicateCounters.length, 4);
  assert.match(rollback.redactionPolicy, /Raw environment values/);
  assert.match(rollback.redactionPolicy, /customer PII/);
  const proof = source('evidence/phase31-meta-social-crm/10-rollback-proof.md');
  for (const scenario of rollback.requiredScenarios) assert.match(proof, new RegExp(scenario));
});

test('8.7 cumulative report records PASS without overstating Layer 9 runtime evidence', () => {
  const evidence = source('evidence/phase31-meta-social-crm/10-cutover-rollback.md');
  const result = source('evidence/phase31-meta-social-crm/items/phase31_layer8.7_result.md');
  assert.match(evidence, /Status:\s*\*\*PASS — source\/offline cutover gate\*\*/);
  assert.match(evidence, /Layer 9/);
  assert.match(evidence, /live PostgreSQL/i);
  assert.match(evidence, /live Meta provider/i);
  assert.match(result, /Status: PASS/);
  assert.match(result, /Prisma schema/);
  assert.doesNotMatch(evidence, /access[_ -]?token\s*[:=]\s*[^`\s]+/i);
  assert.doesNotMatch(evidence, /@[a-z0-9.-]+\.[a-z]{2,}/i);
});

test('8.7 package scripts and execution contract are registered for the full layer gate', () => {
  const pkg = json('package.json');
  for (const id of [...itemIds, '8.7']) {
    assert.equal(typeof pkg.scripts[`test:meta-v6-phase31-layer${id}`], 'string');
    assert.equal(typeof pkg.scripts[`qa:meta-platform-phase31-layer${id}`], 'string');
    assert.equal(typeof pkg.scripts[`qa:phase31-meta-layer${id}`], 'string');
  }
  assert.equal(typeof pkg.scripts['qa:phase31-meta-layer8-items'], 'string');
  assert.equal(typeof pkg.scripts['qa:phase31-meta-layer8'], 'string');
  const execution = json('.ai/phase31-execution-manifest.json');
  const layer = execution.layers['8'];
  assert.equal(layer.items.length, 7);
  assert.deepEqual(layer.artifacts, [
    'minsahbeauty_phase31_layer8_complete.zip',
    'minsahbeauty_phase31_layer8_complete.zip.sha256',
    'phase31_layer8_verification.log',
    'evidence/phase31-meta-social-crm/10-cutover-rollback.md',
  ]);
  const currentItem = Number.parseFloat(String(execution.current_item ?? '0'));
  assert.ok(execution.current_item === '8.7' || currentItem >= 9.1, `current item ${execution.current_item}`);
  if (currentItem >= 9.1) {
    assert.equal(execution.layers['8'].status, 'COMPLETE');
    assert.equal(execution.layers['9'].status, 'IN_PROGRESS');
  }
  assert.equal(execution.standard_item_contract.no_item_zip, true);
  assert.equal(execution.standard_item_contract.full_layer_zip_only, true);
});

test('8.7 presentation/control-only Layer 8 leaves Prisma unchanged', () => {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(new URL('prisma/schema.prisma', root))).digest('hex');
  assert.equal(digest, 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
});
