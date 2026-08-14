import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeInstagramInboundMessage } from '../../lib/meta-platform/domains/instagram/normalize-message.ts';
import {
  planInstagramInboundSideEffects,
  toInstagramInboundSafeResult,
} from '../../lib/meta-platform/domains/instagram/conversations.ts';
import {
  assertInstagramReplyWriteEnabledAtExecution,
  decideInstagramReplyExecutionAction,
} from '../../lib/meta-platform/domains/instagram/send-reply.ts';
import {
  captureInstagramPrivateReplyProviderResponse,
  evaluateInstagramPrivateReplyPolicy,
  INSTAGRAM_PRIVATE_REPLY_MAX_AGE_MS,
} from '../../lib/meta-platform/domains/instagram/private-reply.ts';
import {
  evaluateInstagramAttachmentMetadataPolicy,
  toInstagramAttachmentSafeProjection,
} from '../../lib/meta-platform/domains/instagram/media-policy.ts';
import { evaluateInstagramReplyPolicy, INSTAGRAM_STANDARD_REPLY_WINDOW_MS } from '../../lib/meta/instagram/policy.ts';
import {
  InMemoryInstagramPersistenceRepository,
} from '../../lib/meta-platform/repositories/instagram-messages.ts';
import { InMemoryInstagramPrivateReplyRepository } from '../../lib/meta-platform/repositories/instagram-private-replies.ts';
import {
  hashInstagramOutboundPayload,
  InMemoryInstagramOutboundRepository,
} from '../../lib/meta-platform/repositories/instagram-outbound.ts';
import { runMetaSocialAttachmentValidationPipeline } from '../../lib/meta-platform/queue/social-attachment-validation-pipeline.ts';
import { classifyMetaInstagramOutboundFailure } from '../../lib/meta-platform/queue/instagram-outbound-job.ts';

const NOW = new Date('2026-07-27T22:00:00.000Z');
const SCOPE = Object.freeze({
  environment: 'PRODUCTION',
  connectionKey: 'primary',
  accountIdentityReferenceId: 'ig-account-ref-1',
});
function ids(prefix) { let value = 0; return () => `${prefix}-${++value}`; }

function inbound(overrides = {}) {
  return {
    eventKey: 'instagram:message:mid-1',
    eventType: 'MESSAGE',
    accountId: 'ig-account-1',
    senderId: 'sender-1',
    recipientId: 'ig-account-1',
    conversationKey: 'conversation-1',
    platformMessageId: 'mid-1',
    direction: 'INBOUND',
    messageType: 'TEXT',
    text: '  hello  ',
    sentAt: '2026-07-27T21:59:00.000Z',
    correlationId: 'instagram:layer9.5',
    payloadDigest: 'a'.repeat(64),
    attachments: [],
    ...overrides,
  };
}

function privatePolicy(overrides = {}) {
  const occurredAt = new Date('2026-07-25T22:00:00.000Z');
  return {
    now: NOW,
    conversationId: 'conversation-1',
    conversationAccountIdentityReferenceId: SCOPE.accountIdentityReferenceId,
    sourceMessageId: 'message-1',
    sourceConversationId: 'conversation-1',
    sourceAccountIdentityReferenceId: SCOPE.accountIdentityReferenceId,
    sourceCommentId: 'comment-1',
    sourcePostId: 'post-1',
    sourceOccurredAt: occurredAt,
    storedExpiresAt: new Date(occurredAt.getTime() + INSTAGRAM_PRIVATE_REPLY_MAX_AGE_MS),
    privateReplySentAt: null,
    reservationStatus: 'RESERVED',
    surface: 'POST_OR_REEL',
    liveBroadcastActive: null,
    ...overrides,
  };
}

function mediaAttachment(overrides = {}) {
  return Object.freeze({
    attachmentKey: 'attachment-1',
    externalId: 'provider-attachment-1',
    type: 'IMAGE',
    url: 'https://cdninstagram.com/media/file.png',
    mimeType: 'image/png',
    fileName: 'file.png',
    fileSize: 10,
    thumbnailUrl: null,
    ...overrides,
  });
}

