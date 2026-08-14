import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  evaluateFacebookAdminReplyEligibility,
  projectAdminInboxMessage,
} from '../../lib/meta-platform/admin/inbox-dto.ts';
import { projectInstagramReplyEligibility } from '../../lib/meta-platform/admin/instagram-dto.ts';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Facebook inbox projection exposes safe processing/failure state and no raw attachment metadata', () => {
  const ready = projectAdminInboxMessage({
    id: 'm-ready',
    platform: 'facebook',
    content: 'hello',
    timestamp: '2026-07-27T00:00:00.000Z',
    attachments: [{ id: 'a1', type: 'image', storageKey: 'private/a1', storageUrl: 'https://cdn.example/a1.jpg' }],
  });
  assert.equal(ready.processing.status, 'READY');
  assert.equal(ready.failure, null);

  const blocked = projectAdminInboxMessage({
    id: 'm-blocked',
    platform: 'facebook',
    content: 'attachment',
    timestamp: '2026-07-27T00:00:00.000Z',
    attachments: [{
      id: 'a2',
      type: 'image',
      metadata: { decision: 'QUARANTINED', sourceUrl: 'https://provider.example/x?access_token=secret' },
    }],
  });
  assert.equal(blocked.processing.status, 'BLOCKED');
  assert.equal(blocked.processing.reasonCode, 'ATTACHMENT_QUARANTINED');
  assert.equal(blocked.failure.code, 'META_ADMIN_INBOX_ATTACHMENT_QUARANTINED');
  assert.equal(JSON.stringify(blocked).includes('sourceUrl'), false);
  assert.equal(JSON.stringify(blocked).includes('access_token'), false);
});

test('reply eligibility is fail-closed and deterministic', () => {
  const facebook = evaluateFacebookAdminReplyEligibility({ lastInboundAt: null, now: new Date('2026-07-27T00:00:00.000Z') });
  assert.equal(facebook.allowed, false);
  assert.equal(facebook.reasonCode, 'LAST_INBOUND_REQUIRED');

  const instagram = projectInstagramReplyEligibility({
    status: 'OPEN',
    replyWindowExpiresAt: '2026-07-28T00:00:00.000Z',
    privateReplyExpiresAt: '2026-07-28T00:00:00.000Z',
    now: new Date('2026-07-27T00:00:00.000Z'),
  });
  assert.equal(instagram.standard.allowed, false);
  assert.equal(instagram.standard.reasonCode, 'PERMISSION_HEALTH_UNKNOWN');
  assert.equal(instagram.private.allowed, false);
});

test('legacy unread-count endpoint is removed from admin layouts', async () => {
  const sources = await Promise.all([
    read('app/components/admin/AdminLayout.tsx'),
    read('app/admin/AdminLayoutWrapper.tsx'),
  ]);
  for (const source of sources) {
    assert.doesNotMatch(source, /\/api\/social\/messages\?mode=unread_count/);
    assert.match(source, /\/api\/admin\/inbox\/messages\?mode=unread_count&platform=facebook/);
  }
});

test('Facebook admin inbox consumes eligibility, processing and failure state', async () => {
  const source = await read('app/components/admin/SocialMediaInboxChat.tsx');
  assert.match(source, /replyEligibility: ApiReplyEligibility \| null/);
  assert.match(source, /processing: ApiInboxProcessing \| null/);
  assert.match(source, /Reply unavailable/);
  assert.match(source, /activeConversation\.failure/);
  assert.match(source, /disabled=\{sending \|\| !replyAllowed/);
  assert.match(source, /replyEligibility\?\.allowed !== true/);
});

test('Instagram UI consumes platform health and all operational state groups', async () => {
  const page = await read('app/admin/meta/instagram/page.tsx');
  const listRoute = await read('app/api/admin/meta/instagram/conversations/route.ts');
  const detailRoute = await read('app/api/admin/meta/instagram/conversations/[conversationId]/route.ts');
  assert.match(page, /\/api\/admin\/meta\/instagram\/health/);
  for (const state of ['webhooks', 'messages', 'providerDelivery', 'replies', 'reconciliation', 'privateReplies', 'jobs']) {
    assert.match(page, new RegExp(`health\\.states\\.${state}`));
  }
  assert.match(page, /deadLetters/);
  assert.match(page, /replyEligibility\.standard\.allowed/);
  assert.match(page, /replyEligibility\.private\.allowed/);
  for (const route of [listRoute, detailRoute]) {
    assert.match(route, /getInstagramAdminHealth/);
    assert.match(route, /permissionGranted: health\.permissionGranted/);
    assert.match(route, /accountHealthy: health\.replyEnabled/);
  }
});

test('Lead UI consumes detail trace and the safe failure contract', async () => {
  const page = await read('app/admin/meta-business/leads/page.tsx');
  assert.match(page, /`\/api\/admin\/meta\/leads\/\$\{leadId\}`/);
  assert.match(page, /detail\.trace\.receipt/);
  assert.match(page, /detail\.trace\.fetchAttempts/);
  assert.match(page, /detail\.trace\.handoffs/);
  assert.match(page, /detail\.trace\.duplicates/);
  assert.match(page, /failureText\(item\.failure\)/);
  assert.doesNotMatch(page, /item\.error/);
});

test('provider health and jobs visibility are wired into the operations UI', async () => {
  const page = await read('app/admin/meta/page.tsx');
  const provider = await read('app/admin/meta/ProviderHealthPanel.tsx');
  const providerProjector = await read('lib/meta-platform/admin/provider-health.ts');
  const jobs = await read('app/admin/meta/MetaJobsPanel.tsx');
  assert.match(page, /<ProviderHealthPanel/);
  assert.match(page, /<MetaJobsPanel/);
  assert.match(page, /META_JOB_CANCEL/);
  assert.match(provider, /\/api\/admin\/meta\/health/);
  assert.match(provider, /health\.scopes\.map/);
  for (const scope of ['APP', 'BUSINESS', 'PAGE', 'INSTAGRAM_ACCOUNT', 'AD_ACCOUNT', 'FORM']) {
    assert.match(providerProjector, new RegExp(`'${scope}'`));
  }
  assert.match(jobs, /\/api\/admin\/meta\/jobs/);
  assert.match(jobs, /Next retry/);
  assert.match(jobs, /Request replay/);
  assert.match(jobs, /Request cancel/);
  assert.match(jobs, /reconciliationRequired/);
});


test('baseline item verification artifacts are packaged with the remediated layer', async () => {
  for (const item of ['7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.7', '7.8']) {
    await access(new URL(`../../phase31_layer${item}_verification.log`, import.meta.url));
    await access(new URL(`../../artifacts/phase31-layer7-items/minsahbeauty_phase31_layer${item}_complete.zip`, import.meta.url));
    await access(new URL(`../../artifacts/phase31-layer7-items/minsahbeauty_phase31_layer${item}_complete.zip.sha256`, import.meta.url));
  }
});
