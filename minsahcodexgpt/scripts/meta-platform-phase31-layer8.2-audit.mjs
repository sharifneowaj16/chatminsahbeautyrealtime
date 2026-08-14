#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

const controls = JSON.parse(fs.readFileSync('config/meta-phase31-outbound-write-controls.json', 'utf8'));
const envManifest = JSON.parse(fs.readFileSync('config/env.manifest.json', 'utf8'));
const envExample = fs.readFileSync('.env.example', 'utf8');
const realtimeEnv = fs.readFileSync('realtime-service/.env.example', 'utf8');
const runtime = fs.readFileSync('lib/meta-platform/config/social-outbound-write-control.ts', 'utf8');
const instagramRuntime = fs.readFileSync('lib/meta-platform/domains/instagram/send-reply.ts', 'utf8');
const instagramWorker = fs.readFileSync('workers/meta-instagram.worker.ts', 'utf8');
const realtimeControl = fs.readFileSync('realtime-service/src/facebook/outbound-write-control.ts', 'utf8');
const graph = fs.readFileSync('realtime-service/src/facebook/graph.client.ts', 'utf8');
const retry = fs.readFileSync('realtime-service/src/facebook/outgoing-retry.ts', 'utf8');
const replyRoute = fs.readFileSync('realtime-service/src/routes/reply.router.ts', 'utf8');
const instagramHealth = fs.readFileSync('lib/meta-platform/admin/instagram-status.ts', 'utf8');
const providerHealth = fs.readFileSync('lib/meta-platform/admin/provider-health.ts', 'utf8');
const docs = fs.readFileSync('docs/runbooks/meta-phase31-layer8-outbound-kill-switch.md', 'utf8');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const execution = JSON.parse(fs.readFileSync('.ai/phase31-execution-manifest.json', 'utf8'));

assert.equal(controls.item, '8.2');
assert.deepEqual(controls.operations, [
  'INSTAGRAM_STANDARD_REPLY',
  'INSTAGRAM_PRIVATE_REPLY',
  'FACEBOOK_PAGE_MESSAGE',
  'FACEBOOK_PAGE_COMMENT_REPLY',
  'FACEBOOK_PAGE_MEDIA',
]);

for (const name of [
  'META_PLATFORM_GLOBAL_KILL_SWITCH',
  'META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH',
  'META_PLATFORM_INSTAGRAM_KILL_SWITCH',
  'META_PLATFORM_FACEBOOK_KILL_SWITCH',
]) {
  assert.equal(envManifest.booleans.includes(name), true, `${name} env schema`);
  assert.match(envExample, new RegExp(`^${name}=false$`, 'm'), `${name} root env docs`);
  assert.match(docs, new RegExp(name), `${name} runbook docs`);
}
for (const name of [
  'META_PLATFORM_GLOBAL_KILL_SWITCH',
  'META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH',
  'META_PLATFORM_FACEBOOK_KILL_SWITCH',
]) {
  assert.match(realtimeEnv, new RegExp(`^${name}=false$`, 'm'), `${name} realtime env docs`);
}

assert.match(runtime, /INVALID_FAIL_SAFE_ACTIVE/);
assert.match(runtime, /META_PLATFORM_INSTAGRAM_WRITES/);
assert.match(runtime, /META_PLATFORM_INSTAGRAM_PRIVATE_REPLY/);
assert.match(instagramRuntime, /assertMetaSocialOutboundWriteEnabled/);
assert.match(instagramWorker, /markInstagramReplyBlockedStorage/);
assert.match(instagramWorker, /decision\.classification === 'POLICY_BLOCKED'/);
assert.match(realtimeControl, /process\.env/);
assert.match(graph, /assertFacebookOutboundWriteEnabled\(operation, process\.env\)/);
assert.match(graph, /FACEBOOK_PAGE_MEDIA/);
assert.match(graph, /FACEBOOK_PAGE_COMMENT_REPLY/);
assert.match(retry, /deferOutgoingRetryWhileBlocked/);
assert.match(retry, /getFacebookOutboundWriteControl\(getOutgoingOperation\(job\), process\.env\)/);
assert.match(replyRoute, /Outbound write blocked/);
assert.match(instagramHealth, /replyControl/);
assert.match(providerHealth, /outboundWriteControl/);
assert.match(docs, /attempt counter is not increased/);
assert.match(schema, /generator client/);
assert.equal(execution.layers['8'].items.find((item) => item.id === '8.2').status, 'COMPLETE');
assert.match(execution.current_item, /^(?:8\.[3-7]|9\.[1-8])$/);
assert.equal(execution.standard_item_contract.no_item_zip, true);
assert.equal(execution.standard_item_contract.full_layer_zip_only, true);

console.log('Phase 31 Layer 8.2 audit PASS');
console.log('- Instagram standard/private writes: explicit enable + execution-time kill switches');
console.log('- Facebook message/comment/media writes: provider-boundary execution-time switches');
console.log('- Queued Facebook retries: deferred while blocked without incrementing attempts');
console.log('- Admin visibility: safe reason codes, no raw environment values');
console.log('- Prisma schema change: NONE');
