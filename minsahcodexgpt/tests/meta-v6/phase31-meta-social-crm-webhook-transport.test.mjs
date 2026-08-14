import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

async function loadWebhookRouteHandler() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-webhook-route-handler-'));
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

function signature(rawBody, secret) {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

const routeHandler = await loadWebhookRouteHandler();

test('challenge query extraction accepts the canonical Meta subscription request', () => {
  const params = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': 'verify-me',
    'hub.challenge': 'challenge-value',
  });
  assert.deepEqual(routeHandler.verifyMetaWebhookChallengeRequest({ searchParams: params, expectedToken: 'verify-me' }), {
    ok: true,
    challenge: 'challenge-value',
  });
});

test('challenge query extraction fails closed for a mismatched token', () => {
  const params = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': 'wrong',
    'hub.challenge': 'challenge-value',
  });
  assert.deepEqual(routeHandler.verifyMetaWebhookChallengeRequest({ searchParams: params, expectedToken: 'verify-me' }), {
    ok: false,
    code: 'VERIFY_TOKEN_MISMATCH',
  });
});

test('declared oversized payload is rejected before reading the request body', async () => {
  const input = makeRequest({ body: '{}', headers: { 'content-length': '2048' } });
  const result = await routeHandler.readAndVerifyMetaWebhookRequest({ request: input.request, appSecret: 'secret', maxBytes: 1024 });
  assert.deepEqual(result, { ok: false, code: 'PAYLOAD_TOO_LARGE', httpStatus: 413 });
  assert.equal(input.reads(), 0);
});

test('malformed content-length is rejected before reading the request body', async () => {
  const input = makeRequest({ body: '{}', headers: { 'content-length': '12x' } });
  const result = await routeHandler.readAndVerifyMetaWebhookRequest({ request: input.request, appSecret: 'secret' });
  assert.deepEqual(result, { ok: false, code: 'CONTENT_LENGTH_INVALID', httpStatus: 400 });
  assert.equal(input.reads(), 0);
});

test('actual UTF-8 byte length is enforced when content-length is absent', async () => {
  const body = JSON.stringify({ value: 'x'.repeat(1_100) });
  const input = makeRequest({ body });
  const result = await routeHandler.readAndVerifyMetaWebhookRequest({ request: input.request, appSecret: 'secret', maxBytes: 1024 });
  assert.deepEqual(result, { ok: false, code: 'PAYLOAD_TOO_LARGE', httpStatus: 413 });
  assert.equal(input.reads(), 1);
});

test('body read failures return a bounded request error', async () => {
  const input = makeRequest({ readError: true });
  const result = await routeHandler.readAndVerifyMetaWebhookRequest({ request: input.request, appSecret: 'secret' });
  assert.deepEqual(result, { ok: false, code: 'BODY_READ_FAILED', httpStatus: 400 });
});

test('missing signatures are rejected after raw-body digest creation', async () => {
  const body = '{"object":"instagram","entry":[]}';
  const input = makeRequest({ body });
  const result = await routeHandler.readAndVerifyMetaWebhookRequest({ request: input.request, appSecret: 'secret' });
  assert.deepEqual(result, {
    ok: false,
    code: 'SIGNATURE_MISSING',
    httpStatus: 401,
    payloadDigest: createHash('sha256').update(body).digest('hex'),
  });
});

test('missing application secret is a service failure rather than an authentication success', async () => {
  const body = '{"object":"page","entry":[]}';
  const input = makeRequest({ body, headers: { 'x-hub-signature-256': signature(body, 'secret') } });
  const result = await routeHandler.readAndVerifyMetaWebhookRequest({ request: input.request, appSecret: null });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'APP_SECRET_MISSING');
  assert.equal(result.httpStatus, 503);
});

