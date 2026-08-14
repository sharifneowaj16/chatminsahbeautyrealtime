import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryInstagramPersistenceRepository, compareInstagramActivity } from '../../lib/meta-platform/repositories/instagram-messages.ts';
import { InMemoryInstagramOutboundRepository, hashInstagramOutboundPayload, isInstagramWriteOutcomeUnknown } from '../../lib/meta-platform/repositories/instagram-outbound.ts';
import { InMemoryInstagramPrivateReplyRepository } from '../../lib/meta-platform/repositories/instagram-private-replies.ts';
import { digestInstagramAttachmentUrl, sanitizeInstagramAttachmentMetadata } from '../../lib/meta-platform/repositories/instagram-attachments.ts';

const scope = { environment: 'PRODUCTION', connectionKey: 'primary', accountIdentityReferenceId: 'ig-identity-1' };
function ids(prefix='id') { let i=0; return () => `${prefix}-${++i}`; }
function inbound(repo, overrides={}) {
  repo.upsertParticipant({ ...scope, providerParticipantId: 'person-1', seenAt: new Date('2026-07-24T10:00:00Z') });
  const participant = repo.snapshot().participants[0];
  return repo.persistInbound({ ...scope, receiptId: 'receipt-1', providerConversationKey: 'conversation-1', participantIdentityId: participant.id, providerMessageId: 'message-1', payloadDigest: 'digest-1', occurredAt: new Date('2026-07-24T10:00:00Z'), replyWindowMs: 86_400_000, commentId: null, privateReplyWindowMs: 604_800_000, kind: 'DIRECT', ...overrides });
}

test('same inbound provider message creates one scoped message', () => {
  const repo = new InMemoryInstagramPersistenceRepository({ createId: ids() });
  const first = inbound(repo); const second = inbound(repo);
  assert.equal(first.created, true); assert.equal(second.created, false); assert.equal(repo.snapshot().messages.length, 1);
  assert.equal(repo.getReceiptMessage('receipt-1'), first.message.id);
});

test('same provider message ID in another environment does not collide', () => {
  const repo = new InMemoryInstagramPersistenceRepository({ createId: ids() }); inbound(repo);
  const staging = { ...scope, environment: 'STAGING' };
  const participant = repo.upsertParticipant({ ...staging, providerParticipantId: 'person-1' });
  repo.persistInbound({ ...staging, receiptId: 'receipt-staging', providerConversationKey: 'conversation-1', participantIdentityId: participant.id, providerMessageId: 'message-1', payloadDigest: 'digest-1', occurredAt: new Date('2026-07-24T10:00:00Z'), replyWindowMs: 86_400_000, privateReplyWindowMs: 604_800_000 });
  assert.equal(repo.snapshot().messages.length, 2);
});

test('conversation participant cannot be silently replaced', () => {
  const repo = new InMemoryInstagramPersistenceRepository({ createId: ids() }); inbound(repo);
  assert.throws(() => repo.upsertConversation({ ...scope, providerConversationKey: 'conversation-1', participantIdentityId: 'different' }), (e) => e?.code === 'INSTAGRAM_CONVERSATION_PARTICIPANT_MISMATCH');
});

test('same provider ID with changed digest keeps original and surfaces mismatch', () => {
  const repo = new InMemoryInstagramPersistenceRepository({ createId: ids() }); const first = inbound(repo);
  const second = inbound(repo, { receiptId: 'receipt-replay', payloadDigest: 'changed' });
  assert.equal(second.message.id, first.message.id); assert.equal(second.message.payloadDigest, 'digest-1'); assert.equal(second.message.digestMismatchCount, 1); assert.equal(second.digestMatches, false);
});

test('one receipt cannot be linked to two Instagram messages', () => {
  const repo = new InMemoryInstagramPersistenceRepository({ createId: ids() }); inbound(repo);
  assert.throws(() => inbound(repo, { providerMessageId: 'message-2' }), (e) => e?.code === 'INSTAGRAM_RECEIPT_MESSAGE_LINK_CONFLICT');
});

test('late inbound message persists without regressing conversation activity or reply window', () => {
  const repo = new InMemoryInstagramPersistenceRepository({ createId: ids() }); const latest = inbound(repo);
  inbound(repo, { receiptId: 'receipt-old', providerMessageId: 'message-old', occurredAt: new Date('2026-07-24T09:00:00Z') });
  const conversation = repo.snapshot().conversations[0];
  assert.equal(repo.snapshot().messages.length, 2); assert.equal(conversation.lastActivityAt.toISOString(), latest.conversation.lastActivityAt.toISOString()); assert.equal(conversation.replyWindowExpiresAt.toISOString(), latest.conversation.replyWindowExpiresAt.toISOString());
});

test('equal timestamps use deterministic provider message key tie-break', () => {
  assert.equal(compareInstagramActivity(new Date('2026-07-24T10:00:00Z'), 'b', new Date('2026-07-24T10:00:00Z'), 'a'), 1);
  assert.equal(compareInstagramActivity(new Date('2026-07-24T10:00:00Z'), 'a', new Date('2026-07-24T10:00:00Z'), 'b'), -1);
});