function downloadedMedia(overrides = {}) {
  return Object.freeze({
    sourceUrl: 'https://cdninstagram.com/media/file.png',
    finalUrl: 'https://cdninstagram.com/media/file.png',
    bytes: Buffer.from('safe-media'),
    mimeType: 'image/png',
    detectedMimeType: 'image/png',
    fileName: 'file.png',
    size: 10,
    digest: 'b'.repeat(64),
    ...overrides,
  });
}

test('9.5 inbound text creates one normalized safe message result', () => {
  const message = normalizeInstagramInboundMessage(inbound());
  assert.equal(message.text, 'hello');
  assert.equal(message.providerMessageId, 'mid-1');
  assert.equal(message.occurredAt, '2026-07-27T21:59:00.000Z');
  const result = toInstagramInboundSafeResult({
    receiptId: 'receipt-1', conversationId: 'conversation-1', messageId: 'message-1',
    providerMessageId: message.providerMessageId, created: true, orderingAdvanced: true,
    scheduledAttachmentCount: 0, rejectedAttachmentCount: 0, realtimeEventId: 'event-1',
  });
  assert.equal(result.deduplicated, false);
  assert.equal(result.outOfOrder, false);
  assert.doesNotMatch(JSON.stringify(result), /hello|sender-1/);
});

test('9.5 inbound attachment retains safe metadata and schedules validation once', () => {
  const message = normalizeInstagramInboundMessage(inbound({
    messageType: 'IMAGE',
    attachments: [{ externalId: 'att-1', type: 'IMAGE', url: 'https://cdninstagram.com/private?t=secret', mimeType: 'image/png', fileSize: 100 }],
  }));
  const policy = evaluateInstagramAttachmentMetadataPolicy({
    type: message.attachments[0].type,
    mimeType: message.attachments[0].mimeType,
    fileSize: message.attachments[0].fileSize,
    hasSourceUrl: Boolean(message.attachments[0].url),
  });
  const sideEffects = planInstagramInboundSideEffects({
    messageCreated: true, direction: 'INBOUND', participantProfileMissing: false,
    attachmentCount: message.attachments.length,
  });
  assert.equal(policy.decision, 'PENDING');
  assert.equal(sideEffects.scheduleAttachments, true);
  const safe = toInstagramAttachmentSafeProjection({
    id: 'att-1', messageId: 'message-1', type: 'IMAGE', status: 'PENDING', mimeType: 'image/png', fileSize: 100,
    sourceUrlDigest: 'c'.repeat(64), failureCode: null, quarantinedAt: null,
  });
  assert.doesNotMatch(JSON.stringify(safe), /cdninstagram|secret/);
});

test('9.5 duplicate inbound message creates one row and no duplicate side effects', () => {
  const repository = new InMemoryInstagramPersistenceRepository({ createId: ids('ig') });
  const input = {
    ...SCOPE, receiptId: 'receipt-1', providerConversationKey: 'conversation-1', participantIdentityId: 'participant-1',
    providerMessageId: 'mid-duplicate', payloadDigest: 'd'.repeat(64), occurredAt: NOW,
    replyWindowMs: INSTAGRAM_STANDARD_REPLY_WINDOW_MS,
  };
  const first = repository.persistInbound(input);
  const duplicate = repository.persistInbound({ ...input, receiptId: 'receipt-2' });
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(repository.snapshot().messages.length, 1);
  assert.deepEqual(planInstagramInboundSideEffects({ messageCreated: duplicate.created, direction: 'INBOUND', participantProfileMissing: true, attachmentCount: 2 }), {
    emitRealtime: false, scheduleAttachments: false, refreshParticipantProfile: false, deduplicated: true,
  });
});