test('valid raw-body signature returns one immutable verified transport result', async () => {
  const body = '{\n  "object": "instagram",\n  "entry": []\n}';
  const input = makeRequest({
    body,
    headers: {
      'content-length': Buffer.byteLength(body, 'utf8'),
      'x-hub-signature-256': signature(body, 'secret'),
    },
  });
  const result = await routeHandler.readAndVerifyMetaWebhookRequest({ request: input.request, appSecret: 'secret' });
  assert.deepEqual(result, {
    ok: true,
    rawBody: body,
    byteLength: Buffer.byteLength(body, 'utf8'),
    payloadDigest: createHash('sha256').update(body).digest('hex'),
    signatureAlgorithm: 'sha256',
  });
  assert.equal(Object.isFrozen(result), true);
});

test('signature verification is bound to the exact raw body, including whitespace', async () => {
  const signedBody = '{"object":"page","entry":[]}';
  const deliveredBody = '{ "object": "page", "entry": [] }';
  const input = makeRequest({
    body: deliveredBody,
    headers: { 'x-hub-signature-256': signature(signedBody, 'secret') },
  });
  const result = await routeHandler.readAndVerifyMetaWebhookRequest({ request: input.request, appSecret: 'secret' });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'SIGNATURE_MISMATCH');
  assert.equal(result.httpStatus, 401);
});

async function loadWebhookParser() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-webhook-parser-'));
  const contractDir = path.join(root, 'lib/meta-platform/contracts');
  const transportDir = path.join(root, 'lib/meta-platform/transports/webhook');
  fs.mkdirSync(contractDir, { recursive: true });
  fs.mkdirSync(transportDir, { recursive: true });
  fs.copyFileSync('lib/meta-platform/contracts/webhook.ts', path.join(contractDir, 'webhook.ts'));
  fs.copyFileSync('lib/meta-platform/transports/webhook/signature.ts', path.join(transportDir, 'signature.ts'));
  const routing = fs.readFileSync('lib/meta-platform/transports/webhook/routing.ts', 'utf8')
    .replace("from '../../contracts/webhook'", "from '../../contracts/webhook.ts'");
  fs.writeFileSync(path.join(transportDir, 'routing.ts'), routing);
  const parser = fs.readFileSync('lib/meta-platform/transports/webhook/parser.ts', 'utf8')
    .replace("from '../../contracts/webhook'", "from '../../contracts/webhook.ts'")
    .replace("from './routing'", "from './routing.ts'")
    .replace("from './signature'", "from './signature.ts'");
  const target = path.join(transportDir, 'parser.ts');
  fs.writeFileSync(target, parser);
  return import(`${pathToFileURL(target).href}?run=${Date.now()}`);
}

const parser = await loadWebhookParser();

test('shared envelope parser assigns deterministic Lead Ads, Instagram, Page and unsupported routes', () => {
  const body = JSON.stringify({
    object: 'page',
    entry: [{
      id: 'page-1',
      time: 1_752_800_000,
      changes: [{ field: 'leadgen', value: { leadgen_id: 'lead-1' } }],
      messaging: [{ sender: { id: 'user-1' }, recipient: { id: 'page-1' }, timestamp: 1_752_800_001, message: { mid: 'mid-page-1' } }],
    }],
  });
  const page = parser.parseAndNormalizeMetaWebhookNotifications({ rawBody: body });
  assert.deepEqual(page.notifications.map((event) => [event.eventKind, event.routingTarget]), [
    ['LEADGEN', 'LEAD_ADS'],
    ['MESSAGE', 'FACEBOOK_PAGE'],
  ]);

  const instagram = parser.parseAndNormalizeMetaWebhookNotifications({
    rawBody: JSON.stringify({
      object: 'instagram',
      entry: [{
        id: 'ig-1',
        messaging: [{ sender: { id: 'user-2' }, recipient: { id: 'ig-1' }, timestamp: 1_752_800_002, message: { mid: 'mid-ig-1' } }],
        changes: [{ field: 'comments', value: { id: 'comment-1', timestamp: 1_752_800_003 } }],
      }],
    }),
  });
  assert.deepEqual(instagram.notifications.map((event) => [event.eventKind, event.routingTarget]), [
    ['MESSAGE', 'INSTAGRAM'],
    ['COMMENT', 'INSTAGRAM'],
  ]);

  const unsupported = parser.parseAndNormalizeMetaWebhookNotifications({
    rawBody: JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'wa-1', changes: [{ field: 'messages', value: {} }] }] }),
  });
  assert.equal(unsupported.notifications[0].eventKind, 'UNKNOWN');
  assert.equal(unsupported.notifications[0].routingTarget, 'UNSUPPORTED');
});

