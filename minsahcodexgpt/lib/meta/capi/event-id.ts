const META_EVENT_ID_MAX_LENGTH = 100;

export function buildMetaPurchaseEventId(orderId: string) {
  const normalized = orderId.trim().replace(/[^A-Za-z0-9._-]/g, '-');
  if (!normalized) throw new Error('META_ORDER_ID_REQUIRED');
  return `Purchase-${normalized}`.slice(0, META_EVENT_ID_MAX_LENGTH);
}

export function assertMetaEventIdentity(eventName: string, eventId: string) {
  const normalizedName = eventName.trim();
  const normalizedId = eventId.trim();
  if (!normalizedName) throw new Error('META_EVENT_NAME_REQUIRED');
  if (!normalizedId) throw new Error('META_EVENT_ID_REQUIRED');
  if (normalizedId.length > META_EVENT_ID_MAX_LENGTH) {
    throw new Error('META_EVENT_ID_TOO_LONG');
  }
  return { eventName: normalizedName, eventId: normalizedId };
}
