import {
  projectMetaAdminFailure,
  safeMetaAdminText,
  toMetaAdminIso,
  type MetaAdminReplyEligibility,
} from './contracts.ts';

export const META_FACEBOOK_REPLY_WINDOW_MS = 24 * 60 * 60 * 1_000;

export type AdminInboxAttachmentInput = Readonly<{
  id: unknown;
  type: unknown;
  mimeType?: unknown;
  fileName?: unknown;
  fileSize?: unknown;
  storageUrl?: unknown;
  storageKey?: unknown;
  thumbnailUrl?: unknown;
  status?: unknown;
  metadata?: unknown;
}>;

function inboxAttachmentStatus(input: AdminInboxAttachmentInput): string {
  const metadata = input.metadata && typeof input.metadata === 'object'
    ? input.metadata as Record<string, unknown>
    : null;
  const explicit = safeMetaAdminText(
    input.status ?? metadata?.status ?? metadata?.decision ?? metadata?.policyDecision,
    40,
  )?.toUpperCase();
  if (explicit) return explicit;
  if (input.storageKey || input.storageUrl) return 'READY';
  return 'PENDING';
}

export function projectAdminInboxAttachment(input: AdminInboxAttachmentInput): Readonly<Record<string, unknown>> {
  const status = inboxAttachmentStatus(input);
  const storageUrl = typeof input.storageUrl === 'string' && /^https?:\/\//i.test(input.storageUrl)
    ? input.storageUrl.slice(0, 4_096)
    : null;
  const thumbnailUrl = typeof input.thumbnailUrl === 'string' && /^https?:\/\//i.test(input.thumbnailUrl)
    ? input.thumbnailUrl.slice(0, 4_096)
    : null;
  const fileSize = typeof input.fileSize === 'number' && Number.isSafeInteger(input.fileSize) && input.fileSize >= 0
    ? input.fileSize
    : null;
  return Object.freeze({
    id: String(input.id ?? 'unknown').slice(0, 255),
    type: safeMetaAdminText(input.type, 40)?.toLowerCase() ?? 'file',
    status,
    ...(safeMetaAdminText(input.mimeType, 255) ? { mimeType: safeMetaAdminText(input.mimeType, 255) } : {}),
    ...(safeMetaAdminText(input.fileName, 500) ? { fileName: safeMetaAdminText(input.fileName, 500) } : {}),
    ...(fileSize !== null ? { fileSize } : {}),
    // Only private/validated storage URLs are exposed. Provider source URLs and metadata are intentionally absent.
    ...(status === 'READY' && storageUrl ? { storageUrl } : {}),
    ...(status === 'READY' && thumbnailUrl ? { thumbnailUrl } : {}),
  });
}


export function projectAdminInboxProcessing(input: Readonly<{
  attachments?: readonly Readonly<Record<string, unknown>>[];
}>): Readonly<Record<string, unknown>> {
  const statuses = (input.attachments ?? []).map((attachment) =>
    safeMetaAdminText(attachment.status, 40)?.toUpperCase() ?? 'PENDING'
  );
  const blockedStatus = statuses.find((status) =>
    ['BLOCKED', 'FAILED', 'REJECTED', 'QUARANTINED'].includes(status)
  );
  if (blockedStatus) {
    return Object.freeze({
      status: 'BLOCKED',
      reasonCode: `ATTACHMENT_${blockedStatus}`,
      failure: projectMetaAdminFailure({
        code: `META_ADMIN_INBOX_ATTACHMENT_${blockedStatus}`,
        classification: 'POLICY_BLOCKED',
        safeSummary: 'One or more attachments are unavailable for safe admin display.',
      }),
    });
  }
  if (statuses.some((status) => status !== 'READY')) {
    return Object.freeze({
      status: 'PROCESSING',
      reasonCode: 'ATTACHMENT_VALIDATION_PENDING',
      failure: null,
    });
  }
  return Object.freeze({
    status: 'READY',
    reasonCode: statuses.length > 0 ? 'ATTACHMENTS_READY' : 'MESSAGE_READY',
    failure: null,
  });
}

export function evaluateFacebookAdminReplyEligibility(input: Readonly<{
  lastInboundAt: unknown;
  now?: Date;
}>): MetaAdminReplyEligibility {
  const evaluatedAt = input.now ?? new Date();
  const inboundIso = toMetaAdminIso(input.lastInboundAt);
  if (!inboundIso) {
    return Object.freeze({
      allowed: false,
      policy: 'FACEBOOK_MESSENGER_24H',
      reasonCode: 'LAST_INBOUND_REQUIRED',
      evaluatedAt: evaluatedAt.toISOString(),
      expiresAt: null,
    });
  }
  const expiresAt = new Date(new Date(inboundIso).getTime() + META_FACEBOOK_REPLY_WINDOW_MS);
  const allowed = evaluatedAt.getTime() <= expiresAt.getTime();
  return Object.freeze({
    allowed,
    policy: 'FACEBOOK_MESSENGER_24H',
    reasonCode: allowed ? 'REPLY_WINDOW_OPEN' : 'REPLY_WINDOW_EXPIRED',
    evaluatedAt: evaluatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
}

export function projectAdminInboxMessage(input: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const attachments = Array.isArray(input.attachments)
    ? input.attachments.map((attachment) => projectAdminInboxAttachment((attachment ?? {}) as AdminInboxAttachmentInput))
    : [];
  const processing = projectAdminInboxProcessing({ attachments });
  return Object.freeze({
    id: String(input.id ?? '').slice(0, 255),
    externalId: typeof input.externalId === 'string' ? input.externalId.slice(0, 255) : null,
    platform: safeMetaAdminText(input.platform, 30)?.toLowerCase() ?? 'facebook',
    type: safeMetaAdminText(input.type, 30)?.toLowerCase() ?? 'message',
    conversationId: typeof input.conversationId === 'string' ? input.conversationId.slice(0, 255) : null,
    senderId: typeof input.senderId === 'string' ? input.senderId.slice(0, 255) : null,
    senderName: safeMetaAdminText(input.senderName, 500),
    senderAvatar: null,
    content: typeof input.content === 'string' ? input.content.slice(0, 20_000) : '',
    isRead: input.isRead === true,
    timestamp: toMetaAdminIso(input.timestamp) ?? new Date(0).toISOString(),
    isIncoming: input.isIncoming !== false,
    attachments,
    processing,
    failure: processing.failure ?? null,
  });
}