test('shared envelope parser normalizes object and change field casing before routing', () => {
  const result = parser.parseAndNormalizeMetaWebhookNotifications({
    rawBody: JSON.stringify({ object: ' Instagram ', entry: [{ id: 'ig-1', changes: [{ field: ' Comments ', value: { id: 'comment-1' } }] }] }),
  });
  assert.equal(result.envelope.object, 'instagram');
  assert.equal(result.notifications[0].field, 'comments');
  assert.equal(result.notifications[0].routingTarget, 'INSTAGRAM');
  assert.equal(result.notifications[0].eventKind, 'COMMENT');
});

test('shared envelope parser fails closed for malformed object, entry and event group shapes', () => {
  assert.throws(
    () => parser.parseMetaWebhookEnvelope({ rawBody: JSON.stringify({ entry: [] }) }),
    /META_WEBHOOK_OBJECT_INVALID/,
  );
  assert.throws(
    () => parser.parseMetaWebhookEnvelope({ rawBody: JSON.stringify({ object: 'page', entry: [null] }) }),
    /META_WEBHOOK_ENTRY_INVALID/,
  );
  assert.throws(
    () => parser.parseMetaWebhookEnvelope({ rawBody: JSON.stringify({ object: 'page', entry: [{ id: 'page-1', changes: {} }] }) }),
    /META_WEBHOOK_CHANGES_INVALID/,
  );
  assert.throws(
    () => parser.parseAndNormalizeMetaWebhookNotifications({ rawBody: JSON.stringify({ object: 'page', entry: [{ id: 'page-1', changes: [null] }] }) }),
    /META_WEBHOOK_EVENT_INVALID/,
  );
});

test('shared envelope parser enforces entry, group and total event bounds without truncation', () => {
  assert.throws(
    () => parser.parseMetaWebhookEnvelope({
      rawBody: JSON.stringify({ object: 'page', entry: Array.from({ length: parser.META_WEBHOOK_MAX_ENTRIES + 1 }, (_, index) => ({ id: `page-${index}` })) }),
    }),
    /META_WEBHOOK_ENTRY_LIMIT_EXCEEDED/,
  );
  assert.throws(
    () => parser.parseMetaWebhookEnvelope({
      rawBody: JSON.stringify({ object: 'page', entry: [{ id: 'page-1', changes: Array.from({ length: parser.META_WEBHOOK_MAX_EVENTS_PER_GROUP + 1 }, () => ({ field: 'leadgen', value: {} })) }] }),
    }),
    /META_WEBHOOK_EVENT_GROUP_LIMIT_EXCEEDED/,
  );
  assert.throws(
    () => parser.parseMetaWebhookEnvelope({
      rawBody: JSON.stringify({
        object: 'page',
        entry: [
          { id: 'page-1', changes: Array.from({ length: 500 }, () => ({ field: 'leadgen', value: {} })) },
          { id: 'page-2', changes: Array.from({ length: 500 }, () => ({ field: 'leadgen', value: {} })), messaging: [{}] },
        ],
      }),
    }),
    /META_WEBHOOK_EVENT_LIMIT_EXCEEDED/,
  );
});

