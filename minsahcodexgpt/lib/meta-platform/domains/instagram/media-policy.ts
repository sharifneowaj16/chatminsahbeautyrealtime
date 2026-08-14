export const INSTAGRAM_MEDIA_MAX_BYTES = 25 * 1024 * 1024;
export const INSTAGRAM_MEDIA_TYPES = ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'] as const;
export type InstagramMediaType = (typeof INSTAGRAM_MEDIA_TYPES)[number] | 'UNKNOWN';
export type InstagramMediaDecision = 'PENDING' | 'ALLOWED' | 'QUARANTINED' | 'REJECTED' | 'FAILED';

const ALLOWED_EXACT_MIME = new Set(['application/pdf', 'application/octet-stream']);
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'] as const;

function cleanText(value: unknown, max = 255): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return clean ? clean.slice(0, max) : null;
}

function normalizeType(value: unknown): InstagramMediaType {
  const type = String(value ?? '').trim().toUpperCase();
  return INSTAGRAM_MEDIA_TYPES.includes(type as (typeof INSTAGRAM_MEDIA_TYPES)[number])
    ? type as (typeof INSTAGRAM_MEDIA_TYPES)[number]
    : 'UNKNOWN';
}

function normalizeMime(value: unknown): string | null {
  const mime = cleanText(value, 255)?.toLowerCase().split(';')[0]?.trim() ?? null;
  return mime || null;
}

function mimeAllowed(mime: string | null): boolean {
  return !mime || ALLOWED_EXACT_MIME.has(mime) || ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

export type InstagramAttachmentMetadataPolicy = Readonly<{
  type: InstagramMediaType;
  mimeType: string | null;
  fileSize: number | null;
  sourceDigest: string | null;
  decision: 'PENDING' | 'REJECTED';
  safeReasonCode: string | null;
  quarantine: boolean;
}>;

export function evaluateInstagramAttachmentMetadataPolicy(input: Readonly<{
  type: unknown;
  mimeType?: unknown;
  fileSize?: unknown;
  sourceDigest?: unknown;
  hasSourceUrl: boolean;
}>): InstagramAttachmentMetadataPolicy {
  const type = normalizeType(input.type);
  const mimeType = normalizeMime(input.mimeType);
  const fileSize = typeof input.fileSize === 'number' && Number.isSafeInteger(input.fileSize) ? input.fileSize : null;
  const sourceDigest = cleanText(input.sourceDigest, 128);
  let safeReasonCode: string | null = null;
  if (type === 'UNKNOWN') safeReasonCode = 'ATTACHMENT_TYPE_BLOCKED';
  else if (fileSize !== null && (fileSize < 0 || fileSize > INSTAGRAM_MEDIA_MAX_BYTES)) safeReasonCode = 'ATTACHMENT_SIZE_BLOCKED';
  else if (!mimeAllowed(mimeType)) safeReasonCode = 'ATTACHMENT_MIME_BLOCKED';
  else if (!input.hasSourceUrl) safeReasonCode = 'ATTACHMENT_URL_MISSING';
  return Object.freeze({
    type,
    mimeType,
    fileSize,
    sourceDigest,
    decision: safeReasonCode ? 'REJECTED' : 'PENDING',
    safeReasonCode,
    quarantine: safeReasonCode === 'ATTACHMENT_MALWARE_DETECTED',
  });
}

export function toInstagramAttachmentSafeProjection(input: Readonly<{
  id: unknown;
  messageId?: unknown;
  type: unknown;
  status: unknown;
  mimeType?: unknown;
  fileSize?: unknown;
  sourceUrlDigest?: unknown;
  contentDigest?: unknown;
  failureCode?: unknown;
  quarantinedAt?: unknown;
}>): Readonly<Record<string, unknown>> {
  const id = cleanText(input.id, 255) ?? 'unknown';
  const messageId = cleanText(input.messageId, 255);
  const status = cleanText(input.status, 40)?.toUpperCase() ?? 'UNKNOWN';
  const type = normalizeType(input.type);
  const mimeType = normalizeMime(input.mimeType);
  const fileSize = typeof input.fileSize === 'number' && Number.isSafeInteger(input.fileSize) && input.fileSize >= 0 ? input.fileSize : null;
  const sourceUrlDigest = cleanText(input.sourceUrlDigest, 128);
  const contentDigest = cleanText(input.contentDigest, 128);
  const reasonCode = cleanText(input.failureCode, 96)?.toUpperCase().replace(/[^A-Z0-9_]/g, '_') ?? null;
  return Object.freeze({
    id,
    ...(messageId ? { messageId } : {}),
    type,
    status,
    ...(mimeType ? { mimeType } : {}),
    ...(fileSize !== null ? { fileSize } : {}),
    ...(sourceUrlDigest ? { sourceUrlDigest } : {}),
    ...(contentDigest ? { contentDigest } : {}),
    ...(reasonCode ? { reasonCode } : {}),
    quarantined: Boolean(input.quarantinedAt),
    mediaReady: status === 'READY',
  });
}

export function projectInstagramConversationMediaSafe<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  const row = value as Record<string, unknown>;
  const messages = Array.isArray(row.messages) ? row.messages.map((message) => {
    if (!message || typeof message !== 'object') return message;
    const messageRow = message as Record<string, unknown>;
    const attachments = Array.isArray(messageRow.attachments)
      ? messageRow.attachments.map((attachment) => {
        const item = attachment && typeof attachment === 'object' ? attachment as Record<string, unknown> : {};
        return toInstagramAttachmentSafeProjection({
          id: item.id,
          messageId: item.messageId,
          type: item.type,
          status: item.status,
          mimeType: item.mimeType,
          fileSize: item.fileSize,
          sourceUrlDigest: item.sourceUrlDigest,
          contentDigest: item.contentDigest,
          failureCode: item.failureCode,
          quarantinedAt: item.quarantinedAt,
        });
      })
      : [];
    return { ...messageRow, attachments };
  }) : row.messages;
  return { ...row, ...(messages ? { messages } : {}) } as T;
}

