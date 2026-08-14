import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateFacebookAdminReplyEligibility, projectAdminInboxAttachment } from '../../lib/meta-platform/admin/inbox-dto.ts';
const source = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('admin inbox reads normalized durable records with bounded cursor pagination', () => {
  const repo = source('lib/meta-platform/admin/inbox-repository.ts');
  assert.match(repo, /socialMessage\.findMany/);
  assert.match(repo, /encodeMetaAdminCursor/);
  assert.match(repo, /parseMetaAdminLimit/);
  assert.doesNotMatch(repo, /legacy|realtime-service/i);
  const route = source('app/api/admin/inbox/messages/route.ts');
  assert.match(route, /META_SOCIAL_VIEW/);
  assert.match(route, /assertMetaAdminSafeDto/);
  assert.match(route, /metaAdminNoStoreHeaders/);
});

test('inbox attachment DTO never exposes provider source URL or metadata', () => {
  const dto = projectAdminInboxAttachment({ id: 'a1', type: 'image', status: 'READY', storageUrl: 'https://storage.example/a1', sourceUrl: 'https://graph.facebook.com/a?access_token=secret', metadata: { token: 'secret' } });
  assert.equal(dto.storageUrl, 'https://storage.example/a1');
  assert.equal('sourceUrl' in dto, false);
  assert.equal('metadata' in dto, false);
});

test('Facebook 24-hour reply policy is deterministic and reply route is isolated', () => {
  const now = new Date('2026-07-27T00:00:00.000Z');
  assert.equal(evaluateFacebookAdminReplyEligibility({ lastInboundAt: '2026-07-26T12:00:00.000Z', now }).allowed, true);
  assert.equal(evaluateFacebookAdminReplyEligibility({ lastInboundAt: '2026-07-25T12:00:00.000Z', now }).allowed, false);
  const route = source('app/api/admin/inbox/reply/route.ts');
  assert.match(route, /requireAdminMutationPermission/);
  assert.match(route, /requestFacebookAdminReplyProduction/);
  assert.doesNotMatch(route, /fetch\s*\(/);
  const ui = source('app/components/admin/SocialMediaInboxChat.tsx');
  assert.match(ui, /\/api\/admin\/inbox\/messages/);
  assert.doesNotMatch(ui, /\/api\/social\/messages/);
});