test('shared envelope parser binds parsing to the verified raw-body digest', () => {
  const rawBody = JSON.stringify({ object: 'instagram', entry: [] });
  const expectedPayloadDigest = createHash('sha256').update(rawBody).digest('hex');
  const result = parser.parseAndNormalizeMetaWebhookNotifications({ rawBody, expectedPayloadDigest });
  assert.equal(result.payloadDigest, expectedPayloadDigest);
  assert.throws(
    () => parser.parseAndNormalizeMetaWebhookNotifications({ rawBody, expectedPayloadDigest: '0'.repeat(64) }),
    /META_WEBHOOK_PAYLOAD_DIGEST_MISMATCH/,
  );
});

test('routing target selection returns an immutable domain-only event list', () => {
  const result = parser.parseAndNormalizeMetaWebhookNotifications({
    rawBody: JSON.stringify({
      object: 'page',
      entry: [{
        id: 'page-1',
        changes: [{ field: 'leadgen', value: { leadgen_id: 'lead-1' } }, { field: 'feed', value: { item: 'post' } }],
      }],
    }),
  });
  const leads = parser.selectMetaWebhookNotifications({ notifications: result.notifications, routingTarget: 'LEAD_ADS' });
  assert.equal(leads.length, 1);
  assert.equal(leads[0].providerEventId, 'lead-1');
  assert.equal(Object.isFrozen(leads), true);
  assert.equal(result.notifications.length, 2);
});

function writeSharedParserFixture(root) {
  const contractDir = path.join(root, 'contracts');
  const transportDir = path.join(root, 'transport');
  fs.mkdirSync(contractDir, { recursive: true });
  fs.mkdirSync(transportDir, { recursive: true });
  fs.copyFileSync('lib/meta-platform/contracts/webhook.ts', path.join(contractDir, 'webhook.ts'));
  fs.copyFileSync('lib/meta-platform/transports/webhook/signature.ts', path.join(transportDir, 'signature.ts'));
  fs.copyFileSync('lib/meta-platform/transports/webhook/challenge.ts', path.join(transportDir, 'challenge.ts'));
  const routing = fs.readFileSync('lib/meta-platform/transports/webhook/routing.ts', 'utf8')
    .replace("from '../../contracts/webhook'", "from '../contracts/webhook.ts'");
  fs.writeFileSync(path.join(transportDir, 'routing.ts'), routing);
  const parserSource = fs.readFileSync('lib/meta-platform/transports/webhook/parser.ts', 'utf8')
    .replace("from '../../contracts/webhook'", "from '../contracts/webhook.ts'")
    .replace("from './routing'", "from './routing.ts'")
    .replace("from './signature'", "from './signature.ts'");
  fs.writeFileSync(path.join(transportDir, 'parser.ts'), parserSource);
  return { contractDir, transportDir };
}

async function loadLeadWebhookAdapter() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-lead-adapter-'));
  const { contractDir, transportDir } = writeSharedParserFixture(root);
  const leadDir = path.join(root, 'lead');
  fs.mkdirSync(leadDir, { recursive: true });
  fs.copyFileSync('lib/meta/leads/types.ts', path.join(leadDir, 'types.ts'));
  let source = fs.readFileSync('lib/meta/leads/verify.ts', 'utf8');
  source = source.replace(
    /import \{\s*parseAndNormalizeMetaWebhookNotifications,[\s\S]*?\} from '@\/lib\/meta-platform\/transports\/webhook';/,
    `import { parseAndNormalizeMetaWebhookNotifications } from '${pathToFileURL(path.join(transportDir, 'parser.ts')).href}';\nimport { verifyMetaWebhookChallenge as verifyCentralMetaWebhookChallenge } from '${pathToFileURL(path.join(transportDir, 'challenge.ts')).href}';\nimport type { MetaNormalizedWebhookEvent as MetaWebhookNotification } from '${pathToFileURL(path.join(contractDir, 'webhook.ts')).href}';`,
  ).replace("from './types'", "from './types.ts'");
  const target = path.join(leadDir, 'verify.ts');
  fs.writeFileSync(target, source);
  return import(`${pathToFileURL(target).href}?run=${Date.now()}`);
}

