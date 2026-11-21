'use client';

import { buildVisitorMetaExternalId } from '@/lib/tracking/meta-external-id';
import {
  isMetaDebugEnabled,
  upsertMetaDebugEntry,
  updateMetaDebugEntry,
  type MetaDebugEntry,
} from './debug-store';
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

function emitMetaDebug(
  event: MetaBrowserEventEnvelope,
  pixelStatus: string,
  capiStatus: string,
  detail?: string
): string | null {
  if (!isMetaDebugEnabled()) return null;
  try {
    const payload = (event.payload || {}) as Record<string, unknown>;
    const rawValue = payload.value;
    const parsedValue =
      typeof rawValue === 'number' && Number.isFinite(rawValue)
        ? rawValue
        : typeof rawValue === 'string' && rawValue.trim() && Number.isFinite(Number(rawValue))
          ? Number(rawValue)
          : undefined;
    const currency = typeof payload.currency === 'string' ? payload.currency : undefined;
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);

    upsertMetaDebugEntry({
      id,
      ts: Date.now(),
      time: new Date().toLocaleTimeString(),
      path,
      eventName: event.eventName,
      eventId: event.eventId,
      value: parsedValue,
      currency,
      pixelStatus,
      capiStatus,
      fbp: Boolean(getCookieValue('_fbp')),
      fbc: Boolean(getCookieValue('_fbc')),
      mbVid: Boolean(getCookieValue('mb_vid')),
      ...(detail ? { detail } : {}),
    });
    return id;
  } catch {
    return null;
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
    const valObj = event.validation as unknown as { errors?: string[]; reasons?: string[]; reason?: string };
    const reasonText = Array.isArray(valObj.errors) && valObj.errors.length
      ? valObj.errors.join(', ')
      : Array.isArray(valObj.reasons) && valObj.reasons.length
        ? valObj.reasons.join(', ')
        : valObj.reason || 'Validation failed';
    emitMetaDebug(event, 'INVALID_EVENT', 'SKIPPED', reasonText);
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
    const debugId = emitMetaDebug(event, 'PIXEL_UNAVAILABLE', sendCapi ? 'SENDING...' : 'SKIPPED');
    const capi = sendCapi ? await requestCapi(event) : { sent: false, status: 'SKIPPED' };
    if (debugId) updateMetaDebugEntry(debugId, { capiStatus: capi.status });
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

  const debugId = emitMetaDebug(event, 'OK (' + trackCommand + ')', sendCapi ? 'SENDING...' : 'SKIPPED');
  const capi = sendCapi ? await requestCapi(event) : { sent: false, status: 'SKIPPED' };
  if (debugId) updateMetaDebugEntry(debugId, { capiStatus: capi.status });

  return {
    fired: true,
    capiRequested: capi.sent,
    ...(!sendCapi && event.eventName !== 'Purchase' && { reason: 'UNSUPPORTED_CAPI_EVENT' as const }),
  };
}
