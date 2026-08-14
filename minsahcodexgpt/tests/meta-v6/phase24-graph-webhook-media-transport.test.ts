import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { InMemoryMetaCredentialProvider } from '../../lib/meta-platform/credentials/provider';
import { MetaGraphHttpClient } from '../../lib/meta-platform/transports/graph-http/client';
import { executeMetaGraphBatch } from '../../lib/meta-platform/transports/graph-http/batch';
import { collectMetaGraphPages } from '../../lib/meta-platform/transports/graph-http/pagination';
import type { MetaGraphRequester } from '../../lib/meta-platform/transports/graph-http/types';
import { metaSuccess } from '../../lib/meta-platform/core/result';
import {
  InMemoryMetaWebhookReceiptStore,
  digestMetaWebhookPayload,
  normalizeMetaWebhookNotifications,
  parseMetaWebhookEnvelope,
  persistMetaWebhookReceipts,
  verifyMetaWebhookChallenge,
  verifyMetaWebhookSignature,
} from '../../lib/meta-platform/transports/webhook/index';
import {
  downloadMetaMedia,
  parseAndValidateMetaMediaUrl,
  storeMetaMediaSecurely,
} from '../../lib/meta-platform/transports/media/index';

function credentials() {
  return new InMemoryMetaCredentialProvider([
    {
      connectionKey: 'primary',
      role: 'APP',
      secretRef: 'env:META_APP_SECRET',
      appSecret: 'phase24-app-secret',
      appId: '123',
    },
    {
      connectionKey: 'primary',
      role: 'BUSINESS_SYSTEM_USER',
      secretRef: 'env:META_BUSINESS_ACCESS_TOKEN',
      accessToken: 'phase24-business-token',
      permissions: [],
    },
  ]);
}

test('Graph client fixes the provider host, uses bearer auth and adds appsecret proof safely', async () => {
  const calls: Array<{ url: URL; init?: RequestInit }> = [];
  const logs: unknown[] = [];
  const client = new MetaGraphHttpClient({
    credentialProvider: credentials(),
    logger: (entry) => logs.push(entry),
    fetchImpl: async (input, init) => {
      calls.push({ url: new URL(String(input)), init });
      return new Response(JSON.stringify({ id: '123' }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-fb-trace-id': 'trace-24' },
      });
    },
  });
  const result = await client.request<{ id: string }>({
    capability: 'graph-media-boundary',
    connectionKey: 'primary',
    credentialRole: 'BUSINESS_SYSTEM_USER',
    method: 'GET',
    path: '/me',
    query: { fields: 'id' },
    correlationId: 'phase24-graph',
  });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin, 'https://graph.facebook.com');
  assert.equal(calls[0].url.pathname, '/v24.0/me');
  assert.equal(calls[0].url.searchParams.get('access_token'), null);
  assert.match(calls[0].url.searchParams.get('appsecret_proof') ?? '', /^[a-f0-9]{64}$/);
  assert.equal(new Headers(calls[0].init?.headers).get('authorization'), 'Bearer phase24-business-token');
  const serialized = JSON.stringify(logs);
  assert.equal(serialized.includes('phase24-business-token'), false);
  assert.equal(serialized.includes('phase24-app-secret'), false);
});

test('Graph client rejects absolute paths before any provider request', async () => {
  let called = false;
  const client = new MetaGraphHttpClient({
    credentialProvider: credentials(),
    fetchImpl: async () => { called = true; return new Response('{}'); },
  });
  const result = await client.request({
    capability: 'graph-media-boundary',
    connectionKey: 'primary',
    credentialRole: 'BUSINESS_SYSTEM_USER',
    method: 'GET',
    path: 'https://evil.example/me',
  });
  assert.equal(result.ok, false);
  assert.equal(called, false);
});

test('Pagination follows only normalized cursors and enforces item bounds', async () => {
  const queries: unknown[] = [];
  const requester = {
    async request(input: { query?: Record<string, unknown> }) {
      queries.push(input.query);
      const after = input.query?.after;
      return metaSuccess({
        status: 200,
        headers: {},
        data: after
          ? { data: [{ id: 3 }], paging: { next: 'https://evil.example/steal' } }
          : { data: [{ id: 1 }, { id: 2 }], paging: { cursors: { after: 'cursor-2' }, next: 'https://evil.example/steal' } },
      });
    },
  } as unknown as MetaGraphRequester;
  const result = await collectMetaGraphPages<{ id: number }>({
    client: requester,
    request: {
      capability: 'graph-media-boundary',
      connectionKey: 'primary',
      credentialRole: 'BUSINESS_SYSTEM_USER',
      path: 'catalog/diagnostics',
    },
    options: { maxPages: 5, maxItems: 3, pageSize: 2 },
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value.items.map((item) => item.id), [1, 2, 3]);
    assert.equal(result.value.pages, 2);
    assert.equal(result.value.truncated, true);
  }
  assert.deepEqual(queries, [{ limit: 2 }, { limit: 2, after: 'cursor-2' }]);
});

