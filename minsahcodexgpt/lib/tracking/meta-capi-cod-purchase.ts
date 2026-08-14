import 'server-only';
import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import {
  buildMetaCatalogData,
  prepareMetaCatalogPayload,
  type MetaCatalogData,
} from '@/lib/tracking/meta-content-id';
import { sanitizeTrackingUrl } from '@/lib/tracking/sanitize-url';
import { normalizeMetaExternalId } from '@/lib/tracking/meta-external-id';
import { classifyStoredOrderTraffic } from '@/lib/tracking/traffic-filter';
import {
  getMetaTestEventCode,
  TRACKING_SCHEMA_VERSION,
  withMetaSafePayloadSchema,
  withMetaSchemaVersion,
} from '@/lib/tracking/meta-schema';
import type { MetaBusinessSdkRequestInput } from '@/lib/tracking/meta-business-sdk';
import { sendMetaCapiWithPhase28Cutover } from '@/lib/meta-platform/migration/phase28-capi-facade';
import { getTrackingFailureLogRetentionMetadata } from '@/lib/tracking/failure-retention';
import { logOperationalError } from '@/lib/observability/logger';
import { buildMetaPurchaseEventId } from '@/lib/meta/capi/event-id';
import { computeMetaAdaptiveCooldownMs, parseMetaRateLimitHeaders } from '@/lib/jobs/rate-limit';

const META_TEST_EVENT_CODE = getMetaTestEventCode();
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://minsahbeauty.cloud';

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

function getOrderContentName(items: Array<{ name?: string | null }>) {
  return items
    .map((item) => item.name?.trim())
    .filter(Boolean)
    .join(', ')
    .slice(0, 300);
}

type PurchaseAttributionOrder = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  campaignId?: string | null;
  adsetId?: string | null;
  adId?: string | null;
  placement?: string | null;
  offerVersion?: string | null;
  abVariant?: string | null;
  attributionCouponCode?: string | null;
  couponCode?: string | null;
  freeDeliveryThreshold?: unknown;
  landingOffer?: string | null;
  campaignSourceUrl?: string | null;
};

