import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { enqueueGa4Purchase, enqueueMetaCapiPurchase } from '@/lib/queue/metaCapiQueue';
import { createOnlineBrowserPurchaseToken } from '@/lib/tracking/meta-browser-purchase-token';

export const dynamic = 'force-dynamic';

type VerifiedPaymentPayload = {
  orderId?: string;
  orderNumber?: string;
  gateway?: string;
  transactionId?: string;
  gatewayTransactionId?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  rawStatus?: string;
  paidAt?: string;
};

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
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

function safeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifySignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (!secret) return { configured: false, verified: false };
  if (!signatureHeader) return { configured: true, verified: false };

  const provided = signatureHeader.replace(/^sha256=/i, '').trim();
  if (!/^[a-f0-9]{64}$/i.test(provided)) {
    return { configured: true, verified: false };
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return { configured: true, verified: safeEqualHex(expected, provided) };
}

function normalizePaidStatus(status?: string) {
  const normalized = status?.trim().toLowerCase() ?? '';
  return ['paid', 'completed', 'complete', 'success', 'successful', 'validated'].includes(normalized);
}

function normalizeTerminalFailureStatus(status?: string) {
  const normalized = status?.trim().toLowerCase() ?? '';
  if (['failed', 'fail', 'declined'].includes(normalized)) return 'FAILED';
  if (['cancelled', 'canceled'].includes(normalized)) return 'CANCELLED';
  if (['refunded', 'refund'].includes(normalized)) return 'REFUNDED';
  return null;
}

function parsePaidAt(value?: string) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function wantsCustomerRedirect(request: NextRequest) {
  const value =
    request.nextUrl.searchParams.get('redirect') ??
    request.nextUrl.searchParams.get('customerRedirect') ??
    '';

  return ['1', 'true', 'yes'].includes(value.trim().toLowerCase());
}

function buildOrderConfirmedUrl(request: NextRequest, orderNumber?: string | null, reason?: string) {
  const url = new URL('/checkout/order-confirmed', request.nextUrl.origin);
  if (orderNumber) url.searchParams.set('orderNumber', orderNumber);
  if (reason) url.searchParams.set('payment', reason);
  return url;
}

