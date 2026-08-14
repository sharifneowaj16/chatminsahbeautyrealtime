/**
 * Facebook Conversion API (CAPI) queue route
 *
 * - Browser-callable endpoint for non-Purchase events only
 * - Builds a canonical server event payload with hashed PII
 * - Enqueues it for Business SDK delivery with retry/backoff/safe failure logging
 * - Purchase is blocked here and must use verified COD/online flows
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  TrackingPayload,
  FacebookConversionAPIRequest,
  FacebookCustomData,
  ServerTrackingResponse,
} from '@/types/facebook';
import {
  getClientIp,
  formatCurrency,
  validatePixelId,
  sanitizeUrl,
} from '@/lib/facebook/utils';
import { persistMetaCoreEventOutbox } from '@/lib/meta/capi/core-outbox';
import { requestMetaOutboxDispatch } from '@/lib/meta/capi/dispatcher';
import type { MetaWebsiteCapiRequest } from '@/lib/meta/capi/types';
import { normalizeMetaExternalId } from '@/lib/tracking/meta-external-id';
import { prepareMetaCatalogPayloadForEvent } from '@/lib/tracking/meta-content-id';
import { shouldSkipServerTrackingRequest } from '@/lib/tracking/traffic-filter';
import { resolveTrackingDecision, policyMetadata } from '@/lib/privacy/consent-resolver';
import { hashPiiEmail, hashPiiPhone, hashPiiText, hashNormalizedPii } from '@/lib/privacy/pii-hash';
import { redactPiiString } from '@/lib/privacy/pii-redaction';
import {
  getServerTrackingConsentFromCookie,
  getServerTrackingConsentVersionFromCookie,
  TRACKING_CONSENT_COOKIE,
  TRACKING_CONSENT_VERSION_COOKIE,
} from '@/lib/tracking/tracking-consent';
import {
  getMetaPixelId,
  getMetaTestEventCode,
  withMetaSafePayloadSchema,
  withMetaSchemaVersion,
} from '@/lib/tracking/meta-schema';
import { META_BUSINESS_SDK_VERSION } from '@/lib/meta-platform/versioning/registry';
import { getMetaCapiCutoverStatus } from '@/lib/meta-platform/migration/phase28-capi-facade';

const FACEBOOK_PIXEL_ID = getMetaPixelId();
const FACEBOOK_TEST_EVENT_CODE = getMetaTestEventCode();

const PUBLIC_CAPI_ALLOWED_EVENTS = new Set([
  'PageView',
  'ViewContent',
  'AddToCart',
  'AddToWishlist',
  // Mid-funnel checkout events are allowed on the public non-Purchase CAPI path.
  // They share the browser Pixel event_id for Meta deduplication. Purchase remains blocked.
  'ViewCart',
  'InitiateCheckout',
  'AddShippingInfo',
  'AddPaymentInfo',
  'Search',
  'CompleteRegistration',
  'Contact',
]);

function compactObject<T extends Record<string, unknown>>(input: T): Partial<T> {
  const output: Partial<T> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null) {
      output[key as keyof T] = value as T[keyof T];
    }
  }
  return output;
}

function getMetaEventSourceUrl(payloadUrl: string | undefined, fallbackUrl: string) {
  const sanitizedInput = sanitizeUrl(payloadUrl || fallbackUrl);

  try {
    const url = new URL(sanitizedInput, fallbackUrl);
    // Server-side defense-in-depth: even if an older client sends a raw URL,
    // Meta receives only origin + pathname for event_source_url. Attribution
    // params are sent through dedicated custom data/cookies instead.
    return `${url.origin}${url.pathname}`;
  } catch {
    const fallback = new URL(fallbackUrl);
    return `${fallback.origin}${fallback.pathname}`;
  }
}


export async function POST(request: NextRequest) {
  try {
    if (!validatePixelId(FACEBOOK_PIXEL_ID)) {
      console.error('[CAPI][Queue] Invalid or missing Facebook Pixel ID');
      return NextResponse.json(
        {
          success: false,
          message: 'Facebook Pixel ID not configured',
          error: 'INVALID_CONFIG',
        } as ServerTrackingResponse,
        { status: 500 }
      );
    }

    const payload: TrackingPayload = await request.json();

    if (!payload.eventName) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required field: eventName',
          error: 'INVALID_PAYLOAD',
        } as ServerTrackingResponse,
        { status: 400 }
      );
    }

    if (!payload.eventId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required field: eventId (critical for deduplication)',
          error: 'INVALID_PAYLOAD',
        } as ServerTrackingResponse,
        { status: 400 }
      );
    }

    if (payload.eventName === 'Purchase') {
      return NextResponse.json(
        {
          success: false,
          message: 'Purchase events are not accepted on the public Facebook CAPI endpoint',
          error: 'PURCHASE_NOT_ALLOWED_ON_PUBLIC_CAPI',
        } as ServerTrackingResponse,
        { status: 403 }
      );
    }

    if (!PUBLIC_CAPI_ALLOWED_EVENTS.has(payload.eventName)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unsupported Facebook CAPI event',
          error: 'UNSUPPORTED_EVENT',
        } as ServerTrackingResponse,
        { status: 400 }
      );
    }

    const skippedTraffic = shouldSkipServerTrackingRequest(request);
    if (skippedTraffic) {
      return NextResponse.json(
        {
          success: true,
          message: 'Event skipped by production traffic/privacy filter',
          eventId: payload.eventId,
          skipped: true,
          reason: skippedTraffic.reason,
        },
        { status: 202 }
      );
    }

    const policyDecision = resolveTrackingDecision({
      eventName: payload.eventName,
      consentState: getServerTrackingConsentFromCookie(
        request.cookies.get(TRACKING_CONSENT_COOKIE)?.value
      ),
      consentVersion: getServerTrackingConsentVersionFromCookie(
        request.cookies.get(TRACKING_CONSENT_VERSION_COOKIE)?.value
      ),
    });
    if (!policyDecision.allowCapiEvent) {
      return NextResponse.json({
        success: true, message: 'Event suppressed by privacy policy',
        eventId: payload.eventId, skipped: true, reason: policyDecision.reason,
      }, { status: 202 });
    }

    const headers = request.headers;
    const clientIp = getClientIp(headers);
    const userAgent = headers.get('user-agent') || undefined;
    const fbc = payload.fbc || request.cookies.get('_fbc')?.value;
    const fbp = payload.fbp || request.cookies.get('_fbp')?.value;
    const externalId =
      normalizeMetaExternalId(payload.externalId, 'visitor') ??
      normalizeMetaExternalId(request.cookies.get('mb_vid')?.value, 'visitor');

    const hashedUserData = compactObject({
      em: payload.email ? ([hashPiiEmail(payload.email)].filter(Boolean) as string[]) : undefined,
      ph: payload.phone ? ([hashPiiPhone(payload.phone)].filter(Boolean) as string[]) : undefined,
      external_id: hashNormalizedPii(externalId),
      fn: hashPiiText(payload.firstName),
      ln: hashPiiText(payload.lastName),
      ct: hashPiiText(payload.city),
      st: hashPiiText(payload.state),
      zp: hashPiiText(payload.zipCode),
      country: hashPiiText(payload.country),
      fbc,
      fbp,
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    });

    const customData = withMetaSchemaVersion(
      prepareMetaCatalogPayloadForEvent(payload.eventName, compactObject({
        value: formatCurrency(payload.value),
        currency: payload.currency || 'BDT',
        content_ids: payload.contentIds,
        content_type: payload.contentType,
        content_name: payload.contentName,
        content_category: payload.contentCategory,
        contents: payload.contents?.map((item) =>
          compactObject({
            id: item.id,
            quantity: item.quantity,
            item_price: item.item_price ?? item.price ?? 0,
            item_group_id: item.item_group_id,
            variant_id: item.variant_id,
            variant_sku: item.variant_sku,
            item_variant: item.item_variant,
            shade: item.shade,
            color: item.color,
            size: item.size,
          })
        ),
        num_items: payload.numItems,
        order_id: payload.orderId,
        search_string: payload.searchString,
        status: payload.status,
        method: payload.method,
        shipping_tier: payload.shippingTier,
        checkout_step: payload.checkoutStep,
      }))
    ) as FacebookCustomData;

    const eventTime = Math.floor(Date.now() / 1000);
    const capiRequest: FacebookConversionAPIRequest = {
      data: [
        {
          event_name: payload.eventName,
          event_time: eventTime,
          event_id: payload.eventId,
          event_source_url: getMetaEventSourceUrl(payload.eventSourceUrl, request.url),
          action_source: 'website',
          user_data: hashedUserData,
          custom_data: customData,
        },
      ],
    };

    if (process.env.NODE_ENV !== 'production' && FACEBOOK_TEST_EVENT_CODE) {
      capiRequest.test_event_code = FACEBOOK_TEST_EVENT_CODE;
    }

    const safePayload = withMetaSafePayloadSchema({
        event_name: payload.eventName,
        event_id: payload.eventId,
        order_id: payload.orderId,
        event_time: eventTime,
        value: typeof customData.value === 'number' ? customData.value : undefined,
        currency: typeof customData.currency === 'string' ? customData.currency : undefined,
        custom_data_keys: Object.keys(customData).sort(),
        contents_count: Array.isArray(customData.contents) ? customData.contents.length : 0,
        content_id_count: Array.isArray(customData.content_ids) ? customData.content_ids.length : 0,
        has_fbp: Boolean(fbp),
        has_fbc: Boolean(fbc),
        has_external_id: Boolean(hashedUserData.external_id),
        has_email_hash: Array.isArray(hashedUserData.em) && hashedUserData.em.length > 0,
        has_phone_hash: Array.isArray(hashedUserData.ph) && hashedUserData.ph.length > 0,
        has_ip: Boolean(clientIp),
        has_ua: Boolean(userAgent),
        ...policyMetadata(policyDecision),
      });

    const outbox = await persistMetaCoreEventOutbox({
      request: capiRequest as unknown as MetaWebsiteCapiRequest,
      sourceType: 'BROWSER_CAPI',
      sourceId: payload.eventId,
      orderId: payload.orderId,
      safePayload,
      policyDecision,
    });
    const dispatch = await requestMetaOutboxDispatch(outbox.record.id);

    return NextResponse.json(
      {
        success: true,
        message: dispatch.queued
          ? 'Event persisted and queued for Meta Business SDK delivery'
          : 'Event persisted; dispatcher will retry when queue service recovers',
        eventId: payload.eventId,
        outboxId: outbox.record.id,
        deduplicated: !outbox.created,
      } as ServerTrackingResponse & { outboxId: string; deduplicated: boolean },
      { status: 202 }
    );
  } catch (error) {
    console.error('[CAPI][Queue] Unexpected error:', redactPiiString(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ServerTrackingResponse,
      { status: 500 }
    );
  }
}

export async function GET() {
  const isConfigured = validatePixelId(FACEBOOK_PIXEL_ID);
  const cutover = getMetaCapiCutoverStatus({ testEventCode: FACEBOOK_TEST_EVENT_CODE });

  return NextResponse.json({
    status: 'ok',
    configured: isConfigured,
    pixelId: FACEBOOK_PIXEL_ID ? '***' + FACEBOOK_PIXEL_ID.slice(-4) : 'not set',
    queue: 'meta-capi-outbox',
    mode: 'transactional-outbox-phase28-cutover',
    cutover,
    businessSdk: {
      packageVersion: META_BUSINESS_SDK_VERSION,
      runtimeVersion: 'verified-by-worker-runtime-contract',
    },
    testMode: !!FACEBOOK_TEST_EVENT_CODE,
    credentialPolicy: 'resolved-by-meta-platform-worker',
  });
}
