export type FacebookInboxAttachment = Readonly<{
  id?: string;
  mime_type?: string;
  name?: string;
  file_url?: string;
  image_data?: Readonly<{ url?: string; preview_url?: string }>;
  video_data?: Readonly<{ url?: string; preview_url?: string }>;
  audio_data?: Readonly<{ url?: string }>;
  payload?: Readonly<{ url?: string }>;
  type?: string;
}>;

export type FacebookInboxMessage = Readonly<{
  id?: string;
  message?: string;
  created_time?: string;
  from?: Readonly<{ id?: string; name?: string }>;
  attachments?: Readonly<{ data?: readonly FacebookInboxAttachment[] }>;
}>;

export type FacebookInboxConversation = Readonly<{
  id: string;
  updated_time?: string;
  senders?: Readonly<{ data?: readonly Readonly<{ id?: string; name?: string }>[] }>;
  messages?: Readonly<{ data?: readonly FacebookInboxMessage[] }>;
}>;

export type FacebookInboxProfile = Readonly<{
  id: string | null;
  name: string | null;
  avatar: string | null;
}>;

export type FacebookInboxSnapshot = Readonly<{
  pageId: string;
  pageProfile: FacebookInboxProfile;
  conversations: readonly FacebookInboxConversation[];
  profiles: Readonly<Record<string, FacebookInboxProfile>>;
}>;

