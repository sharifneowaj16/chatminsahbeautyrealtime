import 'server-only';
import prisma from '@/lib/prisma';

type Db = { metaConversation: { update(args: unknown): Promise<unknown>; findUnique(args: unknown): Promise<{ id: string; assignedToId: string | null } | null> } };
const db = prisma as unknown as Db;

export async function assignInstagramConversation(input: { conversationId: string; assignedToId: string | null }) {
  const current = await db.metaConversation.findUnique({ where: { id: input.conversationId } });
  if (!current) throw new Error('INSTAGRAM_CONVERSATION_NOT_FOUND');
  return db.metaConversation.update({ where: { id: input.conversationId }, data: { assignedToId: input.assignedToId } });
}
