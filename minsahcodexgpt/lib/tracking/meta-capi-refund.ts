import crypto from 'node:crypto';
import prisma from '../prisma';
import {
  buildMetaCatalogData,
  prepareMetaCatalogPayload,
  type MetaCatalogData,
} from './meta-content-id';
import { sanitizeTrackingUrl } from './sanitize-url';
import { normalizeMetaExternalId } from './meta-external-id';
import { classifyStoredOrderTraffic } from './traffic-filter';
import {
  getMetaDataProcessingOptions,
  getMetaPixelId,
  getMetaCapiAccessToken,
  getMetaTestEventCode,
  TRACKING_SCHEMA_VERSION,
  withMetaSafePayloadSchema,
  withMetaSchemaVersion,
} from './meta-schema';
import { sendMetaCapiWithPhase28Cutover } from '../meta-platform/migration/phase28-capi-facade';
import { getTrackingFailureLogRetentionMetadata } from './failure-retention';
import { logOperationalError } from '../observability/logger';

function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber: () => number }).toNumber === 'function'
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const META_TEST_EVENT_CODE = getMetaTestEventCode();
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://minsahbeauty.cloud';

export type MetaRefundSource =
  | 'admin_order_status_refunded'
  | 'admin_order_status_cancelled'
  | 'steadfast_return'
  | 'pathao_return'
  | 'return_approved'
  | 'return_received'
  | 'reconciliation_recovery'
  | 'manual_admin'
  | 'test';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(email?: string | null): string | null {
  const normalized = email?.trim().toLowerCase().replace(/\s/g, '');
  return normalized || null;
}

function normalizeBangladeshPhone(phone?: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00880')) digits = digits.slice(2);
  if (digits.startsWith('880')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '880' + digits.slice(1);
  else if (digits.length === 10) digits = '880' + digits;
  return digits.length === 13 ? digits : null;
}

function getSafeRefundEventSourceUrl(firstLandingUrl?: string | null) {
  const sanitized = sanitizeTrackingUrl(firstLandingUrl);
  if (sanitized) {
    try {
      return new URL(sanitized, SITE_URL).toString();
    } catch {
      // Fall through to default
    }
  }
  return sanitizeTrackingUrl(SITE_URL) ?? SITE_URL;
}

export function buildMetaRefundEventId(orderId: string, suffix?: string): string {
  return suffix ? `META-Refund-${orderId}-${suffix}` : `META-Refund-${orderId}`;
}

export function buildMetaCancellationEventId(orderId: string): string {
  return `META-Cancel-${orderId}`;
}

export async function hasMetaRefundBeenSent(orderId: string): Promise<boolean> {
  const count = await prisma.metaEventOutbox.count({
    where: {
      provider: 'META',
      eventName: { in: ['Refund', 'CancelOrder'] },
      orderId,
      status: 'SENT',
    },
  });
  return count > 0;
}

export async function loadOrderForMetaRefund(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      shippingAddress: { select: { phone: true } },
      items: { include: { product: true, variant: true } },
      returns: {
        include: {
          items: true,
        },
      },
    },
  });
}

function hasActualRefundSignal(order: {
  status: string;
  paymentStatus: string;
  refundedAt?: Date | null;
  returnedAt?: Date | null;
  returns?: Array<{ status: string }>;
}): boolean {
  if (order.status === 'REFUNDED' || order.status === 'CANCELLED') return true;
  if (order.paymentStatus === 'REFUNDED') return true;
  if (order.refundedAt != null || order.returnedAt != null) return true;
  if (order.returns?.some((r) => r.status === 'APPROVED' || r.status === 'RECEIVED' || r.status === 'COMPLETED')) {
    return true;
  }
  return false;
}

function getCompletedReturnRefundAmount(order: {
  returns?: Array<{
    status: string;
    refundAmount?: unknown;
  }>;
}): number {
  if (!order.returns || order.returns.length === 0) return 0;
  return order.returns
    .filter((r) => r.status === 'COMPLETED' || r.status === 'APPROVED' || r.status === 'RECEIVED')
    .reduce((sum, item) => sum + (decimalToNumber(item.refundAmount) || 0), 0);
}

async function logMetaRefundFailure(params: {
  orderId?: string;
  eventName: string;
  eventId?: string;
  statusCode?: number;
  errorCode?: string;
  errorMessage: string;
  retryCount?: number;
  finalFailed?: boolean;
  safePayload?: Record<string, unknown>;
}) {
  const retention = getTrackingFailureLogRetentionMetadata({
    provider: 'META',
    statusCode: params.statusCode,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    finalFailed: params.finalFailed ?? false,
  });

  await prisma.metaCapiFailure.create({
    data: {
      orderId: params.orderId,
      eventName: params.eventName,
      eventId: params.eventId,
      provider: 'META',
      schemaVersion: TRACKING_SCHEMA_VERSION,
      statusCode: params.statusCode,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      retryCount: params.retryCount ?? 0,
      finalFailed: params.finalFailed ?? false,
      failureCategory: retention.failureCategory,
      cleanupAfter: retention.cleanupAfter,
      safePayload: (params.safePayload ?? {}) as any,
    },
  });
}

