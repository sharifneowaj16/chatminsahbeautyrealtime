import { NextRequest, NextResponse } from 'next/server';
import {
  ONLINE_BROWSER_PURCHASE_TOKEN_COOKIE,
  ONLINE_BROWSER_PURCHASE_TOKEN_COOKIE_MAX_AGE_SECONDS,
  verifyOnlineBrowserPurchaseToken,
} from '@/lib/tracking/meta-browser-purchase-token';
import { PAYMENT_RETURN_MARKER_COOKIE, PAYMENT_RETURN_MARKER_MAX_AGE_SECONDS } from '@/lib/tracking/payment-gateway-referrals';

export const dynamic = 'force-dynamic';

function buildOrderConfirmedUrl(request: NextRequest, orderNumber?: string | null) {
  const url = new URL('/checkout/order-confirmed', request.url);
  if (orderNumber) url.searchParams.set('orderNumber', orderNumber);
  return url;
}

function buildPaymentCompleteUrl(request: NextRequest, params: { orderId: string; orderNumber?: string | null }) {
  const url = new URL('/checkout/payment-complete', request.url);
  url.searchParams.set('orderId', params.orderId);
  if (params.orderNumber) url.searchParams.set('orderNumber', params.orderNumber);
  return url;
}

/**
 * GET /checkout/payment-bridge?orderId=...&orderNumber=...&bpt=...
 *
 * Server-only bridge for the online Browser Pixel Purchase token.
 * It validates the signed token, stores it in an HttpOnly SameSite=Lax cookie,
 * and immediately redirects to a clean payment-complete URL without `bpt`.
 *
 * This prevents the signed token from being exposed to rendered PageView URLs,
 * Meta Pixel/CAPI event_source_url, browser-visible JS, or normal page scripts.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId')?.trim() || '';
  const orderNumber = request.nextUrl.searchParams.get('orderNumber')?.trim() || '';
  const token = request.nextUrl.searchParams.get('bpt')?.trim() || '';

  if (!orderId || !token) {
    return NextResponse.redirect(buildOrderConfirmedUrl(request, orderNumber), { status: 302 });
  }

  const tokenVerification = verifyOnlineBrowserPurchaseToken({ token, orderId });
  if (!tokenVerification.ok) {
    return NextResponse.redirect(buildOrderConfirmedUrl(request, orderNumber), { status: 302 });
  }

  const response = NextResponse.redirect(
    buildPaymentCompleteUrl(request, { orderId, orderNumber }),
    { status: 302 }
  );

  response.cookies.set(ONLINE_BROWSER_PURCHASE_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONLINE_BROWSER_PURCHASE_TOKEN_COOKIE_MAX_AGE_SECONDS,
  });

  // Short-lived, non-sensitive marker used only by GA4 route tracking to ignore
  // payment-gateway referrers on payment-complete/order-confirmed page_view events.
  response.cookies.set(PAYMENT_RETURN_MARKER_COOKIE, '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PAYMENT_RETURN_MARKER_MAX_AGE_SECONDS,
  });

  return response;
}
