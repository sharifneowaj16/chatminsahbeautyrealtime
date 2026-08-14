import { buildMetaPurchaseEventId } from './event-id';
import { normalizeMetaEventSourceUrl } from './validator';
import type { TrackingDecision } from '@/lib/privacy/consent-types';
import { resolveTrackingDecision } from '@/lib/privacy/consent-resolver';
import type {
  CreateMetaEventOutboxInput,
  MetaCoreOutboxPayload,
  MetaPurchaseOutboxPayload,
  MetaWebsiteCapiRequest,
} from './types';

const DEFAULT_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://minsahbeauty.cloud';

export function resolveMetaWebsiteSourceUrl(value?: string | null) {
  const candidate = value?.trim() || DEFAULT_SITE_URL;
  try {
    const absolute = new URL(candidate, DEFAULT_SITE_URL).toString();
    return normalizeMetaEventSourceUrl(absolute) ?? normalizeMetaEventSourceUrl(DEFAULT_SITE_URL) ?? DEFAULT_SITE_URL;
  } catch {
    return normalizeMetaEventSourceUrl(DEFAULT_SITE_URL) ?? DEFAULT_SITE_URL;
  }
}

export function buildMetaCoreOutboxInput(input: {
  request: MetaWebsiteCapiRequest;
  sourceType: string;
  sourceId?: string | null;
  orderId?: string | null;
  safePayload?: Record<string, unknown> | null;
  policyDecision?: TrackingDecision;
}): CreateMetaEventOutboxInput {
  if (input.request.data.length !== 1) {
    throw new Error('META_OUTBOX_SINGLE_EVENT_REQUIRED');
  }
  const event = input.request.data[0];
  const payload: MetaCoreOutboxPayload = { kind: 'core_event', request: input.request };
  return {
    eventName: event.event_name,
    eventId: event.event_id,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    orderId: input.orderId,
    actionSource: 'website',
    eventSourceUrl: resolveMetaWebsiteSourceUrl(event.event_source_url),
    eventTime: new Date(event.event_time * 1000),
    payload,
    safePayload: input.safePayload,
    policyDecision: input.policyDecision ?? resolveTrackingDecision({ eventName: event.event_name }),
  };
}

export function buildMetaPurchaseOutboxInput(input: {
  purchaseType: 'cod_purchase' | 'online_paid_purchase';
  orderId: string;
  eventTime: Date;
  eventSourceUrl?: string | null;
  sourceType: string;
  sourceId?: string | null;
  safePayload?: Record<string, unknown> | null;
  policyDecision?: TrackingDecision;
}): CreateMetaEventOutboxInput {
  const eventId = buildMetaPurchaseEventId(input.orderId);
  const payload: MetaPurchaseOutboxPayload = {
    kind: 'purchase',
    purchaseType: input.purchaseType,
    orderId: input.orderId,
  };
  return {
    eventName: 'Purchase',
    eventId,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? input.orderId,
    orderId: input.orderId,
    actionSource: 'website',
    eventSourceUrl: resolveMetaWebsiteSourceUrl(input.eventSourceUrl),
    eventTime: input.eventTime,
    payload,
    policyDecision: input.policyDecision ?? resolveTrackingDecision({ eventName: 'Purchase' }),
    safePayload: {
      event_name: 'Purchase',
      event_id: eventId,
      order_id: input.orderId,
      event_time: Math.floor(input.eventTime.getTime() / 1000),
      source: input.purchaseType,
      ...(input.safePayload ?? {}),
    },
  };
}
