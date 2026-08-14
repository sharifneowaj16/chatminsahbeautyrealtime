import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  createSocialRealtimeEvent,
  parseSocialRealtimeEvent,
  SOCIAL_REALTIME_PROTOCOL,
} from '../../packages/meta-realtime-contract/src/index.ts';
import { InMemorySocialRealtimeEventWindow } from '../../realtime-service/src/realtime/event-window.ts';
import { evaluateAdminCsrf } from '../../lib/auth/admin-csrf.ts';
import {
  assertMetaAdminSafeDto,
  projectMetaAdminFailure,
  safeMetaAdminText,
} from '../../lib/meta-platform/admin/contracts.ts';
import {
  projectAdminInboxProcessing,
} from '../../lib/meta-platform/admin/inbox-dto.ts';
import {
  evaluateMetaJobReplayEligibility,
  projectMetaJobAuditForAdmin,
} from '../../lib/meta-platform/admin/jobs-dto.ts';

const source = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const event = (overrides = {}) => createSocialRealtimeEvent({
  type: 'INSTAGRAM_MESSAGE_UPSERTED',
  eventId: 'event.layer9.6.1',
  correlationId: 'corr.layer9.6',
  platform: 'instagram',
  occurredAt: '2026-07-27T22:20:00.000Z',
  emittedAt: '2026-07-27T22:20:01.000Z',
  orderingKey: 'conversation.layer9.6',
  receiptId: 'receipt.layer9.6',
  conversationId: 'conversation.layer9.6',
  messageId: 'message.layer9.6',
  providerEventKey: 'provider.layer9.6',
  state: 'INBOUND',
  ...overrides,
});

const request = ({ method = 'POST', origin = 'https://admin.example', marker = '1', authorization = '', fetchSite = 'same-origin' } = {}) => ({
  method,
  nextUrl: { origin: 'https://admin.example' },
  headers: {
    get(name) {
      const values = {
        origin,
        referer: '',
        'x-admin-request': marker,
        authorization,
        'sec-fetch-site': fetchSite,
      };
      return values[name.toLowerCase()] || null;
    },
  },
});

test('9.6 realtime independent typecheck and build use the standalone service contract', () => {
  const pkg = JSON.parse(source('package.json'));
  const realtimePkg = JSON.parse(source('realtime-service/package.json'));
  const typecheck = source('realtime-service/scripts/typecheck.sh');
  const build = source('realtime-service/scripts/build.sh');
  assert.equal(pkg.scripts['typecheck:phase31-layer6:realtime'], 'npm --prefix realtime-service run typecheck');
  assert.equal(pkg.scripts['build:phase31-layer6:realtime'], 'npm --prefix realtime-service run build');
  assert.equal(realtimePkg.scripts.typecheck, 'bash scripts/typecheck.sh');
  assert.equal(realtimePkg.scripts.build, 'bash scripts/build.sh');
  assert.match(typecheck, /tsconfig\.verify\.json/);
  assert.match(build, /tsconfig\.offline-build\.json/);
});

test('9.6 websocket normalized payload rejects content, secrets and provider URLs', () => {
  assert.equal(SOCIAL_REALTIME_PROTOCOL, 'minsah-inbox-v1');
  const safe = parseSocialRealtimeEvent(event());
  assert.equal(safe?.receiptId, 'receipt.layer9.6');
  assert.equal(parseSocialRealtimeEvent({ ...event(), text: 'customer private message' }), null);
  assert.equal(parseSocialRealtimeEvent({ ...event(), accessToken: 'EA-secret-token-value' }), null);
  assert.equal(parseSocialRealtimeEvent({ ...event(), attachmentUrl: 'https://provider.example/private' }), null);
});

