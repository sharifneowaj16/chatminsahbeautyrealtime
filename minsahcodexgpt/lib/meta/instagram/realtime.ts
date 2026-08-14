import 'server-only';
import { publishNormalizedSocialRealtimeEvent } from '@/lib/meta-platform/realtime/social-events';
import type { MetaInstagramInboundRealtimeEvent } from '@/lib/meta-platform/queue/instagram-inbound-event';
import type { MetaInstagramOutboundRealtimeEvent } from '@/lib/meta-platform/queue/instagram-outbound-event';

export async function publishMetaInstagramInboundRealtimeEvent(event: MetaInstagramInboundRealtimeEvent): Promise<void> {
  await publishNormalizedSocialRealtimeEvent(event);
}

export async function publishMetaInstagramOutboundRealtimeEvent(event: MetaInstagramOutboundRealtimeEvent): Promise<void> {
  await publishNormalizedSocialRealtimeEvent(event);
}
