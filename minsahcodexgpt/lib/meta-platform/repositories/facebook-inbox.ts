import 'server-only';

import prisma from '@/lib/prisma';
import { persistSocialMessage } from '@/lib/social/socialMessageIngest';
import type { FacebookInboxMessageRecord } from '@/lib/meta-platform/domains/facebook/inbox-sync';
import { createFacebookRealtimeEvent, publishFacebookRealtimeEvent } from '@/lib/meta-platform/realtime/facebook-events';

export async function persistFacebookInboxMessage(input: Readonly<{
  message: FacebookInboxMessageRecord;
  attachmentAccessToken: string;
  receiptId?: string | null;
  correlationId?: string;
}>): Promise<Readonly<{
  created: boolean;
  providerMessageId: string;
  messageId: string;
  conversationId: string | null;
}>> {
  const existing = await prisma.socialMessage.findUnique({
    where: { platform_externalId: { platform: 'facebook', externalId: input.message.providerMessageId } },
    select: { id: true },
  });
  const message = await persistSocialMessage({
    platform: 'facebook',
    type: 'message',
    externalId: input.message.providerMessageId,
    conversationId: input.message.conversationKey,
    senderId: input.message.senderId,
    senderName: input.message.senderName,
    senderAvatar: input.message.senderAvatar,
    content: input.message.content,
    rawPayload: input.message.rawPayload,
    isIncoming: input.message.isIncoming,
    isRead: !input.message.isIncoming,
    timestamp: input.message.timestamp,
    attachments: input.message.attachments.map((attachment) => ({ ...attachment })),
    attachmentAccessToken: input.attachmentAccessToken,
    // Layer 6 owns no direct media transport. URLs remain references until the
    // main-app attachment validation pipeline accepts and stores them.
    deferAttachmentDownload: true,
  });
  const created = !existing;
  const correlationId = input.correlationId ?? `fb-inbox:${input.message.providerMessageId}`;
  await publishFacebookRealtimeEvent(createFacebookRealtimeEvent({
    type: 'FACEBOOK_MESSAGE_UPSERTED',
    correlationId,
    occurredAt: input.message.timestamp,
    receiptId: input.receiptId ?? null,
    conversationId: message.conversationId,
    messageId: message.id,
    providerEventKey: input.message.providerMessageId,
    state: created ? 'CREATED' : 'UPDATED',
  }));
  return Object.freeze({
    created,
    providerMessageId: input.message.providerMessageId,
    messageId: message.id,
    conversationId: message.conversationId,
  });
}