export function evaluateInstagramOutboundAttachmentPolicy(input: Readonly<{
  status: unknown;
  policyDecision?: unknown;
  type: unknown;
  mimeType?: unknown;
  fileSize?: unknown;
  storageKey?: unknown;
}>): Readonly<{ allowed: boolean; safeReasonCode: string }> {
  const metadata = evaluateInstagramAttachmentMetadataPolicy({
    type: input.type,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    hasSourceUrl: true,
  });
  if (metadata.decision === 'REJECTED') return Object.freeze({ allowed: false, safeReasonCode: metadata.safeReasonCode ?? 'INSTAGRAM_OUTBOUND_MEDIA_BLOCKED' });
  if (String(input.status).toUpperCase() !== 'READY' || String(input.policyDecision).toUpperCase() !== 'ALLOWED') {
    return Object.freeze({ allowed: false, safeReasonCode: 'INSTAGRAM_OUTBOUND_MEDIA_NOT_VALIDATED' });
  }
  if (!cleanText(input.storageKey, 1000)) return Object.freeze({ allowed: false, safeReasonCode: 'INSTAGRAM_OUTBOUND_MEDIA_STORAGE_REQUIRED' });
  return Object.freeze({ allowed: true, safeReasonCode: 'ALLOWED' });
}

export function assertInstagramOutboundMediaRequestSupported(value: unknown): void {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value)) throw Object.assign(new Error('INSTAGRAM_OUTBOUND_ATTACHMENTS_INVALID'), { retryable: false, status: 409 });
  if (value.length === 0) return;
  for (const attachment of value) {
    const row = attachment && typeof attachment === 'object' ? attachment as Record<string, unknown> : {};
    const policy = evaluateInstagramAttachmentMetadataPolicy({
      type: row.type,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      hasSourceUrl: typeof row.url === 'string' && Boolean(row.url.trim()),
    });
    if (policy.decision === 'REJECTED') {
      throw Object.assign(new Error(policy.safeReasonCode ?? 'INSTAGRAM_OUTBOUND_MEDIA_BLOCKED'), { retryable: false, status: 409 });
    }
  }
  throw Object.assign(new Error('INSTAGRAM_OUTBOUND_MEDIA_NOT_SUPPORTED'), { retryable: false, status: 409 });
}
