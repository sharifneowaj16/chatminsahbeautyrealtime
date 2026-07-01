import 'server-only';
import prisma from '@/lib/prisma';
import { buildMetaCatalogContents, getMetaContentId } from '@/lib/tracking/meta-content-id';
import { classifyStoredOrderTraffic } from '@/lib/tracking/traffic-filter';

const GA4_MEASUREMENT_ID =
  process.env.GA4_MEASUREMENT_ID ??
  process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ??
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GA4_API_SECRET = process.env.GA4_API_SECRET ?? process.env.GOOGLE_ANALYTICS_API_SECRET;
const GA4_MP_TIMEOUT_MS = Number(process.env.GA4_MP_TIMEOUT_MS ?? 10_000) || 10_000;
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://minsahbeauty.cloud';
const TRACKING_SCHEMA_VERSION = 'mb_tracking_v1';
const GA4_PURCHASE_CLAIM_STALE_MS = 15 * 60 * 1000;

type Ga4PurchaseSource = 'cod_phone_confirmed' | 'online_paid';
type Ga4RefundSource = 'admin_refund' | 'return_completed' | 'manual_retry';

type OrderForGa4 = Awaited<ReturnType<typeof loadOrderForGa4>>;
type OrderForGa4Refund = Awaited<ReturnType<typeof loadOrderForGa4Refund>>;

function decimalToNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object' && 'toString' in value) {
    return Number(value.toString());
  }
  return 0;
}

function toPrismaJson(value: unknown) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isCodPaymentMethod(paymentMethod?: string | null) {
  const normalized = paymentMethod?.toLowerCase() ?? '';
  return normalized.includes('cod') || normalized.includes('cash');
}

function isCompletedPaymentStatus(paymentStatus?: unknown) {
  return String(paymentStatus ?? '').toUpperCase() === 'COMPLETED';
}

function isOlderThanSevenDays(eventTimeSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  return now - eventTimeSeconds > 7 * 24 * 60 * 60;
}

function isFutureEventTime(eventTimeSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  return eventTimeSeconds > now + 60;
}

function getGaSessionId(gaSessionId?: string | null) {
  if (!gaSessionId) return undefined;
  const parsed = Number(gaSessionId);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getItemId(item: { productId?: string | null; variantId?: string | null; sku?: string | null; id: string }) {
  return getMetaContentId(item);
}

async function loadOrderForGa4(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true, variant: true } },
      payments: {
        where: {
          status: 'COMPLETED',
          signatureVerified: true,
          amountMatched: true,
          currencyMatched: true,
          currency: 'BDT',
        },
        orderBy: { verifiedAt: 'desc' },
        take: 1,
      },
    },
  });
}

async function loadOrderForGa4Refund(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true, variant: true } },
      payments: {
        where: {
          status: { in: ['COMPLETED', 'REFUNDED'] },
          currency: 'BDT',
        },
        orderBy: { verifiedAt: 'desc' },
      },
      returns: {
        where: { status: 'COMPLETED' },
        include: { items: true },
        orderBy: { updatedAt: 'desc' },
      },
    },
  });
}

async function claimGa4PurchaseSend(orderId: string) {
  const staleBefore = new Date(Date.now() - GA4_PURCHASE_CLAIM_STALE_MS);

  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      gaPurchaseSent: false,
      OR: [
        { gaPurchaseProcessingAt: null },
        { gaPurchaseProcessingAt: { lt: staleBefore } },
      ],
    },
    data: {
      gaPurchaseProcessingAt: new Date(),
    },
  });

  return result.count === 1;
}

async function releaseGa4PurchaseClaim(orderId: string) {
  await prisma.order.updateMany({
    where: {
      id: orderId,
      gaPurchaseSent: false,
    },
    data: {
      gaPurchaseProcessingAt: null,
    },
  });
}

async function markGa4PurchaseSent(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      gaPurchaseSent: true,
      gaPurchaseSentAt: new Date(),
      gaPurchaseProcessingAt: null,
    },
  });
}

