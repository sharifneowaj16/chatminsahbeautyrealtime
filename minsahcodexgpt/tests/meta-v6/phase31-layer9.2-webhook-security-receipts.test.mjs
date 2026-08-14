import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

function signature(rawBody, secret) {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

function makeRequest(input = {}) {
  let reads = 0;
  const headers = new Map(Object.entries(input.headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return {
    request: {
      headers: { get: (name) => headers.get(name.toLowerCase()) ?? null },
      async text() {
        reads += 1;
        if (input.readError) throw new Error('read failed');
        return input.body ?? '';
      },
    },
    reads: () => reads,
  };
}

async function loadRouteHandler() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-layer9.2-route-handler-'));
  for (const name of ['types.ts', 'challenge.ts', 'signature.ts']) {
    fs.copyFileSync(`lib/meta-platform/transports/webhook/${name}`, path.join(root, name));
  }
  const source = fs.readFileSync('lib/meta-platform/transports/webhook/route-handler.ts', 'utf8')
    .replace("from './challenge'", "from './challenge.ts'")
    .replace("from './signature'", "from './signature.ts'")
    .replace("from './types'", "from './types.ts'");
  const target = path.join(root, 'route-handler.ts');
  fs.writeFileSync(target, source);
  return import(`${pathToFileURL(target).href}?run=${Date.now()}`);
}

async function loadParser() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-layer9.2-parser-'));
  const contractDir = path.join(root, 'lib/meta-platform/contracts');
  const transportDir = path.join(root, 'lib/meta-platform/transports/webhook');
  fs.mkdirSync(contractDir, { recursive: true });
  fs.mkdirSync(transportDir, { recursive: true });
  fs.copyFileSync('lib/meta-platform/contracts/webhook.ts', path.join(contractDir, 'webhook.ts'));
  fs.copyFileSync('lib/meta-platform/transports/webhook/signature.ts', path.join(transportDir, 'signature.ts'));
  fs.writeFileSync(
    path.join(transportDir, 'routing.ts'),
    fs.readFileSync('lib/meta-platform/transports/webhook/routing.ts', 'utf8')
      .replace("from '../../contracts/webhook'", "from '../../contracts/webhook.ts'"),
  );
  const source = fs.readFileSync('lib/meta-platform/transports/webhook/parser.ts', 'utf8')
    .replace("from '../../contracts/webhook'", "from '../../contracts/webhook.ts'")
    .replace("from './routing'", "from './routing.ts'")
    .replace("from './signature'", "from './signature.ts'");
  const target = path.join(transportDir, 'parser.ts');
  fs.writeFileSync(target, source);
  return import(`${pathToFileURL(target).href}?run=${Date.now()}`);
}

async function loadHandoff() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-layer9.2-handoff-'));
  for (const name of ['types.ts', 'challenge.ts', 'signature.ts']) {
    fs.copyFileSync(`lib/meta-platform/transports/webhook/${name}`, path.join(root, name));
  }
  fs.writeFileSync(
    path.join(root, 'route-handler.ts'),
    fs.readFileSync('lib/meta-platform/transports/webhook/route-handler.ts', 'utf8')
      .replace("from './challenge'", "from './challenge.ts'")
      .replace("from './signature'", "from './signature.ts'")
      .replace("from './types'", "from './types.ts'"),
  );
  const source = fs.readFileSync('lib/meta-platform/transports/webhook/handoff.ts', 'utf8')
    .replace("from './route-handler'", "from './route-handler.ts'");
  const target = path.join(root, 'handoff.ts');
  fs.writeFileSync(target, source);
  return import(`${pathToFileURL(target).href}?run=${Date.now()}`);
}

const routeHandler = await loadRouteHandler();
const parser = await loadParser();
const handoff = await loadHandoff();

