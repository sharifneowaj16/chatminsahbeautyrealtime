import 'server-only';

import prisma from '@/lib/prisma';
import { evaluateFacebookAdminReplyEligibility } from '@/lib/meta-platform/admin/inbox-dto';
import { requireMetaAdminOpaqueId, safeMetaAdminText } from '@/lib/meta-platform/admin/contracts';

export type FacebookAdminReplyAttachment = Readonly<{
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  fileName?: string;
  mimeType?: string;
  thumbnail?: string;
}>;

const ATTACHMENT_TYPES = new Set(['image', 'video', 'audio', 'file']);

function safeAttachment(value: unknown): FacebookAdminReplyAttachment {
  if (!value || typeof value !== 'object') throw Object.assign(new Error('FACEBOOK_REPLY_ATTACHMENT_INVALID'), { status: 400 });
  const row = value as Record<string, unknown>;
  const type = typeof row.type === 'string' ? row.type.toLowerCase() : '';
  if (!ATTACHMENT_TYPES.has(type)) throw Object.assign(new Error('FACEBOOK_REPLY_ATTACHMENT_TYPE_INVALID'), { status: 400 });
  if (typeof row.url !== 'string' || row.url.length > 4_096) throw Object.assign(new Error('FACEBOOK_REPLY_ATTACHMENT_URL_INVALID'), { status: 400 });
  let url: URL;
  try { url = new URL(row.url); } catch { throw Object.assign(new Error('FACEBOOK_REPLY_ATTACHMENT_URL_INVALID'), { status: 400 }); }
  if (!['https:', 'http:'].includes(url.protocol) || /(?:token|signature|x-amz-|credential)/i.test(url.search)) {
    throw Object.assign(new Error('FACEBOOK_REPLY_ATTACHMENT_URL_UNSAFE'), { status: 409 });
  }
  return Object.freeze({
    type: type as FacebookAdminReplyAttachment['type'],
    url: url.toString(),
    ...(safeMetaAdminText(row.fileName, 500) ? { fileName: safeMetaAdminText(row.fileName, 500)! } : {}),
    ...(safeMetaAdminText(row.mimeType, 255) ? { mimeType: safeMetaAdminText(row.mimeType, 255)! } : {}),
    ...(typeof row.thumbnail === 'string' && /^https?:\/\//i.test(row.thumbnail) ? { thumbnail: row.thumbnail.slice(0, 4_096) } : {}),
  });
}

function safeProviderResult(value: unknown) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const deliveries = Array.isArray(row.deliveries) ? row.deliveries.map((item) => {
    const delivery = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      queued: false as const,
      recipientId: typeof delivery.recipientId === 'string' ? delivery.recipientId.slice(0, 255) : '',
      messageId: typeof delivery.messageId === 'string' ? delivery.messageId.slice(0, 255) : '',
      conversationId: typeof delivery.conversationId === 'string' ? delivery.conversationId.slice(0, 255) : '',
      dbMessageId: typeof delivery.dbMessageId === 'string' ? delivery.dbMessageId.slice(0, 255) : '',
      clientMessageId: typeof delivery.clientMessageId === 'string' ? delivery.clientMessageId.slice(0, 255) : undefined,
    };
  }) : [];
  const queuedDeliveries = Array.isArray(row.queuedDeliveries) ? row.queuedDeliveries.map((item) => {
    const delivery = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      queued: true as const,
      jobId: typeof delivery.jobId === 'string' ? delivery.jobId.slice(0, 255) : '',
      attachmentType: typeof delivery.attachmentType === 'string' ? delivery.attachmentType.slice(0, 20) : undefined,
      error: safeMetaAdminText(delivery.error, 200) ?? 'Queued for retry',
      clientMessageId: typeof delivery.clientMessageId === 'string' ? delivery.clientMessageId.slice(0, 255) : undefined,
    };
  }) : [];
  return Object.freeze({
    ok: row.ok === true,
    queued: row.queued === true,
    messageId: typeof row.messageId === 'string' ? row.messageId.slice(0, 255) : '',
    conversationId: typeof row.conversationId === 'string' ? row.conversationId.slice(0, 255) : '',
    deliveries,
    queuedDeliveries,
  });
}

export async function requestFacebookAdminReplyProduction(input: Readonly<{
  type: unknown;
  recipientPsid?: unknown;
  commentId?: unknown;
  pageId?: unknown;
  text?: unknown;
  attachments?: unknown;
  actorId: string;
  clientMessageId?: unknown;
}>) {
  const type = input.type === 'comment' ? 'comment' : input.type === 'messenger' ? 'messenger' : null;
  if (!type) throw Object.assign(new Error('FACEBOOK_REPLY_TYPE_INVALID'), { status: 400 });
  const text = typeof input.text === 'string' ? input.text.trim().slice(0, 2_000) : '';
  const attachments = Array.isArray(input.attachments) ? input.attachments.map(safeAttachment).slice(0, 10) : [];
  const recipientPsid = type === 'messenger' ? requireMetaAdminOpaqueId(input.recipientPsid, 'FACEBOOK_REPLY_RECIPIENT_INVALID') : undefined;
  const commentId = type === 'comment' ? requireMetaAdminOpaqueId(input.commentId, 'FACEBOOK_REPLY_COMMENT_ID_INVALID') : undefined;
  if (!text && attachments.length === 0) throw Object.assign(new Error('FACEBOOK_REPLY_CONTENT_REQUIRED'), { status: 400 });
  if (type === 'comment' && attachments.length > 0) throw Object.assign(new Error('FACEBOOK_COMMENT_ATTACHMENTS_UNSUPPORTED'), { status: 409 });

  if (recipientPsid) {
    const lastInbound = await prisma.socialMessage.findFirst({
      where: { platform: 'facebook', isIncoming: true, senderId: recipientPsid },
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      select: { timestamp: true },
    });
    const eligibility = evaluateFacebookAdminReplyEligibility({ lastInboundAt: lastInbound?.timestamp });
    if (!eligibility.allowed) {
      throw Object.assign(new Error(eligibility.reasonCode), { status: 409, code: eligibility.reasonCode, eligibility });
    }
  }

  const endpoint = process.env.REALTIME_SERVICE_INTERNAL_URL ?? 'http://realtime-service:3001';
  const secret = process.env.REPLY_API_SECRET ?? '';
  if (!secret) throw Object.assign(new Error('FACEBOOK_REPLY_BRIDGE_NOT_CONFIGURED'), { status: 503 });
  const configuredPageId = process.env.FACEBOOK_PAGE_ID ?? '';
  const pageId = typeof input.pageId === 'string' && input.pageId.trim()
    ? requireMetaAdminOpaqueId(input.pageId, 'FACEBOOK_REPLY_PAGE_ID_INVALID')
    : configuredPageId;
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': secret,
    },
    body: JSON.stringify({
      type,
      recipientPsid,
      commentId,
      pageId: pageId || undefined,
      text,
      attachments,
      agentId: input.actorId,
      clientMessageId: typeof input.clientMessageId === 'string' ? input.clientMessageId.slice(0, 255) : undefined,
    }),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const row = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    throw Object.assign(new Error(safeMetaAdminText(row.error, 200) ?? 'FACEBOOK_REPLY_BRIDGE_FAILED'), {
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      code: 'FACEBOOK_REPLY_BRIDGE_FAILED',
    });
  }
  return safeProviderResult(payload);
}
