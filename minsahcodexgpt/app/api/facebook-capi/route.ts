/**
 * Facebook Conversion API (CAPI) queue route
 *
 * - Browser-callable endpoint for non-Purchase events only
 * - Builds a canonical server event payload with hashed PII
 * - Enqueues it for Business SDK delivery with retry/backoff/safe failure logging
 * - Purchase is blocked here and must use verified COD/online flows
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
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
  const canonicalSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://minsahbeauty.cloud';
  const sanitizedInput = sanitizeUrl(payloadUrl || fallbackUrl);

  try {
    const canonical = new URL(canonicalSiteUrl);
    const url = new URL(sanitizedInput, canonicalSiteUrl);
    return `${canonical.origin}${url.pathname}`;
  } catch {
    try {
      const canonical = new URL(canonicalSiteUrl);
      return `${canonical.origin}/`;
    } catch {
      return 'https://minsahbeauty.cloud/';
    }
  }
}


type EnrichedCustomerPii = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
};

const PII_ENRICH_CACHE_TTL_MS = 5 * 60 * 1000;
const PII_ENRICH_CACHE_MAX = 500;
const piiEnrichCache = new Map<string, { value: EnrichedCustomerPii; expiresAt: number }>();

function readEnrichCache(key: string): EnrichedCustomerPii | null {
  const hit = piiEnrichCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    piiEnrichCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeEnrichCache(key: string, value: EnrichedCustomerPii) {
  if (piiEnrichCache.size >= PII_ENRICH_CACHE_MAX) {
    const oldestKey = piiEnrichCache.keys().next().value;
    if (oldestKey) piiEnrichCache.delete(oldestKey);
  }
  piiEnrichCache.set(key, { value, expiresAt: Date.now() + PII_ENRICH_CACHE_TTL_MS });
}

function sanitizeRealEmail(email?: string | null): string | undefined {
  const clean = email?.trim().toLowerCase();
  if (!clean || !clean.includes('@')) return undefined;
  if (/(@guest.|@placeholder.|@minsah.local$|@phone.|@temp.|@noemail.)/i.test(clean)) {
    return undefined;
  }
  return clean;
}

function normalizeMetaCountryCode(value?: string | null): string {
  const clean = value?.trim().toLowerCase();
  if (!clean || clean === 'bangladesh' || clean === 'bd' || clean === 'bgd') return 'bd';
  if (/^[a-z]{2}$/.test(clean)) return clean;
  return 'bd';
}

function splitFirstAndLastName(firstName?: string | null, lastName?: string | null) {
  let rawFn = firstName?.trim() || undefined;
  let rawLn = lastName?.trim() || undefined;
  if (rawFn && !rawLn) {
    const parts = rawFn.split(/s+/);
    if (parts.length > 1) {
      rawLn = parts.pop() || undefined;
      rawFn = parts.join(' ') || undefined;
    }
  }
  return { firstName: rawFn, lastName: rawLn };
}

async function enrichCustomerPiiFromServer(input: {
  request: NextRequest;
  rawMbVid?: string;
  externalId?: string;
  fbp?: string;
}): Promise<EnrichedCustomerPii> {
  try {
    // 1. Logged-in user via auth_token JWT cookie
    const token =
      input.request.cookies.get('auth_token')?.value ||
      input.request.headers.get('authorization')?.replace(/^Bearers+/i, '');

    if (token) {
      const auth = await verifyAccessToken(token);
      if (auth?.userId) {
        const cacheKey = 'u:' + auth.userId;
        const cached = readEnrichCache(cacheKey);
        if (cached) return cached;

        const user = await prisma.user.findUnique({
          where: { id: auth.userId },
          select: {
            email: true,
            phone: true,
            verifiedPhone: true,
            firstName: true,
            lastName: true,
            addresses: {
              orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
              take: 1,
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                city: true,
                state: true,
                postalCode: true,
                country: true,
              },
            },
          },
        });

        if (user) {
          const addr = user.addresses[0];
          const enriched: EnrichedCustomerPii = {
            email: sanitizeRealEmail(user.email),
            phone: user.verifiedPhone || user.phone || addr?.phone || undefined,
            firstName: addr?.firstName || user.firstName || undefined,
            lastName: addr?.lastName || user.lastName || undefined,
            city: addr?.city || undefined,
            state: addr?.state || undefined,
            zipCode: addr?.postalCode || undefined,
            country: addr?.country || 'bd',
          };
          writeEnrichCache(cacheKey, enriched);
          return enriched;
        }
      }
    }

    // 2. Returning guest customer via indexed Order visitor/fbp columns
    const visitorOr: Array<Record<string, string>> = [];
    if (input.rawMbVid) visitorOr.push({ anonymousVisitorId: input.rawMbVid });
    if (input.externalId) visitorOr.push({ externalId: input.externalId });
    if (input.fbp) visitorOr.push({ fbp: input.fbp });

    if (visitorOr.length > 0) {
      const cacheKey = 'v:' + (input.rawMbVid || input.externalId || input.fbp);
      const cached = readEnrichCache(cacheKey);
      if (cached) return cached;

      const latestOrder = await prisma.order.findFirst({
        where: {
          isTest: false,
          OR: visitorOr,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          user: {
            select: {
              email: true,
              phone: true,
              verifiedPhone: true,
              firstName: true,
              lastName: true,
            },
          },
          shippingAddress: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
            },
          },
        },
      });

      const addr = latestOrder?.shippingAddress;
      const usr = latestOrder?.user;
      const enriched: EnrichedCustomerPii = {
        email: sanitizeRealEmail(usr?.email),
        phone: addr?.phone || usr?.verifiedPhone || usr?.phone || undefined,
        firstName: addr?.firstName || usr?.firstName || undefined,
        lastName: addr?.lastName || usr?.lastName || undefined,
        city: addr?.city || undefined,
        state: addr?.state || undefined,
        zipCode: addr?.postalCode || undefined,
        country: addr?.country || 'bd',
      };
      writeEnrichCache(cacheKey, enriched);
      return enriched;
    }
  } catch (err) {
    console.warn('[CAPI][Queue] Server PII enrichment skipped:', redactPiiString(err instanceof Error ? err.message : 'Unknown error'));
  }

  return {};
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
    const rawMbVid = request.cookies.get('mb_vid')?.value;
    const externalId =
      normalizeMetaExternalId(payload.externalId, 'visitor') ??
      normalizeMetaExternalId(rawMbVid, 'visitor');

    const serverPii = await enrichCustomerPiiFromServer({
      request,
      rawMbVid,
      externalId,
      fbp,
    });

    const resolvedEmail = sanitizeRealEmail(payload.email) || serverPii.email;
    const resolvedPhone = payload.phone || serverPii.phone;
    const { firstName: resolvedFirstName, lastName: resolvedLastName } = splitFirstAndLastName(
      payload.firstName || serverPii.firstName,
      payload.lastName || serverPii.lastName
    );
    const resolvedCity = payload.city || serverPii.city;
    const resolvedState = payload.state || serverPii.state;
    const resolvedZip = payload.zipCode || serverPii.zipCode;
    const resolvedCountry = normalizeMetaCountryCode(payload.country || serverPii.country);

    const emailHash = hashPiiEmail(resolvedEmail);
    const phoneHash = hashPiiPhone(resolvedPhone);

    const hashedUserData = compactObject({
      em: emailHash ? [emailHash] : undefined,
      ph: phoneHash ? [phoneHash] : undefined,
      external_id: hashNormalizedPii(externalId),
      fn: hashPiiText(resolvedFirstName),
      ln: hashPiiText(resolvedLastName),
      ct: hashPiiText(resolvedCity),
      st: hashPiiText(resolvedState),
      zp: hashPiiText(resolvedZip),
      country: hashPiiText(resolvedCountry),
      fbc,
      fbp,
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    });

    // Server-side safeguard: Check if any contentIds or contents[].id looks like a Prisma CUID or does not match a known SKU,
    // and resolve it to the database Product.sku / ProductVariant.sku via Prisma before persisting to the outbox.
    const isLikelyCuid = (str?: string | null): boolean => {
      if (!str || typeof str !== 'string') return false;
      const s = str.trim();
      return /^c[a-z0-9]{20,}$/i.test(s) || (!s.startsWith('SKU-') && !s.includes('-') && s.length >= 20);
    };

    let resolvedContentIds = Array.isArray(payload.contentIds) ? [...payload.contentIds] : [];
    let resolvedContents = Array.isArray(payload.contents) ? payload.contents.map((c) => ({ ...c })) : [];

    const candidateIds = new Set<string>();
    for (const cid of resolvedContentIds) {
      if (typeof cid === 'string' && isLikelyCuid(cid)) {
        candidateIds.add(cid.trim());
      }
    }
    for (const c of resolvedContents) {
      if (typeof c.id === 'string' && isLikelyCuid(c.id)) {
        candidateIds.add(c.id.trim());
      }
      if (typeof c.variant_id === 'string' && isLikelyCuid(c.variant_id)) {
        candidateIds.add(c.variant_id.trim());
      }
    }

    if (candidateIds.size > 0) {
      try {
        const idList = Array.from(candidateIds);
        const [dbProducts, dbVariants] = await Promise.all([
          prisma.product.findMany({
            where: { id: { in: idList } },
            select: { id: true, sku: true },
          }),
          prisma.productVariant.findMany({
            where: { id: { in: idList } },
            select: { id: true, sku: true, product: { select: { sku: true } } },
          }),
        ]);

        const skuMap = new Map<string, string>();
        for (const p of dbProducts) {
          if (p.sku?.trim()) skuMap.set(p.id, p.sku.trim());
        }
        for (const v of dbVariants) {
          const vSku = v.sku?.trim() || v.product?.sku?.trim();
          if (vSku) skuMap.set(v.id, vSku);
        }

        if (skuMap.size > 0) {
          resolvedContentIds = resolvedContentIds.map((id) =>
            typeof id === 'string' && skuMap.has(id.trim()) ? skuMap.get(id.trim())! : id
          );
          resolvedContents = resolvedContents.map((item) => {
            const canonicalId = typeof item.id === 'string' && skuMap.has(item.id.trim())
              ? skuMap.get(item.id.trim())!
              : item.id;
            const canonicalVariantSku = typeof item.variant_id === 'string' && skuMap.has(item.variant_id.trim())
              ? skuMap.get(item.variant_id.trim())!
              : item.variant_sku;
            return {
              ...item,
              id: canonicalId,
              ...(canonicalVariantSku ? { variant_sku: canonicalVariantSku } : {}),
            };
          });
        }
      } catch (err) {
        console.warn('[CAPI][Queue] Failed to resolve CUIDs to SKUs via database safeguard:', err);
      }
    }

    const customData = withMetaSchemaVersion(
      prepareMetaCatalogPayloadForEvent(payload.eventName, compactObject({
        value: formatCurrency(payload.value),
        currency: payload.currency || 'BDT',
        content_ids: resolvedContentIds.length > 0 ? resolvedContentIds : payload.contentIds,
        content_type: payload.contentType,
        content_name: payload.contentName,
        content_category: payload.contentCategory,
        contents: resolvedContents.map((item) =>
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
    publicPixelId: isConfigured ? FACEBOOK_PIXEL_ID : null,
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