test('9.5 late inbound message does not corrupt conversation ordering', () => {
  const repository = new InMemoryInstagramPersistenceRepository({ createId: ids('late') });
  const common = {
    ...SCOPE, providerConversationKey: 'conversation-1', participantIdentityId: 'participant-1',
    payloadDigest: 'e'.repeat(64), replyWindowMs: INSTAGRAM_STANDARD_REPLY_WINDOW_MS,
  };
  const newest = repository.persistInbound({ ...common, receiptId: 'receipt-new', providerMessageId: 'mid-new', occurredAt: NOW });
  const late = repository.persistInbound({ ...common, receiptId: 'receipt-old', providerMessageId: 'mid-old', occurredAt: new Date(NOW.getTime() - 60_000) });
  assert.equal(newest.conversation.lastActivityProviderMessageId, 'mid-new');
  assert.equal(late.conversation.lastActivityProviderMessageId, 'mid-new');
  assert.equal(late.conversation.orderingVersion, 1);
  assert.equal(toInstagramInboundSafeResult({ receiptId: 'receipt-old', conversationId: late.conversation.id, messageId: late.message.id, providerMessageId: 'mid-old', created: true, orderingAdvanced: false, scheduledAttachmentCount: 0, rejectedAttachmentCount: 0 }).outOfOrder, true);
});

test('9.5 valid standard reply remains eligible inside the canonical window', () => {
  const lastInboundAt = new Date(NOW.getTime() - 60_000);
  const policy = evaluateInstagramReplyPolicy({
    now: NOW, accountMatches: true, permissionGranted: true, conversationStatus: 'ACTIVE',
    lastInboundAt, replyWindowExpiresAt: new Date(lastInboundAt.getTime() + INSTAGRAM_STANDARD_REPLY_WINDOW_MS),
    mode: 'MESSAGE', privateReplyExpiresAt: null, privateReplySentAt: null,
  });
  assert.equal(policy.eligible, true);
  assert.equal(policy.code, 'ELIGIBLE');
});

test('9.5 expired standard reply is blocked before any provider call', () => {
  const policy = evaluateInstagramReplyPolicy({
    now: NOW, accountMatches: true, permissionGranted: true, conversationStatus: 'ACTIVE',
    lastInboundAt: new Date(NOW.getTime() - INSTAGRAM_STANDARD_REPLY_WINDOW_MS - 1),
    replyWindowExpiresAt: new Date(NOW.getTime() - 1), mode: 'MESSAGE',
    privateReplyExpiresAt: null, privateReplySentAt: null,
  });
  assert.equal(policy.eligible, false);
  assert.equal(policy.code, 'WINDOW_EXPIRED');
});

test('9.5 valid private reply reserves one comment-scoped one-shot operation', () => {
  const policy = evaluateInstagramPrivateReplyPolicy(privatePolicy());
  assert.equal(policy.eligible, true);
  const repository = new InMemoryInstagramPrivateReplyRepository({ createId: ids('private') });
  const reservation = repository.reserve({
    ...SCOPE, sourceCommentId: 'comment-1', sourceMessageId: 'message-1', expiresAt: policy.expiresAt, now: NOW,
  });
  assert.equal(reservation.status, 'RESERVED');
});

test('9.5 second private reply is blocked by policy and durable reservation', () => {
  const repository = new InMemoryInstagramPrivateReplyRepository({ createId: ids('private-duplicate') });
  const expiresAt = privatePolicy().storedExpiresAt;
  repository.reserve({ ...SCOPE, sourceCommentId: 'comment-1', sourceMessageId: 'message-1', expiresAt, now: NOW });
  assert.throws(() => repository.reserve({ ...SCOPE, sourceCommentId: 'comment-1', sourceMessageId: 'message-1', expiresAt, now: NOW }), /INSTAGRAM_PRIVATE_REPLY_ALREADY_RESERVED/);
  assert.equal(evaluateInstagramPrivateReplyPolicy(privatePolicy({ reservationStatus: 'SENT' })).code, 'INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT_OR_BLOCKED');
});

test('9.5 Instagram Live inactive private reply fails closed', () => {
  const policy = evaluateInstagramPrivateReplyPolicy(privatePolicy({ surface: 'LIVE', liveBroadcastActive: false }));
  assert.equal(policy.eligible, false);
  assert.equal(policy.code, 'INSTAGRAM_PRIVATE_REPLY_LIVE_ENDED');
});

