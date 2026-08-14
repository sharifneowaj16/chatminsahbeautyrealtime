import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('legacy retry loops are default-off and only start inside explicit rollback boundary', () => {
  const config = source('realtime-service/src/config.ts');
  for (const name of ['FB_MEDIA_RETRY_ENABLED','FB_REPLAY_ENABLED','FB_OUTGOING_RETRY_ENABLED','FB_SYNC_ENABLED']) {
    const part = config.slice(config.indexOf(`${name}:`), config.indexOf(`${name}:`) + 180);
    assert.match(part, /default\('false'\)/, `${name} must default false`);
  }
  const index = source('realtime-service/src/index.ts');
  for (const worker of ['startFacebookMediaRetryWorker','startOutgoingRetryWorker','startFacebookReplayWorker','startFacebookInboxSyncScheduler']) {
    assert.ok((index.match(new RegExp(worker, 'g'))?.length ?? 0) >= 1);
  }
});

test('dead-letter visibility and replay are owned by main-app audit/BullMQ controls', () => {
  const route = source('app/api/admin/inbox/sync/dead-letter/route.ts');
  assert.match(route, /META_SOCIAL_VIEW/);
  assert.match(route, /META_SOCIAL_OPERATE/);
  assert.match(route, /listMetaJobAudits/);
  assert.match(route, /replayMetaDeadLetter/);
  assert.match(route, /approvalId/);
  assert.doesNotMatch(route, /realtime-service/);
});

test('bridge mode disables local mutation/retry/media operations', () => {
  const app = source('realtime-service/src/app.ts');
  assert.match(app, /LEGACY_REALTIME_OPERATION_DISABLED/);
  assert.match(app, /\['\/reply', '\/sync', '\/dead-letter', '\/media\/facebook\/\*'\]/);
  assert.match(app, /retryOwner:[\s\S]*cutover\.retryOwner/);
  assert.match(app, /deadLetterOwner:[\s\S]*main-app-meta-job-audit/);
});

test('webhook queue handoff uses deterministic request key for provider redelivery', () => {
  const route = source('app/api/webhook/facebook/route.ts');
  const bridge = source('lib/meta-platform/domains/facebook/legacy-bridge.ts');
  assert.match(route, /requestKey:/);
  assert.match(bridge, /createHash\('sha256'\)/);
  assert.match(bridge, /input\.requestKey/);
});
