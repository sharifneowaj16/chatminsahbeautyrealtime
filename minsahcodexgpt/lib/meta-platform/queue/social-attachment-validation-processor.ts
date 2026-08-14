import 'server-only';

import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import {
  claimInstagramAttachmentValidationStorage,
  markInstagramAttachmentReadyStorage,
  markInstagramAttachmentRejectedStorage,
  markInstagramAttachmentValidationFailedStorage,
} from '../repositories/prisma-instagram-persistence';
import { downloadMetaMedia, storeMetaMediaSecurely } from '../transports/media';
import { createClamAvMetaMediaScanner } from '../transports/media/clamav';
import { createMetaPrivateMinioStore } from '../transports/media/minio-private-store';
import { META_SOCIAL_ATTACHMENT_MAX_BYTES } from '../policies/attachments';
import { runMetaSocialAttachmentValidationPipeline } from './social-attachment-validation-pipeline';
import { toInstagramAttachmentSafeProjection } from '../domains/instagram/media-policy';
import { createAndPublishSocialRealtimeEvent } from '../realtime/social-events';

export const META_SOCIAL_ATTACHMENT_VALIDATOR_VERSION = 'phase31-layer4.6-v1';
const ALLOWED_EXACT_MIME_TYPES = Object.freeze(['application/pdf', 'application/octet-stream']);
const ALLOWED_MIME_PREFIXES = Object.freeze(['image/', 'video/', 'audio/']);
const PERMANENT_DOWNLOAD_MARKERS = Object.freeze([
  'URL_INVALID', 'URL_PROTOCOL_BLOCKED', 'URL_CREDENTIALS_BLOCKED', 'URL_FRAGMENT_BLOCKED',
  'IP_LITERAL_BLOCKED', 'HOST_BLOCKED', 'PRIVATE_ADDRESS_BLOCKED', 'REDIRECT_LIMIT',
  'REDIRECT_LOCATION_MISSING', 'SIZE_BLOCKED', 'MIME_BLOCKED', 'MIME_MISMATCH',
  'HTTP_400', 'HTTP_404', 'HTTP_410',
]);

function errorCode(error: unknown): string {
  const record = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
  return String(record.code ?? (error instanceof Error ? error.message.split(':')[0] : 'META_MEDIA_VALIDATION_FAILED'))
    .toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 96);
}


async function publishAttachmentState(input: Readonly<{
  attachmentId: string;
  messageId: string;
  conversationId: string;
  state: 'READY' | 'REJECTED' | 'FAILED';
  reasonCode?: string | null;
  now: Date;
}>): Promise<void> {
  await createAndPublishSocialRealtimeEvent({
    type: 'SOCIAL_ATTACHMENT_STATE_CHANGED',
    correlationId: `attachment:${input.attachmentId}`,
    platform: 'instagram',
    occurredAt: input.now,
    orderingKey: input.conversationId,
    conversationId: input.conversationId,
    messageId: input.messageId,
    providerEventKey: input.attachmentId,
    state: input.state,
    reasonCode: input.reasonCode ?? null,
  }).catch((error) => {
    console.error('[meta/realtime] failed to publish attachment state', {
      attachmentId: input.attachmentId,
      state: input.state,
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    });
  });
}

function isPermanentUnsafeMedia(code: string): boolean {
  return code === 'META_MEDIA_MALWARE_DETECTED'
    || PERMANENT_DOWNLOAD_MARKERS.some((marker) => code.includes(marker));
}

