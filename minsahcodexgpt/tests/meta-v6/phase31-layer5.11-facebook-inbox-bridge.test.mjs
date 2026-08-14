import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  compareFacebookInboxPlans,
  digestFacebookInboxShape,
  getFacebookInboxRuntimeMode,
  planFacebookInboxSnapshot,
  summarizeFacebookInboxPlan,
} from '../../lib/meta-platform/domains/facebook/index.ts';

function snapshot() {
  return {
    pageId: 'page-1',
    pageProfile: { id: 'page-1', name: 'Page', avatar: null },
    profiles: {
      'page-1': { id: 'page-1', name: 'Page', avatar: null },
      'customer-1': { id: 'customer-1', name: 'Customer Name', avatar: 'https://example.invalid/avatar' },
    },
    conversations: [{
      id: 'conversation-1',
      senders: { data: [{ id: 'page-1', name: 'Page' }, { id: 'customer-1', name: 'Customer Name' }] },
      messages: { data: [
        { id: 'message-1', message: 'hello@example.com +8801712345678', created_time: '2026-07-01T00:00:00.000Z', from: { id: 'customer-1', name: 'Customer Name' } },
        { id: 'message-1', message: 'duplicate', created_time: '2026-07-01T00:00:01.000Z', from: { id: 'customer-1' } },
        { id: 'message-2', created_time: '2026-07-01T00:00:02.000Z', from: { id: 'page-1' }, attachments: { data: [{ id: 'attachment-1', mime_type: 'image/jpeg', file_url: 'https://example.invalid/media' }] } },
      ] },
    }],
  };
}

test('runtime mode defaults to safe legacy and rollback is explicit', () => {
  assert.equal(getFacebookInboxRuntimeMode({}), 'LEGACY');
  assert.equal(getFacebookInboxRuntimeMode({ META_PHASE31_FACEBOOK_INBOX_RUNTIME: 'SHADOW' }), 'SHADOW');
  assert.equal(getFacebookInboxRuntimeMode({ META_PHASE31_FACEBOOK_INBOX_RUNTIME: 'LEGACY_ROLLBACK' }), 'LEGACY_ROLLBACK');
  assert.equal(getFacebookInboxRuntimeMode({ META_PHASE31_FACEBOOK_INBOX_RUNTIME: 'legacy' }), 'LEGACY');
});

test('domain plan is duplicate-safe and preserves inbound text/media behavior', () => {
  const plan = planFacebookInboxSnapshot(snapshot());
  assert.equal(plan.messages.length, 2);
  assert.equal(plan.duplicateProviderMessages, 1);
  assert.equal(plan.messages[0].content, 'hello@example.com +8801712345678');
  assert.equal(plan.messages[1].content, '[image attachment]');
  assert.equal(plan.messages[1].attachments.length, 1);
  assert.equal(plan.messages[0].isIncoming, true);
  assert.equal(plan.messages[1].isIncoming, false);
});

test('safe digest preserves the established 64-bit hash output under the ES2017 TypeScript target', () => {
  assert.equal(
    digestFacebookInboxShape(['b', 'a']),
    'e726b11905478f760eb35df79479ea6a1429bf5fbf2c79d6dadfb409f2dbb5b3',
  );
});

test('safe summaries and shadow comparison contain counts and digests, not message PII or URLs', () => {
  const plan = planFacebookInboxSnapshot(snapshot());
  const comparison = compareFacebookInboxPlans(plan, plan);
  assert.equal(comparison.matched, true);
  const serialized = JSON.stringify({ summary: summarizeFacebookInboxPlan(plan), comparison });
  for (const forbidden of ['hello@example.com', '+8801712345678', 'Customer Name', 'example.invalid', 'access_token']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test('shadow production path compares one fetched snapshot and persists only authoritative plan', async () => {
  const bridge = await readFile(new URL('../../lib/meta-platform/domains/facebook/legacy-bridge.ts', import.meta.url), 'utf8');
  const shadowBlock = bridge.slice(bridge.indexOf("if (mode === 'SHADOW')"), bridge.indexOf('let createdMessages'));
  assert.match(shadowBlock, /summarizeLegacyFacebookInboxSnapshot\(snapshot\)/);
  assert.doesNotMatch(shadowBlock, /syncRecentFacebookInboxLegacy/);
  assert.doesNotMatch(shadowBlock, /persistFacebookInboxMessage/);
  assert.equal((bridge.match(/fetchFacebookInboxSnapshot\(/g) ?? []).length, 2); // definition + one execution call
  assert.equal((bridge.match(/persistFacebookInboxMessage\(/g) ?? []).length, 1);
});

test('actual admin routes and social worker use the production bridge', async () => {
  const [route, compatibilityRoute, worker] = await Promise.all([
    readFile(new URL('../../app/api/admin/social/facebook/sync/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/admin/inbox/sync/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../workers/meta-social.worker.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(route, /requestFacebookInboxSyncProduction/);
  assert.match(compatibilityRoute, /requestFacebookInboxSyncProduction/);
  assert.doesNotMatch(compatibilityRoute, /realtime-service|REPLY_API_SECRET/);
  assert.match(worker, /FACEBOOK_PAGE_INBOX_SYNC/);
  assert.match(worker, /executeFacebookInboxSyncProduction/);
});
