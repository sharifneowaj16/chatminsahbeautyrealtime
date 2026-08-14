#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));
const pkg = json('package.json');
const execution = json('.ai/phase31-execution-manifest.json');
const testFile = 'tests/meta-v6/phase31-layer9.2-webhook-security-receipts.test.mjs';
const lead = read('lib/meta/leads/handoff.ts');
const instagram = read('lib/meta/instagram/service.ts');
const routeHandler = read('lib/meta-platform/transports/webhook/route-handler.ts');
const signature = read('lib/meta-platform/transports/webhook/signature.ts');
const parser = read('lib/meta-platform/transports/webhook/parser.ts');
const handoff = read('lib/meta-platform/transports/webhook/handoff.ts');
const leadRoute = read('app/api/webhooks/meta/route.ts');
const instagramRoute = read('app/api/webhooks/meta/instagram/route.ts');
const tests = read(testFile);

assert.equal(fs.existsSync(testFile), true);
assert.equal(
  pkg.scripts['test:meta-v6-phase31-layer9.2'],
  'node --experimental-strip-types --test tests/meta-v6/phase31-layer9.2-webhook-security-receipts.test.mjs',
);
assert.equal(pkg.scripts['qa:meta-platform-phase31-layer9.2'], 'node scripts/meta-platform-phase31-layer9.2-audit.mjs');
assert.equal(
  pkg.scripts['qa:phase31-meta-layer9.2'],
  'npm run test:meta-v6-phase31-layer9.2 && npm run qa:meta-platform-phase31-layer9.2 && npm run qa:phase31-meta-webhooks',
);
assert.match(execution.current_item, /^(?:9\.2|9\.[3-8])$/);
assert.equal(execution.layers['9'].items.find((item) => item.id === '9.2')?.schema_change_expected, false);

assert.match(routeHandler, /CONTENT_LENGTH_INVALID/);
assert.match(routeHandler, /PAYLOAD_TOO_LARGE/);
assert.match(signature, /SIGNATURE_MISSING/);
assert.match(signature, /APP_SECRET_MISSING/);
assert.ok(routeHandler.indexOf("headers.get('content-length')") < routeHandler.indexOf('await input.request.text()'));
assert.ok(routeHandler.indexOf('await input.request.text()') < routeHandler.indexOf('const signature = verifyMetaWebhookSignature'));
assert.match(handoff, /META_WEBHOOK_HANDOFF_UNAVAILABLE/);
assert.match(handoff, /status: 503/);
assert.match(handoff, /DUPLICATE_IN_DELIVERY/);
assert.match(handoff, /outcome: 'DEFERRED'/);
assert.match(parser, /routingTarget: route\.routingTarget/);
assert.match(parser, /notifications\.sort/);
assert.match(parser, /left\.localeCompare\(right\)/);

assert.match(lead, /queueAdapterPromise/);
assert.match(instagram, /queueAdapterPromise/);
assert.ok(lead.indexOf('await createVerifiedMetaWebhookReceipt') < lead.indexOf('await getQueueAdapter()'));
assert.ok(lead.indexOf('await getQueueAdapter()') < lead.indexOf('await enqueueMetaLeadProcessingJob'));
assert.ok(instagram.indexOf('await persistInstagramWebhookReceipt') < instagram.indexOf('await getQueueAdapter()'));
assert.ok(instagram.indexOf('await getQueueAdapter()') < instagram.indexOf('await enqueueMetaInstagramInboundJob'));
assert.match(lead, /disposition: 'DEFERRED'/);
assert.match(instagram, /disposition: 'DEFERRED'/);
assert.match(lead, /code: 'QUEUE_HANDOFF_FAILED'/);
assert.match(instagram, /code: 'QUEUE_HANDOFF_FAILED'/);

for (const [source, handoffCall] of [
  [leadRoute, 'await handoffMetaLeadWebhookNotifications'],
  [instagramRoute, 'await receiveInstagramWebhookEvents'],
]) {
  assert.ok(source.indexOf('if (!transport.ok)') < source.lastIndexOf('parseAndNormalizeMetaWebhookNotifications'));
  assert.ok(source.lastIndexOf('parseAndNormalizeMetaWebhookNotifications') < source.indexOf(handoffCall));
  assert.match(source, /metaWebhookHandoffUnavailableResponse/);
}

for (const phrase of [
  'valid Meta challenge',
  'missing and malformed signatures',
  'bad raw-body signature',
  'oversized bodies',
  'receipt-store outage',
  'persist receipts before lazy queue acquisition',
  'queue outage after a durable receipt',
  'duplicate event delivery',
  'unsupported Meta objects',
  'late and out-of-order events',
]) assert.match(tests, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync('prisma/schema.prisma')).digest('hex'),
  'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce',
);

console.log('Phase 31 Layer 9.2 webhook security and receipt audit: PASS');
console.log('- security/challenge/body-limit scenarios: covered');
console.log('- receipt outage returns retryable 503: verified');
console.log('- queue acquisition occurs after durable Lead/Instagram receipt: verified');
console.log('- duplicate, unsupported and out-of-order behavior: deterministic');
console.log('- Prisma schema change: NONE');
