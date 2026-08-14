export type InstagramInboundSideEffectPlan = Readonly<{
  emitRealtime: boolean;
  scheduleAttachments: boolean;
  refreshParticipantProfile: boolean;
  deduplicated: boolean;
}>;

export function planInstagramInboundSideEffects(input: {
  messageCreated: boolean;
  direction: 'INBOUND' | 'OUTBOUND';
  participantProfileMissing: boolean;
  attachmentCount: number;
}): InstagramInboundSideEffectPlan {
  const created = input.messageCreated === true;
  return Object.freeze({
    emitRealtime: created,
    scheduleAttachments: created && input.attachmentCount > 0,
    refreshParticipantProfile: created && input.direction === 'INBOUND' && input.participantProfileMissing,
    deduplicated: !created,
  });
}

export function toInstagramInboundSafeResult(input: {
  receiptId: string;
  conversationId: string;
  messageId: string;
  providerMessageId: string;
  created: boolean;
  orderingAdvanced: boolean;
  scheduledAttachmentCount: number;
  rejectedAttachmentCount: number;
  realtimeEventId?: string;
}) {
  return Object.freeze({
    receiptId: input.receiptId,
    conversationId: input.conversationId,
    messageId: input.messageId,
    providerMessageId: input.providerMessageId,
    deduplicated: !input.created,
    outOfOrder: input.created && !input.orderingAdvanced,
    scheduledAttachmentCount: input.scheduledAttachmentCount,
    rejectedAttachmentCount: input.rejectedAttachmentCount,
    ...(input.realtimeEventId ? { realtimeEventId: input.realtimeEventId } : {}),
  });
}
