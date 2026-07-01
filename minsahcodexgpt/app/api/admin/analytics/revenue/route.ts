import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  adminHasPermission,
  adminUnauthorizedResponse,
  getVerifiedAdmin,
} from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import {
  buildDailySeries,
  decimalToNumber,
  getDateWindow,
  growthPercent,
  isCancelledOrder,
  isConfirmedOrder,
  isDeliveredOrder,
  isReturnedOrder,
  parseAdSpend,
  parseDateRange,
  roas,
  roundMoney,
  safePercent,
} from '@/lib/analytics/business';

export const dynamic = 'force-dynamic';

type RevenueOrder = Awaited<ReturnType<typeof loadOrdersForWindow>>[number];

async function requireAnalyticsAdmin(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return { response: adminUnauthorizedResponse() };

  if (!adminHasPermission(admin, ADMIN_PERMISSIONS.ANALYTICS_VIEW)) {
    return {
      response: NextResponse.json(
        { ok: false, error: 'Analytics access is not allowed for this admin user.' },
        { status: 403 }
      ),
    };
  }

  return { response: null };
}

async function loadOrdersForWindow(start: Date, end: Date) {
  return prisma.order.findMany({
    where: {
      isTest: false,
      createdAt: { gte: start, lt: end },
    },
    select: {
      id: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      total: true,
      subtotal: true,
      shippingCost: true,
      discountAmount: true,
      phoneConfirmedAt: true,
      paymentPaidAt: true,
      paidAt: true,
      deliveredAt: true,
      cancelledAt: true,
      returnedAt: true,
      courierDeliveredAt: true,
      courierReturnedAt: true,
      metaPurchaseSent: true,
      gaPurchaseSent: true,
    },
  });
}

function summarizeOrders(orders: RevenueOrder[]) {
  let confirmedOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let returnedOrders = 0;
  let totalRevenue = 0;
  let confirmedRevenue = 0;
  let deliveredRevenue = 0;
  let cancelledRevenue = 0;
  let returnedRevenue = 0;
  let metaPurchaseSent = 0;
  let gaPurchaseSent = 0;

  for (const order of orders) {
    const total = decimalToNumber(order.total);
    totalRevenue += total;

    if (isConfirmedOrder(order)) {
      confirmedOrders += 1;
      confirmedRevenue += total;
    }

    if (isDeliveredOrder(order)) {
      deliveredOrders += 1;
      deliveredRevenue += total;
    }

    if (isCancelledOrder(order)) {
      cancelledOrders += 1;
      cancelledRevenue += total;
    }

    if (isReturnedOrder(order)) {
      returnedOrders += 1;
      returnedRevenue += total;
    }

    if (order.metaPurchaseSent) metaPurchaseSent += 1;
    if (order.gaPurchaseSent) gaPurchaseSent += 1;
  }

  return {
    ordersCreated: orders.length,
    confirmedOrders,
    deliveredOrders,
    cancelledOrders,
    returnedOrders,
    totalRevenue: roundMoney(totalRevenue),
    confirmedRevenue: roundMoney(confirmedRevenue),
    deliveredRevenue: roundMoney(deliveredRevenue),
    cancelledRevenue: roundMoney(cancelledRevenue),
    returnedRevenue: roundMoney(returnedRevenue),
    metaPurchaseSent,
    gaPurchaseSent,
    averageOrderValue: roundMoney(orders.length ? totalRevenue / orders.length : 0),
    confirmationRate: safePercent(confirmedOrders, orders.length),
    deliveryRate: safePercent(deliveredOrders, confirmedOrders),
    cancelRate: safePercent(cancelledOrders, orders.length),
    returnRate: safePercent(returnedOrders, deliveredOrders),
  };
}

function buildSeries(orders: RevenueOrder[], start: Date, end: Date) {
  const series = buildDailySeries(start, end);
  const byDate = new Map(series.map((item) => [item.date, item]));

  for (const order of orders) {
    const date = order.createdAt.toISOString().slice(0, 10);
    const bucket = byDate.get(date);
    if (!bucket) continue;

    const total = decimalToNumber(order.total);
    bucket.orders += 1;
    if (isConfirmedOrder(order)) bucket.confirmedRevenue = roundMoney(bucket.confirmedRevenue + total);
    if (isDeliveredOrder(order)) bucket.deliveredRevenue = roundMoney(bucket.deliveredRevenue + total);
  }

  return series;
}

export async function GET(request: NextRequest) {
  const { response } = await requireAnalyticsAdmin(request);
  if (response) return response;

  const range = parseDateRange(request.nextUrl.searchParams.get('range'));
  const adSpend = parseAdSpend(request.nextUrl.searchParams.get('adSpend'));
  const window = getDateWindow(range);

  const [currentOrders, previousOrders, recentReturns] = await Promise.all([
    loadOrdersForWindow(window.start, window.end),
    loadOrdersForWindow(window.previousStart, window.previousEnd),
    prisma.return.findMany({
      where: {
        requestDate: { gte: window.start, lt: window.end },
      },
      select: {
        id: true,
        status: true,
        refundAmount: true,
        requestDate: true,
      },
    }),
  ]);

  const current = summarizeOrders(currentOrders);
  const previous = summarizeOrders(previousOrders);
  const refundRequestedAmount = roundMoney(
    recentReturns.reduce((total, row) => total + decimalToNumber(row.refundAmount), 0)
  );

  return NextResponse.json({
    ok: true,
    range,
    window: {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      previousStart: window.previousStart.toISOString(),
      previousEnd: window.previousEnd.toISOString(),
    },
    summary: {
      ...current,
      refundRequests: recentReturns.length,
      refundRequestedAmount,
      reportedRoas: roas(current.confirmedRevenue, adSpend),
      realRoas: roas(current.deliveredRevenue, adSpend),
      adSpend,
      growth: {
        confirmedRevenue: growthPercent(current.confirmedRevenue, previous.confirmedRevenue),
        deliveredRevenue: growthPercent(current.deliveredRevenue, previous.deliveredRevenue),
        ordersCreated: growthPercent(current.ordersCreated, previous.ordersCreated),
        confirmedOrders: growthPercent(current.confirmedOrders, previous.confirmedOrders),
        deliveredOrders: growthPercent(current.deliveredOrders, previous.deliveredOrders),
      },
    },
    previous,
    series: buildSeries(currentOrders, window.start, window.end),
    formulas: {
      reportedRoas: 'Confirmed Revenue / Ad Spend',
      realRoas: 'Delivered Revenue / Ad Spend',
      confirmationRate: 'Confirmed Orders / Created Orders',
      deliveryRate: 'Delivered Orders / Confirmed Orders',
      returnRate: 'Returned Orders / Delivered Orders',
    },
  });
}
