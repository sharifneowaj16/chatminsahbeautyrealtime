import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyInstagramWebhookChallenge, verifyInstagramWebhookSignature } from '@/lib/meta/instagram/verify';
import { instagramWebhookPayloadDigest, normalizeInstagramWebhookPayload } from '@/lib/meta/instagram/webhook';
import { validateInstagramAttachment, INSTAGRAM_ATTACHMENT_MAX_BYTES } from '@/lib/meta/instagram/attachments';
import { evaluateInstagramReplyPolicy, hasInstagramMessagingPermission, INSTAGRAM_PRIVATE_REPLY_WINDOW_MS } from '@/lib/meta/instagram/policy';
import { META_JOB_NAMES, META_JOB_SCHEMA_VERSION, META_QUEUE_NAMES, validateMetaJobPayload } from '@/lib/jobs/job-types';

const now = new Date('2026-07-18T00:00:00.000Z');

test('webhook challenge requires subscribe mode and constant token match', () => {
  assert.deepEqual(verifyInstagramWebhookChallenge({ mode: 'subscribe', token: 'safe-token', challenge: '123', expectedToken: 'safe-token' }), { valid: true, challenge: '123' });
});

test('webhook challenge rejects wrong token', () => {
  assert.equal(verifyInstagramWebhookChallenge({ mode: 'subscribe', token: 'wrong', challenge: '123', expectedToken: 'safe-token' }).valid, false);
});

test('x-hub-signature-256 verification accepts authentic raw body', () => {
  const body = '{"object":"instagram"}';
  const signature = `sha256=${createHmac('sha256', 'secret').update(body).digest('hex')}`;
  assert.equal(verifyInstagramWebhookSignature(body, signature, 'secret'), true);
});

test('x-hub-signature-256 verification rejects malformed signature', () => {
  assert.equal(verifyInstagramWebhookSignature('{}', 'sha256=not-a-real-signature', 'secret'), false);
});

test('message webhook normalizes stable IDs, correlation and text', () => {
  const payload = { object: 'instagram', entry: [{ id: '1789', messaging: [{ sender: { id: 'user-1' }, recipient: { id: '1789' }, timestamp: 1_752_800_000_000, message: { mid: 'mid.1', text: 'Need this serum' } }] }] };
  const raw = JSON.stringify(payload); const events = normalizeInstagramWebhookPayload(payload, instagramWebhookPayloadDigest(raw));
  assert.equal(events.length, 1); assert.equal(events[0].eventKey, 'message:1789:mid.1'); assert.equal(events[0].direction, 'INBOUND'); assert.equal(events[0].messageType, 'TEXT'); assert.match(events[0].correlationId, /^ig:[a-f0-9]{24}$/);
});

test('duplicate platform message IDs are normalized once', () => {
  const message = { sender: { id: 'user-1' }, recipient: { id: '1789' }, timestamp: 1_752_800_000_000, message: { mid: 'mid.duplicate', text: 'hello' } };
  const events = normalizeInstagramWebhookPayload({ object: 'instagram', entry: [{ id: '1789', messaging: [message, message] }] }, 'a'.repeat(64));
  assert.equal(events.length, 1);
});

test('echo event is normalized as outbound', () => {
  const events = normalizeInstagramWebhookPayload({ object: 'instagram', entry: [{ id: '1789', messaging: [{ sender: { id: '1789' }, recipient: { id: 'user-1' }, timestamp: 1_752_800_000_000, message: { mid: 'mid.echo', text: 'sent' } }] }] }, 'a'.repeat(64));
  assert.equal(events[0].direction, 'OUTBOUND'); assert.equal(events[0].conversationKey, 'ig:1789:user-1');
});

test('comment webhook creates private-reply conversation context', () => {
  const events = normalizeInstagramWebhookPayload({ object: 'instagram', entry: [{ id: '1789', changes: [{ field: 'comments', value: { id: 'comment-1', text: 'price?', from: { id: 'user-2', username: 'buyer' }, media: { id: 'post-1' }, timestamp: 1_752_800_000 } }] }] }, 'b'.repeat(64));
  assert.equal(events[0].eventType, 'COMMENT'); assert.equal(events[0].messageType, 'COMMENT_PRIVATE_REPLY'); assert.equal(events[0].commentId, 'comment-1');
});

test('unsupported webhook entries without platform IDs are ignored', () => {
  const events = normalizeInstagramWebhookPayload({ object: 'instagram', entry: [{ id: '1789', messaging: [{ sender: {}, recipient: {}, message: {} }] }] }, 'c'.repeat(64));
  assert.equal(events.length, 0);
});

test('https image attachment passes validation', () => {
  assert.deepEqual(validateInstagramAttachment({ type: 'IMAGE', url: 'https://cdn.example.com/a.jpg', mimeType: 'image/jpeg', fileSize: 1_024 }), { valid: true, issues: [] });
});

