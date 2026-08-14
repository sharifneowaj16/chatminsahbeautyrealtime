/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import prisma from '@/lib/prisma';
import { assignInstagramConversation } from './assignment';
import { projectInstagramConversationMediaSafe } from '@/lib/meta-platform/domains/instagram/media-policy';
import { projectInstagramConversationForAdmin } from '@/lib/meta-platform/admin/instagram-dto';

export type InstagramConversationStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'SPAM' | 'ARCHIVED';
export type InstagramConversationLinkType = 'CUSTOMER' | 'LEAD' | 'PRODUCT' | 'ORDER';

type Db = {
  metaConversation: {
    findMany(args: any): Promise<any[]>; findUnique(args: any): Promise<any | null>; update(args: any): Promise<any>;
  };
  metaConversationLink: { upsert(args: any): Promise<any>; updateMany(args: any): Promise<{ count: number }> };
  user: { findUnique(args: any): Promise<any | null> };
  metaLead: { findUnique(args: any): Promise<any | null> };
  product: { findUnique(args: any): Promise<any | null> };
  order: { findUnique(args: any): Promise<any | null> };
};
const db = prisma as unknown as Db;

const ALLOWED_STATUSES = new Set<InstagramConversationStatus>(['OPEN', 'PENDING', 'RESOLVED', 'SPAM', 'ARCHIVED']);
const ALLOWED_LINK_TYPES = new Set<InstagramConversationLinkType>(['CUSTOMER', 'LEAD', 'PRODUCT', 'ORDER']);

function normalizedTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim().toLowerCase()).filter((item) => /^[a-z0-9][a-z0-9_-]{0,31}$/.test(item)))].sort().slice(0, 20);
}

export async function listInstagramConversations(input: {
  status?: InstagramConversationStatus;
  assignedToId?: string;
  query?: string;
  limit?: number;
  cursor?: string;
} = {}) {
  if (input.status && !ALLOWED_STATUSES.has(input.status)) throw new Error('INSTAGRAM_STATUS_INVALID');
  const query = input.query?.trim().slice(0, 120);
  return db.metaConversation.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.assignedToId ? { assignedToId: input.assignedToId } : {}),
      ...(query ? { OR: [
        { participantUsername: { contains: query, mode: 'insensitive' } },
        { participantName: { contains: query, mode: 'insensitive' } },
        { participantId: { contains: query } },
        { messages: { some: { text: { contains: query, mode: 'insensitive' } } } },
      ] } : {}),
    },
    orderBy: [{ status: 'asc' }, { lastMessageAt: 'desc' }, { id: 'desc' }],
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    take: Math.max(1, Math.min(input.limit ?? 100, 251)),
    include: {
      messages: { orderBy: { sentAt: 'desc' }, take: 1, include: { attachments: true } },
      links: { where: { unlinkedAt: null }, orderBy: { linkedAt: 'desc' } },
    },
  });
}

export async function getInstagramConversation(conversationId: string) {
  const row = await db.metaConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { sentAt: 'asc' }, take: 250, include: { attachments: true, replyAttempts: { orderBy: { attemptedAt: 'desc' }, take: 10 } } },
      links: { where: { unlinkedAt: null }, orderBy: { linkedAt: 'desc' } },
      replyAttempts: { orderBy: { attemptedAt: 'desc' }, take: 50 },
    },
  });
  if (!row) throw new Error('INSTAGRAM_CONVERSATION_NOT_FOUND');
  return row;
}


type InstagramAdminProjectionOptions = Readonly<{
  permissionGranted: boolean;
  accountHealthy: boolean;
  now?: Date;
}>;

export async function listInstagramConversationsSafe(
  input: Parameters<typeof listInstagramConversations>[0] = {},
  options: InstagramAdminProjectionOptions,
) {
  const rows = await listInstagramConversations(input);
  return rows.map((row) => projectInstagramConversationForAdmin(projectInstagramConversationMediaSafe(row), options));
}

