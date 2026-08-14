
export const INSTAGRAM_PRIVATE_REPLY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

export type InstagramPrivateReplySurface = 'POST_OR_REEL' | 'LIVE';
export type InstagramPrivateReplyBlockCode =
  | 'INSTAGRAM_PRIVATE_REPLY_SOURCE_REQUIRED'
  | 'INSTAGRAM_PRIVATE_REPLY_SOURCE_SCOPE_MISMATCH'
  | 'INSTAGRAM_PRIVATE_REPLY_POST_RELATIONSHIP_REQUIRED'
  | 'INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT_OR_BLOCKED'
  | 'INSTAGRAM_PRIVATE_REPLY_WINDOW_EXPIRED'
  | 'INSTAGRAM_PRIVATE_REPLY_EXPIRY_STATE_MISMATCH'
  | 'INSTAGRAM_PRIVATE_REPLY_LIVE_STATE_REQUIRED'
  | 'INSTAGRAM_PRIVATE_REPLY_LIVE_ENDED';

export type InstagramPrivateReplyPolicyResult = Readonly<{
  eligible: boolean;
  code: 'ELIGIBLE' | InstagramPrivateReplyBlockCode;
  persistenceEligibility: 'ELIGIBLE' | 'WINDOW_EXPIRED' | 'PRIVATE_REPLY_ALREADY_SENT' | 'UNSUPPORTED';
  surface: InstagramPrivateReplySurface;
  expiresAt: Date | null;
}>;

function cleanId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function canonicalDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return new Date(value.getTime());
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function blocked(
  code: InstagramPrivateReplyBlockCode,
  surface: InstagramPrivateReplySurface,
  persistenceEligibility: InstagramPrivateReplyPolicyResult['persistenceEligibility'],
  expiresAt: Date | null,
): InstagramPrivateReplyPolicyResult {
  return Object.freeze({ eligible: false, code, persistenceEligibility, surface, expiresAt });
}

export function resolveInstagramPrivateReplySurface(policyData: unknown): Readonly<{
  surface: InstagramPrivateReplySurface;
  liveBroadcastActive: boolean | null;
}> {
  const row = policyData && typeof policyData === 'object' && !Array.isArray(policyData)
    ? policyData as Readonly<Record<string, unknown>>
    : {};
  const surface = row.privateReplySurface === 'LIVE' ? 'LIVE' : 'POST_OR_REEL';
  const liveBroadcastActive = typeof row.liveBroadcastActive === 'boolean' ? row.liveBroadcastActive : null;
  return Object.freeze({ surface, liveBroadcastActive });
}

export function evaluateInstagramPrivateReplyPolicy(input: Readonly<{
  now: Date;
  conversationId: unknown;
  conversationAccountIdentityReferenceId: unknown;
  sourceMessageId: unknown;
  sourceConversationId: unknown;
  sourceAccountIdentityReferenceId: unknown;
  sourceCommentId: unknown;
  sourcePostId: unknown;
  sourceOccurredAt: unknown;
  storedExpiresAt: unknown;
  privateReplySentAt?: unknown;
  reservationStatus?: unknown;
  surface: InstagramPrivateReplySurface;
  liveBroadcastActive: boolean | null;
}>): InstagramPrivateReplyPolicyResult {
  const conversationId = cleanId(input.conversationId);
  const accountIdentityReferenceId = cleanId(input.conversationAccountIdentityReferenceId);
  const sourceMessageId = cleanId(input.sourceMessageId);
  const sourceConversationId = cleanId(input.sourceConversationId);
  const sourceAccountIdentityReferenceId = cleanId(input.sourceAccountIdentityReferenceId);
  const sourceCommentId = cleanId(input.sourceCommentId);
  const sourcePostId = cleanId(input.sourcePostId);
  const occurredAt = canonicalDate(input.sourceOccurredAt);
  const storedExpiresAt = canonicalDate(input.storedExpiresAt);
  const sentAt = canonicalDate(input.privateReplySentAt);
  const reservationStatus = cleanId(input.reservationStatus);

  if (!conversationId || !accountIdentityReferenceId || !sourceMessageId || !sourceCommentId || !occurredAt) {
    return blocked('INSTAGRAM_PRIVATE_REPLY_SOURCE_REQUIRED', input.surface, 'UNSUPPORTED', null);
  }
  if (sourceConversationId !== conversationId || sourceAccountIdentityReferenceId !== accountIdentityReferenceId) {
    return blocked('INSTAGRAM_PRIVATE_REPLY_SOURCE_SCOPE_MISMATCH', input.surface, 'UNSUPPORTED', null);
  }
  if (!sourcePostId) {
    return blocked('INSTAGRAM_PRIVATE_REPLY_POST_RELATIONSHIP_REQUIRED', input.surface, 'UNSUPPORTED', null);
  }
  const derivedExpiresAt = new Date(occurredAt.getTime() + INSTAGRAM_PRIVATE_REPLY_MAX_AGE_MS);
  if (!storedExpiresAt || storedExpiresAt.getTime() !== derivedExpiresAt.getTime()) {
    return blocked('INSTAGRAM_PRIVATE_REPLY_EXPIRY_STATE_MISMATCH', input.surface, 'UNSUPPORTED', derivedExpiresAt);
  }
  if (sentAt || (reservationStatus && !['RESERVED', 'SENDING'].includes(reservationStatus))) {
    return blocked('INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT_OR_BLOCKED', input.surface, 'PRIVATE_REPLY_ALREADY_SENT', derivedExpiresAt);
  }
  if (derivedExpiresAt.getTime() <= input.now.getTime()) {
    return blocked('INSTAGRAM_PRIVATE_REPLY_WINDOW_EXPIRED', input.surface, 'WINDOW_EXPIRED', derivedExpiresAt);
  }
  if (input.surface === 'LIVE') {
    if (input.liveBroadcastActive === null) {
      return blocked('INSTAGRAM_PRIVATE_REPLY_LIVE_STATE_REQUIRED', input.surface, 'UNSUPPORTED', derivedExpiresAt);
    }
    if (!input.liveBroadcastActive) {
      return blocked('INSTAGRAM_PRIVATE_REPLY_LIVE_ENDED', input.surface, 'UNSUPPORTED', derivedExpiresAt);
    }
  }
  return Object.freeze({
    eligible: true,
    code: 'ELIGIBLE',
    persistenceEligibility: 'ELIGIBLE',
    surface: input.surface,
    expiresAt: derivedExpiresAt,
  });
}

function stableProviderProjection(value: unknown): Readonly<Record<string, string>> {
  const row = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : {};
  const projection: Record<string, string> = {};
  for (const key of ['id', 'message_id', 'status']) {
    const item = row[key];
    if (typeof item === 'string' && item.trim()) projection[key] = item.trim().slice(0, 255);
  }
  return Object.freeze(projection);
}

export function captureInstagramPrivateReplyProviderResponse(value: unknown): Readonly<{
  providerMessageId: string | null;
  safeDigestInput: string;
}> {
  const projection = stableProviderProjection(value);
  const providerMessageId = projection.message_id ?? projection.id ?? null;
  const safeDigestInput = JSON.stringify(Object.keys(projection).sort().map((key) => [key, projection[key]]));
  return Object.freeze({ providerMessageId, safeDigestInput });
}
