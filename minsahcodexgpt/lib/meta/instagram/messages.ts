/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { buildInstagramMessageIdempotencyKey } from '@/lib/jobs/idempotency';
import { META_QUEUE_NAMES } from '@/lib/jobs/job-types';
import { classifyMetaProviderError } from '@/lib/jobs/retry-policy';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import {
  claimMetaSocialWebhookReceipt,
  createOrGetMetaSocialWebhookReceipt,
  findMetaSocialWebhookReceiptByLegacyReceipt,
  linkMetaSocialWebhookLegacyReceipt,
  markMetaSocialWebhookReceiptBlocked,
  markMetaSocialWebhookReceiptFailed,
  markMetaSocialWebhookReceiptProcessed,
  markMetaSocialWebhookReceiptQueued,
  requeueFailedMetaSocialWebhookReceipt,
} from '@/lib/meta-platform/repositories/prisma-webhook-receipts';
import {
  resolveMetaPlatformEnvironment,
  resolveMetaSocialConnectionKey,
} from '@/lib/meta-platform/repositories/webhook-receipts';
import { MetaProviderIdentityError } from '@/lib/meta-platform/repositories/provider-identities';
import { persistInstagramWebhookProviderIdentity } from '@/lib/meta-platform/repositories/webhook-provider-identities';
import {
  createOrGetInstagramReplyAttemptStorage,
  markInstagramReplyFailedStorage,
  markInstagramReplySendingStorage,
  markInstagramReplySentStorage,
  markInstagramReplyUnknownOutcomeStorage,
  persistInstagramAttachmentPolicyStorage,
  persistInstagramInboundMessageStorage,
  reserveInstagramPrivateReplyStorage,
  stageInstagramReplyMessageStorage,
  loadInstagramReplyExecutionStorage,
  markInstagramReplyRetryableStorage,
  markInstagramReplyBlockedStorage,
} from '@/lib/meta-platform/repositories/prisma-instagram-persistence';
import { digestInstagramAttachmentUrl } from '@/lib/meta-platform/repositories/instagram-attachments';
import { isInstagramWriteOutcomeUnknown } from '@/lib/meta-platform/repositories/instagram-outbound';
import {
  classifyMetaInstagramOutboundFailure,
  enqueueMetaInstagramOutboundJob,
  type MetaInstagramOutboundMode,
} from '@/lib/meta-platform/queue/instagram-outbound-job';
import { createDefaultMetaSocialQueueAdapter } from '@/lib/meta-platform/server';
import { createMetaGraphClient } from '@/lib/meta/connection/client';
import { getLatestMetaConnectionReadiness } from '@/lib/meta/connection/repository';
import { redactMetaAdminData } from '@/lib/meta/admin/redaction';
import { incrementMetaCounter } from '@/lib/observability/metrics';
import { openOrRefreshMetaIncident } from '@/lib/observability/incidents';
import { validateInstagramAttachment } from './attachments';
import { fetchInstagramParticipantProfile } from './profiles';
import { evaluateInstagramReplyPolicy, hasInstagramMessagingPermission, INSTAGRAM_PRIVATE_REPLY_WINDOW_MS, INSTAGRAM_STANDARD_REPLY_WINDOW_MS } from './policy';
import {
  createMetaInstagramInboundRealtimeEvent,
  type MetaInstagramInboundRealtimeEvent,
} from '@/lib/meta-platform/queue/instagram-inbound-event';
import {
  createMetaInstagramOutboundRealtimeEvent,
  type MetaInstagramOutboundRealtimeState,
} from '@/lib/meta-platform/queue/instagram-outbound-event';
import {
  publishMetaInstagramInboundRealtimeEvent,
  publishMetaInstagramOutboundRealtimeEvent,
} from './realtime';
import type { NormalizedInstagramEvent } from './types';
import { planInstagramInboundSideEffects } from '@/lib/meta-platform/domains/instagram/conversations';
import {
  assertInstagramReplyWriteEnabledAtExecution,
  decideInstagramReplyExecutionAction,
  normalizeInstagramReplyIdempotencyKey,
  normalizeInstagramReplyText,
} from '@/lib/meta-platform/domains/instagram/send-reply';
import {
  captureInstagramPrivateReplyProviderResponse,
  evaluateInstagramPrivateReplyPolicy,
  resolveInstagramPrivateReplySurface,
} from '@/lib/meta-platform/domains/instagram/private-reply';

type Db = {
  metaInstagramWebhookReceipt: {
    findUnique(args: any): Promise<any | null>; findMany(args: any): Promise<any[]>; create(args: any): Promise<any>; upsert(args: any): Promise<any>; update(args: any): Promise<any>; updateMany(args: any): Promise<{ count: number }>;
    deleteMany(args: any): Promise<{ count: number }>;
  };
  metaConversation: {
    upsert(args: any): Promise<any>; findUnique(args: any): Promise<any | null>; update(args: any): Promise<any>; deleteMany(args: any): Promise<{ count: number }>;
  };
  metaMessage: { upsert(args: any): Promise<any>; create(args: any): Promise<any>; findUnique(args: any): Promise<any | null> };
  metaMessageAttachment: { upsert(args: any): Promise<any> };
  metaInstagramReplyAttempt: { findUnique(args: any): Promise<any | null>; create(args: any): Promise<any>; update(args: any): Promise<any> };
};
const db = prisma as unknown as Db;

export type MetaInstagramAttachmentValidationScheduleInput = Readonly<{
  attachmentId: string;
  messageId: string;
  conversationId: string;
  accountId: string;
  correlationId: string;
  sourceDigest: string | null;
}>;

export type MetaInstagramAttachmentValidationScheduleResult = Readonly<{
  accepted: boolean;
  jobReference?: string;
  code?: string;
}>;

export type MetaInstagramWebhookProcessingOptions = Readonly<{
  expectedProviderMessageId?: string;
  expectedAccountId?: string;
  now?: Date;
  scheduleAttachmentValidation: (
    input: MetaInstagramAttachmentValidationScheduleInput,
  ) => Promise<MetaInstagramAttachmentValidationScheduleResult>;
  emitRealtimeEvent?: (event: MetaInstagramInboundRealtimeEvent) => Promise<void>;
  observeNormalizedEvent?: (event: NormalizedInstagramEvent) => void;
  allowMediaDownloads?: boolean;
  mediaDownloadBlockReason?: string;
}>;

