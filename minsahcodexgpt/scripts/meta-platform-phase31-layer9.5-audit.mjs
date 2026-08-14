#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));
const pkg = json('package.json');
const execution = json('.ai/phase31-execution-manifest.json');
const testFile = 'tests/meta-v6/phase31-layer9.5-instagram-domain.test.mjs';
const tests = read(testFile);
const normalization = read('lib/meta-platform/domains/instagram/normalize-message.ts');
const conversations = read('lib/meta-platform/domains/instagram/conversations.ts');
const replyPolicy = read('lib/meta/instagram/policy.ts');
const sendReply = read('lib/meta-platform/domains/instagram/send-reply.ts');
const privateReply = read('lib/meta-platform/domains/instagram/private-reply.ts');
const mediaPolicy = read('lib/meta-platform/policies/attachments.ts');
const mediaPipeline = read('lib/meta-platform/queue/social-attachment-validation-pipeline.ts');
const outboundRepository = read('lib/meta-platform/repositories/instagram-outbound.ts');
const messagesRuntime = read('lib/meta/instagram/messages.ts');
const worker = read('workers/meta-instagram.worker.ts');

assert.equal(fs.existsSync(testFile), true);
assert.equal(pkg.scripts['test:meta-v6-phase31-layer9.5'], 'node --experimental-strip-types --test tests/meta-v6/phase31-layer9.5-instagram-domain.test.mjs');
assert.equal(pkg.scripts['qa:meta-platform-phase31-layer9.5'], 'node scripts/meta-platform-phase31-layer9.5-audit.mjs');
assert.equal(pkg.scripts['qa:phase31-meta-layer9.5'], 'npm run test:meta-v6-phase31-layer9.5 && npm run qa:meta-platform-phase31-layer9.5 && npm run qa:phase31-meta-instagram');
assert.match(execution.current_item, /^(?:9\.5|9\.[6-8])$/);
assert.equal(execution.layers['9'].items.find((item) => item.id === '9.5')?.schema_change_expected, false);

for (const phrase of [
  'inbound text creates one normalized safe message result',
  'inbound attachment retains safe metadata and schedules validation once',
  'duplicate inbound message creates one row and no duplicate side effects',
  'late inbound message does not corrupt conversation ordering',
  'valid standard reply remains eligible',
  'expired standard reply is blocked',
  'valid private reply reserves one comment-scoped one-shot operation',
  'second private reply is blocked',
  'Instagram Live inactive private reply fails closed',
  'unsafe media is blocked and failed scanning is quarantined',
  'provider message ID is captured durably',
  'unknown provider write requires reconciliation',
  'execution-time write kill switch blocks standard and private replies',
]) assert.match(tests, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

assert.match(normalization, /providerMessageId:/);
assert.match(normalization, /attachments: Object\.freeze/);
assert.match(conversations, /deduplicated: !created/);
assert.match(conversations, /outOfOrder: input\.created && !input\.orderingAdvanced/);
assert.match(replyPolicy, /WINDOW_EXPIRED/);
assert.match(replyPolicy, /INSTAGRAM_STANDARD_REPLY_WINDOW_MS/);
assert.match(privateReply, /INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT_OR_BLOCKED/);
assert.match(privateReply, /INSTAGRAM_PRIVATE_REPLY_LIVE_ENDED/);
assert.match(privateReply, /captureInstagramPrivateReplyProviderResponse/);
assert.match(mediaPolicy, /MEDIA_SCAN_INFECTED/);
assert.match(mediaPolicy, /MEDIA_SCAN_FAILED/);
assert.match(mediaPipeline, /decision !== 'ALLOWED'/);
assert.match(outboundRepository, /providerMessageId/);
assert.match(outboundRepository, /reconciliationStatus: 'REQUIRED'/);
assert.match(sendReply, /assertMetaSocialOutboundWriteEnabled/);
assert.match(sendReply, /return 'RECONCILE'/);
assert.match(messagesRuntime, /INSTAGRAM_PROVIDER_MESSAGE_ID_MISSING/);
assert.match(messagesRuntime, /INSTAGRAM_PROVIDER_WRITE_PERSISTENCE_UNKNOWN/);
assert.match(messagesRuntime, /assertInstagramOutboundWriteEnabled\(input\.mode\)/);
assert.match(worker, /UNKNOWN_WRITE/);
assert.match(worker, /UnrecoverableError/);

assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync('prisma/schema.prisma')).digest('hex'),
  'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce',
);

console.log('Phase 31 Layer 9.5 Instagram domain audit: PASS');
console.log('- inbound text/media, duplicate and late ordering: covered');
console.log('- standard/private reply policy and Live state: covered');
console.log('- media block/quarantine, provider ID and reconciliation: covered');
console.log('- execution-time write kill switch: covered');
console.log('- live Meta provider evidence: deferred to Layer 9.7');
console.log('- Prisma schema change: NONE');