async function loadInstagramWebhookAdapter() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-instagram-adapter-'));
  const { contractDir, transportDir } = writeSharedParserFixture(root);
  const instagramDir = path.join(root, 'instagram');
  fs.mkdirSync(instagramDir, { recursive: true });
  fs.copyFileSync('lib/meta/instagram/types.ts', path.join(instagramDir, 'types.ts'));
  fs.writeFileSync(path.join(instagramDir, 'attachments.ts'), `
    export function normalizeInstagramAttachmentType(value: unknown) {
      const text = String(value ?? '').toLowerCase();
      if (text.includes('image')) return 'IMAGE';
      if (text.includes('video')) return 'VIDEO';
      if (text.includes('audio') || text.includes('voice')) return 'AUDIO';
      if (text.includes('file')) return 'FILE';
      return 'UNKNOWN';
    }
  `);
  let source = fs.readFileSync('lib/meta/instagram/webhook.ts', 'utf8');
  source = source.replace(
    /import \{\s*parseAndNormalizeMetaWebhookNotifications,[\s\S]*?\} from '@\/lib\/meta-platform\/transports\/webhook';/,
    `import { parseAndNormalizeMetaWebhookNotifications } from '${pathToFileURL(path.join(transportDir, 'parser.ts')).href}';\nimport type { MetaNormalizedWebhookEvent as MetaWebhookNotification } from '${pathToFileURL(path.join(contractDir, 'webhook.ts')).href}';`,
  ).replace("from './attachments'", "from './attachments.ts'")
    .replace("from './types'", "from './types.ts'");
  const target = path.join(instagramDir, 'webhook.ts');
  fs.writeFileSync(target, source);
  return import(`${pathToFileURL(target).href}?run=${Date.now()}`);
}

test('Lead Ads adapter consumes only normalized routed lead events and preserves ownership gates', async () => {
  const lead = await loadLeadWebhookAdapter();
  const rawBody = JSON.stringify({
    object: 'page',
    entry: [{
      id: 'page-1',
      time: 1_752_800_000,
      changes: [
        { field: 'leadgen', value: { leadgen_id: 'lead-1', form_id: 'form-1', ad_id: 'ad-1' } },
        { field: 'feed', value: { item: 'post-1' } },
      ],
    }],
  });
  const result = lead.parseMetaLeadWebhookPayload({ rawBody, expectedPageId: 'page-1', allowedFormIds: ['form-1'] });
  assert.equal(result.normalizedEvents.length, 2);
  assert.equal(result.notifications.length, 1);
  assert.equal(result.notifications[0].leadgenId, 'lead-1');
  assert.match(result.notifications[0].eventKey, /^leadgen:[a-f0-9]{64}$/);

  const rejected = lead.normalizeMetaLeadWebhookNotifications({
    events: result.normalizedEvents,
    expectedPageId: 'page-other',
    allowedFormIds: ['form-1'],
  });
  assert.equal(rejected.notifications.length, 0);
  assert.equal(rejected.rejected[0].code, 'PAGE_OWNERSHIP_MISMATCH');
});

test('Instagram adapter consumes routed normalized messages/comments and never invents missing timestamps', async () => {
  const instagram = await loadInstagramWebhookAdapter();
  const payload = {
    object: 'instagram',
    entry: [{
      id: 'ig-1',
      messaging: [
        { sender: { id: 'user-1' }, recipient: { id: 'ig-1' }, timestamp: 1_752_800_000_000, message: { mid: 'mid-1', text: 'Hello' } },
        { sender: { id: 'user-2' }, recipient: { id: 'ig-1' }, message: { mid: 'mid-no-time', text: 'No time' } },
      ],
      changes: [{ field: 'comments', value: { id: 'comment-1', from: { id: 'user-3' }, media: { id: 'post-1' }, timestamp: 1_752_800_001 } }],
    }],
  };
  const events = instagram.normalizeInstagramWebhookPayload(payload, 'a'.repeat(64));
  assert.deepEqual(events.map((event) => event.eventType).sort(), ['COMMENT', 'MESSAGE']);
  assert.equal(events.some((event) => event.platformMessageId === 'mid-no-time'), false);
  assert.equal(events.every((event) => event.payloadDigest === 'a'.repeat(64)), true);
});

