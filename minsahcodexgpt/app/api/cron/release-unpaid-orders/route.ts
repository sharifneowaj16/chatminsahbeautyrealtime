import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  ONLINE_PAYMENT_EXPIRY_LIMIT,
} from '@/lib/online-payment-stock';
import { authorizeSharedSecretRequest } from '@/lib/security/request-secret';
import {
  EXPIRABLE_PAYMENT_STATUSES,
  ONLINE_PAYMENT_PENDING_ORDER_STATUS,
} from '@/lib/orders/payment-lifecycle';
import { getCanonicalOnlinePaymentMethods } from '@/lib/payments/payment-methods';
import { expireOnlinePaymentOrderInTransaction } from '@/lib/orders/online-payment-lifecycle';

export const dynamic = 'force-dynamic';

function isAuthorizedCronRequest(request: NextRequest) {
  return authorizeSharedSecretRequest(request, {
    secrets: [process.env.CRON_SECRET, process.env.INTERNAL_CRON_SECRET],
    headerNames: ['x-cron-secret'],
    allowQueryParamInNonProduction: true,
    allowWhenUnconfiguredInNonProduction: true,
  }).ok;
}

async function releaseExpiredOnlinePayments() {
  const now = new Date();
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: ONLINE_PAYMENT_PENDING_ORDER_STATUS,
      paymentStatus: { in: [...EXPIRABLE_PAYMENT_STATUSES] },
      paymentExpiresAt: { lte: now },
      stockReservedAt: { not: null },
      stockFinalizedAt: null,
      stockReleasedAt: null,
      paymentMethod: { in: getCanonicalOnlinePaymentMethods() },
    },
    orderBy: { paymentExpiresAt: 'asc' },
    take: ONLINE_PAYMENT_EXPIRY_LIMIT,
    select: { id: true, orderNumber: true },
  });

  const released: string[] = [];
  const failed: Array<{ orderId: string; orderNumber: string; error: string }> = [];

  for (const order of expiredOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        await expireOnlinePaymentOrderInTransaction(tx, {
          orderId: order.id,
          paymentStatus: 'CANCELLED',
          now,
        });
      });
      released.push(order.orderNumber);
    } catch (error) {
      failed.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: error instanceof Error ? error.message : 'UNKNOWN_RELEASE_ERROR',
      });
    }
  }

  return { checked: expiredOrders.length, released, failed };
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { success: false, code: 'CRON_UNAUTHORIZED', message: 'Unauthorized cron request.' },
      { status: 401 },
    );
  }

  const result = await releaseExpiredOnlinePayments();
  return NextResponse.json({
    success: true,
    ...result,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
