/**
 * Meta external_id identity contract for Browser Pixel + Server CAPI.
 *
 * Production rules:
 * - Never send raw database IDs directly to Meta.
 * - Always use a namespaced stable key: visitor:<mb_vid>, user:<userId>, or order:<orderId>.
 * - Always normalize before hashing: String(value).trim().toLowerCase().
 * - Prefer visitor:<mb_vid> when available so Browser Pixel and CAPI share the same external_id.
 */

export type MetaExternalIdPrefix = 'visitor' | 'user' | 'order';

export const META_VISITOR_ID_COOKIE = 'mb_vid';

const ALLOWED_PREFIXES = new Set<MetaExternalIdPrefix>(['visitor', 'user', 'order']);

export function normalizeMetaExternalIdValue(value?: string | number | null): string | undefined {
  if (value === undefined || value === null) return undefined;

  const normalized = String(value).trim().toLowerCase();
  return normalized || undefined;
}

export function normalizeMetaExternalId(
  value?: string | number | null,
  fallbackPrefix: MetaExternalIdPrefix = 'visitor'
): string | undefined {
  const normalized = normalizeMetaExternalIdValue(value);
  if (!normalized) return undefined;

  const separatorIndex = normalized.indexOf(':');
  if (separatorIndex > 0) {
    const prefix = normalized.slice(0, separatorIndex) as MetaExternalIdPrefix;
    const id = normalizeMetaExternalIdValue(normalized.slice(separatorIndex + 1));
    if (id && ALLOWED_PREFIXES.has(prefix)) {
      return `${prefix}:${id}`;
    }
  }

  return `${fallbackPrefix}:${normalized}`;
}

export function buildVisitorMetaExternalId(visitorId?: string | number | null): string | undefined {
  return normalizeMetaExternalId(visitorId, 'visitor');
}

export function buildUserMetaExternalId(userId?: string | number | null): string | undefined {
  return normalizeMetaExternalId(userId, 'user');
}

export function buildOrderMetaExternalId(orderId?: string | number | null): string | undefined {
  return normalizeMetaExternalId(orderId, 'order');
}

export function chooseCanonicalMetaExternalId(options: {
  visitorId?: string | number | null;
  userId?: string | number | null;
  orderId?: string | number | null;
}): string | undefined {
  // Browser Pixel can only reliably know mb_vid, so visitor ID is the canonical first choice.
  return (
    buildVisitorMetaExternalId(options.visitorId) ??
    buildUserMetaExternalId(options.userId) ??
    buildOrderMetaExternalId(options.orderId)
  );
}