test('Batch transport preserves item-level partial failures', async () => {
  const requester = {
    async request() {
      return metaSuccess({
        status: 200,
        headers: {},
        data: [
          { code: 200, headers: [{ name: 'Content-Type', value: 'application/json' }], body: JSON.stringify({ id: 'one' }) },
          { code: 400, headers: [], body: JSON.stringify({ error: { code: 100, message: 'Bad item' } }) },
        ],
      });
    },
  } as unknown as MetaGraphRequester;
  const result = await executeMetaGraphBatch({
    client: requester,
    request: {
      capability: 'graph-media-boundary',
      connectionKey: 'primary',
      credentialRole: 'BUSINESS_SYSTEM_USER',
    },
    operations: [
      { id: 'one', method: 'GET', relativePath: 'me' },
      { id: 'two', method: 'POST', relativePath: 'act_1/campaigns', body: { name: 'test' } },
    ],
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value[0].ok, true);
    assert.equal(result.value[1].ok, false);
    assert.equal(result.value[1].error?.code, 'META_GRAPH_BATCH_ITEM_FAILED');
  }
});

test('Webhook transport rejects bad HMAC, normalizes order and stores receipts before processing', async () => {
  const rawBody = JSON.stringify({
    object: 'page',
    entry: [
      { id: 'page-1', time: 200, changes: [{ field: 'leadgen', value: { leadgen_id: 'later' } }] },
      { id: 'page-1', time: 100, changes: [{ field: 'leadgen', value: { leadgen_id: 'earlier' } }] },
    ],
  });
  const signature = `sha256=${createHmac('sha256', 'secret').update(rawBody).digest('hex')}`;
  assert.equal(verifyMetaWebhookSignature({ rawBody, signatureHeader: signature, appSecret: 'secret' }).ok, true);
  assert.deepEqual(verifyMetaWebhookSignature({ rawBody, signatureHeader: 'sha1=bad', appSecret: 'secret' }), { ok: false, code: 'SIGNATURE_FORMAT_INVALID' });
  assert.equal(verifyMetaWebhookChallenge({ mode: 'subscribe', token: 'verify', expectedToken: 'verify', challenge: '42' }).ok, true);

  const parsed = parseMetaWebhookEnvelope({ rawBody, maxBytes: 10_000 });
  assert.equal(parsed.payloadDigest, digestMetaWebhookPayload(rawBody));
  const notifications = normalizeMetaWebhookNotifications(parsed);
  assert.equal(notifications.length, 2);
  assert.equal(notifications[0].occurredAt, new Date(100_000).toISOString());
  const store = new InMemoryMetaWebhookReceiptStore();
  const first = await persistMetaWebhookReceipts({ notifications, store });
  const second = await persistMetaWebhookReceipts({ notifications, store });
  assert.equal(first.every((receipt) => receipt.created), true);
  assert.equal(second.every((receipt) => !receipt.created), true);
});

test('Media transport blocks SSRF, MIME confusion and malware before private storage', async () => {
  assert.throws(() => parseAndValidateMetaMediaUrl('http://scontent.xx.fbcdn.net/a.jpg'), /PROTOCOL_BLOCKED/);
  assert.throws(() => parseAndValidateMetaMediaUrl('https://127.0.0.1/a.jpg'), /IP_LITERAL_BLOCKED/);

  await assert.rejects(
    () => downloadMetaMedia({
      url: 'https://scontent.xx.fbcdn.net/a.jpg',
      resolver: { resolve: async () => ['127.0.0.1'] },
      fetchImpl: async () => new Response('never'),
    }),
    /PRIVATE_ADDRESS_BLOCKED/,
  );

  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const media = await downloadMetaMedia({
    url: 'https://scontent.xx.fbcdn.net/a.png',
    resolver: { resolve: async () => ['31.13.70.1'] },
    fetchImpl: async () => new Response(png, { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(png.length) } }),
  });
  assert.equal(media.mimeType, 'image/png');
  assert.equal(media.size, png.length);

  await assert.rejects(
    () => storeMetaMediaSecurely({
      media,
      storageKey: 'meta/page-1/a.png',
      scanner: { scan: async () => ({ result: 'INFECTED', signature: 'test' }) },
      store: { put: async () => ({ key: 'never', size: 0 }) },
    }),
    /MALWARE_DETECTED/,
  );

  let stored = false;
  const result = await storeMetaMediaSecurely({
    media,
    storageKey: 'meta/page-1/a.png',
    scanner: { scan: async () => ({ result: 'CLEAN', engine: 'test-scanner' }) },
    store: { put: async (input) => { stored = true; return { key: input.key, size: input.bytes.length }; } },
  });
  assert.equal(stored, true);
  assert.equal(result.scanResult, 'CLEAN');
});
