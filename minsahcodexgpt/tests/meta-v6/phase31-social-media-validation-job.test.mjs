import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMetaSocialAttachmentValidationDedupeKey,
  classifyMetaSocialAttachmentValidationFailure,
  createMetaSocialAttachmentValidationJobEnvelope,
  executeMetaSocialAttachmentValidationJob,
} from '../../lib/meta-platform/queue/social-attachment-validation-job.ts';
import {
  buildMetaSocialPrivateStorageKey,
  runMetaSocialAttachmentValidationPipeline,
} from '../../lib/meta-platform/queue/social-attachment-validation-pipeline.ts';
import { createMetaSocialQueueClaim } from '../../lib/meta-platform/queue/social-queue-adapter.ts';

const digest = 'a'.repeat(64);
const baseAttachment = Object.freeze({
  attachmentKey: 'attachment-1',
  externalId: 'provider-attachment-1',
  type: 'IMAGE',
  url: 'https://cdninstagram.com/media/file.png',
  mimeType: 'image/png',
  fileName: 'file.png',
  fileSize: 8,
  thumbnailUrl: null,
});

function downloaded(overrides = {}) {
  return Object.freeze({
    sourceUrl: baseAttachment.url,
    finalUrl: baseAttachment.url,
    bytes: Buffer.from('safe-media'),
    mimeType: 'image/png',
    detectedMimeType: 'image/png',
    fileName: 'file.png',
    size: 10,
    digest,
    ...overrides,
  });
}

function stored(media, overrides = {}) {
  return Object.freeze({
    storageKey: buildMetaSocialPrivateStorageKey({ accountId: 'ig-1', attachmentId: 'attachment-1', digest: media.digest, fileName: media.fileName }),
    size: media.size,
    mimeType: media.mimeType,
    digest: media.digest,
    scanResult: 'CLEAN',
    ...overrides,
  });
}