async function loadWebhookHandoff() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-webhook-handoff-'));
  for (const name of ['types.ts', 'challenge.ts', 'signature.ts']) {
    fs.copyFileSync(`lib/meta-platform/transports/webhook/${name}`, path.join(root, name));
  }
  const routeSource = fs.readFileSync('lib/meta-platform/transports/webhook/route-handler.ts', 'utf8')
    .replace("from './challenge'", "from './challenge.ts'")
    .replace("from './signature'", "from './signature.ts'")
    .replace("from './types'", "from './types.ts'");
  fs.writeFileSync(path.join(root, 'route-handler.ts'), routeSource);
  const handoffSource = fs.readFileSync('lib/meta-platform/transports/webhook/handoff.ts', 'utf8')
    .replace("from './route-handler'", "from './route-handler.ts'");
  const target = path.join(root, 'handoff.ts');
  fs.writeFileSync(target, handoffSource);
  return import(`${pathToFileURL(target).href}?run=${Date.now()}`);
}

const handoff = await loadWebhookHandoff();

test('shared receipt handoff processes a repeated event key once and classifies the repeated delivery as duplicate', async () => {
  const calls = [];
  const records = await handoff.handoffMetaWebhookItems({
    items: [{ eventKey: 'event-1' }, { eventKey: 'event-1' }],
    receive: async (item) => {
      calls.push(item.eventKey);
      return { receiptId: 'receipt-1', disposition: 'ACCEPTED' };
    },
  });
  assert.deepEqual(calls, ['event-1']);
  assert.deepEqual(records.map((record) => record.disposition), ['ACCEPTED', 'DUPLICATE']);
  assert.equal(records[1].receiptId, 'receipt-1');
  assert.equal(records[1].code, 'DUPLICATE_IN_DELIVERY');
});

test('shared handoff summary returns one consistent accepted response body', () => {
  const summary = handoff.summarizeMetaWebhookHandoff({
    records: [{ eventKey: 'event-1', receiptId: 'receipt-1', disposition: 'ACCEPTED' }],
  });
  assert.deepEqual(handoff.metaWebhookHandoffResponse(summary), {
    ok: true,
    received: true,
    outcome: 'ACCEPTED',
    receiptFirst: true,
    total: 1,
    accepted: 1,
    deduplicated: 0,
    deferred: 0,
    rejected: 0,
    ignored: 0,
  });
});

test('shared handoff summary distinguishes duplicate-only and mixed outcomes', () => {
  const duplicate = handoff.summarizeMetaWebhookHandoff({
    records: [{ eventKey: 'event-1', receiptId: 'receipt-1', disposition: 'DUPLICATE' }],
  });
  assert.equal(duplicate.outcome, 'DUPLICATE');
  assert.equal(duplicate.deduplicated, 1);

  const mixed = handoff.summarizeMetaWebhookHandoff({
    records: [
      { eventKey: 'event-a', receiptId: 'receipt-a', disposition: 'ACCEPTED' },
      { eventKey: 'event-b', receiptId: 'receipt-b', disposition: 'DEFERRED', code: 'QUEUE_HANDOFF_FAILED' },
      { eventKey: 'event-c', receiptId: 'receipt-c', disposition: 'REJECTED', code: 'FORM_OWNERSHIP_MISMATCH' },
    ],
    ignored: 2,
  });
  assert.equal(mixed.outcome, 'MIXED');
  assert.deepEqual(
    [mixed.total, mixed.accepted, mixed.deduplicated, mixed.deferred, mixed.rejected, mixed.ignored],
    [5, 1, 0, 1, 1, 2],
  );
});

