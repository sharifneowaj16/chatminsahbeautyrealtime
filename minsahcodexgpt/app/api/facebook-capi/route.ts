/**
 * Facebook Conversion API (CAPI) queue route
 *
 * - Browser-callable endpoint for non-Purchase events only
 * - Builds Meta CAPI payload server-side with hashed PII
 * - Enqueues CAPI event for async retry/backoff/safe failure logging
 * - Purchase is blocked here and must use verified COD/online flows
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  TrackingPayload,
  FacebookConversionAPIRequest,
  ServerTrackingResponse,
} from '@/types/facebook';
import {
  hashEmail,
  hashPhone,
  hashSHA256,
  getClientIp,
  formatCurrency,
  validatePixelId,
  validateAccessToken,
  sanitizeUrl,
} from '@/lib/facebook/utils';
import { enqueueMetaCapiCoreEvent } from '@/lib/queue/metaCapiQueue';

const FACEBOOK_PIXEL_ID =
  process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ||
  process.env.NEXT_PUBLIC_FB_PIXEL_ID ||
  process.env.NEXT_PUBLIC_META_PIXEL_ID ||
  process.env.META_PIXEL_ID;
const FACEBOOK_ACCESS_TOKEN =
  process.env.FACEBOOK_CONVERSION_API_TOKEN || process.env.META_CAPI_ACCESS_TOKEN;
const FACEBOOK_TEST_EVENT_CODE =
  process.env.NODE_ENV === 'production'
    ? undefined
    : process.env.FACEBOOK_TEST_EVENT_CODE || process.env.META_TEST_EVENT_CODE;

const PUBLIC_CAPI_ALLOWED_EVENTS = new Set([
  'PageView',
  'ViewContent',
  'AddToCart',
  'AddToWishlist',
  'InitiateCheckout',
  'Search',
  'CompleteRegistration',
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
  return sanitizeUrl(payloadUrl || fallbackUrl);
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

    if (!validateAccessToken(FACEBOOK_ACCESS_TOKEN)) {
      console.error('[CAPI][Queue] Invalid or missing Facebook CAPI access token');
      return NextResponse.json(
        {
          success: false,
          message: 'Facebook Access Token not configured',
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

    const headers = request.headers;
    const clientIp = getClientIp(headers);
    const userAgent = headers.get('user-agent') || undefined;
    const fbc = payload.fbc || request.cookies.get('_fbc')?.value;
    const fbp = payload.fbp || request.cookies.get('_fbp')?.value;
    const externalId = payload.externalId || request.cookies.get('mb_vid')?.value;

    const hashedUserData = compactObject({
      em: payload.email ? ([hashEmail(payload.email)].filter(Boolean) as string[]) : undefined,
      ph: payload.phone ? ([hashPhone(payload.phone)].filter(Boolean) as string[]) : undefined,
      external_id: hashSHA256(externalId),
      fn: hashSHA256(payload.firstName),
      ln: hashSHA256(payload.lastName),
      ct: hashSHA256(payload.city),
      st: hashSHA256(payload.state),
      zp: hashSHA256(payload.zipCode),
      country: hashSHA256(payload.country),
      fbc,
      fbp,
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    });

    const customData = compactObject({
      value: formatCurrency(payload.value),
      currency: payload.currency || 'BDT',
      content_ids: payload.contentIds,
      content_type: payload.contentType,
      content_name: payload.contentName,
      content_category: payload.contentCategory,
      contents: payload.contents?.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        item_price: item.item_price ?? item.price ?? 0,
      })),
      num_items: payload.numItems,
      order_id: payload.orderId,
    });

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
          custom_data: Object.keys(customData).length > 0 ? customData : {},
        },
      ],
    };

    if (FACEBOOK_TEST_EVENT_CODE) {
      capiRequest.test_event_code = FACEBOOK_TEST_EVENT_CODE;
    }

    await enqueueMetaCapiCoreEvent({
      eventName: payload.eventName,
      eventId: payload.eventId,
      orderId: payload.orderId,
      capiPayload: capiRequest as unknown as Record<string, unknown>,
      safePayload: {
        event_name: payload.eventName,
        event_id: payload.eventId,
        order_id: payload.orderId,
        event_time: eventTime,
        value: typeof customData.value === 'number' ? customData.value : undefined,
        currency: typeof customData.currency === 'string' ? customData.currency : undefined,
        has_fbp: Boolean(fbp),
        has_fbc: Boolean(fbc),
        has_external_id: Boolean(hashedUserData.external_id),
        has_email_hash: Array.isArray(hashedUserData.em) && hashedUserData.em.length > 0,
        has_phone_hash: Array.isArray(hashedUserData.ph) && hashedUserData.ph.length > 0,
        has_ip: Boolean(clientIp),
        has_ua: Boolean(userAgent),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Event queued successfully',
        eventId: payload.eventId,
      } as ServerTrackingResponse,
      { status: 202 }
    );
  } catch (error) {
    console.error('[CAPI][Queue] Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
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
  const isConfigured = validatePixelId(FACEBOOK_PIXEL_ID) && validateAccessToken(FACEBOOK_ACCESS_TOKEN);

  return NextResponse.json({
    status: 'ok',
    configured: isConfigured,
    pixelId: FACEBOOK_PIXEL_ID ? '***' + FACEBOOK_PIXEL_ID.slice(-4) : 'not set',
    queue: 'meta-capi-purchase',
    mode: 'async',
    testMode: !!FACEBOOK_TEST_EVENT_CODE,
  });
}
