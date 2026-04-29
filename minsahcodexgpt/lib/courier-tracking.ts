export type CourierSource = 'pathao' | 'steadfast';

export interface UnifiedTrackingTimelineItem {
  status: string;
  message: string;
  timestamp: string;
  source: CourierSource;
}

export interface UnifiedCourierTracking {
  courier: CourierSource;
  trackingId: string | null;
  consignmentId: string | null;
  currentStatus: string;
  lastUpdatedAt: string | null;
  deliveryCharge: number;
  timeline: UnifiedTrackingTimelineItem[];
}

type PathaoWebhookEventInput = {
  eventType: string;
  payload: unknown;
  processedAt?: Date | null;
  receivedAt: Date;
};

type SteadfastWebhookEventInput = {
  eventType: string;
  status?: string | null;
  trackingMessage?: string | null;
  processedAt?: Date | null;
  receivedAt: Date;
};

type OrderTrackingInput = {
  shippingMethod?: string | null;
  trackingNumber?: string | null;
  shippingCost?: unknown;
  updatedAt?: Date | null;
  pathaoStatus?: string | null;
  pathaoTrackingCode?: string | null;
  pathaoConsignmentId?: string | null;
  pathaoSentAt?: Date | null;
  steadfastStatus?: string | null;
  steadfastTrackingCode?: string | null;
  steadfastConsignmentId?: string | null;
  steadfastSentAt?: Date | null;
  pathaoWebhookEvents?: PathaoWebhookEventInput[];
  steadfastWebhookEvents?: SteadfastWebhookEventInput[];
};

function extractString(source: unknown, keys: string[]): string | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }

  return null;
}

function toIsoString(value?: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as { toNumber?: unknown }).toNumber === 'function') {
    const parsed = (value as { toNumber: () => number }).toNumber();
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferCourier(order: OrderTrackingInput): CourierSource {
  if (
    order.shippingMethod === 'pathao' ||
    order.pathaoConsignmentId ||
    order.pathaoTrackingCode ||
    order.pathaoStatus
  ) {
    return 'pathao';
  }

  return 'steadfast';
}

function normalizePathaoTimeline(events: PathaoWebhookEventInput[]): UnifiedTrackingTimelineItem[] {
  return events.map((event) => {
    const payloadData =
      event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
        ? ((event.payload as Record<string, unknown>).data as Record<string, unknown> | undefined)
        : undefined;
    const status =
      extractString(event.payload, ['event', 'event_name', 'status']) ??
      extractString(payloadData, ['status', 'delivery_status']) ??
      event.eventType;
    const message =
      extractString(payloadData, ['message', 'note', 'reason', 'description', 'status']) ??
      extractString(event.payload, ['message', 'note', 'reason', 'description']) ??
      status;

    return {
      status,
      message,
      timestamp: (event.processedAt ?? event.receivedAt).toISOString(),
      source: 'pathao',
    };
  });
}

function normalizeSteadfastTimeline(events: SteadfastWebhookEventInput[]): UnifiedTrackingTimelineItem[] {
  return events.map((event) => ({
    status: event.status?.trim() || event.eventType,
    message: event.trackingMessage?.trim() || event.status?.trim() || event.eventType,
    timestamp: (event.processedAt ?? event.receivedAt).toISOString(),
    source: 'steadfast',
  }));
}

export function buildUnifiedCourierTracking(order: OrderTrackingInput): UnifiedCourierTracking {
  const courier = inferCourier(order);
  const timeline = [
    ...normalizePathaoTimeline(order.pathaoWebhookEvents ?? []),
    ...normalizeSteadfastTimeline(order.steadfastWebhookEvents ?? []),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const trackingId =
    courier === 'pathao'
      ? order.pathaoTrackingCode ?? order.trackingNumber ?? order.pathaoConsignmentId ?? null
      : order.steadfastTrackingCode ?? order.trackingNumber ?? null;
  const consignmentId =
    courier === 'pathao'
      ? order.pathaoConsignmentId ?? null
      : order.steadfastConsignmentId ?? null;
  const currentStatus =
    (courier === 'pathao' ? order.pathaoStatus : order.steadfastStatus) ??
    timeline[0]?.status ??
    'unknown';
  const lastUpdatedAt =
    timeline[0]?.timestamp ??
    (courier === 'pathao'
      ? toIsoString(order.pathaoSentAt)
      : toIsoString(order.steadfastSentAt)) ??
    toIsoString(order.updatedAt);

  return {
    courier,
    trackingId,
    consignmentId,
    currentStatus,
    lastUpdatedAt,
    deliveryCharge: toNumber(order.shippingCost),
    timeline,
  };
}

