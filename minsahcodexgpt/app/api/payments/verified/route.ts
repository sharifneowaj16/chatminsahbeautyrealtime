import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { enqueueGa4Purchase, enqueueTikTokPurchase } from '@/lib/queue/metaCapiQueue';
import { createMetaPurchaseOutboxInTransaction } from '@/lib/meta/capi/purchase-outbox';
import { requestMetaOutboxDispatch } from '@/lib/meta/capi/dispatcher';
import type { MetaOutboxDb } from '@/lib/meta/capi/outbox-repository';
import { createOnlineBrowserPurchaseToken } from '@/lib/tracking/meta-browser-purchase-token';
import { recordProductLifecycleTransitionInTransaction } from '@/lib/analytics/product-metrics';
import {
  getCanonicalPaymentContractErrorResponse,
  validateVerifiedPaymentContract,
} from '@/lib/payments/canonical-payment-contract';
import { attributeVerifiedSearchConversionsForOrder } from '@/lib/search/conversion-attribution';
import { notifyNewOrder } from '@/lib/telegram-notify';
import { finalizeOnlineOrderStockInTransaction } from '@/lib/online-payment-stock';
import { verifyHmacSha256Signature } from '@/lib/security/request-secret';
import { expireOnlinePaymentOrderInTransaction } from '@/lib/orders/online-payment-lifecycle';
import {
  ONLINE_PAYMENT_COMPLETED_STATUS,
  isPaidGatewayStatus,
  normalizeTerminalGatewayFailureStatus,
} from '@/lib/orders/payment-lifecycle';

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