async function logGa4Failure(params: {
  orderId?: string;
  eventName?: string;
  eventId?: string;
  errorCode?: string;
  errorMessage: string;
  statusCode?: number;
  retryCount?: number;
  finalFailed?: boolean;
  safePayload?: Record<string, unknown>;
  responsePayload?: unknown;
}) {
  await prisma.metaCapiFailure.create({
    data: {
      orderId: params.orderId,
      eventName: params.eventName ?? 'purchase',
      eventId: params.eventId,
      provider: 'GA4',
      schemaVersion: TRACKING_SCHEMA_VERSION,
      statusCode: params.statusCode,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      retryCount: params.retryCount ?? 0,
      finalFailed: params.finalFailed ?? false,
      safePayload: toPrismaJson(params.safePayload),
      responsePayload: toPrismaJson(params.responsePayload),
      hasExternalId: Boolean(params.safePayload?.has_ga_client_id),
    },
  });
}

function shouldRetryGa4(status?: number) {
  if (!status) return true;
  if (status === 429) return true;
  if (status >= 500) return true;
  if (status >= 400 && status < 500) return false;
  return false;
}

async function postGa4MeasurementProtocol(url: string, payload: unknown) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GA4_MP_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildSafePayload(order: NonNullable<OrderForGa4>, source: Ga4PurchaseSource, eventTimeSeconds?: number) {
  return {
    event_name: 'purchase',
    transaction_id: order.id,
    order_id: order.id,
    order_number: order.orderNumber,
    source,
    event_time: eventTimeSeconds,
    value: decimalToNumber(order.total),
    currency: 'BDT',
    item_count: order.items.reduce((sum, item) => sum + item.quantity, 0),
    has_ga_client_id: Boolean(order.gaClientId),
    has_ga_session_id: Boolean(order.gaSessionId),
  };
}

