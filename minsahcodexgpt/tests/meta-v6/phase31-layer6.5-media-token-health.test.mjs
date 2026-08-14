import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Facebook realtime ingestion defers attachment download to shared main-app validation ownership', () => {
  const repository = source('lib/meta-platform/repositories/facebook-inbox.ts');
  const ingest = source('lib/social/socialMessageIngest.ts');
  assert.match(repository, /deferAttachmentDownload: true/);
  assert.match(ingest, /deferAttachmentDownload/);
  assert.match(ingest, /!input\.deferAttachmentDownload/);
});

test('shared attachment validator publishes only safe state changes after persistence', () => {
  const processor = source('lib/meta-platform/queue/social-attachment-validation-processor.ts');
  assert.match(processor, /SOCIAL_ATTACHMENT_STATE_CHANGED/);
  assert.match(processor, /state: 'READY'/);
  assert.match(processor, /state: 'REJECTED'/);
  assert.match(processor, /state: 'FAILED'/);
  assert.doesNotMatch(processor, /attachmentUrl:/);
});

test('bridge health exposes ownership, not tokens or provider payloads', () => {
  const app = source('realtime-service/src/app.ts');
  assert.match(app, /mediaServingEnabled: false/);
  assert.match(app, /tokenHealthOwner:[\s\S]*main-app-meta-connection/);
  assert.match(app, /permissionHealthOwner:[\s\S]*main-app-page-health/);
  assert.doesNotMatch(app, /FB_PAGE_ACCESS_TOKEN/);
  assert.doesNotMatch(app, /tokenHealthy/);
  assert.doesNotMatch(app, /express\.static/);
});

test('legacy token/media workers remain dynamically isolated behind rollback mode', () => {
  const index = source('realtime-service/src/index.ts');
  assert.match(index, /\.\/facebook\/token-health/);
  assert.match(index, /\.\/facebook\/media-retry/);
  assert.doesNotMatch(index, /^import .*facebook\/(token-health|media-retry)/m);
  const env = source('realtime-service/.env.example');
  assert.match(env, /REALTIME_FACEBOOK_MODE=bridge/);
  assert.match(env, /REALTIME_FACEBOOK_LEGACY_ROLLBACK_ENABLED=false/);
  assert.match(env, /FB_MEDIA_RETRY_ENABLED=false/);
});
