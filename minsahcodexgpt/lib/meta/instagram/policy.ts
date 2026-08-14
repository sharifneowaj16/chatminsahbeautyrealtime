import type { InstagramReplyPolicyInput, InstagramReplyPolicyResult } from './types';

export const INSTAGRAM_STANDARD_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const INSTAGRAM_PRIVATE_REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function evaluateInstagramReplyPolicy(input: InstagramReplyPolicyInput): InstagramReplyPolicyResult {
  if (!input.accountMatches) return { eligible: false, code: 'ACCOUNT_MISMATCH', expiresAt: null };
  if (!input.permissionGranted) return { eligible: false, code: 'PERMISSION_MISSING', expiresAt: null };
  if (['SPAM', 'ARCHIVED'].includes(input.conversationStatus)) {
    return { eligible: false, code: 'CONVERSATION_CLOSED', expiresAt: null };
  }

  if (input.mode === 'PRIVATE_REPLY') {
    if (input.privateReplySentAt) return { eligible: false, code: 'PRIVATE_REPLY_ALREADY_SENT', expiresAt: input.privateReplyExpiresAt ?? null };
    if (!input.privateReplyExpiresAt || input.privateReplyExpiresAt <= input.now) {
      return { eligible: false, code: 'WINDOW_EXPIRED', expiresAt: input.privateReplyExpiresAt ?? null };
    }
    return { eligible: true, code: 'ELIGIBLE', expiresAt: input.privateReplyExpiresAt };
  }

  const expiresAt = input.replyWindowExpiresAt
    ?? (input.lastInboundAt ? new Date(input.lastInboundAt.getTime() + INSTAGRAM_STANDARD_REPLY_WINDOW_MS) : null);
  if (!expiresAt || expiresAt <= input.now) return { eligible: false, code: 'WINDOW_EXPIRED', expiresAt };
  return { eligible: true, code: 'ELIGIBLE', expiresAt };
}

export function hasInstagramMessagingPermission(permissions: unknown) {
  const record = permissions && typeof permissions === 'object' && !Array.isArray(permissions)
    ? permissions as Record<string, unknown> : {};
  const granted = Array.isArray(record.granted) ? record.granted.map(String) : [];
  return granted.includes('instagram_manage_messages') || granted.includes('instagram_business_manage_messages');
}
