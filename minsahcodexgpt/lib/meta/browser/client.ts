'use client';

import { buildVisitorMetaExternalId } from '@/lib/tracking/meta-external-id';
import type { MetaDebugEntry } from '@/lib/tracking/pixels/MetaDebugPanel';
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

const CUSTOM_META_PIXEL_EVENTS = new Set([
  'ViewCart',
  'AddShippingInfo',
]);

type MetaPixelWindow = Window & {
  fbq?: ((...args: unknown[]) => void) & { disablePushState?: boolean };
  __mbFbInitReady?: boolean;
  __mbMetaDebugEnabled?: boolean;
  __mbMetaDebugQueue?: MetaDebugEntry[];
};

function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
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
    return window.location.origin + window.location.pathname;
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

function isMetaDebugActive(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as MetaPixelWindow;
  try {
    const flag = new URLSearchParams(window.location.search).get('mb_debug');
    if (flag === '1') {
      win.__mbMetaDebugEnabled = true;
      sessionStorage.setItem('mb_meta_debug_enabled', '1');
      return true;
    }
    if (flag === '0') return false;
    if (win.__mbMetaDebugEnabled) return true;
    return sessionStorage.getItem('mb_meta_debug_enabled') === '1';
  } catch {
    return Boolean(win.__mbMetaDebugEnabled);
  }
}

function emitMetaDebug(
  event: MetaBrowserEventEnvelope,
  pixelStatus: string,
  capiStatus: string
) {
  if (!isMetaDebugActive()) return;
  try {
    const win = window as MetaPixelWindow;
    const entry: MetaDebugEntry = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      time: new Date().toLocaleTimeString(),
      eventName: event.eventName,
      eventId: event.eventId,
      pixelStatus,
      capiStatus,
      fbp: Boolean(getCookieValue('_fbp')),
      fbc: Boolean(getCookieValue('_fbc')),
    };
    win.__mbMetaDebugQueue = [entry, ...(win.__mbMetaDebugQueue || [])].slice(0, 30);
    window.dispatchEvent(new CustomEvent('mb:meta-debug', { detail: entry }));
  } catch {
    // ignore debug hook errors
  }
}

async function requestCapi(
  event: MetaBrowserEventEnvelope
): Promise<{ sent: boolean; status: string }> {
  if (!PUBLIC_CAPI_EVENTS.has(event.eventName)) {
    return { sent: false, status: 'SKIPPED' };
  }
  const body = buildMetaBrowserCapiRequest(event, getIdentity());
  try {
    const res = await fetch('/api/facebook-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
      keepalive: true,
    });
    return { sent: true, status: res.status + ' ' + (res.ok ? 'OK' : 'ERR') };
  } catch {
    metaBrowserDebug('error', 'CAPI request failed', event);
    return { sent: true, status: 'NET_ERR' };
  }
}

export async function dispatchMetaBrowserEvent(
  event: MetaBrowserEventEnvelope,
  options: MetaBrowserDispatchOptions = {}
): Promise<MetaBrowserDispatchResult> {
  if (typeof window === 'undefined' || !canDispatchMetaBrowserEvent(event.policyDecision)) {
    emitMetaDebug(event, 'CONSENT_BLOCKED', 'SKIPPED');
    return { fired: false, capiRequested: false, reason: 'CONSENT_BLOCKED' };
  }
  if (!event.validation.valid) {
    metaBrowserDebug('warn', 'Invalid event blocked', event);
    emitMetaDebug(event, 'INVALID_EVENT', 'SKIPPED');
    return { fired: false, capiRequested: false, reason: 'INVALID_EVENT' };
  }

  const sendCapi =
    options.sendCapi !== false &&
    event.eventName !== 'Purchase' &&
    event.policyDecision.allowCapiEvent;

  const maxAttempts = options.maxReadyAttempts ?? 50;
  const retryDelayMs = options.retryDelayMs ?? 100;
  let ready = false;

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    if (!canDispatchMetaBrowserEvent(event.policyDecision)) {
      emitMetaDebug(event, 'CONSENT_BLOCKED', 'SKIPPED');
      return { fired: false, capiRequested: false, reason: 'CONSENT_BLOCKED' };
    }
    if (
      typeof (window as MetaPixelWindow).fbq === 'function' &&
      (window as MetaPixelWindow).__mbFbInitReady === true
    ) {
      ready = true;
      break;
    }
    if (attempt < maxAttempts) await wait(retryDelayMs);
  }

  if (typeof (window as MetaPixelWindow).fbq !== 'function') {
    metaBrowserDebug('error', 'Pixel unavailable after readiness window; falling back to CAPI', event);
    const capi = sendCapi ? await requestCapi(event) : { sent: false, status: 'SKIPPED' };
    emitMetaDebug(event, 'PIXEL_UNAVAILABLE', capi.status);
    return { fired: false, capiRequested: capi.sent, reason: 'PIXEL_UNAVAILABLE' };
  }

  const fbqRef = (window as MetaPixelWindow).fbq;
  if (fbqRef) {
    fbqRef.disablePushState = true;
  }
    const trackCommand = CUSTOM_META_PIXEL_EVENTS.has(event.eventName) ? 'trackCustom' : 'track';
  (window as MetaPixelWindow).fbq?.(trackCommand, event.eventName, event.payload, {
    eventID: event.eventId,
  });
  metaBrowserDebug(
    ready ? 'debug' : 'warn',
    ready
      ? 'Pixel fired (' + trackCommand + ')'
      : 'Pixel fired through fallback readiness path (' + trackCommand + ')',
    event
  );

  const capi = sendCapi ? await requestCapi(event) : { sent: false, status: 'SKIPPED' };
  emitMetaDebug(event, 'OK (' + trackCommand + ')', capi.status);
  return {
    fired: true,
    capiRequested: capi.sent,
    ...(!sendCapi && event.eventName !== 'Purchase' && { reason: 'UNSUPPORTED_CAPI_EVENT' as const }),
  };
}