test('non-https attachment URL is blocked', () => {
  assert.ok(validateInstagramAttachment({ type: 'FILE', url: 'http://example.com/a.pdf', mimeType: 'application/pdf' }).issues.includes('ATTACHMENT_URL_PROTOCOL_BLOCKED'));
});

test('oversized attachment is blocked before download', () => {
  assert.ok(validateInstagramAttachment({ type: 'VIDEO', url: 'https://cdn.example.com/a.mp4', mimeType: 'video/mp4', fileSize: INSTAGRAM_ATTACHMENT_MAX_BYTES + 1 }).issues.includes('ATTACHMENT_SIZE_BLOCKED'));
});

test('standard reply is eligible inside 24-hour window', () => {
  const policy = evaluateInstagramReplyPolicy({ now, accountMatches: true, permissionGranted: true, conversationStatus: 'OPEN', lastInboundAt: new Date(now.getTime() - 60_000), mode: 'MESSAGE' });
  assert.equal(policy.eligible, true); assert.equal(policy.code, 'ELIGIBLE');
});

test('standard reply is blocked after the window', () => {
  const policy = evaluateInstagramReplyPolicy({ now, accountMatches: true, permissionGranted: true, conversationStatus: 'OPEN', lastInboundAt: new Date(now.getTime() - 25 * 60 * 60_000), mode: 'MESSAGE' });
  assert.equal(policy.code, 'WINDOW_EXPIRED');
});

test('reply is blocked when messaging permission is missing', () => {
  assert.equal(evaluateInstagramReplyPolicy({ now, accountMatches: true, permissionGranted: false, conversationStatus: 'OPEN', lastInboundAt: now, mode: 'MESSAGE' }).code, 'PERMISSION_MISSING');
});

test('reply is blocked for account mismatch', () => {
  assert.equal(evaluateInstagramReplyPolicy({ now, accountMatches: false, permissionGranted: true, conversationStatus: 'OPEN', lastInboundAt: now, mode: 'MESSAGE' }).code, 'ACCOUNT_MISMATCH');
});

test('spam and archived conversations are not replyable', () => {
  assert.equal(evaluateInstagramReplyPolicy({ now, accountMatches: true, permissionGranted: true, conversationStatus: 'SPAM', lastInboundAt: now, mode: 'MESSAGE' }).code, 'CONVERSATION_CLOSED');
});

test('private reply is eligible before its deadline', () => {
  const policy = evaluateInstagramReplyPolicy({ now, accountMatches: true, permissionGranted: true, conversationStatus: 'OPEN', lastInboundAt: null, mode: 'PRIVATE_REPLY', privateReplyExpiresAt: new Date(now.getTime() + INSTAGRAM_PRIVATE_REPLY_WINDOW_MS) });
  assert.equal(policy.eligible, true);
});

test('private reply is one-shot', () => {
  const policy = evaluateInstagramReplyPolicy({ now, accountMatches: true, permissionGranted: true, conversationStatus: 'OPEN', lastInboundAt: null, mode: 'PRIVATE_REPLY', privateReplyExpiresAt: new Date(now.getTime() + INSTAGRAM_PRIVATE_REPLY_WINDOW_MS), privateReplySentAt: now });
  assert.equal(policy.code, 'PRIVATE_REPLY_ALREADY_SENT');
});

test('permission parser supports Facebook Login and Instagram Login scopes', () => {
  assert.equal(hasInstagramMessagingPermission({ granted: ['instagram_manage_messages'] }), true);
  assert.equal(hasInstagramMessagingPermission({ granted: ['instagram_business_manage_messages'] }), true);
  assert.equal(hasInstagramMessagingPermission({ granted: ['instagram_basic'] }), false);
});

test('Instagram message job payload is valid and contains only a receipt ID', () => {
  const payload = { schemaVersion: META_JOB_SCHEMA_VERSION, idempotencyKey: 'instagram-message:receipt-1:event-1', requestedAt: now.toISOString(), correlationId: 'ig:1234567890abcdef', sourceId: 'receipt-1', type: 'instagram_message', receiptId: 'receipt-1' } as const;
  assert.equal(validateMetaJobPayload({ queueName: META_QUEUE_NAMES.INSTAGRAM, jobName: META_JOB_NAMES.INSTAGRAM_MESSAGE, payload }).valid, true);
});

test('Instagram job rejects raw payload and PII fields', () => {
  const payload = { schemaVersion: META_JOB_SCHEMA_VERSION, idempotencyKey: 'instagram-message:receipt-1:event-1', requestedAt: now.toISOString(), type: 'instagram_message', receiptId: 'receipt-1', rawPayload: { email: 'person@example.com' } };
  const result = validateMetaJobPayload({ queueName: META_QUEUE_NAMES.INSTAGRAM, jobName: META_JOB_NAMES.INSTAGRAM_MESSAGE, payload });
  assert.equal(result.valid, false); assert.ok(result.issues.some((issue) => issue.code === 'SECRET_IN_JOB_PAYLOAD'));
});
