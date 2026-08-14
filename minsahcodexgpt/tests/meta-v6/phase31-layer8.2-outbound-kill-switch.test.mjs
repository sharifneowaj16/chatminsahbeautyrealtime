import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  assertMetaSocialOutboundWriteEnabled,
  getMetaSocialOutboundWriteControl,
  getMetaSocialOutboundWriteControlSummary,
} from '../../lib/meta-platform/config/social-outbound-write-control.ts';
import {
  FacebookOutboundWriteBlockedError,
  assertFacebookOutboundWriteEnabled,
  getFacebookOutboundWriteControl,
} from '../../realtime-service/src/facebook/outbound-write-control.ts';

test('8.2 defaults fail closed for Instagram writes while preserving Facebook legacy writes', () => {
  const summary = getMetaSocialOutboundWriteControlSummary({});
  assert.equal(summary.standardReply.enabled, false);
  assert.equal(summary.standardReply.reasonCode, 'META_PLATFORM_INSTAGRAM_WRITES_DISABLED');
  assert.equal(summary.privateReply.enabled, false);
  assert.deepEqual(summary.privateReply.blockers, [
    'META_PLATFORM_INSTAGRAM_WRITES_DISABLED',
    'META_PLATFORM_INSTAGRAM_PRIVATE_REPLY_DISABLED',
  ]);
  assert.equal(summary.facebookMessage.enabled, true);
  assert.equal(summary.facebookMedia.enabled, true);
});

test('8.2 global and social switches block every outbound operation', () => {
  for (const operation of [
    'INSTAGRAM_STANDARD_REPLY',
    'INSTAGRAM_PRIVATE_REPLY',
    'FACEBOOK_PAGE_MESSAGE',
    'FACEBOOK_PAGE_COMMENT_REPLY',
    'FACEBOOK_PAGE_MEDIA',
  ]) {
    const control = getMetaSocialOutboundWriteControl(operation, {
      META_PLATFORM_GLOBAL_KILL_SWITCH: 'true',
      META_PLATFORM_INSTAGRAM_WRITES: 'true',
      META_PLATFORM_INSTAGRAM_PRIVATE_REPLY: 'true',
    });
    assert.equal(control.enabled, false);
    assert.equal(control.reasonCode, 'META_PLATFORM_GLOBAL_KILL_SWITCH_ACTIVE');
  }
  const social = getMetaSocialOutboundWriteControl('FACEBOOK_PAGE_MESSAGE', {
    META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH: 'yes',
  });
  assert.equal(social.reasonCode, 'META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH_ACTIVE');
});

test('8.2 invalid kill-switch values fail safe active without exposing raw values', () => {
  const raw = 'secret-like-invalid-value';
  const control = getMetaSocialOutboundWriteControl('FACEBOOK_PAGE_MESSAGE', {
    META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH: raw,
  });
  assert.equal(control.enabled, false);
  assert.equal(control.reasonCode, 'META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH_INVALID_FAIL_SAFE_ACTIVE');
  assert.equal(JSON.stringify(control).includes(raw), false);

  const instagram = getMetaSocialOutboundWriteControl('INSTAGRAM_STANDARD_REPLY', {
    META_PLATFORM_INSTAGRAM_WRITES: raw,
  });
  assert.equal(instagram.reasonCode, 'META_PLATFORM_INSTAGRAM_WRITES_INVALID_FAIL_SAFE_DISABLED');
});

test('8.2 standard and private Instagram writes require independent explicit enablement', () => {
  assert.doesNotThrow(() => assertMetaSocialOutboundWriteEnabled('INSTAGRAM_STANDARD_REPLY', {
    META_PLATFORM_INSTAGRAM_WRITES: 'true',
  }));
  assert.throws(() => assertMetaSocialOutboundWriteEnabled('INSTAGRAM_PRIVATE_REPLY', {
    META_PLATFORM_INSTAGRAM_WRITES: 'true',
  }), /META_PLATFORM_INSTAGRAM_PRIVATE_REPLY_DISABLED/);
  assert.doesNotThrow(() => assertMetaSocialOutboundWriteEnabled('INSTAGRAM_PRIVATE_REPLY', {
    META_PLATFORM_INSTAGRAM_WRITES: 'true',
    META_PLATFORM_INSTAGRAM_PRIVATE_REPLY: 'true',
  }));
});