function retentionDate(now = new Date()) {
  const days = Math.max(7, Math.min(Number(process.env.META_INSTAGRAM_RETENTION_DAYS ?? 180), 730));
  return new Date(now.getTime() + days * 86_400_000);
}
function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function allowedAccountIds() {
  const config = getMetaBusinessConfig();
  return new Set([config.instagramActorId, config.pageId].filter((item): item is string => Boolean(item)));
}
function assertNormalizedEvent(value: unknown): asserts value is NormalizedInstagramEvent {
  const row = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  for (const key of ['eventKey', 'eventType', 'accountId', 'senderId', 'conversationKey', 'platformMessageId', 'direction', 'messageType', 'sentAt', 'correlationId', 'payloadDigest']) {
    if (typeof row[key] !== 'string' || !String(row[key]).trim()) throw new Error(`INSTAGRAM_EVENT_${key.toUpperCase()}_INVALID`);
  }
  if (!Array.isArray(row.attachments)) throw new Error('INSTAGRAM_EVENT_ATTACHMENTS_INVALID');
}

export async function persistInstagramWebhookReceipt(event: NormalizedInstagramEvent, signatureOk: boolean) {
  const environment = resolveMetaPlatformEnvironment();
  const connectionKey = resolveMetaSocialConnectionKey();
  const canonical = await createOrGetMetaSocialWebhookReceipt({
    platform: 'INSTAGRAM',
    environment,
    connectionKey,
    providerDeliveryId: event.platformMessageId,
    providerEventKey: event.eventKey,
    payloadDigest: event.payloadDigest,
    correlationId: event.correlationId,
    initialState: signatureOk ? 'RECEIVED' : 'BLOCKED',
    safeMetadata: {
      objectType: event.objectType,
      eventType: event.eventType,
      eventKind: event.eventType,
      routingTarget: 'INSTAGRAM',
      accountId: event.accountId,
      senderId: event.senderId,
      conversationKey: event.conversationKey,
      platformMessageId: event.platformMessageId,
      providerTimestamp: event.sentAt,
      signatureOk,
    },
  });

  let identityBlockedCode: string | null = null;
  if (signatureOk) {
    const config = getMetaBusinessConfig();
    try {
      await persistInstagramWebhookProviderIdentity({
        receiptId: canonical.receipt.id,
        environment,
        connectionKey,
        eventAccountId: event.accountId,
        configuredInstagramAccountId: config.instagramActorId,
        configuredPageId: config.pageId,
      });
    } catch (error) {
      if (!(error instanceof MetaProviderIdentityError)) throw error;
      identityBlockedCode = error.code;
      await markMetaSocialWebhookReceiptBlocked({
        receiptId: canonical.receipt.id,
        reasonCode: error.code,
        actor: 'instagram-identity-resolver',
      }).catch(() => undefined);
    }
  }

  const effectiveSignatureOk = signatureOk && !identityBlockedCode;
  const existing = await db.metaInstagramWebhookReceipt.findUnique({ where: { eventKey: event.eventKey } });
  if (existing) {
    const canonicalReceipt = await linkMetaSocialWebhookLegacyReceipt({
      receiptId: canonical.receipt.id,
      legacyReceiptType: 'MetaInstagramWebhookReceipt',
      legacyReceiptId: existing.id,
    });
    return { receipt: existing, created: false, canonicalReceipt, identityBlockedCode } as const;
  }

  const now = new Date();
  try {
    const receipt = await db.metaInstagramWebhookReceipt.create({
      data: {
        eventKey: event.eventKey, eventType: event.eventType, objectType: event.objectType, accountId: event.accountId,
        senderId: event.senderId, conversationKey: event.conversationKey, platformMessageId: event.platformMessageId,
        signatureOk: effectiveSignatureOk, payloadDigest: event.payloadDigest, normalizedEvent: event as never, correlationId: event.correlationId,
        status: effectiveSignatureOk ? 'VERIFIED' : 'FAILED', verifiedAt: effectiveSignatureOk ? now : null, retentionUntil: retentionDate(now),
        errorData: effectiveSignatureOk ? null : { code: identityBlockedCode ?? 'WEBHOOK_SIGNATURE_INVALID' },
      },
    });
    const canonicalReceipt = await linkMetaSocialWebhookLegacyReceipt({
      receiptId: canonical.receipt.id,
      legacyReceiptType: 'MetaInstagramWebhookReceipt',
      legacyReceiptId: receipt.id,
    });
    return { receipt, created: true, canonicalReceipt, identityBlockedCode } as const;
  } catch (error) {
    const raced = await db.metaInstagramWebhookReceipt.findUnique({ where: { eventKey: event.eventKey } });
    if (raced) {
      const canonicalReceipt = await linkMetaSocialWebhookLegacyReceipt({
        receiptId: canonical.receipt.id,
        legacyReceiptType: 'MetaInstagramWebhookReceipt',
        legacyReceiptId: raced.id,
      });
      return { receipt: raced, created: false, canonicalReceipt, identityBlockedCode } as const;
    }
    throw error;
  }
}

