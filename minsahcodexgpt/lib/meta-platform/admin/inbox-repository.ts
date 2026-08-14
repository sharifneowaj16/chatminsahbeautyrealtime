import 'server-only';

import prisma from '@/lib/prisma';
import {
  decodeMetaAdminCursor,
  encodeMetaAdminCursor,
  parseMetaAdminLimit,
  parseMetaAdminMessageLimit,
  requireMetaAdminOpaqueId,
} from './contracts';
import {
  evaluateFacebookAdminReplyEligibility,
  projectAdminInboxMessage,
} from './inbox-dto';

const ALLOWED_PLATFORMS = new Set(['facebook', 'instagram', 'whatsapp', 'youtube']);

type Db = {
  socialMessage: {
    groupBy(args: unknown): Promise<Array<{ conversationId: string | null; _count: { _all: number } }>>;
    findMany(args: unknown): Promise<Array<Record<string, unknown>>>;
    findFirst(args: unknown): Promise<Record<string, unknown> | null>;
    count(args: unknown): Promise<number>;
    update(args: unknown): Promise<Record<string, unknown>>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
};
const db = prisma as unknown as Db;

function platform(value: unknown): string {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : 'facebook';
  if (!ALLOWED_PLATFORMS.has(normalized)) throw Object.assign(new Error('META_ADMIN_INBOX_PLATFORM_INVALID'), { status: 400 });
  return normalized;
}

function attachmentSelect() {
  return {
    id: true,
    type: true,
    mimeType: true,
    fileName: true,
    fileSize: true,
    storageKey: true,
    storageUrl: true,
    thumbnailUrl: true,
    metadata: true,
  };
}

function messageSelect() {
  return {
    id: true,
    externalId: true,
    platform: true,
    type: true,
    conversationId: true,
    senderId: true,
    senderName: true,
    content: true,
    isRead: true,
    timestamp: true,
    isIncoming: true,
    attachments: { orderBy: { createdAt: 'asc' }, select: attachmentSelect() },
  };
}

export async function getAdminInboxUnreadCount(input: Readonly<{ platform?: unknown }> = {}) {
  const selectedPlatform = input.platform === 'all' ? null : platform(input.platform);
  return db.socialMessage.count({
    where: {
      ...(selectedPlatform ? { platform: selectedPlatform } : {}),
      isIncoming: true,
      isRead: false,
    },
  });
}

export async function listAdminInboxConversations(input: Readonly<{
  platform?: unknown;
  unreadOnly?: boolean;
  limit?: unknown;
  cursor?: unknown;
  query?: unknown;
}>) {
  const selectedPlatform = platform(input.platform);
  const limit = parseMetaAdminLimit(input.limit, 40, 100);
  const cursor = decodeMetaAdminCursor(input.cursor);
  const query = typeof input.query === 'string' ? input.query.trim().slice(0, 120) : '';

  const unreadGroups = await db.socialMessage.groupBy({
    by: ['conversationId'],
    where: { platform: selectedPlatform, conversationId: { not: null }, isIncoming: true, isRead: false },
    _count: { _all: true },
  });
  const unreadByConversation = new Map(
    unreadGroups.flatMap((row) => row.conversationId ? [[row.conversationId, row._count._all] as const] : []),
  );
  const unreadIds = [...unreadByConversation.keys()];

  const rows = await db.socialMessage.findMany({
    where: {
      platform: selectedPlatform,
      conversationId: input.unreadOnly ? { in: unreadIds } : { not: null },
      ...(query ? {
        OR: [
          { senderName: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      } : {}),
      ...(cursor ? {
        OR: [
          { timestamp: { lt: new Date(cursor.at) } },
          { timestamp: new Date(cursor.at), id: { lt: cursor.id } },
        ],
      } : {}),
    },
    distinct: ['conversationId'],
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: messageSelect(),
  });

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const conversationIds = pageRows.flatMap((row) => typeof row.conversationId === 'string' ? [row.conversationId] : []);
  const participants = conversationIds.length > 0 ? await db.socialMessage.findMany({
    where: { platform: selectedPlatform, conversationId: { in: conversationIds }, isIncoming: true },
    distinct: ['conversationId'],
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    select: { id: true, conversationId: true, senderId: true, senderName: true, timestamp: true },
  }) : [];
  const participantByConversation = new Map(
    participants.flatMap((row) => typeof row.conversationId === 'string' ? [[row.conversationId, row] as const] : []),
  );

  const conversations = pageRows.flatMap((row) => {
    const conversationId = typeof row.conversationId === 'string' ? row.conversationId : null;
    if (!conversationId) return [];
    const participant = participantByConversation.get(conversationId) ?? row;
    const latestMessage = projectAdminInboxMessage(row);
    const lastInboundAt = participant?.timestamp ?? (row.isIncoming ? row.timestamp : null);
    return [{
      conversationId,
      platform: selectedPlatform,
      participant: {
        id: typeof participant.senderId === 'string' ? participant.senderId : conversationId,
        name: typeof participant.senderName === 'string' ? participant.senderName.slice(0, 500) : conversationId,
        avatar: null,
      },
      latestMessage,
      unreadCount: unreadByConversation.get(conversationId) ?? 0,
      searchText: `${String(participant.senderName ?? '')} ${String(row.content ?? '')}`.toLowerCase().slice(0, 2_000),
      processing: (latestMessage as Record<string, unknown>).processing ?? null,
      failure: (latestMessage as Record<string, unknown>).failure ?? null,
      replyEligibility: selectedPlatform === 'facebook'
        ? evaluateFacebookAdminReplyEligibility({ lastInboundAt })
        : null,
    }];
  });

  const last = pageRows[pageRows.length - 1];
  return {
    conversations,
    unreadCount: unreadGroups.reduce((sum, row) => sum + row._count._all, 0),
    pageInfo: {
      nextConversationCursor: hasMore && last
        ? encodeMetaAdminCursor({ at: String(last.timestamp), id: String(last.id) })
        : null,
      hasMoreConversations: hasMore,
    },
  };
}

export async function getAdminInboxConversation(input: Readonly<{
  conversationId: unknown;
  platform?: unknown;
  unreadOnly?: boolean;
  limit?: unknown;
  cursor?: unknown;
  includeUnreadSummary?: boolean;
}>) {
  const conversationId = requireMetaAdminOpaqueId(input.conversationId, 'META_ADMIN_INBOX_CONVERSATION_ID_INVALID');
  const selectedPlatform = platform(input.platform);
  const limit = parseMetaAdminMessageLimit(input.limit, 250);
  const cursor = decodeMetaAdminCursor(input.cursor);
  const rows = await db.socialMessage.findMany({
    where: {
      platform: selectedPlatform,
      conversationId,
      ...(input.unreadOnly ? { isIncoming: true, isRead: false } : {}),
      ...(cursor ? {
        OR: [
          { timestamp: { lt: new Date(cursor.at) } },
          { timestamp: new Date(cursor.at), id: { lt: cursor.id } },
        ],
      } : {}),
    },
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: messageSelect(),
  });
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const messages = [...pageRows].reverse().map(projectAdminInboxMessage);
  const participant = await db.socialMessage.findFirst({
    where: { platform: selectedPlatform, conversationId, isIncoming: true },
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    select: { senderId: true, senderName: true, timestamp: true },
  });
  const latest = messages[messages.length - 1] ?? null;
  const unreadCount = input.includeUnreadSummary
    ? await getAdminInboxUnreadCount({ platform: selectedPlatform })
    : await db.socialMessage.count({ where: { platform: selectedPlatform, conversationId, isIncoming: true, isRead: false } });
  const oldest = pageRows[pageRows.length - 1];
  return {
    messages,
    unreadCount,
    conversation: latest ? {
      conversationId,
      platform: selectedPlatform,
      participant: {
        id: typeof participant?.senderId === 'string' ? participant.senderId : conversationId,
        name: typeof participant?.senderName === 'string' ? participant.senderName.slice(0, 500) : conversationId,
        avatar: null,
      },
      latestMessage: latest,
      unreadCount: await db.socialMessage.count({ where: { platform: selectedPlatform, conversationId, isIncoming: true, isRead: false } }),
      searchText: `${String(participant?.senderName ?? '')} ${String((latest as Record<string, unknown>).content ?? '')}`.toLowerCase().slice(0, 2_000),
      processing: (latest as Record<string, unknown>).processing ?? null,
      failure: (latest as Record<string, unknown>).failure ?? null,
      replyEligibility: selectedPlatform === 'facebook'
        ? evaluateFacebookAdminReplyEligibility({ lastInboundAt: participant?.timestamp })
        : null,
    } : null,
    pageInfo: {
      nextMessageCursor: hasMore && oldest
        ? encodeMetaAdminCursor({ at: String(oldest.timestamp), id: String(oldest.id) })
        : null,
      hasMoreMessages: hasMore,
    },
  };
}

export async function markAdminInboxRead(input: Readonly<{
  id?: unknown;
  conversationId?: unknown;
  platform?: unknown;
  markAll?: boolean;
}>) {
  const selectedPlatform = input.platform === 'all' ? null : platform(input.platform);
  if (input.markAll) {
    const result = await db.socialMessage.updateMany({
      where: { ...(selectedPlatform ? { platform: selectedPlatform } : {}), isIncoming: true, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count, conversationId: null, messageId: null, platform: selectedPlatform ?? 'all' };
  }
  if (input.conversationId) {
    const conversationId = requireMetaAdminOpaqueId(input.conversationId, 'META_ADMIN_INBOX_CONVERSATION_ID_INVALID');
    const result = await db.socialMessage.updateMany({
      where: { ...(selectedPlatform ? { platform: selectedPlatform } : {}), conversationId, isIncoming: true, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count, conversationId, messageId: null, platform: selectedPlatform ?? 'all' };
  }
  if (input.id) {
    const id = requireMetaAdminOpaqueId(input.id, 'META_ADMIN_INBOX_MESSAGE_ID_INVALID');
    const updated = await db.socialMessage.update({
      where: { id },
      data: { isRead: true },
      select: { id: true, conversationId: true, platform: true },
    });
    return {
      updated: 1,
      conversationId: typeof updated.conversationId === 'string' ? updated.conversationId : null,
      messageId: String(updated.id),
      platform: String(updated.platform),
    };
  }
  throw Object.assign(new Error('META_ADMIN_INBOX_READ_TARGET_REQUIRED'), { status: 400 });
}