test('9.5 unsafe media is blocked and failed scanning is quarantined', async () => {
  const media = downloadedMedia();
  const infected = await runMetaSocialAttachmentValidationPipeline({
    attachment: mediaAttachment(), accountId: 'ig-account-1', now: NOW,
    download: async () => media,
    storeSecurely: async () => ({ storageKey: 'private/meta-social/instagram/ig-account-1/file', size: media.size, mimeType: media.mimeType, digest: media.digest, scanResult: 'INFECTED' }),
  });
  assert.equal(infected.outcome, 'REJECTED');
  assert.equal(infected.decision.reason, 'MEDIA_SCAN_INFECTED');
  const failedScan = await runMetaSocialAttachmentValidationPipeline({
    attachment: mediaAttachment(), accountId: 'ig-account-1', now: NOW,
    download: async () => media,
    storeSecurely: async () => ({ storageKey: 'private/meta-social/instagram/ig-account-1/file', size: media.size, mimeType: media.mimeType, digest: media.digest, scanResult: 'FAILED' }),
  });
  assert.equal(failedScan.outcome, 'REJECTED');
  assert.equal(failedScan.decision.decision, 'QUARANTINED');
  assert.equal(failedScan.decision.quarantined, true);
});

test('9.5 provider message ID is captured durably without provider PII', () => {
  const repository = new InMemoryInstagramOutboundRepository({ createId: ids('outbound') });
  const idempotencyKey = 'reply:layer9.5:provider-id';
  repository.createOrGet({ ...SCOPE, idempotencyKey, payloadHash: hashInstagramOutboundPayload({ text: 'hello' }) });
  const sent = repository.markSent({ ...SCOPE, idempotencyKey, providerMessageId: 'provider-mid-1' });
  assert.equal(sent.providerStatus, 'SENT');
  assert.equal(sent.providerMessageId, 'provider-mid-1');
  const captured = captureInstagramPrivateReplyProviderResponse({ message_id: 'provider-mid-2', status: 'accepted', email: 'private@example.com', access_token: 'secret-token' });
  assert.equal(captured.providerMessageId, 'provider-mid-2');
  assert.doesNotMatch(captured.safeDigestInput, /private@example\.com|secret-token/);
});

test('9.5 unknown provider write requires reconciliation and cannot blind retry', () => {
  const repository = new InMemoryInstagramOutboundRepository({ createId: ids('unknown') });
  const idempotencyKey = 'reply:layer9.5:unknown';
  repository.createOrGet({ ...SCOPE, idempotencyKey, payloadHash: hashInstagramOutboundPayload({ text: 'hello' }) });
  const unknown = repository.markUnknown({ ...SCOPE, idempotencyKey, failureCode: 'INSTAGRAM_PROVIDER_WRITE_OUTCOME_UNKNOWN' });
  assert.equal(unknown.providerStatus, 'UNKNOWN_OUTCOME');
  assert.equal(unknown.reconciliationStatus, 'REQUIRED');
  assert.equal(decideInstagramReplyExecutionAction(unknown), 'RECONCILE');
  assert.equal(classifyMetaInstagramOutboundFailure(new Error('socket hang up')).classification, 'UNKNOWN_WRITE');
});

test('9.5 execution-time write kill switch blocks standard and private replies', () => {
  assert.doesNotThrow(() => assertInstagramReplyWriteEnabledAtExecution('MESSAGE', { META_PLATFORM_INSTAGRAM_WRITES: 'true' }));
  assert.throws(() => assertInstagramReplyWriteEnabledAtExecution('MESSAGE', { META_PLATFORM_GLOBAL_KILL_SWITCH: 'true', META_PLATFORM_INSTAGRAM_WRITES: 'true' }), /META_PLATFORM_GLOBAL_KILL_SWITCH_ACTIVE/);
  assert.throws(() => assertInstagramReplyWriteEnabledAtExecution('PRIVATE_REPLY', { META_PLATFORM_INSTAGRAM_WRITES: 'true', META_PLATFORM_INSTAGRAM_PRIVATE_REPLY: 'false' }), /META_PLATFORM_INSTAGRAM_PRIVATE_REPLY_DISABLED/);
  assert.throws(() => assertInstagramReplyWriteEnabledAtExecution('PRIVATE_REPLY', { META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH: 'true', META_PLATFORM_INSTAGRAM_WRITES: 'true', META_PLATFORM_INSTAGRAM_PRIVATE_REPLY: 'true' }), /META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH_ACTIVE/);
});
