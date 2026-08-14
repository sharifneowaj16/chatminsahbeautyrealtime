export type InstagramInboundAttachment = Readonly<{
  externalId?: string;
  type: string;
  url?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
}>;

export type InstagramInboundDomainMessage = Readonly<{
  eventKey: string;
  eventType: string;
  accountId: string;
  senderId: string;
  recipientId: string;
  conversationKey: string;
  providerMessageId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  messageType: string;
  text?: string;
  occurredAt: string;
  correlationId: string;
  payloadDigest: string;
  attachments: readonly InstagramInboundAttachment[];
}>;

function requiredText(value: unknown, code: string, max = 500): string {
  if (typeof value !== 'string') throw new TypeError(code);
  const clean = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  if (!clean || clean.length > max) throw new TypeError(code);
  return clean;
}

function optionalText(value: unknown, max = 4_000): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return clean ? clean.slice(0, max) : undefined;
}

export function normalizeInstagramInboundMessage(input: Readonly<Record<string, unknown>>): InstagramInboundDomainMessage {
  const direction = requiredText(input.direction, 'INSTAGRAM_DIRECTION_REQUIRED', 20).toUpperCase();
  if (direction !== 'INBOUND' && direction !== 'OUTBOUND') throw new TypeError('INSTAGRAM_DIRECTION_INVALID');
  const occurredAt = requiredText(input.sentAt ?? input.occurredAt, 'INSTAGRAM_OCCURRED_AT_REQUIRED', 100);
  if (!Number.isFinite(new Date(occurredAt).getTime())) throw new TypeError('INSTAGRAM_OCCURRED_AT_INVALID');
  const sourceAttachments = Array.isArray(input.attachments) ? input.attachments : [];
  const attachments = sourceAttachments.slice(0, 20).map((item) => {
    const value = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const externalId = optionalText(value.externalId, 255);
    const url = optionalText(value.url, 2_000);
    const mimeType = optionalText(value.mimeType, 255);
    const fileName = optionalText(value.fileName, 255);
    const fileSize = typeof value.fileSize === 'number' && Number.isSafeInteger(value.fileSize) && value.fileSize >= 0 ? value.fileSize : undefined;
    return Object.freeze({
      ...(externalId ? { externalId } : {}),
      type: requiredText(value.type ?? 'UNKNOWN', 'INSTAGRAM_ATTACHMENT_TYPE_INVALID', 80),
      ...(url ? { url } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(fileName ? { fileName } : {}),
      ...(fileSize !== undefined ? { fileSize } : {}),
    });
  });
  const text = optionalText(input.text, 10_000);
  return Object.freeze({
    eventKey: requiredText(input.eventKey, 'INSTAGRAM_EVENT_KEY_REQUIRED'),
    eventType: requiredText(input.eventType, 'INSTAGRAM_EVENT_TYPE_REQUIRED', 80),
    accountId: requiredText(input.accountId, 'INSTAGRAM_ACCOUNT_ID_REQUIRED'),
    senderId: requiredText(input.senderId, 'INSTAGRAM_SENDER_ID_REQUIRED'),
    recipientId: requiredText(input.recipientId, 'INSTAGRAM_RECIPIENT_ID_REQUIRED'),
    conversationKey: requiredText(input.conversationKey, 'INSTAGRAM_CONVERSATION_KEY_REQUIRED'),
    providerMessageId: requiredText(input.platformMessageId ?? input.providerMessageId, 'INSTAGRAM_PROVIDER_MESSAGE_ID_REQUIRED'),
    direction,
    messageType: requiredText(input.messageType, 'INSTAGRAM_MESSAGE_TYPE_REQUIRED', 80),
    ...(text ? { text } : {}),
    occurredAt: new Date(occurredAt).toISOString(),
    correlationId: requiredText(input.correlationId, 'INSTAGRAM_CORRELATION_ID_REQUIRED'),
    payloadDigest: requiredText(input.payloadDigest, 'INSTAGRAM_PAYLOAD_DIGEST_REQUIRED', 128),
    attachments: Object.freeze(attachments),
  });
}
