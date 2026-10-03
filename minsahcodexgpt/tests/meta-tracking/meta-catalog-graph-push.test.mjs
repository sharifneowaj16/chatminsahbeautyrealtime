import { test } from 'node:test';
import assert from 'node:assert/strict';
import { triggerMetaCatalogFeedUpload } from '../../lib/meta-platform/domains/catalog/event-sync.ts';

test('Meta Catalog Graph Push: Missing credentials safely skip', async () => {
  const prevFeedId = process.env.META_CATALOG_FEED_ID;
  const prevToken = process.env.META_CAPI_ACCESS_TOKEN;
  try {
    delete process.env.META_CATALOG_FEED_ID;
    delete process.env.META_CAPI_ACCESS_TOKEN;

    const result = await triggerMetaCatalogFeedUpload();
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'META_FEED_ID_OR_TOKEN_MISSING');
  } finally {
    if (prevFeedId) process.env.META_CATALOG_FEED_ID = prevFeedId;
    if (prevToken) process.env.META_CAPI_ACCESS_TOKEN = prevToken;
  }
});

test('Meta Catalog Graph Push: Successful POST upload trigger', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedAuth = '';

  const mockFetch = async (url, options) => {
    capturedUrl = String(url);
    capturedMethod = options.method;
    capturedAuth = options.headers.Authorization;

    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'feed_upload_job_7788' }),
    };
  };

  const result = await triggerMetaCatalogFeedUpload({
    feedId: 'test_feed_123',
    accessToken: 'test_meta_token_abc',
    graphApiVersion: 'v20.0',
    fetchImpl: mockFetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.uploadId, 'feed_upload_job_7788');
  assert.equal(capturedUrl, 'https://graph.facebook.com/v20.0/test_feed_123/uploads');
  assert.equal(capturedMethod, 'POST');
  assert.equal(capturedAuth, 'Bearer test_meta_token_abc');
});

test('Meta Catalog Graph Push: HTTP Error handled safely', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 400,
    text: async () => JSON.stringify({ error: { message: 'Invalid feed id' } }),
  });

  const result = await triggerMetaCatalogFeedUpload({
    feedId: 'invalid_feed',
    accessToken: 'test_token',
    fetchImpl: mockFetch,
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /HTTP_400/);
});
