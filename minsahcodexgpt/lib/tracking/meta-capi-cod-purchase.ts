import 'server-only';
import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import { getMetaContentId } from '@/lib/tracking/meta-content-id';
import { sanitizeTrackingUrl } from '@/lib/tracking/sanitize-url';

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION ?? 'v20.0';
const META_PIXEL_ID =
  process.env.META_PIXEL_ID ??
  process.env.NEXT_PUBLIC_META_PIXEL_ID ??
  process.env.NEXT_PUBLIC_FB_PIXEL_ID ??
  process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
const META_CAPI_ACCESS_TOKEN =
  process.env.META_CAPI_ACCESS_TOKEN ?? process.env.FACEBOOK_CONVERSION_API_TOKEN;
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE;
const META_CAPI_TIMEOUT_MS = Number(process.env.META_CAPI_TIMEOUT_MS ?? 10_000) || 10_000;
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://minsahbeauty.cloud';
const TRACKING_SCHEMA_VERSION = 'mb_tracking_v1';

function getSafePurchaseEventSourceUrl(firstLandingUrl?: string | null) {
  const sanitizedFirstLandingUrl = sanitizeTrackingUrl(firstLandingUrl);

  if (sanitizedFirstLandingUrl) {
    try {
      return new URL(sanitizedFirstLandingUrl, SITE_URL).toString();
    } catch {
      // Fall through to sanitized site URL.
    }
  }

  return sanitizeTrackingUrl(SITE_URL) ?? SITE_URL;
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase().replace(/\s/g, '');
  return normalized || null;
}

function normalizeBangladeshPhone(phone?: string | null) {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('00880')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('8801') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('01') && digits.length === 11) return `+88${digits}`;
  if (digits.startsWith('1') && digits.length === 10) return `+880${digits}`;

  return null;
}

function toPrismaJson(value: unknown) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function decimalToNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object' && 'toString' in value) {
    return Number(value.toString());
  }
  return 0;
}

function getEventTimeFromPhoneConfirmedAt(phoneConfirmedAt: Date) {
  return Math.floor(phoneConfirmedAt.getTime() / 1000);
}

function isOlderThanSevenDays(eventTime: number) {
  const now = Math.floor(Date.now() / 1000);
  return now - eventTime > 7 * 24 * 60 * 60;
}

function isFutureEventTime(eventTime: number) {
  const now = Math.floor(Date.now() / 1000);
  return eventTime > now + 60;
}

function shouldRetryMetaCapi(status?: number, errorCode?: string | number | null) {
  if (!status) return true;
  if (status === 429) return true;
  if (status >= 500) return true;

  if (String(errorCode) === '190') return false;
  if (String(errorCode) === '100') return false;

  if (status >= 400 && status < 500) return false;
  return false;
}

async function postMetaCapiPayload(url: string, payload: unknown) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), META_CAPI_TIMEOUT_MS);

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

function isCodPaymentMethod(paymentMethod?: string | null) {
  const normalized = paymentMethod?.toLowerCase() ?? '';
  return normalized.includes('cod') || normalized.includes('cash');
}

function isCompletedPaymentStatus(paymentStatus?: unknown) {
  return String(paymentStatus ?? '').toUpperCase() === 'COMPLETED';
}

const META_PURCHASE_CLAIM_STALE_MS = 15 * 60 * 1000;

async function claimMetaPurchaseSend(orderId: string, eventId: string) {
  const staleBefore = new Date(Date.now() - META_PURCHASE_CLAIM_STALE_MS);

  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      metaPurchaseSent: false,
      OR: [
        { metaPurchaseProcessingAt: null },
        { metaPurchaseProcessingAt: { lt: staleBefore } },
      ],
    },
    data: {
      metaPurchaseProcessingAt: new Date(),
      metaEventId: eventId,
    },
  });

  return result.count === 1;
}

