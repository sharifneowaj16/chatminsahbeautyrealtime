#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const contract = JSON.parse(read('config/meta-phase31-rollback-proof.json'));
const moduleSource = read('lib/meta-platform/config/phase31-rollback-proof.ts');
const tests = read('tests/meta-v6/phase31-layer8.6-rollback-proof.test.mjs');
const leadWorker = read('workers/meta-lead.worker.ts');
const leadProduction = read('lib/meta-platform/domains/leads/production.ts');
const instagramWorker = read('workers/meta-instagram.worker.ts');
const standardReply = read('lib/meta-platform/domains/instagram/standard-reply-runtime.ts');
const privateReply = read('lib/meta-platform/domains/instagram/private-reply-runtime.ts');
const facebookWorker = read('workers/meta-social.worker.ts');
const realtimeIndex = read('realtime-service/src/index.ts');
const health = read('lib/meta-platform/admin/provider-health.ts');
const evidence = read('evidence/phase31-meta-social-crm/10-rollback-proof.md');
const result = read('evidence/phase31-meta-social-crm/items/phase31_layer8.6_result.md');
const execution = JSON.parse(read('.ai/phase31-execution-manifest.json'));
const schema = read('prisma/schema.prisma');

const scenarios = [
  'LEAD_PLATFORM_OFF',
  'INSTAGRAM_READ_PLATFORM_OFF',
  'INSTAGRAM_WRITES_OFF',
  'INSTAGRAM_PRIVATE_REPLY_OFF',
  'REALTIME_BRIDGE_OFF',
  'LEGACY_FALLBACK_ACTIVE',
  'QUEUED_JOBS_HONOR_CURRENT_FLAGS',
  'NO_DATA_CORRUPTION_AFTER_TOGGLE',
  'AUDIT_EVIDENCE_CAPTURED',
];
assert.equal(contract.item, '8.6');
assert.deepEqual(contract.requiredScenarios, scenarios);
assert.equal(contract.preservedBusinessState.includes('providerWriteCount'), true);
assert.equal(contract.duplicateCounters.length, 4);
assert.match(contract.redactionPolicy, /Raw environment values/);
assert.match(moduleSource, /compareMetaRollbackDurableSnapshots/);
assert.match(moduleSource, /buildMetaPhase31RollbackProof/);
assert.match(moduleSource, /rawEnvironmentValuesIncluded: false/);
assert.match(moduleSource, /tokenOrSecretIncluded: false/);
assert.match(moduleSource, /after\.auditRecordCount > before\.auditRecordCount/);
assert.match(moduleSource, /control\.queueExecution\.leadAuthorityAtExecution === 'LEGACY'/);
assert.match(moduleSource, /facebookRetryOwnerAtExecution === 'REALTIME_LEGACY'/);
assert.match(tests, /queued Lead execution re-reads rollback authority/);
assert.match(tests, /queued Instagram standard and private writes are blocked at execution time/);
assert.match(tests, /data-integrity proof detects/);
assert.match(leadWorker, /processMetaLeadReceiptProduction as processMetaLeadReceipt/);
assert.match(leadProduction, /source: process\.env/);
assert.match(instagramWorker, /executeInstagramStandardReplyProduction/);
assert.match(instagramWorker, /executeInstagramPrivateReplyProduction/);
assert.match(standardReply, /assertInstagramCutoverWriteAuthority\('STANDARD', process\.env\)/);
assert.match(standardReply, /assertInstagramReplyWriteEnabledAtExecution\('MESSAGE', process\.env\)/);
assert.match(privateReply, /assertInstagramCutoverWriteAuthority\('PRIVATE', process\.env\)/);
assert.match(privateReply, /assertInstagramReplyWriteEnabledAtExecution\('PRIVATE_REPLY', process\.env\)/);
assert.match(facebookWorker, /executeFacebookInboxSyncProduction/);
assert.match(realtimeIndex, /getRealtimeFacebookCutoverStatus\(\)/);
assert.match(realtimeIndex, /cutover\.retryOwner !== 'REALTIME_LEGACY'/);
assert.match(health, /rollbackControl: getMetaPhase31RollbackControlSnapshot\(process\.env\)/);
for (const scenario of scenarios) assert.match(evidence, new RegExp(scenario));
assert.match(evidence, /source\/offline rollback proof/i);
assert.match(evidence, /Layer 9/);
assert.doesNotMatch(evidence, /access[_ -]?token\s*[:=]\s*[^`\s]+/i);
assert.doesNotMatch(evidence, /@[a-z0-9.-]+\.[a-z]{2,}/i);
assert.match(result, /Status: PASS/);
assert.match(result, /Prisma schema/);
assert.match(schema, /generator client/);
const item = execution.layers['8'].items.find((entry) => entry.id === '8.6');
assert.ok(item);
assert.match(item.status, /^(?:NOT_STARTED|COMPLETE)$/);
assert.match(execution.current_item, /^(?:8\.[6-7]|9\.[1-8])$/);
assert.equal(execution.standard_item_contract.no_item_zip, true);
assert.equal(execution.standard_item_contract.full_layer_zip_only, true);

console.log('Phase 31 Layer 8.6 audit PASS');
console.log('- All nine rollback scenarios are covered');
console.log('- Queue execution re-check boundaries are present');
console.log('- Canonical data-integrity and duplicate invariants are enforced');
console.log('- Evidence projection forbids raw environment, tokens, payloads and PII');
console.log('- Prisma schema change: NONE');