test('9.2 valid Meta challenge succeeds and invalid challenge inputs fail closed', () => {
  const valid = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': 'verify-me',
    'hub.challenge': 'challenge-value',
  });
  assert.deepEqual(routeHandler.verifyMetaWebhookChallengeRequest({ searchParams: valid, expectedToken: 'verify-me' }), {
    ok: true,
    challenge: 'challenge-value',
  });

  const wrongToken = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': 'wrong',
    'hub.challenge': 'challenge-value',
  });
  assert.deepEqual(routeHandler.verifyMetaWebhookChallengeRequest({ searchParams: wrongToken, expectedToken: 'verify-me' }), {
    ok: false,
    code: 'VERIFY_TOKEN_MISMATCH',
  });
  assert.equal(routeHandler.verifyMetaWebhookChallengeRequest({ searchParams: new URLSearchParams(), expectedToken: 'verify-me' }).ok, false);
});

test('9.2 missing and malformed signatures are rejected with no verified request', async () => {
  const body = '{"object":"page","entry":[]}';
  const missing = await routeHandler.readAndVerifyMetaWebhookRequest({ request: makeRequest({ body }).request, appSecret: 'secret' });
  assert.deepEqual(missing, {
    ok: false,
    code: 'SIGNATURE_MISSING',
    httpStatus: 401,
    payloadDigest: createHash('sha256').update(body).digest('hex'),
  });

  const malformed = await routeHandler.readAndVerifyMetaWebhookRequest({
    request: makeRequest({ body, headers: { 'x-hub-signature-256': 'sha256=not-a-digest' } }).request,
    appSecret: 'secret',
  });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.code, 'SIGNATURE_FORMAT_INVALID');
  assert.equal(malformed.httpStatus, 401);
});

test('9.2 bad raw-body signature is rejected even when JSON meaning is equivalent', async () => {
  const signedBody = '{"object":"page","entry":[]}';
  const deliveredBody = '{ "object": "page", "entry": [] }';
  const result = await routeHandler.readAndVerifyMetaWebhookRequest({
    request: makeRequest({
      body: deliveredBody,
      headers: { 'x-hub-signature-256': signature(signedBody, 'secret') },
    }).request,
    appSecret: 'secret',
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'SIGNATURE_MISMATCH');
  assert.equal(result.httpStatus, 401);
});

test('9.2 declared and actual oversized bodies are rejected before business parsing', async () => {
  const declared = makeRequest({ body: '{}', headers: { 'content-length': '2048' } });
  assert.deepEqual(
    await routeHandler.readAndVerifyMetaWebhookRequest({ request: declared.request, appSecret: 'secret', maxBytes: 1024 }),
    { ok: false, code: 'PAYLOAD_TOO_LARGE', httpStatus: 413 },
  );
  assert.equal(declared.reads(), 0);

  const body = JSON.stringify({ value: 'x'.repeat(1_100) });
  const actual = makeRequest({ body });
  assert.deepEqual(
    await routeHandler.readAndVerifyMetaWebhookRequest({ request: actual.request, appSecret: 'secret', maxBytes: 1024 }),
    { ok: false, code: 'PAYLOAD_TOO_LARGE', httpStatus: 413 },
  );
  assert.equal(actual.reads(), 1);
});

test('9.2 receipt-store outage returns a retryable 503 and never claims receipt acceptance', () => {
  assert.deepEqual(handoff.metaWebhookHandoffUnavailableResponse(), {
    status: 503,
    body: {
      ok: false,
      received: false,
      outcome: 'DEFERRED',
      code: 'META_WEBHOOK_HANDOFF_UNAVAILABLE',
      error: 'Webhook receipt handoff unavailable',
    },
  });
});

test('9.2 production Lead and Instagram paths persist receipts before lazy queue acquisition', () => {
  const lead = fs.readFileSync('lib/meta/leads/handoff.ts', 'utf8');
  const instagram = fs.readFileSync('lib/meta/instagram/service.ts', 'utf8');
  assert.match(lead, /queueAdapterPromise/);
  assert.match(instagram, /queueAdapterPromise/);
  assert.ok(lead.indexOf('await createVerifiedMetaWebhookReceipt') < lead.indexOf('await getQueueAdapter()'));
  assert.ok(lead.indexOf('await getQueueAdapter()') < lead.indexOf('await enqueueMetaLeadProcessingJob'));
  assert.ok(instagram.indexOf('await persistInstagramWebhookReceipt') < instagram.indexOf('await getQueueAdapter()'));
  assert.ok(instagram.indexOf('await getQueueAdapter()') < instagram.indexOf('await enqueueMetaInstagramInboundJob'));
});

test('9.2 queue outage after a durable receipt is acknowledged as deferred', async () => {
  const timeline = [];
  const records = await handoff.handoffMetaWebhookItems({
    items: [{ eventKey: 'event-queue-outage' }],
    receive: async () => {
      timeline.push('receipt:persisted');
      try {
        timeline.push('queue:acquire');
        throw new Error('QUEUE_UNAVAILABLE');
      } catch {
        return { receiptId: 'receipt-queue-outage', disposition: 'DEFERRED', code: 'QUEUE_HANDOFF_FAILED' };
      }
    },
  });
  assert.deepEqual(timeline, ['receipt:persisted', 'queue:acquire']);
  const response = handoff.metaWebhookHandoffResponse(handoff.summarizeMetaWebhookHandoff({ records }));
  assert.equal(response.received, true);
  assert.equal(response.outcome, 'DEFERRED');
  assert.equal(response.deferred, 1);
});

test('9.2 duplicate event delivery executes receipt processing once', async () => {
  let calls = 0;
  const records = await handoff.handoffMetaWebhookItems({
    items: [{ eventKey: 'event-duplicate' }, { eventKey: 'event-duplicate' }],
    receive: async () => {
      calls += 1;
      return { receiptId: 'receipt-duplicate', disposition: 'ACCEPTED' };
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(records.map((item) => item.disposition), ['ACCEPTED', 'DUPLICATE']);
  assert.equal(records[1].code, 'DUPLICATE_IN_DELIVERY');
});

test('9.2 unsupported Meta objects are normalized safely and can be acknowledged as ignored', () => {
  const parsed = parser.parseAndNormalizeMetaWebhookNotifications({
    rawBody: JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ id: 'wa-1', changes: [{ field: 'messages', value: { id: 'provider-event-1' } }] }],
    }),
  });
  assert.equal(parsed.notifications.length, 1);
  assert.equal(parsed.notifications[0].routingTarget, 'UNSUPPORTED');
  assert.equal(parsed.notifications[0].eventKind, 'UNKNOWN');
  const response = handoff.metaWebhookHandoffResponse(handoff.summarizeMetaWebhookHandoff({ ignored: 1 }));
  assert.equal(response.ok, true);
  assert.equal(response.outcome, 'IGNORED');
  assert.equal(response.ignored, 1);
});