function redirectAfterCustomerPayment(
  target: string | URL | undefined,
  fallback: URL
) {
  const url = typeof target === 'string' ? new URL(target) : target ?? fallback;
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const redirectCustomer = wantsCustomerRedirect(request);
  const rawBody = await request.text();
  const signature = request.headers.get('x-payment-signature') ?? request.headers.get('x-webhook-signature');
  const signatureCheck = verifySignature(rawBody, signature);

  if (!signatureCheck.configured) {
    return NextResponse.json(
      { success: false, error: 'PAYMENT_WEBHOOK_SECRET is not configured' },
      { status: 500 }
    );
  }

  if (!signatureCheck.verified) {
    return NextResponse.json(
      { success: false, error: 'Invalid payment webhook signature' },
      { status: 401 }
    );
  }

  let payload: VerifiedPaymentPayload;
  try {
    payload = JSON.parse(rawBody) as VerifiedPaymentPayload;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  const orderRef = payload.orderId?.trim() || payload.orderNumber?.trim();
  if (!orderRef) {
    return NextResponse.json({ success: false, error: 'orderId or orderNumber is required' }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderRef }, { orderNumber: orderRef }] },
    select: {
      id: true,
      orderNumber: true,
      paymentStatus: true,
      paymentMethod: true,
      total: true,
      paidAt: true,
      paymentPaidAt: true,
    },
  });

  if (!order) {
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  }

  const gatewayTransactionId =
    payload.gatewayTransactionId?.trim() || payload.transactionId?.trim() || undefined;
  const gateway = payload.gateway?.trim() || 'unknown';
  const rawStatus = payload.rawStatus?.trim() || payload.status?.trim() || 'unknown';
  const currency = (payload.currency?.trim() || 'BDT').toUpperCase();
  const amount = toNumber(payload.amount);
  const orderTotal = toNumber(order.total);
  const amountMatched = Math.abs(amount - orderTotal) < 0.01;
  const currencyMatched = currency === 'BDT';
  const terminalFailureStatus = normalizeTerminalFailureStatus(payload.status);

  if (!normalizePaidStatus(payload.status)) {
    if (terminalFailureStatus) {
      const failurePaymentData = {
        orderId: order.id,
        method: order.paymentMethod || gateway,
        status: terminalFailureStatus as 'FAILED' | 'CANCELLED' | 'REFUNDED',
        amount: amount || orderTotal,
        currency,
        gateway,
        transactionId: payload.transactionId?.trim() || null,
        rawStatus,
        gatewayResponse: {
          orderNumber: order.orderNumber,
          status: payload.status ?? null,
          rawStatus,
        },
        signatureVerified: true,
        amountMatched,
        currencyMatched,
      };

      if (gatewayTransactionId) {
        await prisma.payment.upsert({
          where: { gatewayTransactionId },
          update: failurePaymentData,
          create: {
            ...failurePaymentData,
            gatewayTransactionId,
          },
        });
      } else {
        await prisma.payment.create({ data: failurePaymentData });
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: terminalFailureStatus },
      });
    }

    if (redirectCustomer) {
      return redirectAfterCustomerPayment(
        undefined,
        buildOrderConfirmedUrl(request, order.orderNumber, terminalFailureStatus ? 'failed' : 'pending')
      );
    }

    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'PAYMENT_NOT_PAID',
      purchaseSent: false,
    });
  }

  if (!amountMatched || !currencyMatched) {
    if (redirectCustomer) {
      return redirectAfterCustomerPayment(
        undefined,
        buildOrderConfirmedUrl(request, order.orderNumber, 'mismatch')
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Payment amount or currency did not match the order',
        amountMatched,
        currencyMatched,
      },
      { status: 400 }
    );
  }

  const paidAt = order.paymentPaidAt ?? order.paidAt ?? parsePaidAt(payload.paidAt);

  await prisma.$transaction(async (tx) => {
    const paymentData = {
      orderId: order.id,
      method: order.paymentMethod || gateway,
      status: 'COMPLETED' as const,
      amount,
      currency,
      gateway,
      transactionId: payload.transactionId?.trim() || null,
      rawStatus,
      verifiedAt: paidAt,
      gatewayResponse: {
        orderNumber: order.orderNumber,
        status: payload.status ?? null,
        rawStatus,
      },
      signatureVerified: true,
      amountMatched: true,
      currencyMatched: true,
    };

    if (gatewayTransactionId) {
      await tx.payment.upsert({
        where: { gatewayTransactionId },
        update: paymentData,
        create: {
          ...paymentData,
          gatewayTransactionId,
        },
      });
    } else {
      await tx.payment.create({ data: paymentData });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'COMPLETED',
        paidAt,
        paymentPaidAt: paidAt,
      },
    });
  });

  let purchaseJobId: string | undefined;
  let purchaseQueued = false;
  let purchaseQueueError: string | undefined;
  try {
    const job = await enqueueMetaCapiPurchase({
      type: 'online_paid_purchase',
      orderId: order.id,
    });
    purchaseJobId = job.id;
    purchaseQueued = true;
  } catch (error) {
    console.error('Online paid Meta Purchase queue enqueue failed:', error);
    purchaseQueueError = 'PAYMENT_RECORDED_PURCHASE_QUEUE_FAILED';
  }

  let ga4PurchaseJobId: string | undefined;
  let ga4PurchaseQueued = false;
  let ga4PurchaseQueueError: string | undefined;
  try {
    const job = await enqueueGa4Purchase({
      source: 'online_paid',
      orderId: order.id,
    });
    ga4PurchaseJobId = job.id;
    ga4PurchaseQueued = true;
  } catch (error) {
    console.error('Online paid GA4 Purchase queue enqueue failed:', error);
    ga4PurchaseQueueError = 'PAYMENT_RECORDED_GA4_PURCHASE_QUEUE_FAILED';
  }

  let browserPurchaseToken: string | undefined;
  let paymentBridgeURL: string | undefined;
  let paymentCompleteURL: string | undefined;
  try {
    browserPurchaseToken = createOnlineBrowserPurchaseToken({
      orderId: order.id,
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || request.nextUrl.origin;
    const bridgeUrl = new URL('/checkout/payment-bridge', appUrl);
    bridgeUrl.searchParams.set('orderId', order.id);
    bridgeUrl.searchParams.set('orderNumber', order.orderNumber);
    bridgeUrl.searchParams.set('bpt', browserPurchaseToken);

    const completeUrl = new URL('/checkout/payment-complete', appUrl);
    completeUrl.searchParams.set('orderId', order.id);
    completeUrl.searchParams.set('orderNumber', order.orderNumber);

    // Redirect the customer to paymentBridgeURL. It validates the token,
    // stores it in an HttpOnly cookie, then redirects to the clean paymentCompleteURL.
    paymentBridgeURL = bridgeUrl.toString();
    paymentCompleteURL = completeUrl.toString();
  } catch (error) {
    console.error('Online Browser Purchase token generation failed:', error);
  }

  if (redirectCustomer) {
    return redirectAfterCustomerPayment(
      paymentBridgeURL,
      buildOrderConfirmedUrl(request, order.orderNumber, paymentBridgeURL ? undefined : 'browser-bridge-unavailable')
    );
  }

  return NextResponse.json({
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentPaidAt: paidAt.toISOString(),
    purchaseQueued,
    purchaseJobId,
    purchaseQueueError,
    ga4PurchaseQueued,
    ga4PurchaseJobId,
    ga4PurchaseQueueError,
    browserPurchaseTokenCreated: Boolean(browserPurchaseToken),
    // Do not expose the bridge URL in JSON responses: it contains the short-lived bpt token.
    // Customer-browser payment returns should use redirectCustomer mode, where the token is only
    // carried in a 303 Location header to the server bridge and then moved into an HttpOnly cookie.
    paymentCompleteURL,
    customerRedirectURL: paymentCompleteURL,
  });
}
