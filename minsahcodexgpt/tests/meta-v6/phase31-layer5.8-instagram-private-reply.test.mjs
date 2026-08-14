import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  captureInstagramPrivateReplyProviderResponse,
  evaluateInstagramPrivateReplyPolicy,
  INSTAGRAM_PRIVATE_REPLY_MAX_AGE_MS,
  resolveInstagramPrivateReplySurface,
} from '../../lib/meta-platform/domains/instagram/private-reply.ts';
import { assertInstagramReplyWriteEnabledAtExecution } from '../../lib/meta-platform/domains/instagram/send-reply.ts';

const occurredAt = new Date('2026-07-20T12:00:00.000Z');
const expiresAt = new Date(occurredAt.getTime() + INSTAGRAM_PRIVATE_REPLY_MAX_AGE_MS);
const base = {
  now: new Date('2026-07-26T12:00:00.000Z'),
  conversationId: 'conversation-1',
  conversationAccountIdentityReferenceId: 'account-ref-1',
  sourceMessageId: 'message-1',
  sourceConversationId: 'conversation-1',
  sourceAccountIdentityReferenceId: 'account-ref-1',
  sourceCommentId: 'comment-1',
  sourcePostId: 'post-1',
  sourceOccurredAt: occurredAt,
  storedExpiresAt: expiresAt,
  privateReplySentAt: null,
  reservationStatus: null,
  surface: 'POST_OR_REEL',
  liveBroadcastActive: null,
};

test('post or reel private reply requires scoped comment/post relationship and seven-day state', () => {
  const allowed = evaluateInstagramPrivateReplyPolicy(base);
  assert.equal(allowed.eligible, true);
  assert.equal(allowed.persistenceEligibility, 'ELIGIBLE');
  assert.equal(allowed.expiresAt?.toISOString(), '2026-07-27T12:00:00.000Z');
  assert.equal(evaluateInstagramPrivateReplyPolicy({ ...base, sourcePostId: null }).code, 'INSTAGRAM_PRIVATE_REPLY_POST_RELATIONSHIP_REQUIRED');
  assert.equal(evaluateInstagramPrivateReplyPolicy({ ...base, sourceConversationId: 'other' }).code, 'INSTAGRAM_PRIVATE_REPLY_SOURCE_SCOPE_MISMATCH');
  assert.equal(evaluateInstagramPrivateReplyPolicy({ ...base, storedExpiresAt: new Date('2026-07-29T12:00:00Z') }).code, 'INSTAGRAM_PRIVATE_REPLY_EXPIRY_STATE_MISMATCH');
  assert.equal(evaluateInstagramPrivateReplyPolicy({ ...base, now: expiresAt }).code, 'INSTAGRAM_PRIVATE_REPLY_WINDOW_EXPIRED');
});

test('one-shot state blocks duplicate, failed, and unknown reservation states', () => {
  assert.equal(evaluateInstagramPrivateReplyPolicy({ ...base, privateReplySentAt: new Date() }).persistenceEligibility, 'PRIVATE_REPLY_ALREADY_SENT');
  assert.equal(evaluateInstagramPrivateReplyPolicy({ ...base, reservationStatus: 'SENT' }).code, 'INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT_OR_BLOCKED');
  assert.equal(evaluateInstagramPrivateReplyPolicy({ ...base, reservationStatus: 'UNKNOWN_OUTCOME' }).code, 'INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT_OR_BLOCKED');
});

test('Instagram Live private replies fail closed unless current active state is true', () => {
  assert.deepEqual(resolveInstagramPrivateReplySurface({ privateReplySurface: 'LIVE' }), { surface: 'LIVE', liveBroadcastActive: null });
  assert.equal(evaluateInstagramPrivateReplyPolicy({ ...base, surface: 'LIVE', liveBroadcastActive: null }).code, 'INSTAGRAM_PRIVATE_REPLY_LIVE_STATE_REQUIRED');
  assert.equal(evaluateInstagramPrivateReplyPolicy({ ...base, surface: 'LIVE', liveBroadcastActive: false }).code, 'INSTAGRAM_PRIVATE_REPLY_LIVE_ENDED');
  assert.equal(evaluateInstagramPrivateReplyPolicy({ ...base, surface: 'LIVE', liveBroadcastActive: true }).eligible, true);
});

test('private replies use the current execution-time kill switch', () => {
  assert.doesNotThrow(() => assertInstagramReplyWriteEnabledAtExecution('PRIVATE_REPLY', { META_PLATFORM_INSTAGRAM_WRITES: 'true', META_PLATFORM_INSTAGRAM_PRIVATE_REPLY: 'true' }));
  assert.throws(() => assertInstagramReplyWriteEnabledAtExecution('PRIVATE_REPLY', { META_PLATFORM_INSTAGRAM_WRITES: 'true', META_PLATFORM_INSTAGRAM_PRIVATE_REPLY: 'false' }), /META_PLATFORM_INSTAGRAM_PRIVATE_REPLY_DISABLED/);
  assert.throws(() => assertInstagramReplyWriteEnabledAtExecution('PRIVATE_REPLY', { META_PLATFORM_INSTAGRAM_KILL_SWITCH: 'true', META_PLATFORM_INSTAGRAM_WRITES: 'true', META_PLATFORM_INSTAGRAM_PRIVATE_REPLY: 'true' }), /META_PLATFORM_INSTAGRAM_KILL_SWITCH_ACTIVE/);
});

test('provider response capture retains only safe bounded identifiers', () => {
  const captured = captureInstagramPrivateReplyProviderResponse({
    message_id: 'provider-mid-1',
    status: 'accepted',
    email: 'person@example.com',
    phone: '+8801700000000',
    access_token: 'secret-token',
    nested: { raw: 'webhook-pii' },
  });
  assert.equal(captured.providerMessageId, 'provider-mid-1');
  assert.match(captured.safeDigestInput, /provider-mid-1/);
  assert.doesNotMatch(captured.safeDigestInput, /person@example\.com|8801700000000|secret-token|webhook-pii/);
});

test('production route and worker use private reply domain runtime and reconciliation boundary', () => {
  const route = fs.readFileSync('app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts', 'utf8');
  const worker = fs.readFileSync('workers/meta-instagram.worker.ts', 'utf8');
  const runtime = fs.readFileSync('lib/meta-platform/domains/instagram/private-reply-runtime.ts', 'utf8');
  const messages = fs.readFileSync('lib/meta/instagram/messages.ts', 'utf8');
  const persistence = fs.readFileSync('lib/meta-platform/repositories/prisma-instagram-persistence.ts', 'utf8');
  assert.match(route, /requestInstagramPrivateReplyProduction/);
  assert.match(worker, /executeInstagramPrivateReplyProduction/);
  assert.match(runtime, /assertInstagramReplyWriteEnabledAtExecution\('PRIVATE_REPLY', process\.env\)/);
  assert.match(runtime, /assertInstagramCutoverWriteAuthority\('PRIVATE', process\.env\)/);
  assert.match(messages, /evaluateInstagramPrivateReplyPolicy/);
  assert.match(messages, /captureInstagramPrivateReplyProviderResponse/);
  assert.match(messages, /INSTAGRAM_OUTBOUND_RECONCILIATION_REQUIRED/);
  assert.match(persistence, /providerResponseDigest/);
  assert.match(persistence, /ON CONFLICT \("environment","connectionKey","accountIdentityReferenceId","sourceCommentId"\) DO NOTHING/);
});