async function releaseMetaPurchaseClaim(orderId: string, eventId: string) {
  await prisma.order.updateMany({
    where: {
      id: orderId,
      metaPurchaseSent: false,
      metaEventId: eventId,
    },
    data: {
      metaPurchaseProcessingAt: null,
    },
  });
}

async function markMetaPurchaseSent(orderId: string, eventId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      metaPurchaseSent: true,
      metaPurchaseSentAt: new Date(),
      metaPurchaseProcessingAt: null,
      metaEventId: eventId,
    },
  });
}

function getOrderContentIds(items: Array<{ productId?: string | null; variantId?: string | null; sku?: string | null; id: string }>) {
  return items.map(getMetaContentId).filter(Boolean);
}

function getOrderContentName(items: Array<{ name?: string | null }>) {
  return items
    .map((item) => item.name?.trim())
    .filter(Boolean)
    .join(', ')
    .slice(0, 300);
}

async function logMetaFailure(params: {
  orderId?: string;
  eventName: string;
  eventId?: string;
  statusCode?: number;
  errorCode?: string;
  errorSubcode?: string;
  errorMessage: string;
  retryCount?: number;
  finalFailed?: boolean;
  safePayload?: Record<string, unknown>;
  responsePayload?: unknown;
  hasFbp?: boolean;
  hasFbc?: boolean;
  hasExternalId?: boolean;
  hasEmailHash?: boolean;
  hasPhoneHash?: boolean;
  hasIp?: boolean;
  hasUa?: boolean;
}) {
  await prisma.metaCapiFailure.create({
    data: {
      orderId: params.orderId,
      eventName: params.eventName,
      eventId: params.eventId,
      provider: 'META',
      schemaVersion: TRACKING_SCHEMA_VERSION,
      statusCode: params.statusCode,
      errorCode: params.errorCode,
      errorSubcode: params.errorSubcode,
      errorMessage: params.errorMessage,
      retryCount: params.retryCount ?? 0,
      finalFailed: params.finalFailed ?? false,
      safePayload: toPrismaJson(params.safePayload),
      responsePayload: toPrismaJson(params.responsePayload),
      hasFbp: params.hasFbp ?? false,
      hasFbc: params.hasFbc ?? false,
      hasExternalId: params.hasExternalId ?? false,
      hasEmailHash: params.hasEmailHash ?? false,
      hasPhoneHash: params.hasPhoneHash ?? false,
      hasIp: params.hasIp ?? false,
      hasUa: params.hasUa ?? false,
    },
  });
}

