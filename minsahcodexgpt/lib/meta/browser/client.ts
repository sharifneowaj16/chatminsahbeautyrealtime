'use client';

import { buildVisitorMetaExternalId } from '@/lib/tracking/meta-external-id';
import { canDispatchMetaBrowserEvent } from './consent';
import { metaBrowserDebug } from './diagnostics';
import { buildMetaBrowserCapiRequest } from './payload';
import type {
  MetaBrowserDispatchOptions,
  MetaBrowserDispatchResult,
  MetaBrowserEventEnvelope,
} from './types';

const PUBLIC_CAPI_EVENTS = new Set([
  'PageView',
  'ViewContent',
  'AddToCart',
  'AddToWishlist',
  'ViewCart',
  'InitiateCheckout',
  'AddShippingInfo',
  'AddPaymentInfo',
  'Search',
  'CompleteRegistration',
  'Contact',
]);

type MetaPixelWindow = Window & {
  fbq?: (...args: unknown[]) => void;
  __mbFbInitReady?: boolean;
};


function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getEventSourceUrl() {
  if (typeof window === 'undefined') return undefined;
  try {
    return `${window.location.origin}${window.location.pathname}`;
  } catch {
    return undefined;
  }
}

function getIdentity() {
  return {
    fbc: getCookieValue('_fbc'),
    fbp: getCookieValue('_fbp'),
    externalId: buildVisitorMetaExternalId(getCookieValue('mb_vid')),
    eventSourceUrl: getEventSourceUrl(),
  };
}

function wait(ms: number) {
  return new Promise<void>((resolve) => globalThis.setTimeout(resolve, ms));
}

async function requestCapi(event: MetaBrowserEventEnvelope) {
  if (!PUBLIC_CAPI_EVENTS.has(event.eventName)) return false;
  const body = buildMetaBrowserCapiRequest(event, getIdentity());
  try {
    await fetch('/api/facebook-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
      keepalive: true,
    });
    return true;
  } catch {
    metaBrowserDebug('error', 'CAPI request failed', event);
    return true;
  }
}

export async function dispatchMetaBrowserEvent(
  event: MetaBrowserEventEnvelope,
  options: MetaBrowserDispatchOptions = {}
): Promise<MetaBrowserDispatchResult> {
  if (typeof window === 'undefined' || !canDispatchMetaBrowserEvent(event.policyDecision)) {
    return { fired: false, capiRequested: false, reason: 'CONSENT_BLOCKED' };
  }
  if (!event.validation.valid) {
    metaBrowserDebug('warn', 'Invalid event blocked', event);
    return { fired: false, capiRequested: false, reason: 'INVALID_EVENT' };
  }

  const maxAttempts = options.maxReadyAttempts ?? 50;
  const retryDelayMs = options.retryDelayMs ?? 100;
  let ready = false;

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    if (!canDispatchMetaBrowserEvent(event.policyDecision)) {
      return { fired: false, capiRequested: false, reason: 'CONSENT_BLOCKED' };
    }
    if (typeof (window as MetaPixelWindow).fbq === 'function' && (window as MetaPixelWindow).__mbFbInitReady === true) {
      ready = true;
      break;
    }
    if (attempt < maxAttempts) await wait(retryDelayMs);
  }

  if (typeof (window as MetaPixelWindow).fbq !== 'function') {
    metaBrowserDebug('error', 'Pixel unavailable after readiness window', event);
    return { fired: false, capiRequested: false, reason: 'PIXEL_UNAVAILABLE' };
  }

  (window as MetaPixelWindow).fbq?.('track', event.eventName, event.payload, { eventID: event.eventId });
  metaBrowserDebug(ready ? 'debug' : 'warn', ready ? 'Pixel fired' : 'Pixel fired through fallback readiness path', event);

  const sendCapi = options.sendCapi !== false && event.eventName !== 'Purchase' && event.policyDecision.allowCapiEvent;
  const capiRequested = sendCapi ? await requestCapi(event) : false;
  return {
    fired: true,
    capiRequested,
    ...(!sendCapi && event.eventName !== 'Purchase' && { reason: 'UNSUPPORTED_CAPI_EVENT' as const }),
  };
}
