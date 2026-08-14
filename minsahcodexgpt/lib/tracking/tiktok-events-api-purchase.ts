import 'server-only';

import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import {
  buildTikTokContentIds,
  getTikTokContentId,
  getTikTokContentType,
} from '@/lib/tracking/tiktok-content-id';
import { normalizeMetaExternalId } from '@/lib/tracking/meta-external-id';
import { TRACKING_SCHEMA_VERSION } from '@/lib/tracking/meta-schema';
import { sanitizeTrackingUrl } from '@/lib/tracking/sanitize-url';
import { getTrackingFailureLogRetentionMetadata } from '@/lib/tracking/failure-retention';
import { logOperationalError } from '@/lib/observability/logger';
import { classifyStoredOrderTraffic } from '@/lib/tracking/traffic-filter';

const TIKTOK_EVENTS_API_ENABLED = process.env.TIKTOK_EVENTS_API_ENABLED === 'true';
const TIKTOK_PURCHASE_LIVE_VERIFIED = process.env.TIKTOK_PURCHASE_LIVE_VERIFIED === 'true';
const TIKTOK_PIXEL_ID = process.env.TIKTOK_PIXEL_ID ?? process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;
const TIKTOK_TEST_EVENT_CODE = process.env.TIKTOK_TEST_EVENT_CODE;
const TIKTOK_EVENTS_API_URL =
  process.env.TIKTOK_EVENTS_API_URL ?? 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
const TIKTOK_EVENTS_API_TIMEOUT_MS = Number(process.env.TIKTOK_EVENTS_API_TIMEOUT_MS ?? 5_000) || 5_000;
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://minsahbeauty.cloud';
const TIKTOK_PURCHASE_CLAIM_STALE_MS = 15 * 60 * 1000;

type TikTokPurchaseSource = 'cod_phone_confirmed' | 'online_paid';
type OrderForTikTok = Awaited<ReturnType<typeof loadOrderForTikTok>>;

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
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

function decimalToNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
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

function isFutureEventTime(eventTimeSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  return eventTimeSeconds > now + 60;
}

function getSafePageUrl(firstLandingUrl?: string | null) {
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

function getSafeReferrer(referrer?: string | null) {
  return sanitizeTrackingUrl(referrer);
}

function buildTikTokPurchaseEventId(orderId: string) {
  return `tt_purchase_${orderId}`;
}

function shouldRetryTikTokEventsApi(status?: number, errorCode?: string | number | null) {
  if (!status) return true;
  if (status === 408 || status === 409 || status === 425 || status === 429) return true;
  if (status >= 500) return true;

  const normalizedCode = String(errorCode ?? '').toUpperCase();
  if (normalizedCode.includes('TOKEN') || normalizedCode.includes('AUTH') || normalizedCode.includes('PERMISSION')) {
    return false;
  }

  if (status >= 400 && status < 500) return false;
  return false;
}

async function loadOrderForTikTok(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      shippingAddress: { select: { phone: true } },
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

async function claimTikTokPurchaseSend(orderId: string, eventId: string) {
  const staleBefore = new Date(Date.now() - TIKTOK_PURCHASE_CLAIM_STALE_MS);

  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      tiktokPurchaseSent: false,
      OR: [
        { tiktokPurchaseProcessingAt: null },
        { tiktokPurchaseProcessingAt: { lt: staleBefore } },
      ],
    },
    data: {
      tiktokPurchaseProcessingAt: new Date(),
      tiktokEventId: eventId,
    },
  });

  return result.count === 1;
}

async function releaseTikTokPurchaseClaim(orderId: string, eventId: string) {
  await prisma.order.updateMany({
    where: {
      id: orderId,
      tiktokPurchaseSent: false,
      tiktokEventId: eventId,
    },
    data: {
      tiktokPurchaseProcessingAt: null,
    },
  });
}

async function markTikTokPurchaseSent(orderId: string, eventId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      tiktokPurchaseSent: true,
      tiktokPurchaseSentAt: new Date(),
      tiktokPurchaseProcessingAt: null,
      tiktokEventId: eventId,
    },
  });
}