async function persistAttachment(
  message: any,
  event: NormalizedInstagramEvent,
  attachment: NormalizedInstagramEvent['attachments'][number],
  index: number,
  options: MetaInstagramWebhookProcessingOptions,
) {
  const validation = validateInstagramAttachment(attachment);
  const queueable = validation.valid && Boolean(attachment.url);
  const validationFailure = validation.issues[0] ?? (attachment.url ? null : 'ATTACHMENT_URL_MISSING');
  const externalId = attachment.externalId || `${message.platformId}:${index}`;
  const sourceDigest = digestInstagramAttachmentUrl(attachment.url);
  const initial = await db.metaMessageAttachment.upsert({
    where: { messageId_externalId: { messageId: message.id, externalId } },
    create: {
      messageId: message.id,
      externalId,
      type: attachment.type,
      status: queueable ? 'PENDING' : 'REJECTED',
      mimeType: attachment.mimeType ?? null,
      fileName: attachment.fileName ?? null,
      fileSize: attachment.fileSize ?? null,
      sourceUrl: attachment.url ?? null,
      thumbnailUrl: attachment.thumbnailUrl ?? null,
      failureCode: validationFailure,
    },
    update: {
      type: attachment.type,
      mimeType: attachment.mimeType ?? null,
      fileName: attachment.fileName ?? null,
      fileSize: attachment.fileSize ?? null,
      sourceUrl: attachment.url ?? null,
      thumbnailUrl: attachment.thumbnailUrl ?? null,
      status: queueable ? 'PENDING' : 'REJECTED',
      failureCode: validationFailure,
    },
  });
  await persistInstagramAttachmentPolicyStorage({
    attachmentId: initial.id,
    sourceUrl: attachment.url,
    decision: queueable ? 'PENDING' : 'REJECTED',
    reasonCode: validationFailure,
  });
  if (!queueable || !attachment.url) {
    return { attachment: initial, scheduled: false, rejected: true, blocked: false } as const;
  }
  if (options.allowMediaDownloads === false) {
    await persistInstagramAttachmentPolicyStorage({
      attachmentId: initial.id,
      sourceUrl: attachment.url,
      decision: 'PENDING',
      reasonCode: options.mediaDownloadBlockReason ?? 'META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS_DISABLED',
    });
    return { attachment: initial, scheduled: false, rejected: false, blocked: true } as const;
  }

  const scheduled = await options.scheduleAttachmentValidation({
    attachmentId: initial.id,
    messageId: message.id,
    conversationId: message.conversationId,
    accountId: event.accountId,
    correlationId: event.correlationId,
    sourceDigest,
  });
  if (!scheduled.accepted || !scheduled.jobReference) {
    const error = new Error(scheduled.code ?? 'INSTAGRAM_ATTACHMENT_VALIDATION_QUEUE_FAILED');
    Object.assign(error, {
      code: scheduled.code ?? 'INSTAGRAM_ATTACHMENT_VALIDATION_QUEUE_FAILED',
      retryable: true,
    });
    throw error;
  }
  await persistInstagramAttachmentPolicyStorage({
    attachmentId: initial.id,
    sourceUrl: attachment.url,
    validationJobReference: scheduled.jobReference,
    decision: 'PENDING',
  });
  return { attachment: initial, scheduled: true, rejected: false, blocked: false } as const;
}

