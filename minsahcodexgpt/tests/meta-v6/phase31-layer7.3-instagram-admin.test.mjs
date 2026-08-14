import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { projectInstagramConversationForAdmin, projectInstagramReplyEligibility } from '../../lib/meta-platform/admin/instagram-dto.ts';
const source = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Instagram DTO strips raw policy, failure and provider media fields', () => {
  const dto = projectInstagramConversationForAdmin({
    id: 'c1', platformId: 'ig-conv-1', status: 'OPEN', lastInboundAt: '2026-07-26T23:00:00.000Z', replyWindowExpiresAt: '2026-07-27T23:00:00.000Z',
    policyData: { accessToken: 'secret' }, failureData: { rawPayload: true }, messages: [{ id: 'm1', direction: 'INBOUND', content: 'hello', attachments: [{ id: 'a1', status: 'READY', sourceUrl: 'https://graph.example/x?access_token=secret', metadata: { secret: true } }] }],
  }, { now: new Date('2026-07-27T00:00:00.000Z') });
  const text = JSON.stringify(dto);
  assert.doesNotMatch(text, /accessToken|rawPayload|sourceUrl|metadata|policyData|failureData/);
  assert.match(text, /providerIds/);
  assert.match(text, /ig-conv-1/);
});

test('Instagram standard and private reply eligibility are explicit', () => {
  const status = projectInstagramReplyEligibility({ status: 'OPEN', replyWindowExpiresAt: '2026-07-27T02:00:00.000Z', privateReplyExpiresAt: '2026-07-27T02:00:00.000Z', permissionGranted: true, accountHealthy: true, now: new Date('2026-07-27T00:00:00.000Z') });
  assert.equal(status.standard.allowed, true);
  assert.equal(status.private.allowed, true);
  const blocked = projectInstagramReplyEligibility({ status: 'OPEN', replyWindowExpiresAt: '2026-07-27T02:00:00.000Z', permissionGranted: false, now: new Date('2026-07-27T00:00:00.000Z') });
  assert.equal(blocked.standard.reasonCode, 'PERMISSION_MISSING');
});

test('Instagram admin routes use safe DTO and mutation boundaries', () => {
  for (const path of ['app/api/admin/meta/instagram/health/route.ts', 'app/api/admin/meta/instagram/conversations/route.ts', 'app/api/admin/meta/instagram/conversations/[conversationId]/route.ts', 'app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts']) {
    const text = source(path);
    assert.match(text, /assertMetaAdminSafeDto/);
    assert.match(text, /metaAdminNoStoreHeaders/);
  }
  assert.match(source('app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts'), /requireAdminMutationPermission/);
  assert.match(source('lib/meta-platform/admin/instagram-status.ts'), /metaSocialWebhookReceipt/);
  assert.match(source('lib/meta-platform/admin/instagram-status.ts'), /metaJobAudit/);
});