async function logTikTokFailure(params: {
  orderId?: string;
  eventId?: string;
  statusCode?: number;
  errorCode?: string;
  errorSubcode?: string;
  errorMessage: string;
  retryCount?: number;
  finalFailed?: boolean;
  safePayload?: Record<string, unknown>;
  responsePayload?: unknown;
  hasTtclid?: boolean;
  hasTtp?: boolean;
  hasExternalId?: boolean;
  hasEmailHash?: boolean;
  hasPhoneHash?: boolean;
  hasIp?: boolean;
  hasUa?: boolean;
}) {
  const retention = getTrackingFailureLogRetentionMetadata({
    provider: 'TIKTOK',
    statusCode: params.statusCode,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    finalFailed: params.finalFailed ?? false,
  });

  await prisma.metaCapiFailure.create({
    data: {
      orderId: params.orderId,
      eventName: 'Purchase',
      eventId: params.eventId,
      provider: 'TIKTOK',
      schemaVersion: TRACKING_SCHEMA_VERSION,
      statusCode: params.statusCode,
      errorCode: params.errorCode,
      errorSubcode: params.errorSubcode,
      errorMessage: params.errorMessage,
      retryCount: params.retryCount ?? 0,
      finalFailed: params.finalFailed ?? false,
      failureCategory: retention.failureCategory,
      cleanupAfter: retention.cleanupAfter,
      safePayload: toPrismaJson(params.safePayload),
      responsePayload: toPrismaJson(params.responsePayload),
      hasFbc: params.hasTtclid ?? false,
      hasFbp: params.hasTtp ?? false,
      hasExternalId: params.hasExternalId ?? false,
      hasEmailHash: params.hasEmailHash ?? false,
      hasPhoneHash: params.hasPhoneHash ?? false,
      hasIp: params.hasIp ?? false,
      hasUa: params.hasUa ?? false,
    },
  });
}