export async function processInstagramWebhookReceipt(
  receiptId: string,
  options: MetaInstagramWebhookProcessingOptions,
) {
  const receipt = await db.metaInstagramWebhookReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt) throw new Error('INSTAGRAM_WEBHOOK_RECEIPT_NOT_FOUND');
  if (options.expectedProviderMessageId && receipt.platformMessageId !== options.expectedProviderMessageId) {
    throw Object.assign(new Error('INSTAGRAM_INBOUND_PROVIDER_MESSAGE_MISMATCH'), {
      code: 'INSTAGRAM_INBOUND_PROVIDER_MESSAGE_MISMATCH',
      permanent: true,
    });
  }
  if (options.expectedAccountId && receipt.accountId !== options.expectedAccountId) {
    throw Object.assign(new Error('INSTAGRAM_INBOUND_ACCOUNT_SCOPE_MISMATCH'), {
      code: 'INSTAGRAM_INBOUND_ACCOUNT_SCOPE_MISMATCH',
      permanent: true,
    });
  }
  const lifecycleNow = options.now ?? new Date();
  let canonical = await findMetaSocialWebhookReceiptByLegacyReceipt({
    legacyReceiptType: 'MetaInstagramWebhookReceipt',
    legacyReceiptId: receipt.id,
  });
  if (!canonical) throw new Error('META_SOCIAL_WEBHOOK_RECEIPT_NOT_FOUND');
  if (canonical.state === 'PROCESSED') return { deduplicated: true, status: 'PROCESSED' as const };
  const queueReference = buildInstagramMessageIdempotencyKey(receipt.id, receipt.eventKey);
  if (canonical.state === 'RECEIVED') {
    const queued = await markMetaSocialWebhookReceiptQueued({
      receiptId: canonical.id,
      queueName: META_QUEUE_NAMES.INSTAGRAM,
      jobReference: queueReference,
      actor: 'meta-instagram-worker-recovery',
      now: lifecycleNow,
    });
    if (!queued.ok) throw new Error(String(queued.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_QUEUE_TRANSITION_FAILED'));
    canonical = queued.value.receipt;
  } else if (canonical.state === 'FAILED') {
    const requeued = await requeueFailedMetaSocialWebhookReceipt({
      receiptId: canonical.id,
      queueName: META_QUEUE_NAMES.INSTAGRAM,
      jobReference: queueReference,
      actor: 'meta-instagram-worker-retry',
      now: lifecycleNow,
    });
    if (!requeued.ok) throw new Error(String(requeued.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_REQUEUE_FAILED'));
    canonical = requeued.value;
  }
  if (canonical.state === 'BLOCKED' || canonical.state === 'DEAD_LETTERED') {
    throw new Error(`META_SOCIAL_WEBHOOK_RECEIPT_TERMINAL:${canonical.state}`);
  }
  const leaseOwner = `meta-instagram-worker:${process.pid}`;
  const canonicalClaim = await claimMetaSocialWebhookReceipt({
    receiptId: canonical.id,
    leaseOwner,
    now: lifecycleNow,
  });
  if (!canonicalClaim.ok) throw new Error(String(canonicalClaim.error.safeDetails?.sourceCode ?? 'META_SOCIAL_WEBHOOK_RECEIPT_NOT_CLAIMABLE'));
  const canonicalLease = canonicalClaim.value.leaseToken;

  if (receipt.status === 'PROCESSED' || receipt.status === 'IGNORED') {
    const synchronized = await markMetaSocialWebhookReceiptProcessed({
      receiptId: canonical.id,
      leaseToken: canonicalLease,
      actor: leaseOwner,
      now: lifecycleNow,
    });
    if (!synchronized.ok) throw new Error(String(synchronized.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_COMPLETION_FAILED'));
    return { deduplicated: true, status: receipt.status };
  }

  const claimed = await db.metaInstagramWebhookReceipt.updateMany({
    where: { id: receipt.id, status: { in: ['VERIFIED', 'QUEUED', 'FAILED'] } },
    data: { status: 'PROCESSING', processingAt: lifecycleNow, attemptCount: { increment: 1 }, errorData: null },
  });
  if (claimed.count !== 1) {
    await markMetaSocialWebhookReceiptFailed({
      receiptId: canonical.id,
      leaseToken: canonicalLease,
      failureCode: 'LEGACY_RECEIPT_NOT_CLAIMED',
      failureCategory: 'CONFLICT',
      failureSummary: 'Legacy Instagram receipt was not claimable after canonical claim.',
      nextRetryAt: lifecycleNow,
      actor: leaseOwner,
      now: lifecycleNow,
    });
    throw new Error('INSTAGRAM_LEGACY_RECEIPT_NOT_CLAIMED');
  }
  try {
    const event = receipt.normalizedEvent as unknown;
    assertNormalizedEvent(event);
    options.observeNormalizedEvent?.(event);
    if (options.expectedProviderMessageId && event.platformMessageId !== options.expectedProviderMessageId) {
      throw Object.assign(new Error('INSTAGRAM_INBOUND_PROVIDER_MESSAGE_MISMATCH'), {
        code: 'INSTAGRAM_INBOUND_PROVIDER_MESSAGE_MISMATCH',
        permanent: true,
      });
    }
    if (options.expectedAccountId && event.accountId !== options.expectedAccountId) {
      throw Object.assign(new Error('INSTAGRAM_INBOUND_ACCOUNT_SCOPE_MISMATCH'), {
        code: 'INSTAGRAM_INBOUND_ACCOUNT_SCOPE_MISMATCH',
        permanent: true,
      });
    }
    if (allowedAccountIds().size > 0 && !allowedAccountIds().has(event.accountId)) {
      await db.metaInstagramWebhookReceipt.update({ where: { id: receipt.id }, data: { status: 'IGNORED', processedAt: new Date(), errorData: { code: 'INSTAGRAM_ACCOUNT_MISMATCH' } } });
      const canonicalProcessed = await markMetaSocialWebhookReceiptProcessed({
        receiptId: canonical.id,
        leaseToken: canonicalLease,
        actor: leaseOwner,
      });
      if (!canonicalProcessed.ok) throw new Error(String(canonicalProcessed.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_COMPLETION_FAILED'));
      incrementMetaCounter('meta_instagram_messages_total', { direction: event.direction.toLowerCase(), outcome: 'account_mismatch' });
      return { ignored: true, code: 'INSTAGRAM_ACCOUNT_MISMATCH' };
    }
    const sentAt = new Date(event.sentAt);
    if (Number.isNaN(sentAt.getTime())) throw new Error('INSTAGRAM_EVENT_TIMESTAMP_INVALID');
    const participantId = event.direction === 'INBOUND' ? event.senderId : event.recipientId;
    const persisted = await persistInstagramInboundMessageStorage({
      canonicalReceiptId: canonical.id,
      accountId: event.accountId,
      providerConversationKey: event.conversationKey,
      providerMessageId: event.platformMessageId,
      providerParticipantId: participantId,
      participantUsername: event.participantUsername ?? null,
      participantName: event.participantName ?? null,
      direction: event.direction,
      messageType: event.messageType,
      text: event.text,
      occurredAt: sentAt,
      payloadDigest: event.payloadDigest,
      replyToProviderMessageId: event.replyToMessageId ?? null,
      storyMediaId: event.storyMediaId ?? null,
      commentId: event.commentId ?? null,
      postId: event.postId ?? null,
      correlationId: event.correlationId,
      conversationKind: event.eventType === 'COMMENT' ? 'COMMENT_THREAD' : event.messageType === 'STORY_REPLY' ? 'STORY_THREAD' : 'DIRECT',
      replyWindowMs: INSTAGRAM_STANDARD_REPLY_WINDOW_MS,
      privateReplyWindowMs: INSTAGRAM_PRIVATE_REPLY_WINDOW_MS,
    });
    const conversation = persisted.conversation as any;
    const message = persisted.message as any;
    const sideEffects = planInstagramInboundSideEffects({
      messageCreated: Boolean(persisted.created),
      direction: event.direction,
      participantProfileMissing: !event.participantUsername,
      attachmentCount: event.attachments.length,
    });
    const attachmentResults = [];
    if (sideEffects.scheduleAttachments) {
      for (const [index, attachment] of event.attachments.entries()) {
        attachmentResults.push(await persistAttachment(message, event, attachment, index, options));
      }
    }
    if (sideEffects.refreshParticipantProfile) {
      const profile = await fetchInstagramParticipantProfile(participantId).catch(() => null);
      if (profile) await db.metaConversation.update({ where: { id: conversation.id }, data: {
        participantUsername: profile.username, participantName: profile.name, participantAvatarUrl: profile.avatarUrl,
      } });
    }
    const realtimeEvent = sideEffects.emitRealtime ? createMetaInstagramInboundRealtimeEvent({
      receiptId: canonical.id,
      conversationId: conversation.id,
      messageId: message.id,
      correlationId: event.correlationId,
      providerMessageId: event.platformMessageId,
      direction: event.direction,
      messageType: event.messageType,
      occurredAt: sentAt,
      emittedAt: lifecycleNow,
      deduplicated: false,
      outOfOrder: Boolean(!persisted.orderingAdvanced),
    }) : null;
    if (realtimeEvent) await (options.emitRealtimeEvent ?? publishMetaInstagramInboundRealtimeEvent)(realtimeEvent);
    await db.metaInstagramWebhookReceipt.update({ where: { id: receipt.id }, data: { status: 'PROCESSED', processedAt: lifecycleNow, errorData: null } });
    const canonicalProcessed = await markMetaSocialWebhookReceiptProcessed({
      receiptId: canonical.id,
      leaseToken: canonicalLease,
      actor: leaseOwner,
    });
    if (!canonicalProcessed.ok) throw new Error(String(canonicalProcessed.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_COMPLETION_FAILED'));
    incrementMetaCounter('meta_instagram_messages_total', { direction: event.direction.toLowerCase(), outcome: 'processed' });
    return {
      deduplicated: !persisted.created,
      conversationId: conversation.id,
      messageId: message.id,
      correlationId: event.correlationId,
      digestMatches: persisted.digestMatches,
      outOfOrder: Boolean(persisted.created && !persisted.orderingAdvanced),
      scheduledAttachmentCount: attachmentResults.filter((item) => item.scheduled).length,
      rejectedAttachmentCount: attachmentResults.filter((item) => item.rejected).length,
      blockedAttachmentCount: attachmentResults.filter((item) => item.blocked).length,
      ...(realtimeEvent ? { realtimeEventId: realtimeEvent.eventId } : {}),
    };
  } catch (error) {
    const safe = redactMetaAdminData(error instanceof Error ? { name: error.name, message: error.message } : error);
    const message = error instanceof Error ? error.message : 'Instagram receipt processing failed.';
    const failureCodeCandidate = message.split(':')[0]!.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 80);
    await markMetaSocialWebhookReceiptFailed({
      receiptId: canonical.id,
      leaseToken: canonicalLease,
      failureCode: /^[A-Z][A-Z0-9_]{2,79}$/.test(failureCodeCandidate) ? failureCodeCandidate : 'INSTAGRAM_PROCESSING_FAILED',
      failureCategory: 'RETRYABLE',
      failureSummary: message,
      nextRetryAt: new Date(),
      actor: leaseOwner,
    }).catch(() => undefined);
    await db.metaInstagramWebhookReceipt.update({ where: { id: receipt.id }, data: { status: 'FAILED', errorData: safe } }).catch(() => undefined);
    await openOrRefreshMetaIncident({
      incidentType: 'INSTAGRAM_WEBHOOK_FAILURE', severity: 'ERROR', resourceType: 'META_INSTAGRAM_WEBHOOK', resourceId: receipt.id,
      summary: 'Instagram webhook processing failed.', details: safe, correlationId: receipt.correlationId,
      runbookUrl: '/admin/meta/instagram', timeWindowMinutes: 60, cooldownMinutes: 15,
    }).catch(() => undefined);
    incrementMetaCounter('meta_instagram_messages_total', { direction: 'unknown', outcome: 'failed' });
    throw error;
  }
}

async function sendProviderReply(input: { accountId: string; participantId: string; text: string; mode: 'MESSAGE' | 'PRIVATE_REPLY'; commentId?: string | null }) {
  const config = getMetaBusinessConfig();
  const token = config.pageAccessToken ?? config.accessToken;
  if (!token) throw new Error('META_INSTAGRAM_ACCESS_TOKEN_REQUIRED');
  const path = input.mode === 'PRIVATE_REPLY'
    ? `/${input.commentId}/private_replies`
    : (process.env.META_INSTAGRAM_SEND_PATH?.trim() || `/${input.accountId}/messages`);
  if (input.mode === 'PRIVATE_REPLY' && !input.commentId) throw new Error('INSTAGRAM_COMMENT_ID_REQUIRED');
  const body = input.mode === 'PRIVATE_REPLY'
    ? { message: input.text }
    : { recipient: { id: input.participantId }, message: { text: input.text } };
  const client = createMetaGraphClient({
    accessToken: token,
    appSecret: config.appSecret,
    graphApiVersion: config.graphApiVersion,
  });
  try {
    return await client.post<Record<string, unknown>>(path, body, {}, token);
  } catch (error) {
    const providerError = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
    const wrapped = new Error('INSTAGRAM_PROVIDER_REPLY_FAILED');
    Object.assign(wrapped, {
      safeProvider: redactMetaAdminData(error),
      unknownOutcome: isInstagramWriteOutcomeUnknown(error),
      status: providerError.status ?? providerError.statusCode ?? providerError.providerStatus,
      code: providerError.code ?? providerError.errorCode,
      retryAfterMs: providerError.retryAfterMs,
      retryAfterSeconds: providerError.retryAfterSeconds,
      retryable: providerError.retryable,
    });
    throw wrapped;
  }
}

export function assertInstagramOutboundWriteEnabled(
  mode: MetaInstagramOutboundMode,
  env: Readonly<Record<string, string | undefined>> = process.env,
): void {
  assertInstagramReplyWriteEnabledAtExecution(mode, env);
}

function metaSocialEnvironment(value: unknown): 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' | undefined {
  return value === 'DEVELOPMENT' || value === 'STAGING' || value === 'PRODUCTION' ? value : undefined;
}

async function publishInstagramOutboundState(input: {
  attemptId: string;
  conversationId: string;
  messageId: string;
  correlationId: string;
  mode: MetaInstagramOutboundMode;
  state: MetaInstagramOutboundRealtimeState;
  providerMessageId?: string | null;
  reasonCode?: string | null;
  occurredAt: Date;
}): Promise<void> {
  const event = createMetaInstagramOutboundRealtimeEvent(input);
  await publishMetaInstagramOutboundRealtimeEvent(event);
}

export async function sendInstagramReply(input: {
  conversationId: string;
  actorId: string;
  text: string;
  idempotencyKey: string;
  mode?: 'MESSAGE' | 'PRIVATE_REPLY';
  sourceMessageId?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const cleanText = normalizeInstagramReplyText(input.text);
  const normalizedIdempotencyKey = normalizeInstagramReplyIdempotencyKey(input.idempotencyKey);
  const conversation = await db.metaConversation.findUnique({
    where: { id: input.conversationId },
    include: { messages: { orderBy: [{ providerOccurredAt: 'desc' }, { sentAt: 'desc' }], take: 20 } },
  });
  if (!conversation) throw new Error('INSTAGRAM_CONVERSATION_NOT_FOUND');
  const source = input.sourceMessageId
    ? conversation.messages.find((item: any) => item.id === input.sourceMessageId)
    : conversation.messages.find((item: any) => item.direction === 'INBOUND');
  const mode = input.mode ?? (source?.messageType === 'COMMENT_PRIVATE_REPLY' ? 'PRIVATE_REPLY' : 'MESSAGE');
  const readiness = await getLatestMetaConnectionReadiness();
  const permissionGranted = hasInstagramMessagingPermission(readiness?.permissions);
  const configured = allowedAccountIds();
  const policyData = conversation.policyData && typeof conversation.policyData === 'object' ? conversation.policyData as Record<string, unknown> : {};
  const legacyPrivateReplyExpiresAt = typeof policyData.privateReplyExpiresAt === 'string' ? new Date(policyData.privateReplyExpiresAt) : null;
  const privateReplyExpiresAt = source?.privateReplyExpiresAt ?? legacyPrivateReplyExpiresAt;
  const basePolicy = evaluateInstagramReplyPolicy({
    now, accountMatches: configured.size === 0 || configured.has(conversation.accountId), permissionGranted,
    conversationStatus: conversation.status, lastInboundAt: conversation.lastInboundAt,
    replyWindowExpiresAt: conversation.replyWindowExpiresAt, mode,
    privateReplyExpiresAt, privateReplySentAt: conversation.privateReplySentAt,
  });
  const privateSurface = resolveInstagramPrivateReplySurface(policyData);
  const privatePolicy = mode === 'PRIVATE_REPLY' ? evaluateInstagramPrivateReplyPolicy({
    now,
    conversationId: conversation.id,
    conversationAccountIdentityReferenceId: conversation.accountIdentityReferenceId,
    sourceMessageId: source?.id,
    sourceConversationId: source?.conversationId,
    sourceAccountIdentityReferenceId: source?.accountIdentityReferenceId,
    sourceCommentId: source?.commentId,
    sourcePostId: source?.postId,
    sourceOccurredAt: source?.providerOccurredAt ?? source?.sentAt,
    storedExpiresAt: privateReplyExpiresAt,
    privateReplySentAt: conversation.privateReplySentAt,
    surface: privateSurface.surface,
    liveBroadcastActive: privateSurface.liveBroadcastActive,
  }) : null;
  const policy = basePolicy.eligible && privatePolicy && !privatePolicy.eligible
    ? { eligible: false, code: privatePolicy.persistenceEligibility, expiresAt: privatePolicy.expiresAt }
    : basePolicy;
  const correlationId = conversation.correlationId || `ig-reply:${randomUUID()}`;
  const textHash = hash(cleanText);
  const payloadHash = hash(JSON.stringify({
    accountIdentityReferenceId: conversation.accountIdentityReferenceId,
    conversationId: conversation.id, participantId: conversation.participantId,
    mode, sourceMessageId: source?.id ?? null, sourceCommentId: source?.commentId ?? null, textHash,
  }));
  assertInstagramOutboundWriteEnabled(mode);
  const stored = await createOrGetInstagramReplyAttemptStorage({
    conversationId: conversation.id, sourceMessageId: source?.id ?? null, actorId: input.actorId,
    mode, idempotencyKey: normalizedIdempotencyKey, textHash, payloadHash,
    eligibility: policy.code, correlationId, now,
  });
  const attempt = stored.attempt as any;
  if (!stored.created && (
    attempt.providerStatus === 'SENT'
    || attempt.providerStatus === 'FAILED'
    || attempt.providerStatus === 'UNKNOWN_OUTCOME'
    || attempt.reconciliationStatus === 'REQUIRED'
    || attempt.status === 'BLOCKED'
    || attempt.status === 'FAILED'
    || attempt.status === 'SENT'
  )) {
    return { deduplicated: true, queued: false, attempt };
  }
  if (!policy.eligible) {
    if (!stored.created && ['PENDING', 'SENDING'].includes(String(attempt.providerStatus))) {
      await markInstagramReplyBlockedStorage({
        attemptId: attempt.id,
        failureCode: policy.code,
        failureSummary: `Idempotent retry is no longer eligible for delivery: ${policy.code}.`,
        now,
      }).catch(() => undefined);
    }
    incrementMetaCounter('meta_instagram_replies_total', { mode: mode.toLowerCase(), outcome: policy.code.toLowerCase() });
    const error = new Error(`INSTAGRAM_REPLY_BLOCKED:${policy.code}`); Object.assign(error, { status: 409, code: policy.code, attemptId: attempt.id }); throw error;
  }
  let reservation: any = null;
  if (mode === 'PRIVATE_REPLY') {
    if (!privatePolicy?.eligible || !source?.id || !source.commentId || !privatePolicy.expiresAt) {
      throw Object.assign(new Error(privatePolicy?.code ?? 'INSTAGRAM_PRIVATE_REPLY_SOURCE_REQUIRED'), { retryable: false });
    }
    reservation = await reserveInstagramPrivateReplyStorage({
      attemptId: attempt.id, conversationId: conversation.id, sourceMessageId: source.id,
      sourceCommentId: source.commentId, expiresAt: privatePolicy.expiresAt, now,
    });
  }
  const pendingMessage = await stageInstagramReplyMessageStorage({ attemptId: attempt.id, text: cleanText, now });
  const adapter = await createDefaultMetaSocialQueueAdapter();
  const queued = await enqueueMetaInstagramOutboundJob({
    adapter,
    attemptId: attempt.id,
    mode,
    conversationId: conversation.id,
    accountId: conversation.accountId,
    messageId: (pendingMessage as any).id,
    commentId: source?.commentId ?? null,
    correlationId,
    environment: metaSocialEnvironment(attempt.environment),
    connectionKey: attempt.connectionKey,
  });
  if (!queued.result.accepted) {
    await markInstagramReplyRetryableStorage({
      attemptId: attempt.id,
      failureCode: queued.result.code,
      failureSummary: 'Instagram outbound request is durable but queue transport is unavailable.',
      now,
    }).catch(() => undefined);
    throw Object.assign(new Error(queued.result.code), { code: queued.result.code, retryAt: 'retryAt' in queued.result ? queued.result.retryAt : undefined, retryable: true });
  }
  await publishInstagramOutboundState({
    attemptId: attempt.id,
    conversationId: conversation.id,
    messageId: (pendingMessage as any).id,
    correlationId,
    mode,
    state: 'QUEUED',
    occurredAt: now,
  }).catch(() => undefined);
  incrementMetaCounter('meta_instagram_replies_total', { mode: mode.toLowerCase(), outcome: queued.result.deduplicated ? 'deduplicated' : 'queued' });
  return {
    deduplicated: !stored.created || queued.result.deduplicated,
    queued: true,
    attempt,
    reservation,
    messageId: (pendingMessage as any).id,
    jobReference: queued.envelope.dedupeKey,
  };
}

export async function executeInstagramReplyAttempt(input: {
  attemptId: string;
  mode: MetaInstagramOutboundMode;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const row = await loadInstagramReplyExecutionStorage(input.attemptId) as any;
  if (row.mode !== input.mode) throw Object.assign(new Error('INSTAGRAM_OUTBOUND_MODE_MISMATCH'), { retryable: false });
  if (row.providerStatus === 'SENDING') {
    await markInstagramReplyUnknownOutcomeStorage({
      attemptId: row.id,
      failureCode: 'INSTAGRAM_WORKER_CRASH_AFTER_WRITE_POSSIBLE',
      failureSummary: 'A previous worker stopped while the provider write was in progress; reconciliation is required before any retry.',
      now,
    }).catch(() => undefined);
    throw Object.assign(new Error('INSTAGRAM_OUTBOUND_RECONCILIATION_REQUIRED'), {
      code: 'INSTAGRAM_WORKER_CRASH_AFTER_WRITE_POSSIBLE',
      unknownOutcome: true,
      retryable: false,
    });
  }
  const executionAction = decideInstagramReplyExecutionAction({
    providerStatus: row.providerStatus,
    reconciliationStatus: row.reconciliationStatus,
    providerMessageId: row.providerMessageId,
  });
  if (executionAction === 'DEDUPLICATE_SENT') {
    return { deduplicated: true, attemptId: row.id, providerMessageId: row.providerMessageId };
  }
  if (executionAction === 'RECONCILE') {
    throw Object.assign(new Error('INSTAGRAM_OUTBOUND_RECONCILIATION_REQUIRED'), { code: 'INSTAGRAM_OUTBOUND_RECONCILIATION_REQUIRED', unknownOutcome: true, retryable: false });
  }
  if (executionAction === 'MARK_UNKNOWN_AND_RECONCILE') {
    await markInstagramReplyUnknownOutcomeStorage({
      attemptId: row.id,
      failureCode: 'INSTAGRAM_WORKER_CRASH_AFTER_WRITE_POSSIBLE',
      failureSummary: 'A previous worker stopped while the provider write was in progress; reconciliation is required before any retry.',
      now,
    }).catch(() => undefined);
    throw Object.assign(new Error('INSTAGRAM_OUTBOUND_RECONCILIATION_REQUIRED'), { code: 'INSTAGRAM_WORKER_CRASH_AFTER_WRITE_POSSIBLE', unknownOutcome: true, retryable: false });
  }
  assertInstagramOutboundWriteEnabled(input.mode);
  const policy = evaluateInstagramReplyPolicy({
    now,
    accountMatches: allowedAccountIds().size === 0 || allowedAccountIds().has(row.conversationAccountId),
    permissionGranted: hasInstagramMessagingPermission((await getLatestMetaConnectionReadiness())?.permissions),
    conversationStatus: row.conversationStatus,
    lastInboundAt: row.lastInboundAt,
    replyWindowExpiresAt: row.replyWindowExpiresAt,
    mode: input.mode,
    privateReplyExpiresAt: row.sourcePrivateReplyExpiresAt ?? row.privateReservationExpiresAt,
    privateReplySentAt: row.privateReplySentAt,
  });
  const executionPrivateSurface = resolveInstagramPrivateReplySurface(row.conversationPolicyData);
  const executionPrivatePolicy = input.mode === 'PRIVATE_REPLY' ? evaluateInstagramPrivateReplyPolicy({
    now,
    conversationId: row.conversationId,
    conversationAccountIdentityReferenceId: row.accountIdentityReferenceId,
    sourceMessageId: row.sourceMessageId,
    sourceConversationId: row.sourceConversationIdResolved,
    sourceAccountIdentityReferenceId: row.sourceAccountIdentityReferenceIdResolved,
    sourceCommentId: row.sourceCommentIdResolved,
    sourcePostId: row.sourcePostIdResolved,
    sourceOccurredAt: row.sourceProviderOccurredAtResolved ?? row.sourceSentAtResolved,
    storedExpiresAt: row.sourcePrivateReplyExpiresAt ?? row.privateReservationExpiresAt,
    privateReplySentAt: row.privateReplySentAt,
    reservationStatus: row.privateReservationStatus,
    surface: executionPrivateSurface.surface,
    liveBroadcastActive: executionPrivateSurface.liveBroadcastActive,
  }) : null;
  const executionBlockCode = !policy.eligible
    ? policy.code
    : executionPrivatePolicy && !executionPrivatePolicy.eligible ? executionPrivatePolicy.code : null;
  if (executionBlockCode) {
    await markInstagramReplyBlockedStorage({
      attemptId: row.id,
      failureCode: executionBlockCode,
      failureSummary: `Execution-time Instagram reply policy blocked the write: ${executionBlockCode}.`,
      now,
    }).catch(() => undefined);
    throw Object.assign(new Error(`INSTAGRAM_REPLY_BLOCKED:${executionBlockCode}`), { code: executionBlockCode, status: 409, retryable: false });
  }
  if (input.mode === 'PRIVATE_REPLY') {
    if (!row.sourceCommentIdResolved || !row.privateReservationId) throw Object.assign(new Error('INSTAGRAM_PRIVATE_REPLY_SOURCE_REQUIRED'), { retryable: false });
    if (!['RESERVED', 'SENDING'].includes(row.privateReservationStatus)) {
      throw Object.assign(new Error('INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT_OR_BLOCKED'), { retryable: false });
    }
  }
  if (typeof row.pendingText !== 'string' || !row.pendingText.trim()) throw Object.assign(new Error('INSTAGRAM_OUTBOUND_PENDING_TEXT_MISSING'), { retryable: false });
  await markInstagramReplySendingStorage(row.id, now);
  try {
    const provider = await sendProviderReply({
      accountId: row.conversationAccountId,
      participantId: row.conversationParticipantId,
      text: row.pendingText,
      mode: input.mode,
      commentId: row.sourceCommentIdResolved ?? null,
    });
    const privateProviderCapture = input.mode === 'PRIVATE_REPLY'
      ? captureInstagramPrivateReplyProviderResponse(provider)
      : null;
    const providerMessageId = privateProviderCapture?.providerMessageId
      ?? (typeof provider.message_id === 'string' && provider.message_id.trim()
        ? provider.message_id.trim()
        : typeof provider.id === 'string' && provider.id.trim() ? provider.id.trim() : null);
    if (!providerMessageId) {
      throw Object.assign(new Error('INSTAGRAM_PROVIDER_MESSAGE_ID_MISSING'), { code: 'INSTAGRAM_PROVIDER_MESSAGE_ID_MISSING', unknownOutcome: true });
    }
    let completed;
    try {
      completed = await markInstagramReplySentStorage({
        attemptId: row.id,
        providerMessageId,
        text: row.pendingText,
        now,
        providerResponseDigest: privateProviderCapture ? hash(privateProviderCapture.safeDigestInput) : null,
      });
    } catch (persistenceError) {
      throw Object.assign(new Error('INSTAGRAM_PROVIDER_WRITE_PERSISTENCE_UNKNOWN'), {
        code: 'INSTAGRAM_PROVIDER_WRITE_PERSISTENCE_UNKNOWN',
        unknownOutcome: true,
        providerMessageId,
        cause: persistenceError,
      });
    }
    await publishInstagramOutboundState({
      attemptId: row.id,
      conversationId: row.conversationId,
      messageId: row.pendingMessageId,
      correlationId: row.correlationId,
      mode: input.mode,
      state: 'SENT',
      providerMessageId,
      occurredAt: now,
    }).catch(() => undefined);
    incrementMetaCounter('meta_instagram_replies_total', { mode: input.mode.toLowerCase(), outcome: 'sent' });
    return { deduplicated: false, ...completed, provider: redactMetaAdminData(provider) };
  } catch (error) {
    const safe = redactMetaAdminData(error instanceof Error ? { name: error.name, message: error.message, safeProvider: (error as any).safeProvider } : error);
    const failure = classifyMetaInstagramOutboundFailure(error);
    if (failure.classification === 'UNKNOWN_WRITE') {
      await markInstagramReplyUnknownOutcomeStorage({
        attemptId: row.id,
        failureCode: failure.safeReasonCode,
        failureSummary: 'Provider reply outcome is unknown and requires reconciliation.',
        providerMessageId: typeof (error as any)?.providerMessageId === 'string' ? (error as any).providerMessageId : null,
        now,
      }).catch(() => undefined);
    } else if (failure.classification === 'RATE_LIMIT' || failure.classification === 'TRANSIENT') {
      await markInstagramReplyRetryableStorage({ attemptId: row.id, failureCode: failure.safeReasonCode, failureSummary: 'Transient provider failure; safe retry remains eligible.', now }).catch(() => undefined);
    } else if (failure.classification === 'POLICY_BLOCKED') {
      await markInstagramReplyBlockedStorage({ attemptId: row.id, failureCode: failure.safeReasonCode, failureSummary: 'Instagram outbound write blocked by policy.', now }).catch(() => undefined);
    } else {
      await markInstagramReplyFailedStorage({ attemptId: row.id, failureCode: failure.safeReasonCode, failureSummary: 'Instagram provider reply failed definitively.', now }).catch(() => undefined);
    }
    const realtimeState: MetaInstagramOutboundRealtimeState = failure.classification === 'UNKNOWN_WRITE'
      ? 'UNKNOWN_OUTCOME'
      : failure.classification === 'RATE_LIMIT' || failure.classification === 'TRANSIENT'
        ? 'RETRYING'
        : failure.classification === 'POLICY_BLOCKED'
          ? 'BLOCKED'
          : 'FAILED';
    await publishInstagramOutboundState({
      attemptId: row.id,
      conversationId: row.conversationId,
      messageId: row.pendingMessageId,
      correlationId: row.correlationId,
      mode: input.mode,
      state: realtimeState,
      providerMessageId: typeof (error as any)?.providerMessageId === 'string' ? (error as any).providerMessageId : null,
      reasonCode: failure.safeReasonCode,
      occurredAt: now,
    }).catch(() => undefined);
    await openOrRefreshMetaIncident({
      incidentType: 'INSTAGRAM_REPLY_FAILURE', severity: 'ERROR', resourceType: 'META_CONVERSATION', resourceId: row.conversationId,
      summary: failure.classification === 'UNKNOWN_WRITE' ? 'Instagram reply outcome requires reconciliation.' : 'Instagram reply delivery failed.',
      details: safe, correlationId: row.correlationId, runbookUrl: '/admin/meta/instagram', timeWindowMinutes: 60, cooldownMinutes: 15,
    }).catch(() => undefined);
    incrementMetaCounter('meta_instagram_replies_total', { mode: input.mode.toLowerCase(), outcome: failure.classification.toLowerCase() });
    throw error;
  }
}

export async function runInstagramReceiptRecovery(input: {
  enqueue: (receipt: { id: string; event: NormalizedInstagramEvent }) => Promise<unknown>;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(input.limit ?? 100, 500));
  const receipts = await db.metaInstagramWebhookReceipt.findMany({
    where: {
      status: 'FAILED',
      signatureOk: true,
      errorData: { path: ['code'], equals: 'QUEUE_HANDOFF_FAILED' },
    },
    orderBy: { receivedAt: 'asc' },
    take: limit,
  });
  let enqueued = 0;
  let failed = 0;
  for (const receipt of receipts) {
    try {
      assertNormalizedEvent(receipt.normalizedEvent);
      await input.enqueue({ id: receipt.id, event: receipt.normalizedEvent });
      await db.metaInstagramWebhookReceipt.update({
        where: { id: receipt.id },
        data: { status: 'QUEUED', queuedAt: new Date(), errorData: null },
      });
      enqueued += 1;
    } catch (error) {
      failed += 1;
      await db.metaInstagramWebhookReceipt.update({
        where: { id: receipt.id },
        data: {
          status: 'FAILED',
          errorData: {
            code: 'QUEUE_HANDOFF_FAILED',
            reasonCode: String((error as { code?: unknown })?.code ?? 'INSTAGRAM_RECEIPT_RECOVERY_FAILED')
              .toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 96),
          },
        },
      }).catch(() => undefined);
    }
  }
  return { scanned: receipts.length, enqueued, failed };
}

export async function runInstagramRetention(now = new Date()) {
  const receipts = await db.metaInstagramWebhookReceipt.deleteMany({ where: { retentionUntil: { lt: now } } });
  const conversations = await db.metaConversation.deleteMany({
    where: { retentionUntil: { lt: now }, status: { in: ['RESOLVED', 'SPAM', 'ARCHIVED'] } },
  });
  return { checkedAt: now.toISOString(), deletedReceipts: receipts.count, deletedConversations: conversations.count };
}
