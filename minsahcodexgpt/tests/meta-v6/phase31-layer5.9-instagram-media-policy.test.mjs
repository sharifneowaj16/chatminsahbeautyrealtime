import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  assertInstagramOutboundMediaRequestSupported,
  evaluateInstagramAttachmentMetadataPolicy,
  evaluateInstagramOutboundAttachmentPolicy,
  projectInstagramConversationMediaSafe,
  toInstagramAttachmentSafeProjection,
} from '../../lib/meta-platform/domains/instagram/media-policy.ts';
import { getInstagramMediaRuntimeMode } from '../../lib/meta-platform/domains/instagram/feature-flags.ts';

test('attachment metadata normalizes and blocks unsafe types, sizes, mime types, and missing URLs', () => {
  assert.equal(evaluateInstagramAttachmentMetadataPolicy({ type: 'image', mimeType: 'image/jpeg', fileSize: 10, hasSourceUrl: true }).decision, 'PENDING');
  assert.equal(evaluateInstagramAttachmentMetadataPolicy({ type: 'unknown', hasSourceUrl: true }).safeReasonCode, 'ATTACHMENT_TYPE_BLOCKED');
  assert.equal(evaluateInstagramAttachmentMetadataPolicy({ type: 'IMAGE', fileSize: 30 * 1024 * 1024, hasSourceUrl: true }).safeReasonCode, 'ATTACHMENT_SIZE_BLOCKED');
  assert.equal(evaluateInstagramAttachmentMetadataPolicy({ type: 'FILE', mimeType: 'text/html', hasSourceUrl: true }).safeReasonCode, 'ATTACHMENT_MIME_BLOCKED');
  assert.equal(evaluateInstagramAttachmentMetadataPolicy({ type: 'VIDEO', hasSourceUrl: false }).safeReasonCode, 'ATTACHMENT_URL_MISSING');
});

test('safe attachment projection excludes raw URLs, filenames, storage keys, and generic metadata', () => {
  const projection = toInstagramAttachmentSafeProjection({
    id: 'attachment-1', messageId: 'message-1', type: 'IMAGE', status: 'READY', mimeType: 'image/png', fileSize: 100,
    sourceUrlDigest: 'a'.repeat(64), contentDigest: 'b'.repeat(64), failureCode: null, quarantinedAt: null,
    sourceUrl: 'https://example.com/private?token=secret', fileName: 'person@example.com.png', storageKey: 'private/path', metadata: { phone: '+8801700000000' },
  });
  const json = JSON.stringify(projection);
  assert.equal(projection.mediaReady, true);
  assert.doesNotMatch(json, /example\.com|secret|person@example\.com|private\/path|8801700000000/);
});

test('conversation media projection redacts raw attachment fields', () => {
  const result = projectInstagramConversationMediaSafe({ id: 'c1', messages: [{ id: 'm1', attachments: [{ id: 'a1', messageId: 'm1', type: 'IMAGE', status: 'REJECTED', sourceUrl: 'https://x.test?t=secret', fileName: 'name.jpg', failureCode: 'MIME_BLOCKED' }] }] });
  const json = JSON.stringify(result);
  assert.match(json, /MIME_BLOCKED/);
  assert.doesNotMatch(json, /x\.test|secret|name\.jpg/);
});

test('outbound media policy only allows validated ready private storage records', () => {
  assert.deepEqual(evaluateInstagramOutboundAttachmentPolicy({ status: 'READY', policyDecision: 'ALLOWED', type: 'IMAGE', mimeType: 'image/jpeg', fileSize: 100, storageKey: 'private/key' }), { allowed: true, safeReasonCode: 'ALLOWED' });
  assert.equal(evaluateInstagramOutboundAttachmentPolicy({ status: 'PENDING', policyDecision: 'PENDING', type: 'IMAGE', storageKey: 'private/key' }).safeReasonCode, 'INSTAGRAM_OUTBOUND_MEDIA_NOT_VALIDATED');
  assert.throws(() => assertInstagramOutboundMediaRequestSupported([{ type: 'FILE', mimeType: 'text/html', url: 'https://example.com/a' }]), /ATTACHMENT_MIME_BLOCKED/);
  assert.throws(() => assertInstagramOutboundMediaRequestSupported([{ type: 'IMAGE', mimeType: 'image/jpeg', fileSize: 100, url: 'https://example.com/a' }]), /INSTAGRAM_OUTBOUND_MEDIA_NOT_SUPPORTED/);
});

test('production routes and worker paths use safe media domain integrations', () => {
  const attachmentAdapter = fs.readFileSync('lib/meta/instagram/attachments.ts', 'utf8');
  const processor = fs.readFileSync('lib/meta-platform/queue/social-attachment-validation-processor.ts', 'utf8');
  const listRoute = fs.readFileSync('app/api/admin/meta/instagram/conversations/route.ts', 'utf8');
  const detailRoute = fs.readFileSync('app/api/admin/meta/instagram/conversations/[conversationId]/route.ts', 'utf8');
  const replyRoute = fs.readFileSync('app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts', 'utf8');
  const worker = fs.readFileSync('workers/meta-social.worker.ts', 'utf8');
  assert.match(attachmentAdapter, /evaluateInstagramAttachmentMetadataPolicy/);
  assert.match(processor, /toInstagramAttachmentSafeProjection/);
  assert.doesNotMatch(processor, /deduplicated: true[^\n]*storageKey/);
  assert.match(listRoute, /listInstagramConversationsSafe/);
  assert.match(detailRoute, /getInstagramConversationSafe/);
  assert.match(replyRoute, /assertInstagramOutboundMediaRequestSupported/);
  assert.match(worker, /processMetaSocialAttachmentValidation/);
  assert.equal(getInstagramMediaRuntimeMode({}), 'DOMAIN');
  assert.equal(getInstagramMediaRuntimeMode({ META_PHASE31_INSTAGRAM_MEDIA_RUNTIME: 'LEGACY_ROLLBACK' }), 'LEGACY_ROLLBACK');
});