function buildPurchaseAttributionCustomData(order: PurchaseAttributionOrder) {
  const freeDeliveryThreshold = decimalToNumber(order.freeDeliveryThreshold);
  const campaignSourceUrl = sanitizeTrackingUrl(order.campaignSourceUrl);

  return {
    ...(order.utmSource && { utm_source: order.utmSource }),
    ...(order.utmMedium && { utm_medium: order.utmMedium }),
    ...(order.utmCampaign && { utm_campaign: order.utmCampaign }),
    ...(order.utmContent && { utm_content: order.utmContent }),
    ...(order.utmTerm && { utm_term: order.utmTerm }),
    ...(order.campaignId && { campaign_id: order.campaignId }),
    ...(order.adsetId && { adset_id: order.adsetId }),
    ...(order.adId && { ad_id: order.adId }),
    ...(order.placement && { placement: order.placement }),
    ...(order.offerVersion && { offer_version: order.offerVersion }),
    ...(order.abVariant && { ab_variant: order.abVariant }),
    ...(order.couponCode && { applied_coupon_code: order.couponCode }),
    ...(order.attributionCouponCode && { attribution_coupon_code: order.attributionCouponCode }),
    ...((order.couponCode || order.attributionCouponCode) && {
      coupon_code: order.couponCode ?? order.attributionCouponCode,
    }),
    ...(freeDeliveryThreshold > 0 && { free_delivery_threshold: freeDeliveryThreshold }),
    ...(order.landingOffer && { landing_offer: order.landingOffer }),
    ...(campaignSourceUrl && { campaign_source_url: campaignSourceUrl }),
  };
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
      errorSubcode: params.errorSubcode,
      errorMessage: params.errorMessage,
      retryCount: params.retryCount ?? 0,
      finalFailed: params.finalFailed ?? false,
      failureCategory: retention.failureCategory,
      cleanupAfter: retention.cleanupAfter,
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


class LoggedMetaPurchaseRetryableError extends Error {
  readonly metaCapiFailureAlreadyLogged = true;
  readonly providerStatus?: number;
  readonly retryAfterMs?: number;

  constructor(message: string, providerStatus?: number, retryAfterMs?: number) {
    super(message);
    this.name = 'LoggedMetaPurchaseRetryableError';
    this.providerStatus = providerStatus;
    this.retryAfterMs = retryAfterMs;
  }
}

function isLoggedMetaPurchaseRetryableError(
  error: unknown
): error is LoggedMetaPurchaseRetryableError {
  return (
    error instanceof LoggedMetaPurchaseRetryableError ||
    (typeof error === 'object' &&
      error !== null &&
      'metaCapiFailureAlreadyLogged' in error &&
      (error as { metaCapiFailureAlreadyLogged?: unknown }).metaCapiFailureAlreadyLogged === true)
  );
}

async function deliverPurchaseWithBusinessSdk(params: {
  orderId: string;
  eventId: string;
  payload: MetaBusinessSdkRequestInput;
  safePayload: Record<string, unknown>;
  retryCount: number;
  finalAttempt: boolean;
  hasFbp: boolean;
  hasFbc: boolean;
  hasExternalId: boolean;
  hasEmailHash: boolean;
  hasPhoneHash: boolean;
  hasIp: boolean;
  hasUa: boolean;
}) {
  try {
    const result = await sendMetaCapiWithPhase28Cutover({
      payload: params.payload,
      correlationId: params.eventId,
    });
    const responsePayload = result.responsePayload;

    if (result.ok) {
      await markMetaPurchaseSent(params.orderId, params.eventId);
      console.log(
        `[CAPI][Phase28][Purchase] Event sent successfully: ${params.eventId}`
      );
      return {
        ok: true,
        retry: false,
        response: responsePayload,
        transport: result.transport,
        cutoverMode: result.cutoverMode,
        graphApiVersion: result.graphApiVersion,
        sdkVersion: result.sdkVersion,
        credentialVersion: result.credentialVersion,
      };
    }

    const metaError = responsePayload?.error;
    const errorCode = metaError?.code ? String(metaError.code) : undefined;
    const retry = shouldRetryMetaCapi(result.status, errorCode);

    await logMetaFailure({
      orderId: params.orderId,
      eventName: 'Purchase',
      eventId: params.eventId,
      statusCode: result.status,
      errorCode,
      errorSubcode: metaError?.error_subcode ? String(metaError.error_subcode) : undefined,
      errorMessage:
        metaError?.message ??
        `Meta CAPI Business SDK failed with status ${result.status}`,
      retryCount: params.retryCount,
      finalFailed: !retry || params.finalAttempt,
      safePayload: params.safePayload,
      responsePayload,
      hasFbp: params.hasFbp,
      hasFbc: params.hasFbc,
      hasExternalId: params.hasExternalId,
      hasEmailHash: params.hasEmailHash,
      hasPhoneHash: params.hasPhoneHash,
      hasIp: params.hasIp,
      hasUa: params.hasUa,
    });

    if (String(errorCode) === '190') {
      logOperationalError(
        'tracking.meta_capi.invalid_access_token',
        new Error('Meta CAPI access token is invalid or expired.'),
        {
          eventName: 'Purchase',
          eventId: params.eventId,
          orderId: params.orderId,
          statusCode: result.status,
          errorCode,
        }
      );
    }

    await releaseMetaPurchaseClaim(params.orderId, params.eventId);

    if (retry) {
      const rateHeaders = parseMetaRateLimitHeaders(result.responseHeaders);
      throw new LoggedMetaPurchaseRetryableError(
        `Retryable Meta CAPI Business SDK error: ${result.status}`,
        result.status,
        computeMetaAdaptiveCooldownMs({ status: result.status, headers: rateHeaders })
      );
    }

    return {
      ok: false,
      retry: false,
      reason: 'META_CAPI_PERMANENT_FAILURE',
      transport: result.transport,
      cutoverMode: result.cutoverMode,
      graphApiVersion: result.graphApiVersion,
      sdkVersion: result.sdkVersion,
    };
  } catch (error) {
    if (isLoggedMetaPurchaseRetryableError(error)) {
      throw error;
    }

    await logMetaFailure({
      orderId: params.orderId,
      eventName: 'Purchase',
      eventId: params.eventId,
      errorCode: 'BUSINESS_SDK_NETWORK_OR_RUNTIME_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown Business SDK error',
      retryCount: params.retryCount,
      finalFailed: params.finalAttempt,
      safePayload: params.safePayload,
      hasFbp: params.hasFbp,
      hasFbc: params.hasFbc,
      hasExternalId: params.hasExternalId,
      hasEmailHash: params.hasEmailHash,
      hasPhoneHash: params.hasPhoneHash,
      hasIp: params.hasIp,
      hasUa: params.hasUa,
    });

    await releaseMetaPurchaseClaim(params.orderId, params.eventId);
    throw error;
  }
}

export async function sendCodPurchaseToMeta(params: {
  orderId: string;
  retryCount?: number;
  finalAttempt?: boolean;
}) {
  const { orderId, retryCount = 0, finalAttempt = false } = params;
  const eventId = buildMetaPurchaseEventId(orderId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      shippingAddress: { select: { phone: true } },
      items: { include: { product: true, variant: true } },
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

  const traffic = classifyStoredOrderTraffic(order);
  if (!traffic.allowed) {
    return { ok: true, skipped: true, reason: traffic.reason };
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
  const normalizedExternalId = normalizeMetaExternalId(order.externalId, 'visitor');
  const externalIdHash = normalizedExternalId ? sha256(normalizedExternalId) : undefined;

  const catalogItems = order.items.map((item) => ({
    ...item,
    price: decimalToNumber(item.price),
  }));
  const resolvedMetaCatalogData = buildMetaCatalogData(catalogItems);
  const catalogShape = resolvedMetaCatalogData ? 'product_only' : 'empty';
  const metaCatalogData = prepareMetaCatalogPayload(resolvedMetaCatalogData ?? {}) as Partial<MetaCatalogData>;
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
        custom_data: withMetaSchemaVersion({
          currency: 'BDT',
          value: orderValue,
          order_id: String(order.id),
          ...metaCatalogData,
          ...(contentName && { content_name: contentName }),
          num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
          ...buildPurchaseAttributionCustomData(order),
        }),
      },
    ],
    ...(process.env.NODE_ENV !== 'production' && META_TEST_EVENT_CODE
      ? { test_event_code: META_TEST_EVENT_CODE }
      : {}),
  };

  const safePayload = withMetaSafePayloadSchema({
    event_name: 'Purchase',
    event_id: eventId,
    order_id: order.id,
    event_time: eventTime,
    event_time_source: 'order.phoneConfirmedAt',
    source: 'cod_phone_confirmed',
    value: orderValue,
    currency: 'BDT',
    catalog_shape: catalogShape,
    content_type: metaCatalogData.content_type,
    content_id_count: Array.isArray(metaCatalogData.content_ids) ? metaCatalogData.content_ids.length : 0,
    contents_count: Array.isArray(metaCatalogData.contents) ? metaCatalogData.contents.length : 0,
    num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
    custom_data_keys: Object.keys(payload.data[0].custom_data).sort(),
    attribution_keys: Object.keys(buildPurchaseAttributionCustomData(order)).sort(),
    has_fbp: Boolean(order.fbp),
    has_fbc: Boolean(order.fbc),
    has_external_id: Boolean(externalIdHash),
    has_email_hash: Boolean(emailHash),
    has_phone_hash: Boolean(phoneHash),
    has_ip: Boolean(order.customerIp),
    has_ua: Boolean(order.customerUa),
  });

  return deliverPurchaseWithBusinessSdk({
    orderId: order.id,
    eventId,
    payload: payload as MetaBusinessSdkRequestInput,
    safePayload,
    retryCount,
    finalAttempt,
    hasFbp: Boolean(order.fbp),
    hasFbc: Boolean(order.fbc),
    hasExternalId: Boolean(externalIdHash),
    hasEmailHash: Boolean(emailHash),
    hasPhoneHash: Boolean(phoneHash),
    hasIp: Boolean(order.customerIp),
    hasUa: Boolean(order.customerUa),
  });
}

