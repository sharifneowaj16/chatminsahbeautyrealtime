const SAFE_SESSION_ID = /^[A-Za-z0-9:_-]{8,128}$/;

export function normalizeAttributionIdentity(value: unknown) {
  const normalized = String(value ?? '').trim();
  return SAFE_SESSION_ID.test(normalized) ? normalized : undefined;
}

export function buildAttributionKey(input: { sessionId?: string; visitorId?: string; orderId?: string; leadId?: string }) {
  if (input.orderId) return `order:${input.orderId}`;
  if (input.leadId) return `lead:${input.leadId}`;
  if (input.sessionId) return `session:${input.sessionId}`;
  if (input.visitorId) return `visitor:${input.visitorId}`;
  throw new Error('ATTRIBUTION_IDENTITY_REQUIRED');
}