test('9.2 late and out-of-order events normalize into deterministic chronological order', () => {
  const rawBody = JSON.stringify({
    object: 'instagram',
    entry: [{
      id: 'ig-1',
      messaging: [
        { sender: { id: 'user-1' }, recipient: { id: 'ig-1' }, timestamp: 1_752_800_010_000, message: { mid: 'mid-newer' } },
        { sender: { id: 'user-1' }, recipient: { id: 'ig-1' }, timestamp: 1_752_800_000_000, message: { mid: 'mid-older' } },
      ],
    }],
  });
  const first = parser.parseAndNormalizeMetaWebhookNotifications({ rawBody });
  const second = parser.parseAndNormalizeMetaWebhookNotifications({ rawBody });
  assert.deepEqual(first.notifications.map((item) => item.providerEventId), ['mid-older', 'mid-newer']);
  assert.deepEqual(first.notifications, second.notifications);
  assert.equal(first.notifications.every((item) => item.orderingKey === 'ig-1'), true);
});

test('9.2 active routes verify transport before parse and parse before receipt handoff', () => {
  const leadRoute = fs.readFileSync('app/api/webhooks/meta/route.ts', 'utf8');
  const instagramRoute = fs.readFileSync('app/api/webhooks/meta/instagram/route.ts', 'utf8');
  for (const [source, handoffCall] of [
    [leadRoute, 'await handoffMetaLeadWebhookNotifications'],
    [instagramRoute, 'await receiveInstagramWebhookEvents'],
  ]) {
    assert.ok(source.indexOf('if (!transport.ok)') < source.lastIndexOf('parseAndNormalizeMetaWebhookNotifications'));
    assert.ok(source.lastIndexOf('parseAndNormalizeMetaWebhookNotifications') < source.indexOf(handoffCall));
    assert.match(source, /metaWebhookHandoffUnavailableResponse/);
  }
});
