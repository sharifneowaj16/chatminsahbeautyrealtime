import { resolveTrackingDecision } from '@/lib/privacy/consent-resolver';
import type { TrackingDecision } from '@/lib/privacy/consent-types';
import {
  getClientTrackingConsent,
  getClientTrackingConsentVersion,
} from '@/lib/tracking/tracking-consent';
import { getClientTrackingBlockReason } from '@/lib/tracking/client-traffic-filter';

function toPolicyState(value: ReturnType<typeof getClientTrackingConsent>) {
  if (value === 'granted') return 'GRANTED' as const;
  if (value === 'denied') return 'DENIED' as const;
  if (value === 'withdrawn') return 'WITHDRAWN' as const;
  return 'UNKNOWN' as const;
}

export function getMetaBrowserTrackingDecision(eventName?: string): TrackingDecision {
  const blockReason = getClientTrackingBlockReason();
  return resolveTrackingDecision({
    eventName,
    consentState: toPolicyState(getClientTrackingConsent()),
    consentVersion: getClientTrackingConsentVersion(),
    internalTraffic: blockReason === 'INTERNAL_TRAFFIC',
    botTraffic: blockReason === 'BOT_OR_AUTOMATED_TRAFFIC',
  });
}

export function canDispatchMetaBrowserEvent(decision = getMetaBrowserTrackingDecision()) {
  return decision.allowPixel;
}

export function getMetaBrowserBlockReason(decision = getMetaBrowserTrackingDecision()) {
  return decision.allowPixel ? undefined : decision.reason;
}
