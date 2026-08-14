import 'server-only';
import { publishSocialUpdate } from '@/lib/redis';
import {
  createSocialRealtimeEvent,
  parseSocialRealtimeEvent,
  type SocialRealtimeEvent,
  type SocialRealtimeEventInput,
} from '../../../packages/meta-realtime-contract/src';

export { createSocialRealtimeEvent };
export type { SocialRealtimeEvent, SocialRealtimeEventInput };

export async function publishNormalizedSocialRealtimeEvent(value: unknown): Promise<number> {
  const event = parseSocialRealtimeEvent(value);
  if (!event) throw new TypeError('SOCIAL_REALTIME_EVENT_INVALID');
  return publishSocialUpdate(event);
}

export async function createAndPublishSocialRealtimeEvent(input: SocialRealtimeEventInput): Promise<SocialRealtimeEvent> {
  const event = createSocialRealtimeEvent(input);
  await publishNormalizedSocialRealtimeEvent(event);
  return event;
}
