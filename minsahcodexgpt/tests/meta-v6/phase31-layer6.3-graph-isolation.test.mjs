import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRealtimeBridgeSignature, verifyRealtimeBridgeSignature } from '../../packages/meta-realtime-contract/src/index.ts';
const source = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('bridge HMAC binds timestamp, method, path, and body', () => {
  const secret = 'x'.repeat(48); const timestamp = '1785096000000'; const body = Buffer.from('{"object":"page"}');
  const signature = createRealtimeBridgeSignature({ secret, timestamp, method: 'POST', path: '/api/webhook/facebook', body });
  assert.equal(verifyRealtimeBridgeSignature({ secret, timestamp, signature, method: 'POST', path: '/api/webhook/facebook', body, now: Number(timestamp) }), true);
  assert.equal(verifyRealtimeBridgeSignature({ secret, timestamp, signature, method: 'POST', path: '/api/webhook/facebook', body: Buffer.from('{}'), now: Number(timestamp) }), false);
});

test('normalized bridge is default and legacy provider code is explicit rollback only', () => {
  const config = source('realtime-service/src/config.ts');
  const index = source('realtime-service/src/index.ts');
  assert.match(config, /REALTIME_FACEBOOK_MODE:[\s\S]*default\('bridge'\)/);
  assert.match(config, /REALTIME_FACEBOOK_LEGACY_ROLLBACK_ENABLED:[\s\S]*default\('false'\)/);
  assert.match(index, /startLegacyRollbackWorkers/);
  assert.match(index, /cutover\.retryOwner !== 'REALTIME_LEGACY'/);
  assert.match(index, /\.\/facebook\/token-health/);
  assert.doesNotMatch(index, /^import .*\.\/facebook\/(token-health|inbox-sync|media-retry|outgoing-retry|replay-queue)/m);
});

test('external webhook is a signed proxy to main-app shared Meta transport', () => {
  const proxy = source('realtime-service/src/routes/bridge-webhook.router.ts');
  const route = source('app/api/webhook/facebook/route.ts');
  const handoff = source('realtime-service/src/realtime/main-app-facebook-handoff.ts');
  const bridge = source('lib/meta-platform/domains/facebook/legacy-bridge.ts');
  assert.match(proxy, /MAIN_APP_PATH = '\/api\/webhook\/facebook'/);
  assert.match(handoff, /x-realtime-bridge-signature/);
  assert.match(route, /verifyInternalRealtimeBridgeRequest/);
  assert.match(route, /verifyMetaWebhookSignature/);
  assert.match(bridge, /assertMetaPageHealthReady/);
  assert.match(bridge, /createMetaGraphClient/);
});
