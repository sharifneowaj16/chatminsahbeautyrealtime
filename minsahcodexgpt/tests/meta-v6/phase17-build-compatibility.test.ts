import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { validateProductionRedisUrl } from '../../lib/jobs/connection';

test('Meta Business SDK package import is isolated to the unified transport runtime', async () => {
  const platformWrapper = fs.readFileSync('lib/meta-business/sdk.ts', 'utf8');
  const capiWrapper = fs.readFileSync('lib/tracking/meta-business-sdk.ts', 'utf8');
  const runtimeBoundary = fs.readFileSync('lib/meta-platform/transports/business-sdk/runtime.ts', 'utf8');
  const declaration = fs.readFileSync('types/facebook-nodejs-business-sdk.d.ts', 'utf8');

  assert.match(platformWrapper, /meta-platform\/transports\/business-sdk\/compatibility/);
  assert.match(capiWrapper, /meta-platform\/transports\/business-sdk\/runtime/);
  assert.doesNotMatch(platformWrapper, /facebook-nodejs-business-sdk/);
  assert.doesNotMatch(capiWrapper, /facebook-nodejs-business-sdk/);
  assert.match(runtimeBoundary, /import \* as businessSdkNamespace from 'facebook-nodejs-business-sdk'/);
  assert.doesNotMatch(runtimeBoundary, /import businessSdkNamespace from/);
  assert.doesNotMatch(declaration, /export default/);

  const runtime = await import('facebook-nodejs-business-sdk');
  assert.equal(typeof runtime.FacebookAdsApi, 'function');
  assert.equal(typeof runtime.EventRequest, 'function');
  assert.equal(typeof runtime.ServerEvent, 'function');
});

test('leadgen alias exports route config directly and re-exports handlers only', () => {
  const route = fs.readFileSync('app/api/webhooks/meta/leadgen/route.ts', 'utf8');
  assert.match(route, /export const dynamic = 'force-dynamic'/);
  assert.match(route, /export const runtime = 'nodejs'/);
  assert.match(route, /export \{ GET, POST \} from '\.\.\/route'/);
  assert.doesNotMatch(route, /export \{ dynamic, runtime/);
});

test('CAPI outbox queue is not created during module import', () => {
  const queue = fs.readFileSync('lib/queue/metaCapiOutboxQueue.ts', 'utf8');
  assert.doesNotMatch(queue, /export const metaCapiOutboxQueue = getMetaQueue/);
  assert.doesNotMatch(queue, /getMetaQueue\(META_CAPI_OUTBOX_QUEUE_NAME\)/);
  assert.match(queue, /enqueueMetaCapiOutboxJob/);
});

test('production Redis accepts governed redis and rediss URLs', () => {
  assert.equal(
    validateProductionRedisUrl({ NODE_ENV: 'production', REDIS_URL: 'redis://redis.internal:6379' }),
    'redis://redis.internal:6379'
  );
  assert.equal(
    validateProductionRedisUrl({ NODE_ENV: 'production', REDIS_URL: 'rediss://redis.example.com:6380' }),
    'rediss://redis.example.com:6380'
  );
  assert.throws(
    () => validateProductionRedisUrl({ NODE_ENV: 'production', REDIS_URL: 'https://example.com' }),
    /must use redis:\/\/ or rediss:\/\//
  );
  assert.throws(
    () => validateProductionRedisUrl({ NODE_ENV: 'production' }),
    /REDIS_URL is required/
  );
});

test('Next.js owns framework static and image cache headers', () => {
  const config = fs.readFileSync('next.config.ts', 'utf8');
  assert.doesNotMatch(config, /source: "\/_next\/static\/:path\*"/);
  assert.doesNotMatch(config, /source: "\/_next\/image"/);
  assert.match(config, /minimumCacheTTL: 2592000/);
});