export async function getInstagramConversationSafe(
  conversationId: string,
  options: InstagramAdminProjectionOptions,
) {
  return projectInstagramConversationForAdmin(
    projectInstagramConversationMediaSafe(await getInstagramConversation(conversationId)),
    options,
  );
}

export async function updateInstagramConversation(input: {
  conversationId: string;
  status?: InstagramConversationStatus;
  assignedToId?: string | null;
  tags?: unknown;
  subject?: string | null;
}) {
  if (input.status && !ALLOWED_STATUSES.has(input.status)) throw new Error('INSTAGRAM_STATUS_INVALID');
  if (input.assignedToId !== undefined) await assignInstagramConversation({ conversationId: input.conversationId, assignedToId: input.assignedToId });
  return db.metaConversation.update({
    where: { id: input.conversationId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.tags !== undefined ? { tags: normalizedTags(input.tags) } : {}),
      ...(input.subject !== undefined ? { subject: input.subject?.trim().slice(0, 200) || null } : {}),
    },
  });
}

async function targetExists(linkType: InstagramConversationLinkType, targetId: string) {
  if (linkType === 'CUSTOMER') return Boolean(await db.user.findUnique({ where: { id: targetId }, select: { id: true } }));
  if (linkType === 'LEAD') return Boolean(await db.metaLead.findUnique({ where: { id: targetId }, select: { id: true } }));
  if (linkType === 'PRODUCT') return Boolean(await db.product.findUnique({ where: { id: targetId }, select: { id: true } }));
  return Boolean(await db.order.findUnique({ where: { id: targetId }, select: { id: true } }));
}

export async function linkInstagramConversation(input: {
  conversationId: string;
  linkType: InstagramConversationLinkType;
  targetId: string;
  verificationMethod: string;
  linkedById: string;
  evidence?: unknown;
}) {
  if (!ALLOWED_LINK_TYPES.has(input.linkType)) throw new Error('INSTAGRAM_LINK_TYPE_INVALID');
  const conversation = await db.metaConversation.findUnique({ where: { id: input.conversationId }, select: { id: true } });
  if (!conversation) throw new Error('INSTAGRAM_CONVERSATION_NOT_FOUND');
  if (!(await targetExists(input.linkType, input.targetId))) throw new Error('INSTAGRAM_LINK_TARGET_NOT_FOUND');
  const method = input.verificationMethod.trim().toUpperCase();
  if (!['EXPLICIT_ADMIN', 'VERIFIED_CUSTOMER_ID', 'VERIFIED_ORDER_REFERENCE', 'LEAD_CONVERSION'].includes(method)) {
    throw new Error('INSTAGRAM_LINK_VERIFICATION_REQUIRED');
  }
  return db.metaConversationLink.upsert({
    where: { conversationId_linkType_targetId: { conversationId: input.conversationId, linkType: input.linkType, targetId: input.targetId } },
    create: {
      conversationId: input.conversationId, linkType: input.linkType, targetId: input.targetId,
      verificationMethod: method, evidence: input.evidence as never, linkedById: input.linkedById,
    },
    update: { verificationMethod: method, evidence: input.evidence as never, linkedById: input.linkedById, linkedAt: new Date(), unlinkedAt: null },
  });
}

export async function unlinkInstagramConversation(input: { conversationId: string; linkType: InstagramConversationLinkType; targetId: string }) {
  if (!ALLOWED_LINK_TYPES.has(input.linkType)) throw new Error('INSTAGRAM_LINK_TYPE_INVALID');
  const result = await db.metaConversationLink.updateMany({
    where: { conversationId: input.conversationId, linkType: input.linkType, targetId: input.targetId, unlinkedAt: null },
    data: { unlinkedAt: new Date() },
  });
  if (result.count !== 1) throw new Error('INSTAGRAM_LINK_NOT_FOUND');
  return result;
}