export type FacebookInboxAttachmentRecord = Readonly<{
  externalId: string;
  type: string;
  mimeType: string | null;
  fileName: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type FacebookInboxMessageRecord = Readonly<{
  providerMessageId: string;
  providerConversationId: string;
  conversationKey: string;
  senderId: string | null;
  senderName: string | null;
  senderAvatar: string | null;
  content: string;
  isIncoming: boolean;
  timestamp: Date;
  attachments: readonly FacebookInboxAttachmentRecord[];
  rawPayload: Readonly<Record<string, unknown>>;
}>;

export type FacebookInboxPlan = Readonly<{
  pageId: string;
  conversations: number;
  messages: readonly FacebookInboxMessageRecord[];
  skippedMessages: number;
  duplicateProviderMessages: number;
  safeDigest: string;
}>;

function bounded(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean ? clean.slice(0, max) : null;
}

function opaqueId(value: unknown): string | null {
  const clean = bounded(value, 255);
  return clean && /^[A-Za-z0-9._:-]+$/.test(clean) ? clean : null;
}

function attachmentType(attachment: FacebookInboxAttachment): string {
  const explicit = bounded(attachment.type, 64)?.toLowerCase();
  if (explicit) return explicit;
  const mime = bounded(attachment.mime_type, 255)?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

export function normalizeFacebookInboxAttachments(
  attachments: readonly FacebookInboxAttachment[] | undefined,
): readonly FacebookInboxAttachmentRecord[] {
  return Object.freeze((attachments ?? []).map((attachment, index) => {
    const type = attachmentType(attachment);
    const externalId = opaqueId(attachment.id) ?? `${type}-${index}`;
    const externalUrl = bounded(
      attachment.file_url ?? attachment.image_data?.url ?? attachment.video_data?.url
        ?? attachment.audio_data?.url ?? attachment.payload?.url,
      4_096,
    );
    const thumbnailUrl = bounded(
      attachment.image_data?.preview_url ?? attachment.video_data?.preview_url,
      4_096,
    );
    return Object.freeze({
      externalId,
      type,
      mimeType: bounded(attachment.mime_type, 255),
      fileName: bounded(attachment.name, 500),
      externalUrl,
      thumbnailUrl,
      metadata: Object.freeze({ attachmentType: type, hasExternalUrl: Boolean(externalUrl), hasThumbnailUrl: Boolean(thumbnailUrl) }),
    });
  }));
}

function messageContent(message: FacebookInboxMessage, attachments: readonly FacebookInboxAttachmentRecord[]): string {
  const text = bounded(message.message, 20_000);
  if (text) return text;
  if (attachments.length === 0) return '[Facebook message]';
  return `[${attachments.map((attachment) => attachment.type).join(', ')} attachment${attachments.length > 1 ? 's' : ''}]`;
}

export function digestFacebookInboxShape(parts: readonly string[]): string {
  const input = [...parts].sort().join('|');
  const seeds = [
    BigInt('0xcbf29ce484222325'),
    BigInt('0x84222325cbf29ce4'),
    BigInt('0x9e3779b185ebca87'),
    BigInt('0x517cc1b727220a95'),
  ] as const;
  const fnvPrime64 = BigInt('0x100000001b3');
  return seeds.map((seed, index) => {
    let hash: bigint = seed;
    for (let offset = 0; offset < input.length; offset += 1) {
      hash ^= BigInt(input.charCodeAt(offset) + index * 17);
      hash = BigInt.asUintN(64, hash * fnvPrime64);
    }
    return hash.toString(16).padStart(16, '0');
  }).join('');
}

function safePlanDigest(messages: readonly FacebookInboxMessageRecord[]): string {
  return digestFacebookInboxShape(messages.map(
    (message) => `${message.providerMessageId}:${message.providerConversationId}:${message.isIncoming ? 'I' : 'O'}:${message.attachments.length}`,
  ));
}

export function planFacebookInboxSnapshot(snapshot: FacebookInboxSnapshot): FacebookInboxPlan {
  const pageId = opaqueId(snapshot.pageId);
  if (!pageId) throw new TypeError('META_FACEBOOK_PAGE_ID_INVALID');
  const records: FacebookInboxMessageRecord[] = [];
  const seenProviderMessages = new Set<string>();
  let skippedMessages = 0;
  let duplicateProviderMessages = 0;

  for (const conversation of snapshot.conversations) {
    const providerConversationId = opaqueId(conversation.id);
    if (!providerConversationId) continue;
    const participants = conversation.senders?.data ?? [];
    const customer = participants.find((participant) => opaqueId(participant.id) !== pageId) ?? participants[0] ?? null;
    const customerId = opaqueId(customer?.id);
    const conversationKey = customerId ? `facebook:${customerId}` : `facebook:${providerConversationId}`;

    for (const message of conversation.messages?.data ?? []) {
      const providerMessageId = opaqueId(message.id);
      if (!providerMessageId) {
        skippedMessages += 1;
        continue;
      }
      if (seenProviderMessages.has(providerMessageId)) {
        duplicateProviderMessages += 1;
        continue;
      }
      seenProviderMessages.add(providerMessageId);
      const attachments = normalizeFacebookInboxAttachments(message.attachments?.data);
      const senderId = opaqueId(message.from?.id) ?? customerId;
      const isIncoming = senderId !== pageId;
      const profile = senderId ? snapshot.profiles[senderId] : undefined;
      const timestamp = message.created_time ? new Date(message.created_time) : new Date(0);
      if (!Number.isFinite(timestamp.getTime())) {
        skippedMessages += 1;
        continue;
      }
      records.push(Object.freeze({
        providerMessageId,
        providerConversationId,
        conversationKey,
        senderId,
        senderName: bounded(profile?.name ?? message.from?.name ?? customer?.name, 500),
        senderAvatar: bounded(profile?.avatar, 4_096),
        content: messageContent(message, attachments),
        isIncoming,
        timestamp,
        attachments,
        rawPayload: Object.freeze({
          providerConversationId,
          providerMessageId,
          source: 'FACEBOOK_PAGE_INBOX',
        }),
      }));
    }
  }

  records.sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime()
    || left.providerMessageId.localeCompare(right.providerMessageId));
  return Object.freeze({
    pageId,
    conversations: snapshot.conversations.length,
    messages: Object.freeze(records),
    skippedMessages,
    duplicateProviderMessages,
    safeDigest: safePlanDigest(records),
  });
}

export type FacebookInboxSafeSummary = Readonly<{
  conversations: number;
  messages: number;
  attachments: number;
  skippedMessages: number;
  duplicateProviderMessages: number;
  safeDigest: string;
}>;

export function summarizeFacebookInboxPlan(plan: FacebookInboxPlan): FacebookInboxSafeSummary {
  return Object.freeze({
    conversations: plan.conversations,
    messages: plan.messages.length,
    attachments: plan.messages.reduce((total, message) => total + message.attachments.length, 0),
    skippedMessages: plan.skippedMessages,
    duplicateProviderMessages: plan.duplicateProviderMessages,
    safeDigest: plan.safeDigest,
  });
}


export function compareFacebookInboxSummaries(
  authoritative: FacebookInboxSafeSummary,
  shadow: FacebookInboxSafeSummary,
): Readonly<{ matched: boolean; authoritative: FacebookInboxSafeSummary; shadow: FacebookInboxSafeSummary; reasonCode: string }> {
  const matched = authoritative.safeDigest === shadow.safeDigest
    && authoritative.messages === shadow.messages
    && authoritative.attachments === shadow.attachments
    && authoritative.duplicateProviderMessages === shadow.duplicateProviderMessages;
  return Object.freeze({
    matched,
    authoritative,
    shadow,
    reasonCode: matched ? 'FACEBOOK_INBOX_SHADOW_MATCH' : 'FACEBOOK_INBOX_SHADOW_MISMATCH',
  });
}

export function compareFacebookInboxPlans(
  authoritative: FacebookInboxPlan,
  shadow: FacebookInboxPlan,
): Readonly<{ matched: boolean; authoritative: FacebookInboxSafeSummary; shadow: FacebookInboxSafeSummary; reasonCode: string }> {
  const authoritativeSummary = summarizeFacebookInboxPlan(authoritative);
  const shadowSummary = summarizeFacebookInboxPlan(shadow);
  const matched = authoritativeSummary.safeDigest === shadowSummary.safeDigest
    && authoritativeSummary.messages === shadowSummary.messages
    && authoritativeSummary.attachments === shadowSummary.attachments;
  return Object.freeze({
    matched,
    authoritative: authoritativeSummary,
    shadow: shadowSummary,
    reasonCode: matched ? 'FACEBOOK_INBOX_SHADOW_MATCH' : 'FACEBOOK_INBOX_SHADOW_MISMATCH',
  });
}