test('8.2 controls re-read current values and recover safely after re-enable', () => {
  const env = { META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH: 'true' };
  assert.throws(() => assertFacebookOutboundWriteEnabled('FACEBOOK_PAGE_MESSAGE', env), FacebookOutboundWriteBlockedError);
  env.META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH = 'false';
  assert.doesNotThrow(() => assertFacebookOutboundWriteEnabled('FACEBOOK_PAGE_MESSAGE', env));
  assert.equal(getFacebookOutboundWriteControl('FACEBOOK_PAGE_MEDIA', env).enabled, true);
});

test('8.2 Instagram queued worker persists a safe blocked reason', () => {
  const worker = fs.readFileSync('workers/meta-instagram.worker.ts', 'utf8');
  assert.match(worker, /decision\.classification === 'POLICY_BLOCKED'/);
  assert.match(worker, /markInstagramReplyBlockedStorage/);
  assert.match(worker, /Execution-time outbound control blocked the provider write/);
  assert.match(worker, /executeInstagramStandardReplyProduction/);
  assert.match(worker, /executeInstagramPrivateReplyProduction/);
});

test('8.2 Facebook provider calls and queued retries resolve current controls at execution time', () => {
  const graph = fs.readFileSync('realtime-service/src/facebook/graph.client.ts', 'utf8');
  const retry = fs.readFileSync('realtime-service/src/facebook/outgoing-retry.ts', 'utf8');
  assert.ok(graph.indexOf('assertFacebookOutboundWriteEnabled(operation, process.env)') < graph.indexOf('fetch(`${getGraphApiBase()}/me/messages`'));
  assert.ok(graph.indexOf("assertFacebookOutboundWriteEnabled('FACEBOOK_PAGE_COMMENT_REPLY', process.env)") < graph.indexOf('fetch(`${getGraphApiBase()}/${commentId}/comments`'));
  assert.match(retry, /getFacebookOutboundWriteControl\(getOutgoingOperation\(job\), process\.env\)/);
  assert.match(retry, /deferOutgoingRetryWhileBlocked\(job, control\.reasonCode\)/);
  assert.match(retry, /attempt: job\.attempts/);
  assert.doesNotMatch(retry, /deferOutgoingRetryWhileBlocked[\s\S]{0,500}attempts: job\.attempts \+ 1/);
});

test('8.2 admin health and UI expose safe outbound blocked reasons', () => {
  const provider = fs.readFileSync('lib/meta-platform/admin/provider-health.ts', 'utf8');
  const instagram = fs.readFileSync('lib/meta-platform/admin/instagram-status.ts', 'utf8');
  const page = fs.readFileSync('app/admin/meta/instagram/page.tsx', 'utf8');
  assert.match(provider, /outboundWriteControl:\s*getMetaSocialOutboundWriteControlSummary\(process\.env\)/);
  assert.match(instagram, /replyControl:/);
  assert.match(instagram, /outboundWriteControl\.standardReply\.enabled/);
  assert.match(page, /health\.replyControl\.standard\.reasonCode/);
  assert.match(page, /Private reply control/);
});

test('8.2 execution manifest advances only to the exact next item', () => {
  const execution = JSON.parse(fs.readFileSync('.ai/phase31-execution-manifest.json', 'utf8'));
  assert.equal(execution.layers['8'].items.find((item) => item.id === '8.2').status, 'COMPLETE');
  assert.match(execution.current_item, /^(?:8\.[3-7]|9\.[1-8])$/);
  assert.equal(execution.standard_item_contract.no_item_zip, true);
  assert.equal(execution.standard_item_contract.full_layer_zip_only, true);
});
