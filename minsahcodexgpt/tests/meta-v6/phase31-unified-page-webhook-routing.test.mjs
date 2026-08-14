import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const router = fs.readFileSync('realtime-service/src/routes/bridge-webhook.router.ts', 'utf8');
const handoff = fs.readFileSync('realtime-service/src/realtime/main-app-facebook-handoff.ts', 'utf8');

test('realtime bridge preserves the public webhook while routing Lead Ads to the canonical main-app ingress', () => {
  assert.match(router, /EXTERNAL_PATHS = \['\/meta', '\/facebook'\]/);
  assert.match(handoff, /LEAD_ADS: '\/api\/webhooks\/meta'/);
  assert.match(handoff, /FACEBOOK_PAGE: '\/api\/webhook\/facebook'/);
  assert.match(handoff, /signInternalBridgeRequest\(\{ method: 'POST', path: mainAppPath, body: input\.body \}\)/);
});

test('dispatcher recognizes leadgen, Page messaging and mixed webhook batches', () => {
  assert.match(router, /field === 'leadgen'/);
  assert.match(router, /entry\.messaging/);
  assert.match(router, /entry\.standby/);
  assert.match(router, /if \(hasLeadAds\) targets\.push\('LEAD_ADS'\)/);
  assert.match(router, /if \(hasFacebookPage \|\| !hasLeadAds\) targets\.push\('FACEBOOK_PAGE'\)/);
  assert.match(router, /Promise\.all\(targets\.map/);
});

test('malformed or unknown payloads retain the existing Facebook fail-closed target', () => {
  assert.match(router, /catch \{\s*return Object\.freeze\(\['FACEBOOK_PAGE'\]\)\s*\}/);
  assert.match(router, /if \(hasFacebookPage \|\| !hasLeadAds\)/);
});