function parsePaidAt(value?: string) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isFutureTimestamp(date: Date) {
  return date.getTime() > Date.now() + 60_000;
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
  const signatureCheck = verifyHmacSha256Signature({
    rawBody,
    signatureHeader: signature,
    secret: process.env.PAYMENT_WEBHOOK_SECRET,
  });

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
      createdAt: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      isTest: true,
      phoneConfirmedAt: true,
      total: true,
      paidAt: true,
      paymentPaidAt: true,
      paymentExpiresAt: true,
      stockReservedAt: true,
      stockFinalizedAt: true,
      stockReleasedAt: true,
      adminNotifiedAt: true,
      deliveredAt: true,
      cancelledAt: true,
      returnedAt: true,
      refundedAt: true,
      courierDeliveredAt: true,
      courierReturnedAt: true,
    },
  });

  if (!order) {
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  }

  const gatewayTransactionId =
    payload.gatewayTransactionId?.trim() || payload.transactionId?.trim() || undefined;
  const gateway = payload.gateway?.trim() || 'unknown';

  const contract = validateVerifiedPaymentContract({
    paymentMethod: order.paymentMethod,
    gateway,
  });

  if (!contract.ok) {
    return NextResponse.json(
      getCanonicalPaymentContractErrorResponse(contract),
      { status: contract.code === 'COD_PAYMENT_CANNOT_USE_VERIFIED_ONLINE_FLOW' ? 409 : 400 }
    );
  }

  const rawStatus = payload.rawStatus?.trim() || payload.status?.trim() || 'unknown';
  const currency = (payload.currency?.trim() || 'BDT').toUpperCase();
  const amount = toNumber(payload.amount);
  const orderTotal = toNumber(order.total);
  const amountMatched = Math.abs(amount - orderTotal) < 0.01;
  const currencyMatched = currency === 'BDT';
  const terminalFailureStatus = normalizeTerminalGatewayFailureStatus(payload.status);

  if (!isPaidGatewayStatus(payload.status)) {
    if (terminalFailureStatus && order.paymentStatus === ONLINE_PAYMENT_COMPLETED_STATUS) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'ORDER_ALREADY_PAID',
        purchaseSent: false,
      });
    }

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

      await prisma.$transaction(async (tx) => {
        if (gatewayTransactionId) {
          await tx.payment.upsert({
            where: { gatewayTransactionId },
            update: failurePaymentData,
            create: {
              ...failurePaymentData,
              gatewayTransactionId,
            },
          });
        } else {
          await tx.payment.create({ data: failurePaymentData });
        }

        await expireOnlinePaymentOrderInTransaction(tx, {
          orderId: order.id,
          paymentStatus: terminalFailureStatus,
        });
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

  if (isFutureTimestamp(paidAt)) {
    return NextResponse.json(
      {
        success: false,
        code: 'PAYMENT_PAID_AT_IN_FUTURE',
        error: 'Verified payment timestamp is in the future; payment was not recorded as paid.',
      },
      { status: 400 }
    );
  }

  if (
    order.paymentExpiresAt &&
    order.paymentStatus !== ONLINE_PAYMENT_COMPLETED_STATUS &&
    paidAt.getTime() > new Date(order.paymentExpiresAt).getTime()
  ) {
    await prisma.$transaction(async (tx) => {
      await expireOnlinePaymentOrderInTransaction(tx, {
        orderId: order.id,
        paymentStatus: 'CANCELLED',
      });
    });

    return NextResponse.json(
      {
        success: false,
        code: 'PAYMENT_WINDOW_EXPIRED',
        error: 'Payment was received after this order payment window expired. Please contact support for reconciliation.',
      },
      { status: 409 }
    );
  }

  const shouldAttributeSearchConversion = order.paymentStatus !== ONLINE_PAYMENT_COMPLETED_STATUS;
  const shouldNotifyAdminAfterPayment = order.paymentStatus !== ONLINE_PAYMENT_COMPLETED_STATUS && !order.adminNotifiedAt;

  let metaPurchaseOutboxId: string | undefined;

  try {
    await prisma.$transaction(async (tx) => {
      const paymentData = {
        orderId: order.id,
        method: order.paymentMethod || gateway,
        status: ONLINE_PAYMENT_COMPLETED_STATUS,
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

      if (order.paymentStatus !== ONLINE_PAYMENT_COMPLETED_STATUS) {
        await finalizeOnlineOrderStockInTransaction(tx, order.id);
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          paymentStatus: ONLINE_PAYMENT_COMPLETED_STATUS,
          paidAt,
          paymentPaidAt: paidAt,
          stockFinalizedAt: order.stockFinalizedAt ?? paidAt,
        },
      });

      await recordProductLifecycleTransitionInTransaction(tx, order, updatedOrder);

      if (!order.isTest) {
        const outbox = await createMetaPurchaseOutboxInTransaction(
          tx as unknown as MetaOutboxDb,
          {
            purchaseType: 'online_paid_purchase',
            orderId: order.id,
            eventTime: paidAt,
            eventSourceUrl: new URL('/checkout/payment-complete', request.nextUrl.origin).toString(),
            sourceType: 'ONLINE_PAYMENT_VERIFIED',
            sourceId: gatewayTransactionId ?? payload.transactionId?.trim() ?? order.id,
            safePayload: {
              payment_status: ONLINE_PAYMENT_COMPLETED_STATUS,
              gateway,
              amount,
              currency,
            },
          }
        );
        metaPurchaseOutboxId = outbox.record.id;
      }
    });
  } catch (error) {
    if (
      error instanceof Error &&
      [
        'ONLINE_STOCK_FINALIZATION_FAILED',
        'ONLINE_STOCK_RESERVATION_ALREADY_RELEASED',
      ].includes(error.message)
    ) {
      return NextResponse.json(
        {
          success: false,
          code: 'ONLINE_STOCK_FINALIZATION_FAILED',
          error: 'Stock is no longer available for one or more paid order items. Please contact support for reconciliation.',
        },
        { status: 409 }
      );
    }
    throw error;
  }

  if (shouldNotifyAdminAfterPayment) {
    const notificationOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: {
        id: true,
        orderNumber: true,
        subtotal: true,
        shippingCost: true,
        courierDeliveryCharge: true,
        deliveryDiscountAmount: true,
        deliveryPricingSource: true,
        deliveryOfferType: true,
        deliveryOfferBadgeText: true,
        total: true,
        paymentMethod: true,
        shippingAddress: {
          select: { firstName: true, lastName: true, phone: true, city: true, street1: true, street2: true },
        },
        items: {
          select: { name: true, quantity: true, price: true, total: true },
        },
      },
    });

    if (notificationOrder) {
      await notifyNewOrder({
        orderId: notificationOrder.id,
        orderNumber: notificationOrder.orderNumber,
        customerName: notificationOrder.shippingAddress
          ? `${notificationOrder.shippingAddress.firstName} ${notificationOrder.shippingAddress.lastName}`.trim()
          : 'N/A',
        customerPhone: notificationOrder.shippingAddress?.phone || 'N/A',
        address: {
          city: notificationOrder.shippingAddress?.city || 'N/A',
          zone: notificationOrder.shippingAddress?.street2 || null,
          area: notificationOrder.shippingAddress?.street1 || null,
        },
        items: notificationOrder.items.map((item) => ({
          name: item.name,
          variant: null,
          quantity: item.quantity,
          unitPrice: toNumber(item.price),
          total: toNumber(item.total),
        })),
        subtotal: toNumber(notificationOrder.subtotal),
        shippingCost: toNumber(notificationOrder.shippingCost),
        courierDeliveryCharge: notificationOrder.courierDeliveryCharge === null
          ? null
          : toNumber(notificationOrder.courierDeliveryCharge),
        deliveryDiscountAmount: toNumber(notificationOrder.deliveryDiscountAmount),
        deliveryPricingSource: String(notificationOrder.deliveryPricingSource),
        deliveryOfferType: String(notificationOrder.deliveryOfferType),
        deliveryOfferBadgeText: notificationOrder.deliveryOfferBadgeText,
        total: toNumber(notificationOrder.total),
        paymentMethod: notificationOrder.paymentMethod || gateway,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { adminNotifiedAt: new Date() },
      });
    }
  }

  let searchConversionAttribution: Awaited<ReturnType<typeof attributeVerifiedSearchConversionsForOrder>> | undefined;
  if (shouldAttributeSearchConversion) {
    try {
      searchConversionAttribution = await attributeVerifiedSearchConversionsForOrder(order.id, {
        source: 'online_paid_payment_verified',
      });
    } catch (error) {
      console.error('Search conversion attribution failed for verified online payment:', error);
      searchConversionAttribution = {
        attributed: 0,
        source: 'online_paid_payment_verified',
        skipped: 'ATTRIBUTION_ERROR',
      };
    }
  } else {
    searchConversionAttribution = {
      attributed: 0,
      source: 'online_paid_payment_verified',
      skipped: 'ORDER_ALREADY_COMPLETED',
    };
  }

  let purchaseJobId: string | undefined;
  let purchaseQueued = false;
  let purchaseQueueError: string | undefined;
  if (metaPurchaseOutboxId) {
    const dispatch = await requestMetaOutboxDispatch(metaPurchaseOutboxId);
    purchaseQueued = dispatch.queued;
    purchaseJobId = dispatch.jobId;
    if (!dispatch.queued) {
      console.error('Online paid Meta outbox immediate dispatch failed:', dispatch.error);
      purchaseQueueError = 'PAYMENT_RECORDED_META_OUTBOX_PENDING_DISPATCH';
    }
  } else if (!order.isTest) {
    purchaseQueueError = 'PAYMENT_RECORDED_META_OUTBOX_NOT_CREATED';
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

  let tiktokPurchaseJobId: string | undefined;
  let tiktokPurchaseQueued = false;
  let tiktokPurchaseQueueError: string | undefined;
  try {
    const job = await enqueueTikTokPurchase({
      type: 'tiktok_online_paid_purchase',
      orderId: order.id,
    });
    tiktokPurchaseJobId = job.id;
    tiktokPurchaseQueued = true;
  } catch (error) {
    console.error('Online paid TikTok Purchase queue enqueue failed:', error);
    tiktokPurchaseQueueError = 'PAYMENT_RECORDED_TIKTOK_PURCHASE_QUEUE_FAILED';
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
    tiktokPurchaseQueued,
    tiktokPurchaseJobId,
    tiktokPurchaseQueueError,
    searchConversionAttribution,
    browserPurchaseTokenCreated: Boolean(browserPurchaseToken),
    // Do not expose the bridge URL in JSON responses: it contains the short-lived bpt token.
    // Customer-browser payment returns should use redirectCustomer mode, where the token is only
    // carried in a 303 Location header to the server bridge and then moved into an HttpOnly cookie.
    paymentCompleteURL,
    customerRedirectURL: paymentCompleteURL,
  });
}