test('9.6 duplicate websocket events are suppressed and late events are marked out of order', () => {
  const window = new InMemorySocialRealtimeEventWindow();
  assert.equal(window.accept(event()).accepted, true);
  assert.deepEqual(window.accept(event()), { accepted: false, reason: 'DUPLICATE_EVENT' });
  const late = window.accept(event({
    eventId: 'event.layer9.6.late',
    occurredAt: '2026-07-27T22:19:00.000Z',
    emittedAt: '2026-07-27T22:20:02.000Z',
  }));
  assert.equal(late.accepted && late.delivery.event.outOfOrder, true);
});

test('9.6 retry and dead-letter ownership remains singular and replay-safe', () => {
  const app = source('realtime-service/src/app.ts');
  const config = source('realtime-service/src/config.ts');
  assert.match(app, /retryOwner: cutover\.retryOwner/);
  assert.match(app, /deadLetterOwner:[\s\S]*main-app-meta-job-audit/);
  for (const name of ['FB_MEDIA_RETRY_ENABLED', 'FB_REPLAY_ENABLED', 'FB_OUTGOING_RETRY_ENABLED', 'FB_SYNC_ENABLED']) {
    const section = config.slice(config.indexOf(`${name}:`), config.indexOf(`${name}:`) + 180);
    assert.match(section, /default\('false'\)/);
  }
  assert.equal(evaluateMetaJobReplayEligibility({ status: 'DEAD_LETTER', jobName: 'lead-process' }).allowed, true);
  assert.equal(evaluateMetaJobReplayEligibility({ status: 'FAILED', jobName: 'instagram-reply', lastError: { code: 'UNKNOWN_WRITE_OUTCOME' } }).reasonCode, 'UNKNOWN_OUTCOME_RECONCILIATION_REQUIRED');
});

test('9.6 realtime and admin token-health ownership is aligned without exposing credentials', () => {
  const app = source('realtime-service/src/app.ts');
  const health = source('lib/meta-platform/admin/provider-health.ts');
  assert.match(app, /tokenHealthOwner:[\s\S]*main-app-meta-connection/);
  assert.match(app, /permissionHealthOwner:[\s\S]*main-app-page-health/);
  assert.match(health, /tokenValid/);
  assert.match(health, /permissionHealth/);
  assert.match(health, /lastVerifiedAt/);
  assert.doesNotMatch(app, /FB_PAGE_ACCESS_TOKEN/);
  assert.doesNotMatch(health, /select:\s*\{[^}]*tokenRef/s);
  assert.doesNotMatch(health, /select:\s*\{[^}]*secretRef/s);
});

test('9.6 admin receipt trace preserves receipt, correlation, source and replay relationships', () => {
  const projected = projectMetaJobAuditForAdmin({
    id: 'job-1', queueName: 'social', jobName: 'instagram-inbound', status: 'COMPLETED',
    sourceId: 'receipt.layer9.6', correlationId: 'corr.layer9.6', replayOfId: 'job-original',
    attempts: 1, maxAttempts: 5,
  });
  assert.equal(projected.sourceId, 'receipt.layer9.6');
  assert.equal(projected.correlationId, 'corr.layer9.6');
  assert.equal(projected.replayOfId, 'job-original');
  const jobs = source('lib/meta-platform/admin/jobs-status.ts');
  const timeline = source('app/api/admin/meta/correlations/[correlationId]/route.ts');
  assert.match(jobs, /correlationId: true/);
  assert.match(jobs, /sourceId: true/);
  assert.match(jobs, /replayOfId: true/);
  assert.match(timeline, /META_OPS_VIEW/);
  assert.match(timeline, /getMetaCorrelationTimeline/);
});

test('9.6 admin blocked reason is explicit, stable and safely redacted', () => {
  const processing = projectAdminInboxProcessing({ attachments: [{ status: 'QUARANTINED' }] });
  assert.equal(processing.status, 'BLOCKED');
  assert.equal(processing.reasonCode, 'ATTACHMENT_QUARANTINED');
  const failure = projectMetaAdminFailure({
    code: 'PROVIDER_WRITE_BLOCKED',
    classification: 'POLICY_BLOCKED',
    message: 'Contact private@example.com or +8801712345678; access_token=very-secret-value',
  });
  const text = JSON.stringify(failure);
  assert.match(text, /PROVIDER_WRITE_BLOCKED/);
  assert.doesNotMatch(text, /private@example\.com|8801712345678|very-secret-value/);
});

