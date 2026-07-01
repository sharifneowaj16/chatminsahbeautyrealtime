import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  ONLINE_BROWSER_PURCHASE_TOKEN_COOKIE,
  verifyOnlineBrowserPurchaseToken,
} from '@/lib/tracking/meta-browser-purchase-token';
import {
  buildMetaCatalogContentIds,
  buildMetaCatalogContents,
  getMetaCatalogContentType,
} from '@/lib/tracking/meta-content-id';

export const dynamic = 'force-dynamic';

function decimalToNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object' && 'toString' in value) {
    return Number(value.toString());
  }
  return 0;
}

function isCodPaymentMethod(paymentMethod?: string | null) {
  const normalized = paymentMethod?.toLowerCase() ?? '';
  return normalized.includes('cod') || normalized.includes('cash');
}

function getContentName(items: Array<{ name?: string | null }>) {
  return items
    .map((item) => item.name?.trim())
    .filter(Boolean)
    .join(', ')
    .slice(0, 300);
}

function jsonResponse(
  body: Record<string, unknown>,
  init?: ResponseInit,
  options?: { clearBrowserPurchaseToken?: boolean }
) {
  const response = NextResponse.json(body, init);
  if (options?.clearBrowserPurchaseToken) {
    response.cookies.set(ONLINE_BROWSER_PURCHASE_TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }
  return response;
}

// ─── POST /api/tracking/meta/online-purchase ────────────────────────────────
// Atomic DB-level Browser Pixel Purchase claim.
// First caller (any browser/device) claims metaBrowserPurchaseClaimedAt and gets
// track:true. All subsequent callers get track:false (BROWSER_PURCHASE_ALREADY_CLAIMED).
// This replaces the old localStorage-only guard which was device-specific and
// leaked across incognito / other browsers / cleared storage.
//
// Also supports polling retry: returns PAYMENT_NOT_VERIFIED_PAID (no claim made)
// when payment webhook has not yet arrived, so the client can retry briefly.
//
// SECURITY: Only UUID orderId plus a server-signed browser purchase token is accepted.
// The token is read from an HttpOnly SameSite cookie set by /checkout/payment-bridge.
// Generic thank-you/order-confirmed pages cannot claim or fire Browser Purchase.
//
// SEMANTICS of metaBrowserPurchaseClaimedAt:
// Means "a signed payment-return browser flow was AUTHORISED to fire Purchase"
// (claimed), NOT "browser confirmed delivery to Meta." Browser Pixel delivery
// cannot be server-verified. The DB field prevents duplicate authorizations across
// browsers/devices.
export async function POST(request: NextRequest) {
  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { track: false, reason: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  // UUID orderId only — orderNumber not accepted (guessable sequential string).
  const orderId = body.orderId?.trim();
  const token = request.cookies.get(ONLINE_BROWSER_PURCHASE_TOKEN_COOKIE)?.value?.trim();

  if (!orderId) {
    return NextResponse.json(
      { track: false, reason: 'ORDER_ID_REQUIRED' },
      { status: 400 }
    );
  }

  if (!token) {
    return NextResponse.json(
      { track: false, reason: 'BROWSER_PURCHASE_TOKEN_COOKIE_REQUIRED' },
      { status: 400 }
    );
  }

  // ── 1. Look up order + verified payment ──────────────────────────────────
  const order = await prisma.order.findFirst({
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

  if (!order) {
    return jsonResponse({ track: false, reason: 'ORDER_NOT_FOUND' }, { status: 404 }, { clearBrowserPurchaseToken: true });
  }

  // ── 2. Guard conditions (no claim made yet — safe to retry) ──────────────
  if (order.isTest) {
    return jsonResponse({ track: false, reason: 'TEST_ORDER' }, undefined, { clearBrowserPurchaseToken: true });
  }

  if (isCodPaymentMethod(order.paymentMethod)) {
    // COD Purchase is Server CAPI only — no Browser Pixel ever.
    return jsonResponse({ track: false, reason: 'COD_PURCHASE_IS_CAPI_ONLY' }, undefined, { clearBrowserPurchaseToken: true });
  }

  if (String(order.paymentStatus).toUpperCase() !== 'COMPLETED' || !order.paymentPaidAt) {
    // Payment webhook not yet processed. Client may retry briefly.
    return NextResponse.json({ track: false, reason: 'PAYMENT_NOT_VERIFIED_PAID' });
  }

  const verifiedPayment = order.payments[0];
  if (!verifiedPayment) {
    return jsonResponse({ track: false, reason: 'VERIFIED_PAYMENT_MISSING' });
  }

  const tokenVerification = verifyOnlineBrowserPurchaseToken({
    token,
    orderId: order.id,
  });

  if (!tokenVerification.ok) {
    return jsonResponse(
      { track: false, reason: tokenVerification.reason },
      { status: 403 },
      { clearBrowserPurchaseToken: true }
    );
  }

  const orderValue = decimalToNumber(order.total);
  const paymentAmount = decimalToNumber(verifiedPayment.amount);

  if (orderValue <= 0) {
    return jsonResponse({ track: false, reason: 'PURCHASE_VALUE_INVALID' }, undefined, { clearBrowserPurchaseToken: true });
  }

  if (Math.abs(orderValue - paymentAmount) >= 0.01 || verifiedPayment.currency !== 'BDT') {
    return jsonResponse({ track: false, reason: 'PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH' }, undefined, { clearBrowserPurchaseToken: true });
  }

  // ── 3. Atomic DB claim (cross-browser / cross-device idempotency) ─────────
  // UPDATE ... WHERE metaBrowserPurchaseClaimedAt IS NULL
  // count=1 → this caller is first → authorised to fire Browser Pixel
  // count=0 → already claimed (another browser/tab/device) → skip
  const claim = await prisma.order.updateMany({
    where: {
      id: order.id,
      metaBrowserPurchaseClaimedAt: null,
    },
    data: {
      metaBrowserPurchaseClaimedAt: new Date(),
    },
  });

  if (claim.count === 0) {
    return jsonResponse({
      track: false,
      reason: 'BROWSER_PURCHASE_ALREADY_CLAIMED',
    }, undefined, { clearBrowserPurchaseToken: true });
  }

  // ── 4. Return authorised fire payload ────────────────────────────────────
  const catalogItems = order.items.map((item) => ({
    ...item,
    price: decimalToNumber(item.price),
  }));
  const contents = buildMetaCatalogContents(catalogItems);
  const contentIds = buildMetaCatalogContentIds(catalogItems);
  const contentType = getMetaCatalogContentType(catalogItems);

  const contentName = getContentName(order.items);

  return jsonResponse({
    track: true,
    eventId: `Purchase-${order.id}`,
    eventTime: Math.floor(order.paymentPaidAt.getTime() / 1000),
    purchaseData: {
      value: orderValue,
      currency: 'BDT',
      order_id: String(order.id),
      content_ids: contentIds,
      content_type: contentType,
      ...(contentName && { content_name: contentName }),
      contents,
      num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
    },
  }, undefined, { clearBrowserPurchaseToken: true });
}

