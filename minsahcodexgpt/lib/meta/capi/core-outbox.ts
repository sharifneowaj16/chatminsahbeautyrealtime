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
  if (input.request.data.length !== 1) throw new Error('META_OUTBOX_SINGLE_EVENT_REQUIRED');
  const event = assertMetaWebsiteEvent(input.request.data[0]);
  return createMetaEventOutbox(buildMetaCoreOutboxInput({
    ...input,
    request: { ...input.request, data: [event] },
  }));
}