export async function sendGa4Purchase(params: {
  orderId: string;
  source: Ga4PurchaseSource;
  retryCount?: number;
  finalAttempt?: boolean;
}) {
  const { orderId, source, retryCount = 0, finalAttempt = false } = params;
  const eventId = `GA4-Purchase-${orderId}`;

  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
    await logGa4Failure({
      orderId,
      eventId,
      errorCode: 'GA4_ENV_MISSING',
      errorMessage: 'GA4_MEASUREMENT_ID or GA4_API_SECRET is missing.',
      retryCount,
      finalFailed: true,
      safePayload: { event_name: 'purchase', order_id: orderId, has_ga_client_id: false },
    });
    return { ok: true, skipped: true, reason: 'GA4_ENV_MISSING' };
  }

  const order = await loadOrderForGa4(orderId);
  if (!order) {
    await logGa4Failure({
      orderId,
      eventId,
      errorCode: 'ORDER_NOT_FOUND',
      errorMessage: 'Order not found for GA4 Purchase.',
      retryCount,
      finalFailed: true,
      safePayload: { event_name: 'purchase', order_id: orderId, has_ga_client_id: false },
    });
    return { ok: false, retry: false, reason: 'ORDER_NOT_FOUND' };
  }

  const traffic = classifyStoredOrderTraffic(order);
  if (!traffic.allowed) return { ok: true, skipped: true, reason: traffic.reason };
  if (order.gaPurchaseSent) return { ok: true, skipped: true, reason: 'GA4_PURCHASE_ALREADY_SENT' };
  if (!order.gaClientId) return { ok: true, skipped: true, reason: 'GA_CLIENT_ID_MISSING' };

  const orderValue = decimalToNumber(order.total);
  if (!Number.isFinite(orderValue) || orderValue <= 0) {
    await logGa4Failure({
      orderId,
      eventId,
      errorCode: 'INVALID_ORDER_VALUE',
      errorMessage: 'Order total must be greater than 0 for GA4 Purchase.',
      retryCount,
      finalFailed: true,
      safePayload: buildSafePayload(order, source),
    });
    return { ok: false, retry: false, reason: 'INVALID_ORDER_VALUE' };
  }

  let eventDate: Date | null = null;
  if (source === 'cod_phone_confirmed') {
    if (!isCodPaymentMethod(order.paymentMethod)) {
      return { ok: true, skipped: true, reason: 'NOT_COD_ORDER' };
    }
    if (!order.phoneConfirmedAt) {
      await logGa4Failure({
        orderId,
        eventId,
        errorCode: 'PHONE_CONFIRMED_AT_MISSING',
        errorMessage: 'phoneConfirmedAt missing for COD GA4 Purchase.',
        retryCount,
        finalFailed: true,
        safePayload: buildSafePayload(order, source),
      });
      return { ok: false, retry: false, reason: 'PHONE_CONFIRMED_AT_MISSING' };
    }
    eventDate = order.phoneConfirmedAt;
  }

  if (source === 'online_paid') {
    if (isCodPaymentMethod(order.paymentMethod)) {
      return { ok: true, skipped: true, reason: 'COD_ORDER_NOT_ONLINE_PAID' };
    }
    if (!isCompletedPaymentStatus(order.paymentStatus) || !order.paymentPaidAt) {
      return { ok: true, skipped: true, reason: 'PAYMENT_NOT_COMPLETED' };
    }
    if (order.payments.length < 1) {
      await logGa4Failure({
        orderId,
        eventId,
        errorCode: 'VERIFIED_PAYMENT_NOT_FOUND',
        errorMessage: 'Verified Payment row missing for online GA4 Purchase.',
        retryCount,
        finalFailed: true,
        safePayload: buildSafePayload(order, source),
      });
      return { ok: false, retry: false, reason: 'VERIFIED_PAYMENT_NOT_FOUND' };
    }
    const verifiedAmount = decimalToNumber(order.payments[0].amount);
    if (Math.abs(verifiedAmount - orderValue) > 0.01) {
      await logGa4Failure({
        orderId,
        eventId,
        errorCode: 'VERIFIED_PAYMENT_AMOUNT_MISMATCH',
        errorMessage: 'Verified Payment amount does not match order total for GA4 Purchase.',
        retryCount,
        finalFailed: true,
        safePayload: buildSafePayload(order, source),
      });
      return { ok: false, retry: false, reason: 'VERIFIED_PAYMENT_AMOUNT_MISMATCH' };
    }
    eventDate = order.paymentPaidAt;
  }

  if (!eventDate) {
    return { ok: false, retry: false, reason: 'INVALID_GA4_PURCHASE_SOURCE' };
  }

  const eventTimeSeconds = Math.floor(eventDate.getTime() / 1000);
  const safePayload = buildSafePayload(order, source, eventTimeSeconds);

  if (isFutureEventTime(eventTimeSeconds)) {
    await logGa4Failure({
      orderId,
      eventId,
      errorCode: 'EVENT_TIME_IN_FUTURE',
      errorMessage: 'GA4 Purchase event time is in the future.',
      retryCount,
      finalFailed: true,
      safePayload,
    });
    return { ok: false, retry: false, reason: 'EVENT_TIME_IN_FUTURE' };
  }

  if (isOlderThanSevenDays(eventTimeSeconds)) {
    await logGa4Failure({
      orderId,
      eventId,
      errorCode: 'EVENT_TIME_TOO_OLD',
      errorMessage: 'GA4 Purchase event time is older than 7 days; not sent.',
      retryCount,
      finalFailed: true,
      safePayload,
    });
    return { ok: false, retry: false, reason: 'EVENT_TIME_TOO_OLD' };
  }

  const claimed = await claimGa4PurchaseSend(orderId);
  if (!claimed) return { ok: true, skipped: true, reason: 'GA4_PURCHASE_ALREADY_CLAIMED_OR_SENT' };

  const sessionId = getGaSessionId(order.gaSessionId);
  const catalogItems = order.items.map((item) => ({
    ...item,
    price: decimalToNumber(item.price),
  }));
  const catalogContents = buildMetaCatalogContents(catalogItems);
  const items = order.items.map((item, index) => {
    const catalogContent = catalogContents[index];

    return {
      item_id: getItemId(item),
      item_name: item.name,
      price: decimalToNumber(item.price),
      quantity: item.quantity,
      ...(catalogContent?.item_group_id && { item_group_id: catalogContent.item_group_id }),
      ...(catalogContent?.variant_id && { variant_id: catalogContent.variant_id }),
      ...(catalogContent?.item_variant && { item_variant: catalogContent.item_variant }),
      ...(catalogContent?.shade && { shade: catalogContent.shade }),
      ...(catalogContent?.size && { size: catalogContent.size }),
    };
  });

  const payload = {
    client_id: order.gaClientId,
    timestamp_micros: eventDate.getTime() * 1000,
    non_personalized_ads: false,
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: order.id,
          event_id: eventId,
          affiliation: 'Minsah Beauty',
          currency: 'BDT',
          value: orderValue,
          shipping: decimalToNumber(order.shippingCost),
          tax: decimalToNumber(order.taxAmount),
          coupon: order.couponCode ?? undefined,
          items,
          engagement_time_msec: 1,
          page_location: `${SITE_URL.replace(/\/$/, '')}/checkout/${source === 'online_paid' ? 'payment-complete' : 'phone-confirmed'}`,
          order_number: order.orderNumber,
          ga_purchase_source: source,
          ...(sessionId ? { session_id: sessionId } : {}),
        },
      },
    ],
  };

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(GA4_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(GA4_API_SECRET)}`;

  try {
    const res = await postGa4MeasurementProtocol(url, payload);
    const responseText = await res.text().catch(() => '');
    const responsePayload = responseText ? { body: responseText.slice(0, 500) } : undefined;

    if (res.ok || res.status === 204) {
      await markGa4PurchaseSent(orderId);
      console.log(`[GA4][Purchase] Sent successfully: order ${orderId} (${source})`);
      return { ok: true, retry: false };
    }

    const retry = shouldRetryGa4(res.status);
    await logGa4Failure({
      orderId,
      eventId,
      statusCode: res.status,
      errorCode: `GA4_HTTP_${res.status}`,
      errorMessage: `GA4 Measurement Protocol failed with status ${res.status}`,
      retryCount,
      finalFailed: !retry || finalAttempt,
      safePayload,
      responsePayload,
    });

    if (retry) throw new Error(`Retryable GA4 Measurement Protocol error: ${res.status}`);

    await releaseGa4PurchaseClaim(orderId);
    return { ok: false, retry: false, reason: 'GA4_PERMANENT_FAILURE' };
  } catch (error) {
    await logGa4Failure({
      orderId,
      eventId,
      errorCode: 'NETWORK_OR_RETRYABLE_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown GA4 network/retryable error',
      retryCount,
      finalFailed: finalAttempt,
      safePayload,
    });

    if (finalAttempt) {
      await releaseGa4PurchaseClaim(orderId);
    }

    throw error;
  }
}


function buildGa4RefundSafePayload(
  order: NonNullable<OrderForGa4Refund>,
  source: Ga4RefundSource,
  refundAmount: number,
  itemCount: number,
  eventTimeSeconds?: number
) {
  return {
    event_name: 'refund',
    transaction_id: order.id,
    order_id: order.id,
    order_number: order.orderNumber,
    source,
    event_time: eventTimeSeconds,
    value: refundAmount,
    currency: 'BDT',
    item_count: itemCount,
    has_ga_client_id: Boolean(order.gaClientId),
    has_ga_session_id: Boolean(order.gaSessionId),
    ga_purchase_sent: Boolean(order.gaPurchaseSent),
    completed_return_count: order.returns.length,
  };
}

function getCompletedReturnRefundAmount(order: NonNullable<OrderForGa4Refund>) {
  return order.returns.reduce((total, returnRequest) => total + decimalToNumber(returnRequest.refundAmount), 0);
}

function hasActualRefundSignal(order: NonNullable<OrderForGa4Refund>) {
  const paymentStatus = String(order.paymentStatus ?? '').toUpperCase();
  const status = String(order.status ?? '').toUpperCase();
  const hasRefundedPayment = order.payments.some((payment) => String(payment.status ?? '').toUpperCase() === 'REFUNDED');

  return (
    paymentStatus === 'REFUNDED' ||
    status === 'REFUNDED' ||
    Boolean(order.refundedAt) ||
    hasRefundedPayment ||
    order.returns.some((returnRequest) => returnRequest.status === 'COMPLETED' && decimalToNumber(returnRequest.refundAmount) > 0)
  );
}

function getGa4RefundEventDate(order: NonNullable<OrderForGa4Refund>) {
  return order.refundedAt ?? order.returns[0]?.updatedAt ?? new Date();
}

function buildRefundItems(order: NonNullable<OrderForGa4Refund>) {
  const returnItems = order.returns.flatMap((returnRequest) => returnRequest.items);

  if (returnItems.length > 0) {
    return returnItems.map((item) => ({
      item_id: item.productId ? getMetaContentId({ productId: item.productId, variantId: null, sku: null, id: item.id }) : item.id,
      item_name: item.name,
      price: decimalToNumber(item.price),
      quantity: item.quantity,
    }));
  }

  const catalogItems = order.items.map((item) => ({
    ...item,
    price: decimalToNumber(item.price),
  }));
  const catalogContents = buildMetaCatalogContents(catalogItems);

  return order.items.map((item, index) => {
    const catalogContent = catalogContents[index];

    return {
      item_id: getItemId(item),
      item_name: item.name,
      price: decimalToNumber(item.price),
      quantity: item.quantity,
      ...(catalogContent?.item_group_id && { item_group_id: catalogContent.item_group_id }),
      ...(catalogContent?.variant_id && { variant_id: catalogContent.variant_id }),
      ...(catalogContent?.item_variant && { item_variant: catalogContent.item_variant }),
      ...(catalogContent?.shade && { shade: catalogContent.shade }),
      ...(catalogContent?.size && { size: catalogContent.size }),
    };
  });
}

async function markGa4RefundSent(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      gaRefundSent: true,
      gaRefundSentAt: new Date(),
    },
  });
}

export async function sendGa4Refund(params: {
  orderId: string;
  source: Ga4RefundSource;
  retryCount?: number;
  finalAttempt?: boolean;
}) {
  const { orderId, source, retryCount = 0, finalAttempt = false } = params;
  const eventId = `GA4-Refund-${orderId}`;

  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
    await logGa4Failure({
      orderId,
      eventName: 'refund',
      eventId,
      errorCode: 'GA4_ENV_MISSING',
      errorMessage: 'GA4_MEASUREMENT_ID or GA4_API_SECRET is missing.',
      retryCount,
      finalFailed: true,
      safePayload: { event_name: 'refund', order_id: orderId, has_ga_client_id: false },
    });
    return { ok: true, skipped: true, reason: 'GA4_ENV_MISSING' };
  }

  const order = await loadOrderForGa4Refund(orderId);
  if (!order) {
    await logGa4Failure({
      orderId,
      eventName: 'refund',
      eventId,
      errorCode: 'ORDER_NOT_FOUND',
      errorMessage: 'Order not found for GA4 Refund.',
      retryCount,
      finalFailed: true,
      safePayload: { event_name: 'refund', order_id: orderId, has_ga_client_id: false },
    });
    return { ok: false, retry: false, reason: 'ORDER_NOT_FOUND' };
  }

  const traffic = classifyStoredOrderTraffic(order);
  if (!traffic.allowed) return { ok: true, skipped: true, reason: traffic.reason };
  if (order.gaRefundSent) return { ok: true, skipped: true, reason: 'GA4_REFUND_ALREADY_SENT' };
  if (!order.gaPurchaseSent) return { ok: true, skipped: true, reason: 'GA4_PURCHASE_NOT_SENT' };
  if (!order.gaClientId) return { ok: true, skipped: true, reason: 'GA_CLIENT_ID_MISSING' };
  if (!hasActualRefundSignal(order)) return { ok: true, skipped: true, reason: 'NO_ACTUAL_REFUND_SIGNAL' };

  const completedReturnRefundAmount = getCompletedReturnRefundAmount(order);
  const orderValue = decimalToNumber(order.total);
  const refundAmount = completedReturnRefundAmount > 0 ? completedReturnRefundAmount : orderValue;

  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    await logGa4Failure({
      orderId,
      eventName: 'refund',
      eventId,
      errorCode: 'INVALID_REFUND_VALUE',
      errorMessage: 'Refund value must be greater than 0 for GA4 Refund.',
      retryCount,
      finalFailed: true,
      safePayload: buildGa4RefundSafePayload(order, source, refundAmount, 0),
    });
    return { ok: false, retry: false, reason: 'INVALID_REFUND_VALUE' };
  }

  const eventDate = getGa4RefundEventDate(order);
  const eventTimeSeconds = Math.floor(eventDate.getTime() / 1000);
  const items = buildRefundItems(order);
  const safePayload = buildGa4RefundSafePayload(order, source, refundAmount, items.reduce((sum, item) => sum + item.quantity, 0), eventTimeSeconds);

  if (isFutureEventTime(eventTimeSeconds)) {
    await logGa4Failure({
      orderId,
      eventName: 'refund',
      eventId,
      errorCode: 'EVENT_TIME_IN_FUTURE',
      errorMessage: 'GA4 Refund event time is in the future.',
      retryCount,
      finalFailed: true,
      safePayload,
    });
    return { ok: false, retry: false, reason: 'EVENT_TIME_IN_FUTURE' };
  }

  const sessionId = getGaSessionId(order.gaSessionId);
  const payload = {
    client_id: order.gaClientId,
    timestamp_micros: eventDate.getTime() * 1000,
    non_personalized_ads: false,
    events: [
      {
        name: 'refund',
        params: {
          transaction_id: order.id,
          event_id: eventId,
          affiliation: 'Minsah Beauty',
          currency: 'BDT',
          value: refundAmount,
          items,
          engagement_time_msec: 1,
          page_location: `${SITE_URL.replace(/\/$/, '')}/admin/orders/${order.id}`,
          order_number: order.orderNumber,
          ga_refund_source: source,
          ...(sessionId ? { session_id: sessionId } : {}),
        },
      },
    ],
  };

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(GA4_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(GA4_API_SECRET)}`;

  try {
    const res = await postGa4MeasurementProtocol(url, payload);
    const responseText = await res.text().catch(() => '');
    const responsePayload = responseText ? { body: responseText.slice(0, 500) } : undefined;

    if (res.ok || res.status === 204) {
      await markGa4RefundSent(orderId);
      console.log(`[GA4][Refund] Sent successfully: order ${orderId} (${source})`);
      return { ok: true, retry: false };
    }

    const retry = shouldRetryGa4(res.status);
    await logGa4Failure({
      orderId,
      eventName: 'refund',
      eventId,
      statusCode: res.status,
      errorCode: `GA4_HTTP_${res.status}`,
      errorMessage: `GA4 Measurement Protocol refund failed with status ${res.status}`,
      retryCount,
      finalFailed: !retry || finalAttempt,
      safePayload,
      responsePayload,
    });

    if (retry) throw new Error(`Retryable GA4 refund Measurement Protocol error: ${res.status}`);
    return { ok: false, retry: false, reason: 'GA4_REFUND_PERMANENT_FAILURE' };
  } catch (error) {
    await logGa4Failure({
      orderId,
      eventName: 'refund',
      eventId,
      errorCode: 'NETWORK_OR_RETRYABLE_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown GA4 refund network/retryable error',
      retryCount,
      finalFailed: finalAttempt,
      safePayload,
    });

    throw error;
  }
}
