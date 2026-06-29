import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export type ProviderVerifiedPaymentPayload = {
  orderId: string;
  gateway: 'bkash' | 'nagad' | string;
  transactionId?: string;
  gatewayTransactionId?: string;
  amount?: number | string;
  currency?: string;
  status: string;
  rawStatus?: string;
  paidAt?: string;
};

export function buildOrderConfirmedUrl(
  request: NextRequest,
  orderNumber?: string | null,
  reason?: string
) {
  const url = new URL('/checkout/order-confirmed', request.nextUrl.origin);
  if (orderNumber) url.searchParams.set('orderNumber', orderNumber);
  if (reason) url.searchParams.set('payment', reason);
  return url;
}

export async function redirectViaVerifiedPaymentRoute(
  request: NextRequest,
  payload: ProviderVerifiedPaymentPayload,
  fallbackUrl: URL
) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('Payment return redirect failed: PAYMENT_WEBHOOK_SECRET is not configured');
    return NextResponse.redirect(fallbackUrl, { status: 303 });
  }

  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const verifiedUrl = new URL('/api/payments/verified', request.nextUrl.origin);
  verifiedUrl.searchParams.set('redirect', '1');

  try {
    const response = await fetch(verifiedUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-payment-signature': `sha256=${signature}`,
      },
      body: rawBody,
      redirect: 'manual',
    });

    const location = response.headers.get('location');
    if (location && response.status >= 300 && response.status < 400) {
      return NextResponse.redirect(new URL(location, request.nextUrl.origin), { status: 303 });
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Payment verified redirect route returned non-OK response:', {
        status: response.status,
        body: text.slice(0, 300),
      });
    }
  } catch (error) {
    console.error('Payment verified redirect route call failed:', error);
  }

  return NextResponse.redirect(fallbackUrl, { status: 303 });
}