export async function sendCodPurchaseToMeta(params: {
  orderId: string;
  retryCount?: number;
  finalAttempt?: boolean;
}) {
  const { orderId, retryCount = 0, finalAttempt = false } = params;
  const eventId = `Purchase-${orderId}`;

  if (!META_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) {
    await logMetaFailure({
      orderId,
      eventName: 'Purchase',
      eventId,
      errorCode: 'META_ENV_MISSING',
      errorMessage: 'META_PIXEL_ID or META_CAPI_ACCESS_TOKEN is missing.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'META_ENV_MISSING' };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: true,
    },
  });

  if (!order) {
    await logMetaFailure({
      orderId,
      eventName: 'Purchase',
      eventId,
      errorCode: 'ORDER_NOT_FOUND',
      errorMessage: 'Order not found for COD Purchase.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'ORDER_NOT_FOUND' };
  }

  if (order.isTest) {
    return { ok: true, skipped: true, reason: 'TEST_ORDER' };
  }

  if (order.metaPurchaseSent) {
    return { ok: true, skipped: true, reason: 'ALREADY_SENT' };
  }

  if (!isCodPaymentMethod(order.paymentMethod)) {
    return { ok: true, skipped: true, reason: 'NON_COD_ORDER' };
  }

  if (!order.phoneConfirmedAt) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      errorCode: 'PHONE_CONFIRMED_AT_MISSING',
      errorMessage: 'phoneConfirmedAt missing for COD Purchase.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'PHONE_CONFIRMED_AT_MISSING' };
  }

  const eventTime = getEventTimeFromPhoneConfirmedAt(order.phoneConfirmedAt);

  if (isFutureEventTime(eventTime)) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      errorCode: 'EVENT_TIME_IN_FUTURE',
      errorMessage: 'phoneConfirmedAt is in the future.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'EVENT_TIME_IN_FUTURE' };
  }

  if (isOlderThanSevenDays(eventTime)) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      statusCode: 400,
      errorCode: 'EVENT_TIME_TOO_OLD',
      errorMessage: 'phoneConfirmedAt is older than 7 days. Meta CAPI Purchase not sent.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'EVENT_TIME_TOO_OLD' };
  }

  const normalizedEmail = normalizeEmail(order.user.email);
  const normalizedPhone = normalizeBangladeshPhone(order.user.phone);
  const emailHash = normalizedEmail ? sha256(normalizedEmail) : undefined;
  const phoneHash = normalizedPhone ? sha256(normalizedPhone) : undefined;
  const externalIdHash = order.externalId ? sha256(order.externalId.trim()) : undefined;

  const contents = order.items.map((item) => ({
    id: getMetaContentId(item),
    quantity: item.quantity,
    item_price: decimalToNumber(item.price),
  }));
  const contentIds = getOrderContentIds(order.items);
  const contentName = getOrderContentName(order.items);
  const orderValue = decimalToNumber(order.total);

  if (orderValue <= 0) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      errorCode: 'PURCHASE_VALUE_INVALID',
      errorMessage: 'Purchase value must be greater than zero.',
      retryCount,
      finalFailed: true,
      safePayload: {
        event_name: 'Purchase',
        event_id: eventId,
        order_id: order.id,
        value: orderValue,
        currency: 'BDT',
      },
    });
    return { ok: false, retry: false, reason: 'PURCHASE_VALUE_INVALID' };
  }

  const claimed = await claimMetaPurchaseSend(order.id, eventId);
  if (!claimed) {
    return { ok: true, skipped: true, reason: 'ALREADY_CLAIMED_OR_SENT' };
  }

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_id: eventId,
        event_time: eventTime,
        action_source: 'website',
        event_source_url: getSafePurchaseEventSourceUrl(order.firstLandingUrl),
        user_data: {
          ...(emailHash && { em: emailHash }),
          ...(phoneHash && { ph: phoneHash }),
          ...(externalIdHash && { external_id: externalIdHash }),
          ...(order.fbp && { fbp: order.fbp }),
          ...(order.fbc && { fbc: order.fbc }),
          ...(order.customerIp && { client_ip_address: order.customerIp }),
          ...(order.customerUa && { client_user_agent: order.customerUa }),
        },
        custom_data: {
          currency: 'BDT',
          value: orderValue,
          order_id: String(order.id),
          content_ids: contentIds,
          content_type: 'product',
          ...(contentName && { content_name: contentName }),
          contents,
          num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
        },
      },
    ],
    ...(process.env.NODE_ENV !== 'production' && META_TEST_EVENT_CODE
      ? { test_event_code: META_TEST_EVENT_CODE }
      : {}),
  };

  const safePayload = {
    event_name: 'Purchase',
    event_id: eventId,
    order_id: order.id,
    event_time: eventTime,
    event_time_source: 'order.phoneConfirmedAt',
    value: orderValue,
    currency: 'BDT',
    has_fbp: Boolean(order.fbp),
    has_fbc: Boolean(order.fbc),
    has_external_id: Boolean(externalIdHash),
    has_email_hash: Boolean(emailHash),
    has_phone_hash: Boolean(phoneHash),
    has_ip: Boolean(order.customerIp),
    has_ua: Boolean(order.customerUa),
  };

  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(META_CAPI_ACCESS_TOKEN)}`;

  try {
    const res = await postMetaCapiPayload(url, payload);

    const responsePayload = (await res.json().catch(() => null)) as {
      error?: {
        code?: string | number;
        error_subcode?: string | number;
        message?: string;
      };
    } | null;

    if (res.ok) {
      await markMetaPurchaseSent(order.id, eventId);

      return { ok: true, retry: false, response: responsePayload };
    }

    const metaError = responsePayload?.error;
    const errorCode = metaError?.code ? String(metaError.code) : undefined;
    const retry = shouldRetryMetaCapi(res.status, errorCode);

    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      statusCode: res.status,
      errorCode,
      errorSubcode: metaError?.error_subcode ? String(metaError.error_subcode) : undefined,
      errorMessage: metaError?.message ?? `Meta CAPI failed with status ${res.status}`,
      retryCount,
      finalFailed: !retry || finalAttempt,
      safePayload,
      responsePayload,
      hasFbp: Boolean(order.fbp),
      hasFbc: Boolean(order.fbc),
      hasExternalId: Boolean(externalIdHash),
      hasEmailHash: Boolean(emailHash),
      hasPhoneHash: Boolean(phoneHash),
      hasIp: Boolean(order.customerIp),
      hasUa: Boolean(order.customerUa),
    });

    if (String(errorCode) === '190') {
      console.error('[CRITICAL][META_CAPI] Invalid access token or expired token.', {
        eventName: 'Purchase',
        eventId,
        orderId: order.id,
        statusCode: res.status,
        errorCode,
      });
    }

    if (retry) {
      await releaseMetaPurchaseClaim(order.id, eventId);
      throw new Error(`Retryable Meta CAPI error: ${res.status}`);
    }

    await releaseMetaPurchaseClaim(order.id, eventId);

    return { ok: false, retry: false, reason: 'META_CAPI_PERMANENT_FAILURE' };
  } catch (error) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      errorCode: 'NETWORK_OR_RETRYABLE_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown network/retryable error',
      retryCount,
      finalFailed: finalAttempt,
      safePayload,
      hasFbp: Boolean(order.fbp),
      hasFbc: Boolean(order.fbc),
      hasExternalId: Boolean(externalIdHash),
      hasEmailHash: Boolean(emailHash),
      hasPhoneHash: Boolean(phoneHash),
      hasIp: Boolean(order.customerIp),
      hasUa: Boolean(order.customerUa),
    });

    await releaseMetaPurchaseClaim(order.id, eventId);
    throw error;
  }
}

export async function sendOnlinePaidPurchaseToMeta(params: {
  orderId: string;
  retryCount?: number;
  finalAttempt?: boolean;
}) {
  const { orderId, retryCount = 0, finalAttempt = false } = params;
  const eventId = `Purchase-${orderId}`;

  if (!META_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) {
    await logMetaFailure({
      orderId,
      eventName: 'Purchase',
      eventId,
      errorCode: 'META_ENV_MISSING',
      errorMessage: 'META_PIXEL_ID or META_CAPI_ACCESS_TOKEN is missing.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'META_ENV_MISSING' };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: true,
    },
  });

  if (!order) {
    await logMetaFailure({
      orderId,
      eventName: 'Purchase',
      eventId,
      errorCode: 'ORDER_NOT_FOUND',
      errorMessage: 'Order not found for online paid Purchase.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'ORDER_NOT_FOUND' };
  }

  if (order.isTest) {
    return { ok: true, skipped: true, reason: 'TEST_ORDER' };
  }

  if (order.metaPurchaseSent) {
    return { ok: true, skipped: true, reason: 'ALREADY_SENT' };
  }

  if (isCodPaymentMethod(order.paymentMethod)) {
    return { ok: true, skipped: true, reason: 'COD_ORDER' };
  }

  if (!isCompletedPaymentStatus(order.paymentStatus)) {
    return { ok: true, skipped: true, reason: 'PAYMENT_NOT_COMPLETED' };
  }

  if (!order.paymentPaidAt) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      errorCode: 'PAYMENT_PAID_AT_MISSING',
      errorMessage: 'paymentPaidAt missing for online paid Purchase.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'PAYMENT_PAID_AT_MISSING' };
  }

  const eventTime = Math.floor(order.paymentPaidAt.getTime() / 1000);

  if (isFutureEventTime(eventTime)) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      errorCode: 'EVENT_TIME_IN_FUTURE',
      errorMessage: 'paymentPaidAt is in the future.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'EVENT_TIME_IN_FUTURE' };
  }

  if (isOlderThanSevenDays(eventTime)) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      statusCode: 400,
      errorCode: 'EVENT_TIME_TOO_OLD',
      errorMessage: 'paymentPaidAt is older than 7 days. Meta CAPI Purchase not sent.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'EVENT_TIME_TOO_OLD' };
  }

  const normalizedEmail = normalizeEmail(order.user.email);
  const normalizedPhone = normalizeBangladeshPhone(order.user.phone);
  const emailHash = normalizedEmail ? sha256(normalizedEmail) : undefined;
  const phoneHash = normalizedPhone ? sha256(normalizedPhone) : undefined;
  const externalIdHash = order.externalId ? sha256(order.externalId.trim()) : undefined;

  const contents = order.items.map((item) => ({
    id: getMetaContentId(item),
    quantity: item.quantity,
    item_price: decimalToNumber(item.price),
  }));
  const contentIds = getOrderContentIds(order.items);
  const contentName = getOrderContentName(order.items);
  const orderValue = decimalToNumber(order.total);

  if (orderValue <= 0) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      errorCode: 'PURCHASE_VALUE_INVALID',
      errorMessage: 'Purchase value must be greater than zero.',
      retryCount,
      finalFailed: true,
      safePayload: {
        event_name: 'Purchase',
        event_id: eventId,
        order_id: order.id,
        value: orderValue,
        currency: 'BDT',
      },
    });
    return { ok: false, retry: false, reason: 'PURCHASE_VALUE_INVALID' };
  }

  const verifiedPayment = await prisma.payment.findFirst({
    where: {
      orderId: order.id,
      status: 'COMPLETED',
      signatureVerified: true,
      amountMatched: true,
      currencyMatched: true,
      currency: 'BDT',
    },
    orderBy: { verifiedAt: 'desc' },
  });

  if (!verifiedPayment) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      errorCode: 'VERIFIED_PAYMENT_MISSING',
      errorMessage: 'Verified completed payment row missing for online Purchase.',
      retryCount,
      finalFailed: true,
      safePayload: {
        event_name: 'Purchase',
        event_id: eventId,
        order_id: order.id,
        payment_status: String(order.paymentStatus),
      },
    });
    return { ok: false, retry: false, reason: 'VERIFIED_PAYMENT_MISSING' };
  }

  const verifiedPaymentAmount = decimalToNumber(verifiedPayment.amount);
  if (Math.abs(verifiedPaymentAmount - orderValue) >= 0.01) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      errorCode: 'VERIFIED_PAYMENT_AMOUNT_MISMATCH',
      errorMessage: 'Verified payment amount does not match order total for online Purchase.',
      retryCount,
      finalFailed: true,
      safePayload: {
        event_name: 'Purchase',
        event_id: eventId,
        order_id: order.id,
        order_value: orderValue,
        verified_payment_amount: verifiedPaymentAmount,
        currency: verifiedPayment.currency,
      },
    });
    return { ok: false, retry: false, reason: 'VERIFIED_PAYMENT_AMOUNT_MISMATCH' };
  }

  const claimed = await claimMetaPurchaseSend(order.id, eventId);
  if (!claimed) {
    return { ok: true, skipped: true, reason: 'ALREADY_CLAIMED_OR_SENT' };
  }

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_id: eventId,
        event_time: eventTime,
        action_source: 'website',
        event_source_url: getSafePurchaseEventSourceUrl(order.firstLandingUrl),
        user_data: {
          ...(emailHash && { em: emailHash }),
          ...(phoneHash && { ph: phoneHash }),
          ...(externalIdHash && { external_id: externalIdHash }),
          ...(order.fbp && { fbp: order.fbp }),
          ...(order.fbc && { fbc: order.fbc }),
          ...(order.customerIp && { client_ip_address: order.customerIp }),
          ...(order.customerUa && { client_user_agent: order.customerUa }),
        },
        custom_data: {
          currency: 'BDT',
          value: orderValue,
          order_id: String(order.id),
          content_ids: contentIds,
          content_type: 'product',
          ...(contentName && { content_name: contentName }),
          contents,
          num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
        },
      },
    ],
    ...(process.env.NODE_ENV !== 'production' && META_TEST_EVENT_CODE
      ? { test_event_code: META_TEST_EVENT_CODE }
      : {}),
  };

  const safePayload = {
    event_name: 'Purchase',
    event_id: eventId,
    order_id: order.id,
    event_time: eventTime,
    event_time_source: 'order.paymentPaidAt',
    value: orderValue,
    currency: 'BDT',
    has_fbp: Boolean(order.fbp),
    has_fbc: Boolean(order.fbc),
    has_external_id: Boolean(externalIdHash),
    has_email_hash: Boolean(emailHash),
    has_phone_hash: Boolean(phoneHash),
    has_ip: Boolean(order.customerIp),
    has_ua: Boolean(order.customerUa),
  };

  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(META_CAPI_ACCESS_TOKEN)}`;

  try {
    const res = await postMetaCapiPayload(url, payload);

    const responsePayload = (await res.json().catch(() => null)) as {
      error?: {
        code?: string | number;
        error_subcode?: string | number;
        message?: string;
      };
    } | null;

    if (res.ok) {
      await markMetaPurchaseSent(order.id, eventId);

      return { ok: true, retry: false, response: responsePayload };
    }

    const metaError = responsePayload?.error;
    const errorCode = metaError?.code ? String(metaError.code) : undefined;
    const retry = shouldRetryMetaCapi(res.status, errorCode);

    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      statusCode: res.status,
      errorCode,
      errorSubcode: metaError?.error_subcode ? String(metaError.error_subcode) : undefined,
      errorMessage: metaError?.message ?? `Meta CAPI failed with status ${res.status}`,
      retryCount,
      finalFailed: !retry || finalAttempt,
      safePayload,
      responsePayload,
      hasFbp: Boolean(order.fbp),
      hasFbc: Boolean(order.fbc),
      hasExternalId: Boolean(externalIdHash),
      hasEmailHash: Boolean(emailHash),
      hasPhoneHash: Boolean(phoneHash),
      hasIp: Boolean(order.customerIp),
      hasUa: Boolean(order.customerUa),
    });

    if (String(errorCode) === '190') {
      console.error('[CRITICAL][META_CAPI] Invalid access token or expired token.', {
        eventName: 'Purchase',
        eventId,
        orderId: order.id,
        statusCode: res.status,
        errorCode,
      });
    }

    if (retry) {
      await releaseMetaPurchaseClaim(order.id, eventId);
      throw new Error(`Retryable Meta CAPI error: ${res.status}`);
    }

    await releaseMetaPurchaseClaim(order.id, eventId);

    return { ok: false, retry: false, reason: 'META_CAPI_PERMANENT_FAILURE' };
  } catch (error) {
    await logMetaFailure({
      orderId: order.id,
      eventName: 'Purchase',
      eventId,
      errorCode: 'NETWORK_OR_RETRYABLE_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown network/retryable error',
      retryCount,
      finalFailed: finalAttempt,
      safePayload,
      hasFbp: Boolean(order.fbp),
      hasFbc: Boolean(order.fbc),
      hasExternalId: Boolean(externalIdHash),
      hasEmailHash: Boolean(emailHash),
      hasPhoneHash: Boolean(phoneHash),
      hasIp: Boolean(order.customerIp),
      hasUa: Boolean(order.customerUa),
    });

    await releaseMetaPurchaseClaim(order.id, eventId);
    throw error;
  }
}