export function buildMetaRefundPayload(params: {
  order: {
    id: string;
    total: unknown;
    fbp?: string | null;
    fbc?: string | null;
    customerIp?: string | null;
    customerUa?: string | null;
    externalId?: string | null;
    firstLandingUrl?: string | null;
    metaEventId?: string | null;
    user?: { email?: string | null; phone?: string | null } | null;
    shippingAddress?: { phone?: string | null } | null;
    items: Array<{
      id: string;
      name?: string | null;
      price: unknown;
      quantity: number;
      product?: { id: string; name?: string | null } | null;
      variant?: { id: string; name?: string | null } | null;
    }>;
  };
  eventId: string;
  source: MetaRefundSource;
  refundAmount: number;
  eventTime?: number;
}) {
  const { order, eventId, source, refundAmount } = params;
  const normalizedEmail = normalizeEmail(order.user?.email);
  const normalizedPhone = normalizeBangladeshPhone(order.shippingAddress?.phone || order.user?.phone);
  const emailHash = normalizedEmail ? sha256(normalizedEmail) : undefined;
  const phoneHash = normalizedPhone ? sha256(normalizedPhone) : undefined;
  const normalizedExternalId = normalizeMetaExternalId(order.externalId, 'visitor');
  const externalIdHash = normalizedExternalId ? sha256(normalizedExternalId) : undefined;

  const catalogItems = order.items.map((item) => ({
    ...item,
    price: decimalToNumber(item.price),
  }));
  const resolvedMetaCatalogData = buildMetaCatalogData(catalogItems);
  const metaCatalogData = prepareMetaCatalogPayload(resolvedMetaCatalogData ?? {}) as Partial<MetaCatalogData>;

  const eventTime = params.eventTime ?? Math.floor(Date.now() / 1000);
  const lduOptions = getMetaDataProcessingOptions();

  return {
    data: [
      {
        event_name: 'Refund',
        event_id: eventId,
        event_time: eventTime,
        action_source: 'website' as const,
        event_source_url: getSafeRefundEventSourceUrl(order.firstLandingUrl),
        user_data: {
          ...(emailHash && { em: emailHash }),
          ...(phoneHash && { ph: phoneHash }),
          ...(externalIdHash && { external_id: externalIdHash }),
          ...(order.fbp && { fbp: order.fbp }),
          ...(order.fbc && { fbc: order.fbc }),
          ...(order.customerIp && { client_ip_address: order.customerIp }),
          ...(order.customerUa && { client_user_agent: order.customerUa }),
        },
        custom_data: withMetaSchemaVersion({
          currency: 'BDT',
          value: refundAmount,
          order_id: String(order.id),
          ...metaCatalogData,
          num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
          meta_refund_source: source,
          original_purchase_event_id: order.metaEventId ?? undefined,
        }),
        ...lduOptions,
      },
    ],
    ...lduOptions,
    ...(process.env.NODE_ENV !== 'production' && META_TEST_EVENT_CODE
      ? { test_event_code: META_TEST_EVENT_CODE }
      : {}),
  };
}