test('9.6 admin permission health includes scoped remediation and requires ops-view authorization', () => {
  const health = source('lib/meta-platform/admin/provider-health.ts');
  const route = source('app/api/admin/meta/health/route.ts');
  for (const scope of ['APP', 'BUSINESS', 'PAGE', 'INSTAGRAM_ACCOUNT', 'AD_ACCOUNT', 'FORM']) {
    assert.match(health, new RegExp(`'${scope}'`));
  }
  assert.match(health, /REAUTHORIZE_PROVIDER_ASSET/);
  assert.match(health, /REVIEW_REQUIRED_PERMISSIONS/);
  assert.match(health, /revokedAt/);
  assert.match(route, /META_OPS_VIEW/);
  assert.match(route, /assertMetaAdminSafeDto/);
});

test('9.6 admin dead-letter visibility is bounded, sanitized and approval-aware', () => {
  const dto = projectMetaJobAuditForAdmin({
    id: 'dead-1', queueName: 'social', jobName: 'instagram-reply', status: 'DEAD_LETTER',
    attempts: 5, maxAttempts: 5, payload: { accessToken: 'secret' },
    lastError: { code: 'META_TIMEOUT', message: 'private@example.com timed out', rawPayload: { token: 'secret' } },
  });
  const text = JSON.stringify(dto);
  assert.equal(dto.status, 'DEAD_LETTER');
  assert.equal(dto.replayEligibility.allowed, true);
  assert.equal(dto.replayEligibility.approvalRequired, true);
  assert.doesNotMatch(text, /payload|rawPayload|accessToken|private@example\.com/);
  const route = source('app/api/admin/meta/jobs/route.ts');
  assert.match(route, /parseMetaAdminLimit/);
  assert.match(route, /listMetaAdminJobs/);
});

test('9.6 admin replay authorization blocks cross-site requests and requires audited approval', () => {
  assert.equal(evaluateAdminCsrf(request()).allowed, true);
  assert.equal(evaluateAdminCsrf(request({ origin: 'https://evil.example' })).allowed, false);
  assert.equal(evaluateAdminCsrf(request({ fetchSite: 'cross-site' })).reasonCode, 'ADMIN_CSRF_FETCH_SITE_BLOCKED');
  const jobs = source('app/api/admin/meta/jobs/route.ts');
  const deadLetter = source('app/api/admin/inbox/sync/dead-letter/route.ts');
  assert.match(jobs, /requireAdminMutationPermission/);
  assert.match(jobs, /META_OPS_OPERATE/);
  assert.match(jobs, /approvalId/);
  assert.match(jobs, /executeMetaAdminAction/);
  assert.match(deadLetter, /META_SOCIAL_OPERATE/);
  assert.match(deadLetter, /approvalId/);
});

test('9.6 sensitive-data redaction fails closed across admin DTO and realtime contracts', () => {
  const safe = {
    ok: true,
    reason: safeMetaAdminText('Email private@example.com, phone +8801712345678, Bearer abcdefghijklmnopqrstuvwxyz', 300),
  };
  assert.doesNotThrow(() => assertMetaAdminSafeDto(safe));
  assert.doesNotMatch(JSON.stringify(safe), /private@example\.com|8801712345678|abcdefghijklmnopqrstuvwxyz/);
  assert.throws(() => assertMetaAdminSafeDto({ accessToken: 'secret' }), /META_ADMIN_DTO_SENSITIVE_KEY/);
  assert.throws(() => assertMetaAdminSafeDto({ safe: 'Bearer abcdefghijklmnopqrstuvwxyz' }), /META_ADMIN_DTO_SECRET_LEAK/);
  assert.equal(parseSocialRealtimeEvent({ ...event(), email: 'private@example.com' }), null);
});