export async function sendOnlinePaidPurchaseToMeta(params: {
  orderId: string;
  retryCount?: number;
  finalAttempt?: boolean;
}) {
  const { orderId, retryCount = 0, finalAttempt = false } = params;
  const eventId = buildMetaPurchaseEventId(orderId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      shippingAddress: { select: { phone: true } },
      items: { include: { product: true, variant: true } },
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

  const traffic = classifyStoredOrderTraffic(order);
  if (!traffic.allowed) {
    return { ok: true, skipped: true, reason: traffic.reason };
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
  const normalizedExternalId = normalizeMetaExternalId(order.externalId, 'visitor');
  const externalIdHash = normalizedExternalId ? sha256(normalizedExternalId) : undefined;

  const catalogItems = order.items.map((item) => ({
    ...item,
    price: decimalToNumber(item.price),
  }));
  const resolvedMetaCatalogData = buildMetaCatalogData(catalogItems);
  const catalogShape = resolvedMetaCatalogData ? 'product_only' : 'empty';
  const metaCatalogData = prepareMetaCatalogPayload(resolvedMetaCatalogData ?? {}) as Partial<MetaCatalogData>;
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
        custom_data: withMetaSchemaVersion({
          currency: 'BDT',
          value: orderValue,
          order_id: String(order.id),
          ...metaCatalogData,
          ...(contentName && { content_name: contentName }),
          num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
          ...buildPurchaseAttributionCustomData(order),
        }),
      },
    ],
    ...(process.env.NODE_ENV !== 'production' && META_TEST_EVENT_CODE
      ? { test_event_code: META_TEST_EVENT_CODE }
      : {}),
  };

  const safePayload = withMetaSafePayloadSchema({
    event_name: 'Purchase',
    event_id: eventId,
    order_id: order.id,
    event_time: eventTime,
    event_time_source: 'order.paymentPaidAt',
    source: 'online_paid',
    value: orderValue,
    currency: 'BDT',
    catalog_shape: catalogShape,
    content_type: metaCatalogData.content_type,
    content_id_count: Array.isArray(metaCatalogData.content_ids) ? metaCatalogData.content_ids.length : 0,
    contents_count: Array.isArray(metaCatalogData.contents) ? metaCatalogData.contents.length : 0,
    num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
    custom_data_keys: Object.keys(payload.data[0].custom_data).sort(),
    attribution_keys: Object.keys(buildPurchaseAttributionCustomData(order)).sort(),
    has_fbp: Boolean(order.fbp),
    has_fbc: Boolean(order.fbc),
    has_external_id: Boolean(externalIdHash),
    has_email_hash: Boolean(emailHash),
    has_phone_hash: Boolean(phoneHash),
    has_ip: Boolean(order.customerIp),
    has_ua: Boolean(order.customerUa),
  });

  return deliverPurchaseWithBusinessSdk({
    orderId: order.id,
    eventId,
    payload: payload as MetaBusinessSdkRequestInput,
    safePayload,
    retryCount,
    finalAttempt,
    hasFbp: Boolean(order.fbp),
    hasFbc: Boolean(order.fbc),
    hasExternalId: Boolean(externalIdHash),
    hasEmailHash: Boolean(emailHash),
    hasPhoneHash: Boolean(phoneHash),
    hasIp: Boolean(order.customerIp),
    hasUa: Boolean(order.customerUa),
  });
}