export async function sendMetaCapiRefund(params: {
  orderId: string;
  source: MetaRefundSource;
  customRefundAmount?: number;
  retryCount?: number;
  finalAttempt?: boolean;
}): Promise<{ ok: boolean; skipped?: boolean; reason?: string; eventId?: string }> {
  const { orderId, source, customRefundAmount, retryCount = 0, finalAttempt = false } = params;
  const eventId = buildMetaRefundEventId(orderId);

  const pixelId = getMetaPixelId();
  const accessToken = getMetaCapiAccessToken();
  if (!pixelId || !accessToken) {
    return { ok: true, skipped: true, reason: 'META_CREDENTIALS_MISSING' };
  }

  const order = await loadOrderForMetaRefund(orderId);
  if (!order) {
    await logMetaRefundFailure({
      orderId,
      eventName: 'Refund',
      eventId,
      errorCode: 'ORDER_NOT_FOUND',
      errorMessage: 'Order not found for Meta CAPI Refund.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, reason: 'ORDER_NOT_FOUND' };
  }

  // Traffic filter check
  const traffic = classifyStoredOrderTraffic(order);
  if (!traffic.allowed) {
    return { ok: true, skipped: true, reason: traffic.reason };
  }

  // Idempotency: skip if Meta Refund has already been sent
  const alreadySent = await hasMetaRefundBeenSent(orderId);
  if (alreadySent) {
    return { ok: true, skipped: true, reason: 'META_REFUND_ALREADY_SENT' };
  }

  // If purchase was never sent to Meta, do not send a standalone refund
  if (!order.metaPurchaseSent) {
    return { ok: true, skipped: true, reason: 'META_PURCHASE_NOT_SENT' };
  }

  // Ensure there is an actual refund/cancellation signal
  if (source !== 'manual_admin' && !hasActualRefundSignal(order)) {
    return { ok: true, skipped: true, reason: 'NO_ACTUAL_REFUND_SIGNAL' };
  }

  // Compute refund value
  const returnRefundAmount = getCompletedReturnRefundAmount(order);
  const orderTotal = decimalToNumber(order.total);
  const refundAmount = customRefundAmount ?? (returnRefundAmount > 0 ? returnRefundAmount : orderTotal);

  if (refundAmount <= 0) {
    await logMetaRefundFailure({
      orderId,
      eventName: 'Refund',
      eventId,
      errorCode: 'INVALID_REFUND_VALUE',
      errorMessage: 'Refund value must be greater than 0 for Meta CAPI Refund.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, reason: 'INVALID_REFUND_VALUE' };
  }

  const eventTime = Math.floor(Date.now() / 1000);
  const payload = buildMetaRefundPayload({
    order,
    eventId,
    source,
    refundAmount,
    eventTime,
  });

  const safePayload = withMetaSafePayloadSchema({
    event_name: 'Refund',
    event_id: eventId,
    order_id: order.id,
    event_time: eventTime,
    source,
    value: refundAmount,
    currency: 'BDT',
    has_fbp: Boolean(order.fbp),
    has_fbc: Boolean(order.fbc),
    has_phone_hash: Boolean(payload.data[0].user_data.ph),
    has_email_hash: Boolean(payload.data[0].user_data.em),
  });

  // Database Outbox Idempotency record
  try {
    await prisma.metaEventOutbox.upsert({
      where: {
        provider_eventName_eventId: {
          provider: 'META',
          eventName: 'Refund',
          eventId,
        },
      },
      update: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        processingAt: new Date(),
      },
      create: {
        correlationId: `refund-${order.id}-${Date.now()}`,
        provider: 'META',
        eventName: 'Refund',
        eventId,
        sourceType: 'ORDER',
        sourceId: order.id,
        orderId: order.id,
        actionSource: 'website',
        eventSourceUrl: getSafeRefundEventSourceUrl(order.firstLandingUrl),
        eventTime: new Date(eventTime * 1000),
        payload: payload as any,
        safePayload: safePayload as any,
        policyVersion: TRACKING_SCHEMA_VERSION,
        policyReason: `refund_source_${source}`,
        consentState: 'GRANTED',
        retentionUntil: new Date(Date.now() + 90 * 86400 * 1000),
        status: 'PROCESSING',
        attempts: 1,
      },
    });

    // Deliver via cutover facade (supports Business SDK and MetaPlatform)
    const result = await sendMetaCapiWithPhase28Cutover({
      payload: payload as any,
      correlationId: `refund-${order.id}`,
      pixelId,
    });

    if (result.ok) {
      await prisma.metaEventOutbox.update({
        where: {
          provider_eventName_eventId: {
            provider: 'META',
            eventName: 'Refund',
            eventId,
          },
        },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          response: (result.responsePayload ?? {}) as any,
        },
      });

      return { ok: true, eventId };
    } else {
      await prisma.metaEventOutbox.update({
        where: {
          provider_eventName_eventId: {
            provider: 'META',
            eventName: 'Refund',
            eventId,
          },
        },
        data: {
          status: finalAttempt ? 'FAILED_PERMANENT' : 'RETRY_SCHEDULED',
          lastError: { status: result.status, message: 'Provider returned error status' },
        },
      });

      await logMetaRefundFailure({
        orderId,
        eventName: 'Refund',
        eventId,
        statusCode: result.status,
        errorMessage: 'Meta CAPI Refund delivery returned non-ok status.',
        retryCount,
        finalFailed: finalAttempt,
        safePayload,
      });

      return { ok: false, reason: 'META_PROVIDER_ERROR' };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown Meta CAPI Refund error';
    await logMetaRefundFailure({
      orderId,
      eventName: 'Refund',
      eventId,
      errorCode: 'META_REFUND_RUNTIME_EXCEPTION',
      errorMessage: errorMsg,
      retryCount,
      finalFailed: finalAttempt,
      safePayload,
    });

    logOperationalError('tracking.meta_capi.refund_failed', error instanceof Error ? error : new Error(errorMsg), {
      orderId,
      eventId,
      source,
    });

    return { ok: false, reason: errorMsg };
  }
}

export async function sendMetaCapiCancellation(params: {
  orderId: string;
  source?: MetaRefundSource;
  retryCount?: number;
  finalAttempt?: boolean;
}) {
  return sendMetaCapiRefund({
    orderId: params.orderId,
    source: params.source ?? 'admin_order_status_cancelled',
    retryCount: params.retryCount,
    finalAttempt: params.finalAttempt,
  });
}
