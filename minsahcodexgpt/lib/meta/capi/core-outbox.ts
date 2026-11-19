import 'server-only';
import { buildMetaCoreOutboxInput } from './builder';
import { createMetaEventOutbox } from './outbox-repository';
import type { MetaWebsiteCapiRequest } from './types';
import type { TrackingDecision } from '@/lib/privacy/consent-types';
import { assertMetaWebsiteEvent } from './validator';

export async function persistMetaCoreEventOutbox(input: {
  request: MetaWebsiteCapiRequest;
  sourceType: string;
  sourceId?: string | null;
  orderId?: string | null;
  safePayload?: Record<string, unknown> | null;
  policyDecision: TrackingDecision;
}) {
  const firstEvent = input.request.data[0];
  if (input.request.data.length !== 1 || !firstEvent) throw new Error('META_OUTBOX_SINGLE_EVENT_REQUIRED');
  const event = assertMetaWebsiteEvent(firstEvent);
  return createMetaEventOutbox(buildMetaCoreOutboxInput({
    ...input,
    request: { ...input.request, data: [event] },
  }));
}