async function postTikTokEventsApiPayload(payload: unknown) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIKTOK_EVENTS_API_TIMEOUT_MS);

  try {
    return await fetch(TIKTOK_EVENTS_API_URL, {
      method: 'POST',
      headers: {
        'Access-Token': TIKTOK_ACCESS_TOKEN ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildTikTokContents(order: NonNullable<OrderForTikTok>) {
  return order.items
    .map((item) => {
      const source = {
        ...item,
        price: decimalToNumber(item.price),
      };
      const contentId = getTikTokContentId(source);
      if (!contentId) return null;

      return {
        content_id: contentId,
        content_name: clean(item.name) ?? clean(item.product?.name),
        quantity: Math.max(1, Math.trunc(item.quantity || 1)),
        price: decimalToNumber(item.price),
      };
    })
    .filter(Boolean) as Array<{
      content_id: string;
      content_name?: string;
      quantity: number;
      price: number;
    }>;
}

function buildTikTokPayload(params: {
  order: NonNullable<OrderForTikTok>;
  source: TikTokPurchaseSource;
  eventId: string;
  eventTime: number;
}) {
  const { order, source, eventId, eventTime } = params;
  const normalizedEmail = normalizeEmail(order.user.email);
  const normalizedPhone = normalizeBangladeshPhone(order.user.phone ?? order.shippingAddress?.phone);
  const normalizedExternalId = normalizeMetaExternalId(order.tiktokExternalId ?? order.externalId, 'visitor');
  const emailHash = normalizedEmail ? sha256(normalizedEmail) : undefined;
  const phoneHash = normalizedPhone ? sha256(normalizedPhone) : undefined;
  const externalIdHash = normalizedExternalId ? sha256(normalizedExternalId) : undefined;
  const catalogItems = order.items.map((item) => ({
    ...item,
    price: decimalToNumber(item.price),
  }));
  const contentIds = buildTikTokContentIds(catalogItems);
  const contentType = getTikTokContentType(catalogItems);
  const contents = buildTikTokContents(order);
  const quantity = order.items.reduce((sum, item) => sum + Math.max(1, Math.trunc(item.quantity || 1)), 0);
  const orderValue = decimalToNumber(order.total);
  const pageUrl = getSafePageUrl(order.firstLandingUrl);
  const referrer = getSafeReferrer(order.referrer);

  const payload = {
    event_source: 'web',
    event_source_id: TIKTOK_PIXEL_ID,
    data: [
      {
        event: 'Purchase',
        event_time: eventTime,
        event_id: eventId,
        user: {
          ...(order.tiktokClickId && { ttclid: order.tiktokClickId }),
          ...(order.tiktokTtp && { ttp: order.tiktokTtp }),
          ...(emailHash && { email: emailHash }),
          ...(phoneHash && { phone: phoneHash }),
          ...(externalIdHash && { external_id: externalIdHash }),
          ...(order.customerIp && { ip: order.customerIp }),
          ...(order.customerUa && { user_agent: order.customerUa }),
        },
        page: {
          url: pageUrl,
          ...(referrer && { referrer }),
        },
        properties: {
          currency: 'BDT',
          value: orderValue,
          content_type: contentType,
          description: `Minsah Beauty ${source === 'cod_phone_confirmed' ? 'COD' : 'online paid'} purchase`,
          content_ids: contentIds,
          quantity,
          contents,
          order_id: order.orderNumber ?? order.id,
        },
      },
    ],
    ...(TIKTOK_TEST_EVENT_CODE ? { test_event_code: TIKTOK_TEST_EVENT_CODE } : {}),
  };

  const safePayload = {
    event: 'Purchase',
    event_id: eventId,
    event_time: eventTime,
    source,
    order_id: order.id,
    order_number: order.orderNumber,
    value: orderValue,
    currency: 'BDT',
    content_type: contentType,
    content_id_count: contentIds.length,
    contents_count: contents.length,
    quantity,
    has_ttclid: Boolean(order.tiktokClickId),
    has_ttp: Boolean(order.tiktokTtp),
    has_external_id: Boolean(externalIdHash),
    has_email_hash: Boolean(emailHash),
    has_phone_hash: Boolean(phoneHash),
    has_ip: Boolean(order.customerIp),
    has_ua: Boolean(order.customerUa),
    endpoint_version: 'v1.3',
    event_source: 'web',
    test_event: Boolean(TIKTOK_TEST_EVENT_CODE),
  };

  return {
    payload,
    safePayload,
    orderValue,
    hasTtclid: Boolean(order.tiktokClickId),
    hasTtp: Boolean(order.tiktokTtp),
    hasExternalId: Boolean(externalIdHash),
    hasEmailHash: Boolean(emailHash),
    hasPhoneHash: Boolean(phoneHash),
    hasIp: Boolean(order.customerIp),
    hasUa: Boolean(order.customerUa),
  };
}

async function sendPurchaseToTikTok(params: {
  orderId: string;
  source: TikTokPurchaseSource;
  retryCount?: number;
  finalAttempt?: boolean;
}) {
  const { orderId, source, retryCount = 0, finalAttempt = false } = params;
  const eventId = buildTikTokPurchaseEventId(orderId);

  if (!TIKTOK_EVENTS_API_ENABLED) {
    return { ok: true, skipped: true, reason: 'TIKTOK_EVENTS_API_DISABLED' };
  }

  if (process.env.NODE_ENV === 'production' && !TIKTOK_PURCHASE_LIVE_VERIFIED) {
    return { ok: true, skipped: true, reason: 'TIKTOK_PURCHASE_LIVE_NOT_VERIFIED' };
  }

  if (!TIKTOK_PIXEL_ID || !TIKTOK_ACCESS_TOKEN) {
    await logTikTokFailure({
      orderId,
      eventId,
      errorCode: 'TIKTOK_ENV_MISSING',
      errorMessage: 'TIKTOK_PIXEL_ID/NEXT_PUBLIC_TIKTOK_PIXEL_ID or TIKTOK_ACCESS_TOKEN is missing.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'TIKTOK_ENV_MISSING' };
  }

  const order = await loadOrderForTikTok(orderId);

  if (!order) {
    await logTikTokFailure({
      orderId,
      eventId,
      errorCode: 'ORDER_NOT_FOUND',
      errorMessage: 'Order not found for TikTok Purchase.',
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'ORDER_NOT_FOUND' };
  }

  const traffic = classifyStoredOrderTraffic(order, { skipBot: true });
  if (!traffic.allowed) {
    return { ok: true, skipped: true, reason: traffic.reason };
  }

  if (order.tiktokPurchaseSent) {
    return { ok: true, skipped: true, reason: 'ALREADY_SENT' };
  }

  if (source === 'cod_phone_confirmed') {
    if (!isCodPaymentMethod(order.paymentMethod)) {
      return { ok: true, skipped: true, reason: 'NON_COD_ORDER' };
    }

    if (!order.phoneConfirmedAt) {
      await logTikTokFailure({
        orderId: order.id,
        eventId,
        errorCode: 'PHONE_CONFIRMED_AT_MISSING',
        errorMessage: 'phoneConfirmedAt missing for TikTok COD Purchase.',
        retryCount,
        finalFailed: true,
      });
      return { ok: false, retry: false, reason: 'PHONE_CONFIRMED_AT_MISSING' };
    }
  } else {
    if (isCodPaymentMethod(order.paymentMethod)) {
      return { ok: true, skipped: true, reason: 'COD_ORDER' };
    }

    if (!isCompletedPaymentStatus(order.paymentStatus)) {
      return { ok: true, skipped: true, reason: 'PAYMENT_NOT_COMPLETED' };
    }

    if (!order.paymentPaidAt) {
      await logTikTokFailure({
        orderId: order.id,
        eventId,
        errorCode: 'PAYMENT_PAID_AT_MISSING',
        errorMessage: 'paymentPaidAt missing for TikTok online paid Purchase.',
        retryCount,
        finalFailed: true,
      });
      return { ok: false, retry: false, reason: 'PAYMENT_PAID_AT_MISSING' };
    }

    const verifiedPayment = order.payments[0];
    if (!verifiedPayment) {
      await logTikTokFailure({
        orderId: order.id,
        eventId,
        errorCode: 'VERIFIED_PAYMENT_MISSING',
        errorMessage: 'Verified completed payment row missing for TikTok online paid Purchase.',
        retryCount,
        finalFailed: true,
      });
      return { ok: false, retry: false, reason: 'VERIFIED_PAYMENT_MISSING' };
    }

    const orderValue = decimalToNumber(order.total);
    const verifiedPaymentAmount = decimalToNumber(verifiedPayment.amount);
    if (Math.abs(verifiedPaymentAmount - orderValue) >= 0.01) {
      await logTikTokFailure({
        orderId: order.id,
        eventId,
        errorCode: 'VERIFIED_PAYMENT_AMOUNT_MISMATCH',
        errorMessage: 'Verified payment amount does not match order total for TikTok online Purchase.',
        retryCount,
        finalFailed: true,
        safePayload: {
          event: 'Purchase',
          event_id: eventId,
          order_id: order.id,
          order_value: orderValue,
          verified_payment_amount: verifiedPaymentAmount,
          currency: verifiedPayment.currency,
        },
      });
      return { ok: false, retry: false, reason: 'VERIFIED_PAYMENT_AMOUNT_MISMATCH' };
    }
  }

  const eventTime = Math.floor(
    (source === 'cod_phone_confirmed' ? order.phoneConfirmedAt! : order.paymentPaidAt!).getTime() / 1000
  );

  if (isFutureEventTime(eventTime)) {
    await logTikTokFailure({
      orderId: order.id,
      eventId,
      errorCode: 'EVENT_TIME_IN_FUTURE',
      errorMessage: `${source === 'cod_phone_confirmed' ? 'phoneConfirmedAt' : 'paymentPaidAt'} is in the future.`,
      retryCount,
      finalFailed: true,
    });
    return { ok: false, retry: false, reason: 'EVENT_TIME_IN_FUTURE' };
  }

  const purchase = buildTikTokPayload({ order, source, eventId, eventTime });
  if (purchase.orderValue <= 0) {
    await logTikTokFailure({
      orderId: order.id,
      eventId,
      errorCode: 'PURCHASE_VALUE_INVALID',
      errorMessage: 'TikTok Purchase value must be greater than zero.',
      retryCount,
      finalFailed: true,
      safePayload: purchase.safePayload,
    });
    return { ok: false, retry: false, reason: 'PURCHASE_VALUE_INVALID' };
  }

  const claimed = await claimTikTokPurchaseSend(order.id, eventId);
  if (!claimed) {
    return { ok: true, skipped: true, reason: 'ALREADY_CLAIMED_OR_SENT' };
  }

  try {
    const res = await postTikTokEventsApiPayload(purchase.payload);

    const responsePayload = (await res.json().catch(() => null)) as {
      code?: string | number;
      message?: string;
      request_id?: string;
      data?: unknown;
      error?: {
        code?: string | number;
        message?: string;
      };
    } | null;

    const apiCode = responsePayload?.code ?? responsePayload?.error?.code;
    const isTikTokApiSuccess = res.ok && (apiCode === undefined || String(apiCode) === '0');

    if (isTikTokApiSuccess) {
      await markTikTokPurchaseSent(order.id, eventId);
      return { ok: true, retry: false, response: responsePayload };
    }

    const errorCode = apiCode ? String(apiCode) : undefined;
    const errorMessage =
      responsePayload?.message ??
      responsePayload?.error?.message ??
      `TikTok Events API failed with status ${res.status}`;
    const retry = shouldRetryTikTokEventsApi(res.status, errorCode);

    await logTikTokFailure({
      orderId: order.id,
      eventId,
      statusCode: res.status,
      errorCode,
      errorMessage,
      retryCount,
      finalFailed: !retry || finalAttempt,
      safePayload: purchase.safePayload,
      responsePayload,
      hasTtclid: purchase.hasTtclid,
      hasTtp: purchase.hasTtp,
      hasExternalId: purchase.hasExternalId,
      hasEmailHash: purchase.hasEmailHash,
      hasPhoneHash: purchase.hasPhoneHash,
      hasIp: purchase.hasIp,
      hasUa: purchase.hasUa,
    });

    if (res.status === 401 || res.status === 403 || String(errorCode).toUpperCase().includes('TOKEN')) {
      logOperationalError(
        'tracking.tiktok_events_api.invalid_credentials',
        new Error('TikTok Events API token, authorization, or permission is invalid.'),
        {
          eventName: 'Purchase',
          eventId,
          orderId: order.id,
          statusCode: res.status,
          errorCode,
        }
      );
    }

    if (retry) {
      await releaseTikTokPurchaseClaim(order.id, eventId);
      throw new Error(`Retryable TikTok Events API error: ${res.status}`);
    }

    await releaseTikTokPurchaseClaim(order.id, eventId);
    return { ok: false, retry: false, reason: 'TIKTOK_EVENTS_API_PERMANENT_FAILURE' };
  } catch (error) {
    await logTikTokFailure({
      orderId: order.id,
      eventId,
      errorCode: 'NETWORK_OR_RETRYABLE_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown TikTok network/retryable error',
      retryCount,
      finalFailed: finalAttempt,
      safePayload: purchase.safePayload,
      hasTtclid: purchase.hasTtclid,
      hasTtp: purchase.hasTtp,
      hasExternalId: purchase.hasExternalId,
      hasEmailHash: purchase.hasEmailHash,
      hasPhoneHash: purchase.hasPhoneHash,
      hasIp: purchase.hasIp,
      hasUa: purchase.hasUa,
    });

    await releaseTikTokPurchaseClaim(order.id, eventId);
    throw error;
  }
}

export function sendCodPurchaseToTikTok(params: {
  orderId: string;
  retryCount?: number;
  finalAttempt?: boolean;
}) {
  return sendPurchaseToTikTok({
    ...params,
    source: 'cod_phone_confirmed',
  });
}

export function sendOnlinePaidPurchaseToTikTok(params: {
  orderId: string;
  retryCount?: number;
  finalAttempt?: boolean;
}) {
  return sendPurchaseToTikTok({
    ...params,
    source: 'online_paid',
  });
}
