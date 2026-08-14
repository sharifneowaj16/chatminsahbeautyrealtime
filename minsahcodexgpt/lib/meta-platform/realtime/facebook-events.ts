import 'server-only';
import {
  createSocialRealtimeEvent,
  publishNormalizedSocialRealtimeEvent,
  type SocialRealtimeEvent,
} from './social-events';
import type { SocialRealtimeEventType } from '../../../packages/meta-realtime-contract/src';

export function createFacebookRealtimeEvent(input: Readonly<{
  type: Extract<SocialRealtimeEventType,
    'FACEBOOK_MESSAGE_UPSERTED' | 'FACEBOOK_COMMENT_UPSERTED' | 'FACEBOOK_RECEIPT_UPDATED' | 'FACEBOOK_REPLY_STATE_CHANGED' | 'SOCIAL_ATTACHMENT_STATE_CHANGED' | 'SOCIAL_CONVERSATION_READ'>;
  correlationId: string;
  occurredAt?: Date | string;
  receiptId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  providerEventKey?: string | null;
  state?: string | null;
  reasonCode?: string | null;
}>): SocialRealtimeEvent {
  return createSocialRealtimeEvent({
    ...input,
    platform: 'facebook',
    orderingKey: input.conversationId ?? input.receiptId ?? input.providerEventKey ?? input.correlationId,
  });
}

export async function publishFacebookRealtimeEvent(event: SocialRealtimeEvent): Promise<number> {
  if (event.platform !== 'facebook') throw new TypeError('FACEBOOK_REALTIME_EVENT_INVALID');
  return publishNormalizedSocialRealtimeEvent(event);
}