test('outbound idempotency returns one attempt for same scoped key and payload', () => {
  const repo = new InMemoryInstagramOutboundRepository({ createId: ids('send') }); const payloadHash = hashInstagramOutboundPayload({ text: 'hello' });
  const first = repo.createOrGet({ ...scope, idempotencyKey: 'send-key-1', payloadHash }); const second = repo.createOrGet({ ...scope, idempotencyKey: 'send-key-1', payloadHash });
  assert.equal(first.created, true); assert.equal(second.created, false); assert.equal(first.attempt.id, second.attempt.id);
});

test('same outbound idempotency key with changed payload is rejected', () => {
  const repo = new InMemoryInstagramOutboundRepository(); repo.createOrGet({ ...scope, idempotencyKey: 'send-key-1', payloadHash: 'a' });
  assert.throws(() => repo.createOrGet({ ...scope, idempotencyKey: 'send-key-1', payloadHash: 'b' }), (e) => e?.code === 'INSTAGRAM_SEND_IDEMPOTENCY_PAYLOAD_MISMATCH');
});

test('provider outbound message ID is unique within account scope', () => {
  const repo = new InMemoryInstagramOutboundRepository({ createId: ids('send') });
  repo.createOrGet({ ...scope, idempotencyKey: 'send-key-1', payloadHash: 'a' }); repo.createOrGet({ ...scope, idempotencyKey: 'send-key-2', payloadHash: 'b' });
  repo.markSent({ ...scope, idempotencyKey: 'send-key-1', providerMessageId: 'provider-1' });
  assert.throws(() => repo.markSent({ ...scope, idempotencyKey: 'send-key-2', providerMessageId: 'provider-1' }), (e) => e?.code === 'INSTAGRAM_PROVIDER_MESSAGE_ID_CONFLICT');
});

test('unknown outbound outcome retains attempt and requires reconciliation', () => {
  const repo = new InMemoryInstagramOutboundRepository(); repo.createOrGet({ ...scope, idempotencyKey: 'send-key-1', payloadHash: 'a' });
  const row = repo.markUnknown({ ...scope, idempotencyKey: 'send-key-1' }); assert.equal(row.providerStatus, 'UNKNOWN_OUTCOME'); assert.equal(row.reconciliationStatus, 'REQUIRED'); assert.equal(row.providerMessageId, null);
});

test('network uncertainty classifier distinguishes timeout/reset errors', () => {
  assert.equal(isInstagramWriteOutcomeUnknown(new Error('fetch failed: ECONNRESET')), true); assert.equal(isInstagramWriteOutcomeUnknown(new Error('permission denied')), false);
});

test('private reply source comment can be reserved only once', () => {
  const repo = new InMemoryInstagramPrivateReplyRepository({ createId: ids('private') }); const expiresAt = new Date('2026-07-25T10:00:00Z'); const now = new Date('2026-07-24T10:00:00Z');
  repo.reserve({ ...scope, sourceCommentId: 'comment-1', sourceMessageId: 'message-1', expiresAt, now });
  assert.throws(() => repo.reserve({ ...scope, sourceCommentId: 'comment-1', sourceMessageId: 'message-1', expiresAt, now }), (e) => e?.code === 'INSTAGRAM_PRIVATE_REPLY_ALREADY_RESERVED');
});

test('expired private reply cannot be reserved', () => {
  const repo = new InMemoryInstagramPrivateReplyRepository();
  assert.throws(() => repo.reserve({ ...scope, sourceCommentId: 'comment-1', sourceMessageId: 'message-1', expiresAt: new Date('2026-07-24T09:00:00Z'), now: new Date('2026-07-24T10:00:00Z') }), (e) => e?.code === 'INSTAGRAM_PRIVATE_REPLY_WINDOW_EXPIRED');
});

test('unknown private reply outcome retains one-shot reservation', () => {
  const repo = new InMemoryInstagramPrivateReplyRepository(); repo.reserve({ ...scope, sourceCommentId: 'comment-1', sourceMessageId: 'message-1', expiresAt: new Date('2026-07-25T10:00:00Z'), now: new Date('2026-07-24T10:00:00Z') });
  assert.equal(repo.markUnknown({ ...scope, sourceCommentId: 'comment-1' }).status, 'UNKNOWN_OUTCOME');
  assert.throws(() => repo.reserve({ ...scope, sourceCommentId: 'comment-1', sourceMessageId: 'message-1', expiresAt: new Date('2026-07-25T10:00:00Z'), now: new Date('2026-07-24T10:00:00Z') }));
});

test('attachment safe metadata excludes signed URL and digest is deterministic', () => {
  const url = 'https://cdn.example/media?access_token=secret'; assert.equal(digestInstagramAttachmentUrl(url), digestInstagramAttachmentUrl(url));
  const safe = sanitizeInstagramAttachmentMetadata({ externalId: 'a', mimeType: 'image/png', sourceUrl: url, accessToken: 'secret' });
  assert.deepEqual(safe, { externalId: 'a', mimeType: 'image/png' });
});