test('durable receipt enqueue failure is acknowledged as deferred rather than requesting provider redelivery', () => {
  const summary = handoff.summarizeMetaWebhookHandoff({
    records: [{ eventKey: 'event-1', receiptId: 'receipt-1', disposition: 'DEFERRED', code: 'QUEUE_HANDOFF_FAILED' }],
  });
  const response = handoff.metaWebhookHandoffResponse(summary);
  assert.equal(response.ok, true);
  assert.equal(response.received, true);
  assert.equal(response.outcome, 'DEFERRED');
  assert.equal(response.deferred, 1);
});

test('receipt-first dispositions fail closed when a receipt identity is missing', async () => {
  await assert.rejects(
    handoff.handoffMetaWebhookItems({
      items: [{ eventKey: 'event-1' }],
      receive: async () => ({ disposition: 'ACCEPTED' }),
    }),
    /META_WEBHOOK_HANDOFF_RECEIPT_REQUIRED/,
  );
  assert.throws(
    () => handoff.summarizeMetaWebhookHandoff({ ignored: -1 }),
    /META_WEBHOOK_HANDOFF_IGNORED_COUNT_INVALID/,
  );
});

test('shared transport rejection response keeps signature and body failures consistent', () => {
  assert.deepEqual(handoff.metaWebhookRequestFailureResponse({
    ok: false,
    code: 'SIGNATURE_MISSING',
    httpStatus: 401,
    payloadDigest: 'a'.repeat(64),
  }), {
    status: 401,
    body: {
      ok: false,
      received: false,
      outcome: 'REJECTED',
      code: 'SIGNATURE_MISSING',
      error: 'Invalid webhook signature',
    },
  });
  assert.equal(handoff.metaWebhookRequestFailureResponse({ ok: false, code: 'PAYLOAD_TOO_LARGE', httpStatus: 413 }).body.error, 'Webhook payload too large');
});

test('shared envelope and receipt-store failure responses expose bounded retry semantics', () => {
  const envelope = handoff.metaWebhookEnvelopeFailureResponse(new Error('META_WEBHOOK_EVENT_LIMIT_EXCEEDED'));
  assert.deepEqual(envelope, {
    status: 400,
    body: {
      ok: false,
      received: false,
      outcome: 'REJECTED',
      code: 'META_WEBHOOK_EVENT_LIMIT_EXCEEDED',
      error: 'Invalid webhook envelope',
    },
  });
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

test('shared handoff bounds item volume and rejects forged record or summary metadata', async () => {
  await assert.rejects(
    handoff.handoffMetaWebhookItems({
      items: Array.from({ length: handoff.META_WEBHOOK_HANDOFF_MAX_ITEMS + 1 }, (_, index) => ({ eventKey: `event-${index}` })),
      receive: async () => ({ receiptId: 'receipt-1', disposition: 'ACCEPTED' }),
    }),
    /META_WEBHOOK_HANDOFF_ITEM_LIMIT_EXCEEDED/,
  );
  await assert.rejects(
    handoff.handoffMetaWebhookItems({
      items: [{ eventKey: 'event-1' }],
      receive: async () => ({ receiptId: 'receipt-1', disposition: 'ACCEPTED', accessToken: 'secret' }),
    }),
    /META_WEBHOOK_HANDOFF_RECORD_FIELD_INVALID/,
  );
  const summary = handoff.summarizeMetaWebhookHandoff({
    records: [{ eventKey: 'event-1', receiptId: 'receipt-1', disposition: 'ACCEPTED' }],
  });
  assert.throws(
    () => handoff.metaWebhookHandoffResponse({ ...summary, accepted: 99 }),
    /META_WEBHOOK_HANDOFF_SUMMARY_INVALID/,
  );
});
