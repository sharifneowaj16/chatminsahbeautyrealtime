import type { TrackingEventData } from '@/types/tracking';
import { prepareMetaCatalogPayloadForEvent } from '@/lib/tracking/meta-content-id';
import { resolveMetaBrowserEventId } from './event-id';
import type { MetaBrowserEventEnvelope, MetaBrowserEventName } from './types';
import { validateMetaBrowserEvent } from './validator';
import { getMetaBrowserTrackingDecision } from './consent';
import type { TrackingDecision } from '@/lib/privacy/consent-types';

const BLOCKED_EXACT_KEYS = new Set([
  'email',
  'phone',
  'first_name',
  'firstname',
  'firstName',
  'last_name',
  'lastname',
  'lastName',
  'address',
  'street',
  'city',
  'state',
  'zip',
  'zipcode',
  'zip_code',
  'country',
  'ip',
  'ip_address',
  'user_agent',
  'access_token',
  'accesstoken',
  'authorization',
  'password',
  'secret',
  'client_secret',
]);

const BLOCKED_KEY_PATTERN = /(access.?token|authorization|password|client.?secret|api.?key)/i;

function cleanString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function safeUrl(value: unknown) {
  const raw = cleanString(value);
  if (!raw) return undefined;
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://invalid.local';
    const url = new URL(raw, base);
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

function sanitizeContentRows(value: unknown): TrackingEventData['contents'] | undefined {
  if (!Array.isArray(value)) return undefined;

  const rows = value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    const id = cleanString(row.id);
    if (!id) return [];
    const quantity = Math.max(1, Math.trunc(finiteNumber(row.quantity) ?? 1));
    const itemPrice = finiteNumber(row.item_price ?? row.price);
    return [{
      id,
      quantity,
      ...(itemPrice !== undefined && itemPrice >= 0 && { item_price: itemPrice, price: itemPrice }),
      ...(cleanString(row.item_group_id) && { item_group_id: cleanString(row.item_group_id) }),
      ...(cleanString(row.variant_id) && { variant_id: cleanString(row.variant_id) }),
      ...(cleanString(row.variant_sku) && { variant_sku: cleanString(row.variant_sku) }),
      ...(cleanString(row.item_variant) && { item_variant: cleanString(row.item_variant) }),
      ...(cleanString(row.shade) && { shade: cleanString(row.shade) }),
      ...(cleanString(row.color) && { color: cleanString(row.color) }),
      ...(cleanString(row.size) && { size: cleanString(row.size) }),
    }];
  });

  return rows.length > 0 ? rows : undefined;
}

function sanitizePrimitive(key: string, value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  if (/url$/i.test(key) || /_url$/i.test(key)) return safeUrl(value);
  return cleanString(value);
}

/**
 * Privacy-safe browser payload. This is deliberately deny-by-default for
 * nested objects and blocks direct customer identifiers and secret-like keys.
 */
export function sanitizeMetaBrowserPayload(input?: TrackingEventData | Record<string, unknown> | null): TrackingEventData {
  if (!input || typeof input !== 'object') return {};

  const output: TrackingEventData = {};
  for (const [key, value] of Object.entries(input)) {
    if (BLOCKED_EXACT_KEYS.has(key) || BLOCKED_KEY_PATTERN.test(key)) continue;

    if (key === 'contents') {
      const rows = sanitizeContentRows(value);
      if (rows) output.contents = rows;
      continue;
    }

    if (key === 'content_ids' || key === 'contentIds') {
      if (!Array.isArray(value)) continue;
      const ids = Array.from(new Set(value.map(cleanString).filter((id): id is string => Boolean(id))));
      if (ids.length > 0) output.content_ids = ids;
      continue;
    }

    if (Array.isArray(value)) {
      const primitives = value.map((item) => sanitizePrimitive(key, item)).filter((item) => item !== undefined);
      if (primitives.length > 0) output[key] = primitives;
      continue;
    }

    const sanitized = sanitizePrimitive(key, value);
    if (sanitized !== undefined) output[key] = sanitized;
  }

  if (typeof output.currency === 'string') output.currency = output.currency.toUpperCase();
  if (output.value !== undefined) {
    const value = finiteNumber(output.value);
    if (value === undefined || value < 0) delete output.value;
    else output.value = Math.round(value * 100) / 100;
  }
  if (output.num_items !== undefined) {
    const numItems = finiteNumber(output.num_items);
    if (numItems === undefined || numItems <= 0) delete output.num_items;
    else output.num_items = Math.max(1, Math.trunc(numItems));
  }

  return output;
}

export function buildMetaBrowserEvent(input: {
  eventName: MetaBrowserEventName;
  eventId?: string | null;
  payload?: TrackingEventData | Record<string, unknown> | null;
  policyDecision?: TrackingDecision;
}): MetaBrowserEventEnvelope {
  const eventId = resolveMetaBrowserEventId(input.eventName, input.eventId);
  const sanitized = sanitizeMetaBrowserPayload(input.payload);
  const payload = prepareMetaCatalogPayloadForEvent(input.eventName, sanitized) ?? {};
  const validation = validateMetaBrowserEvent({
    eventName: input.eventName,
    eventId,
    payload,
  });

  const policyDecision = input.policyDecision ?? getMetaBrowserTrackingDecision(input.eventName);
  return { eventName: input.eventName, eventId, payload, validation, policyDecision };
}

export function buildMetaBrowserCapiRequest(
  event: MetaBrowserEventEnvelope,
  identity: { fbc?: string; fbp?: string; externalId?: string; eventSourceUrl?: string }
) {
  const data = event.payload;
  return {
    eventName: event.eventName,
    eventId: event.eventId,
    eventSourceUrl: identity.eventSourceUrl,
    fbc: identity.fbc,
    fbp: identity.fbp,
    externalId: identity.externalId,
    value: data.value,
    currency: data.currency || 'BDT',
    contentIds: data.content_ids,
    contentType: data.content_type === 'product_group' ? 'product_group' : data.content_type === 'product' ? 'product' : undefined,
    contentName: data.content_name,
    contentCategory: data.content_category,
    contents: data.contents,
    numItems: data.num_items,
    orderId: data.transaction_id || data.orderId,
    searchString: data.search_string || data.search_term || data.searchString,
    status: data.status,
    method: data.method || data.payment_type || data.paymentType,
    shippingTier: data.shipping_tier || data.shippingTier,
    checkoutStep: data.checkout_step || data.checkoutStep,
    policyVersion: event.policyDecision.policyVersion,
    policyReason: event.policyDecision.reason,
    consentState: event.policyDecision.consentState,
    consentVersion: event.policyDecision.consentVersion,
    retentionUntil: event.policyDecision.retentionUntil,
  };
}