test('safe image passes bounded download, clean scan and private storage policy', async () => {
  const media = downloaded();
  const result = await runMetaSocialAttachmentValidationPipeline({
    attachment: baseAttachment,
    accountId: 'ig-1',
    now: new Date('2026-07-25T18:00:00Z'),
    download: async () => media,
    storeSecurely: async () => stored(media),
  });
  assert.equal(result.outcome, 'READY');
  assert.equal(result.decision.reason, 'MEDIA_READY');
  assert.match(result.stored.storageKey, /^private\/meta-social\/instagram\/ig-1\//);
});

test('safe video uses the same verified private-storage pipeline', async () => {
  const attachment = { ...baseAttachment, type: 'VIDEO', mimeType: 'video/mp4', fileName: 'clip.mp4' };
  const media = downloaded({ mimeType: 'video/mp4', detectedMimeType: 'video/mp4', fileName: 'clip.mp4' });
  const result = await runMetaSocialAttachmentValidationPipeline({ attachment, accountId: 'ig-1', now: new Date(), download: async () => media, storeSecurely: async () => stored(media) });
  assert.equal(result.outcome, 'READY');
});

test('declared oversize attachment is permanently rejected before download', async () => {
  let called = false;
  const result = await runMetaSocialAttachmentValidationPipeline({
    attachment: { ...baseAttachment, fileSize: 25 * 1024 * 1024 + 1 },
    accountId: 'ig-1',
    now: new Date(),
    download: async () => { called = true; return downloaded(); },
    storeSecurely: async (media) => stored(media),
  });
  assert.equal(result.outcome, 'REJECTED');
  assert.equal(result.decision.reason, 'MEDIA_DECLARED_SIZE_BLOCKED');
  assert.equal(called, false);
});

test('MIME confusion is rejected after bounded download', async () => {
  const media = downloaded({ mimeType: 'video/mp4', detectedMimeType: 'video/mp4' });
  const result = await runMetaSocialAttachmentValidationPipeline({
    attachment: baseAttachment,
    accountId: 'ig-1',
    now: new Date(),
    download: async () => media,
    storeSecurely: async () => stored(media),
  });
  assert.equal(result.outcome, 'REJECTED');
  assert.equal(result.decision.reason, 'MEDIA_TYPE_MIME_MISMATCH');
});

test('malware is policy-blocked and scanner outages remain retryable', () => {
  assert.equal(classifyMetaSocialAttachmentValidationFailure(new Error('META_MEDIA_MALWARE_DETECTED')).classification, 'POLICY_BLOCKED');
  assert.equal(classifyMetaSocialAttachmentValidationFailure(Object.assign(new Error('META_MEDIA_SCAN_UNAVAILABLE'), { retryable: true })).classification, 'TRANSIENT');
  assert.equal(classifyMetaSocialAttachmentValidationFailure(new Error('META_MEDIA_SCAN_TIMEOUT')).classification, 'TRANSIENT');
});

test('host redirect and SSRF-style address failures are policy blocked', () => {
  assert.equal(classifyMetaSocialAttachmentValidationFailure(new Error('META_MEDIA_HOST_BLOCKED')).classification, 'POLICY_BLOCKED');
  assert.equal(classifyMetaSocialAttachmentValidationFailure(new Error('META_MEDIA_PRIVATE_ADDRESS_BLOCKED')).classification, 'POLICY_BLOCKED');
  assert.equal(classifyMetaSocialAttachmentValidationFailure(new Error('META_MEDIA_REDIRECT_LIMIT')).classification, 'POLICY_BLOCKED');
});

test('provider rate limit preserves Retry-After and auth is terminal', () => {
  const rate = classifyMetaSocialAttachmentValidationFailure({ status: 429, code: 'RATE_LIMIT', retryAfterMs: 12000 });
  assert.equal(rate.classification, 'RATE_LIMIT');
  assert.equal(rate.retryAfterMs, 12000);
  assert.equal(classifyMetaSocialAttachmentValidationFailure({ status: 403, code: 'PERMISSION_DENIED' }).classification, 'AUTH');
});

test('same attachment and source digest produce one deterministic job key', () => {
  const a = buildMetaSocialAttachmentValidationDedupeKey({ attachmentId: 'attachment-1', sourceDigest: digest });
  const b = buildMetaSocialAttachmentValidationDedupeKey({ attachmentId: 'attachment-1', sourceDigest: digest });
  assert.equal(a, b);
  assert.match(a, /^social:validate-social-attachment:[a-f0-9]{64}$/);
});

test('same content digest produces deterministic private object identity', () => {
  const a = buildMetaSocialPrivateStorageKey({ accountId: 'ig-1', attachmentId: 'attachment-1', digest, fileName: 'a.png' });
  const b = buildMetaSocialPrivateStorageKey({ accountId: 'ig-1', attachmentId: 'attachment-1', digest, fileName: 'a.png' });
  assert.equal(a, b);
  assert.ok(!a.includes('https://'));
});

test('queue envelope carries durable references and never source URLs', () => {
  const envelope = createMetaSocialAttachmentValidationJobEnvelope({
    attachmentId: 'attachment-1', messageId: 'message-1', conversationId: 'conversation-1', accountId: 'ig-1',
    correlationId: 'correlation-1', sourceDigest: digest,
  });
  assert.equal(envelope.jobType, 'VALIDATE_SOCIAL_ATTACHMENT');
  assert.equal(envelope.payloadRef.id, 'attachment-1');
  assert.ok(!JSON.stringify(envelope).includes('cdninstagram'));
});

test('worker executor ACKs successful validation with safe result reference', async () => {
  const envelope = createMetaSocialAttachmentValidationJobEnvelope({ attachmentId: 'attachment-1', messageId: 'message-1', conversationId: 'conversation-1', accountId: 'ig-1', correlationId: 'correlation-1', sourceDigest: digest });
  const claim = createMetaSocialQueueClaim({ queueName: 'meta-social', jobName: 'social-attachment-validation', jobId: 'job-1', deliveryAttempt: 1, claimedAt: new Date(), envelope });
  const result = await executeMetaSocialAttachmentValidationJob({ claim, processAttachment: async (input) => ({ ok: true, input }) });
  assert.equal(result.outcome, 'ACK');
  assert.equal(result.queueResult.resultRef.id, 'attachment-1');
});

test('worker executor rejects forged attachment scope without processing', async () => {
  const envelope = createMetaSocialAttachmentValidationJobEnvelope({ attachmentId: 'attachment-1', messageId: 'message-1', conversationId: 'conversation-1', accountId: 'ig-1', correlationId: 'correlation-1' });
  const forged = { ...envelope, payloadRef: { ...envelope.payloadRef, scope: { messageId: 'message-1' } } };
  const claim = { transport: 'BULLMQ', transportJobId: 'job-1', attemptNumber: 1, claimedAt: new Date().toISOString(), envelope: forged };
  let called = false;
  const result = await executeMetaSocialAttachmentValidationJob({ claim, processAttachment: async () => { called = true; } });
  assert.equal(result.outcome, 'NACK');
  assert.equal(result.queueResult.classification, 'PERMANENT');
  assert.equal(called, false);
});