export async function processMetaSocialAttachmentValidation(input: Readonly<{
  attachmentId: string;
  validationJobReference: string;
  expectedSourceDigest?: string | null;
  expectedMessageId?: string | null;
  expectedConversationId?: string | null;
  expectedAccountId?: string | null;
  now?: Date;
}>) {
  const now = input.now ?? new Date();
  const record = await claimInstagramAttachmentValidationStorage({
    attachmentId: input.attachmentId,
    validationJobReference: input.validationJobReference,
    expectedSourceDigest: input.expectedSourceDigest,
  });

  if (input.expectedMessageId && record.messageId !== input.expectedMessageId) throw Object.assign(new Error('INSTAGRAM_ATTACHMENT_MESSAGE_SCOPE_MISMATCH'), { permanent: true, retryable: false });
  if (input.expectedConversationId && record.conversationId !== input.expectedConversationId) throw Object.assign(new Error('INSTAGRAM_ATTACHMENT_CONVERSATION_SCOPE_MISMATCH'), { permanent: true, retryable: false });
  if (input.expectedAccountId && record.accountId !== input.expectedAccountId) throw Object.assign(new Error('INSTAGRAM_ATTACHMENT_ACCOUNT_SCOPE_MISMATCH'), { permanent: true, retryable: false });
  if (record.status === 'READY' || record.status === 'REJECTED') {
    return Object.freeze({ ...toInstagramAttachmentSafeProjection(record), deduplicated: true });
  }

  const attachment = Object.freeze({
    attachmentKey: record.id,
    externalId: record.externalId,
    type: ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'].includes(record.type) ? record.type as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' : 'UNKNOWN' as const,
    url: record.sourceUrl,
    mimeType: record.mimeType,
    fileName: record.fileName,
    fileSize: record.fileSize,
    thumbnailUrl: null,
  });
  const config = getMetaBusinessConfig();
  const token = config.pageAccessToken ?? config.accessToken;
  const scanner = createClamAvMetaMediaScanner();
  const store = createMetaPrivateMinioStore();

  try {
    const result = await runMetaSocialAttachmentValidationPipeline({
      attachment,
      accountId: record.accountId,
      now,
      download: () => {
        if (!record.sourceUrl) throw Object.assign(new Error('META_MEDIA_URL_REQUIRED'), { permanent: true, retryable: false });
        if (record.sourceUrlExpiresAt && record.sourceUrlExpiresAt.getTime() <= now.getTime()) {
          throw Object.assign(new Error('META_MEDIA_SOURCE_URL_EXPIRED'), { retryable: true });
        }
        return downloadMetaMedia({
          url: record.sourceUrl,
          authorization: token ? `Bearer ${token}` : undefined,
          maxBytes: META_SOCIAL_ATTACHMENT_MAX_BYTES,
          allowedMimeTypes: ALLOWED_EXACT_MIME_TYPES,
          allowedMimePrefixes: ALLOWED_MIME_PREFIXES,
        });
      },
      storeSecurely: (media, storageKey) => storeMetaMediaSecurely({
        media,
        scanner,
        store,
        storageKey,
        metadata: {
          provider: 'meta',
          channel: 'instagram',
          attachmentId: record.id,
          messageId: record.messageId,
        },
      }),
    });

    if (result.outcome === 'REJECTED') {
      await markInstagramAttachmentRejectedStorage({
        attachmentId: record.id,
        validationJobReference: input.validationJobReference,
        reasonCode: result.decision.reason,
        validatorVersion: META_SOCIAL_ATTACHMENT_VALIDATOR_VERSION,
        contentDigest: result.decision.contentDigest,
        quarantined: result.decision.quarantined,
      });
      await publishAttachmentState({ attachmentId: record.id, messageId: record.messageId, conversationId: record.conversationId, state: 'REJECTED', reasonCode: result.decision.reason, now });
      return Object.freeze({ ...toInstagramAttachmentSafeProjection({ ...record, status: 'REJECTED', failureCode: result.decision.reason, quarantinedAt: result.decision.quarantined ? now : null }), deduplicated: false });
    }

    await markInstagramAttachmentReadyStorage({
      attachmentId: record.id,
      validationJobReference: input.validationJobReference,
      mimeType: result.stored!.mimeType,
      fileSize: result.stored!.size,
      contentDigest: result.stored!.digest,
      storageKey: result.stored!.storageKey,
      reasonCode: result.decision.reason,
      validatorVersion: META_SOCIAL_ATTACHMENT_VALIDATOR_VERSION,
    });
    await publishAttachmentState({ attachmentId: record.id, messageId: record.messageId, conversationId: record.conversationId, state: 'READY', now });
    return Object.freeze({ ...toInstagramAttachmentSafeProjection({ ...record, status: 'READY', contentDigest: result.stored!.digest, mimeType: result.stored!.mimeType, fileSize: result.stored!.size }), deduplicated: false });
  } catch (error) {
    const code = errorCode(error);
    if (isPermanentUnsafeMedia(code)) {
      await markInstagramAttachmentRejectedStorage({
        attachmentId: record.id,
        validationJobReference: input.validationJobReference,
        reasonCode: code === 'META_MEDIA_MALWARE_DETECTED' ? 'MEDIA_SCAN_INFECTED' : code,
        validatorVersion: META_SOCIAL_ATTACHMENT_VALIDATOR_VERSION,
        quarantined: code === 'META_MEDIA_MALWARE_DETECTED',
      });
      await publishAttachmentState({ attachmentId: record.id, messageId: record.messageId, conversationId: record.conversationId, state: 'REJECTED', reasonCode: code === 'META_MEDIA_MALWARE_DETECTED' ? 'MEDIA_SCAN_INFECTED' : code, now });
      return Object.freeze({ ...toInstagramAttachmentSafeProjection({ ...record, status: 'REJECTED', failureCode: code, quarantinedAt: code === 'META_MEDIA_MALWARE_DETECTED' ? now : null }), deduplicated: false });
    }
    await markInstagramAttachmentValidationFailedStorage({
      attachmentId: record.id,
      validationJobReference: input.validationJobReference,
      reasonCode: code,
      validatorVersion: META_SOCIAL_ATTACHMENT_VALIDATOR_VERSION,
    }).catch(() => undefined);
    await publishAttachmentState({ attachmentId: record.id, messageId: record.messageId, conversationId: record.conversationId, state: 'FAILED', reasonCode: code, now });
    throw error;
  }
}
