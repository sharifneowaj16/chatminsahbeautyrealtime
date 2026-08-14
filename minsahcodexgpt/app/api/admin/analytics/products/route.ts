import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  adminHasPermission,
  adminUnauthorizedResponse,
  getVerifiedAdmin,
} from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import {
  decimalToNumber,
  getDateWindow,
  isCancelledOrder,
  isConfirmedOrder,
  isDeliveredOrder,
  isReturnedOrder,
  isRefundedOrder,
  parseDateRange,
  productGrade,
  roundMoney,
  safePercent,
} from '@/lib/analytics/business';

export const dynamic = 'force-dynamic';

type ProductBucket = {
  key: string;
  productId: string | null;
  sku: string | null;
  name: string;
  views: number;
  uniqueViews: number;
  addToCarts: number;
  viewCarts: number;
  checkoutStarts: number;
  checkoutShippingInfos: number;
  checkoutPaymentInfos: number;
  unitsSold: number;
  confirmedUnits: number;
  deliveredUnits: number;
  cancelledUnits: number;
  returnedUnits: number;
  refundedUnits: number;
  orders: Set<string>;
  confirmedOrders: Set<string>;
  deliveredOrders: Set<string>;
  cancelledOrders: Set<string>;
  returnedOrders: Set<string>;
  refundedOrders: Set<string>;
  totalRevenue: number;
  confirmedRevenue: number;
  deliveredRevenue: number;
  cancelledRevenue: number;
  returnedRevenue: number;
  refundedRevenue: number;
  estimatedGrossProfit: number | null;
  costKnown: boolean;
  stockLeft: number | null;
};

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

function createBucket(key: string, name: string, productId: string | null, sku: string | null): ProductBucket {
  return {
    key,
    productId,
    sku,
    name,
    views: 0,
    uniqueViews: 0,
    addToCarts: 0,
    viewCarts: 0,
    checkoutStarts: 0,
    checkoutShippingInfos: 0,
    checkoutPaymentInfos: 0,
    unitsSold: 0,
    confirmedUnits: 0,
    deliveredUnits: 0,
    cancelledUnits: 0,
    returnedUnits: 0,
    refundedUnits: 0,
    orders: new Set<string>(),
    confirmedOrders: new Set<string>(),
    deliveredOrders: new Set<string>(),
    cancelledOrders: new Set<string>(),
    returnedOrders: new Set<string>(),
    refundedOrders: new Set<string>(),
    totalRevenue: 0,
    confirmedRevenue: 0,
    deliveredRevenue: 0,
    cancelledRevenue: 0,
    returnedRevenue: 0,
    refundedRevenue: 0,
    estimatedGrossProfit: null,
    costKnown: false,
    stockLeft: null,
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireAnalyticsAdmin(request);
  if (response) return response;

  const range = parseDateRange(request.nextUrl.searchParams.get('range'));
  const limitParam = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 5), 100) : 50;
  const window = getDateWindow(range);

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        isTest: false,
        createdAt: { gte: window.start, lt: window.end },
      },
    },
    select: {
      productId: true,
      sku: true,
      name: true,
      quantity: true,
      price: true,
      total: true,
      order: {
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          phoneConfirmedAt: true,
          paymentPaidAt: true,
          paidAt: true,
          deliveredAt: true,
          cancelledAt: true,
          returnedAt: true,
          refundedAt: true,
          courierDeliveredAt: true,
          courierReturnedAt: true,
        },
      },
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          costPrice: true,
          quantity: true,
          viewCount: true,
          uniqueViewCount: true,
          addToCartCount: true,
          viewCartCount: true,
          checkoutStartCount: true,
          checkoutShippingInfoCount: true,
          checkoutPaymentInfoCount: true,
          productDailyMetrics: {
            where: {
              metricDate: { gte: window.start, lt: window.end },
            },
            select: {
              views: true,
              uniqueViews: true,
              addToCarts: true,
              viewCarts: true,
              checkoutStarts: true,
              checkoutShippingInfos: true,
              checkoutPaymentInfos: true,
              orders: true,
              confirmedOrders: true,
              deliveredOrders: true,
              cancelledOrders: true,
              returnedOrders: true,
              refundedOrders: true,
              revenue: true,
              confirmedRevenue: true,
              deliveredRevenue: true,
              cancelledRevenue: true,
              returnedRevenue: true,
              refundedRevenue: true,
              estimatedProfit: true,
            },
          },
        },
      },
    },
  });

  const metricProducts = await prisma.product.findMany({
    where: {
      deletedAt: null,
      OR: [
        { productDailyMetrics: { some: { metricDate: { gte: window.start, lt: window.end } } } },
        { viewCount: { gt: 0 } },
        { addToCartCount: { gt: 0 } },
        { viewCartCount: { gt: 0 } },
        { checkoutStartCount: { gt: 0 } },
        { checkoutShippingInfoCount: { gt: 0 } },
        { checkoutPaymentInfoCount: { gt: 0 } },
      ],
    },
    select: {
      id: true,
      sku: true,
      name: true,
      quantity: true,
      viewCount: true,
      uniqueViewCount: true,
      addToCartCount: true,
      viewCartCount: true,
      checkoutStartCount: true,
      checkoutShippingInfoCount: true,
      checkoutPaymentInfoCount: true,
      productDailyMetrics: {
        where: {
          metricDate: { gte: window.start, lt: window.end },
        },
        select: {
          views: true,
          uniqueViews: true,
          addToCarts: true,
          viewCarts: true,
          checkoutStarts: true,
          checkoutShippingInfos: true,
          checkoutPaymentInfos: true,
        },
      },
    },
    orderBy: [{ viewCount: 'desc' }, { addToCartCount: 'desc' }, { updatedAt: 'desc' }],
    take: Math.max(limit * 2, 100),
  });

  const buckets = new Map<string, ProductBucket>();

  for (const product of metricProducts) {
    const bucket = createBucket(product.id, product.name, product.id, product.sku);
    const metricTotals = product.productDailyMetrics.reduce(
      (acc, metric) => ({
        views: acc.views + metric.views,
        uniqueViews: acc.uniqueViews + metric.uniqueViews,
        addToCarts: acc.addToCarts + metric.addToCarts,
        viewCarts: acc.viewCarts + metric.viewCarts,
        checkoutStarts: acc.checkoutStarts + metric.checkoutStarts,
        checkoutShippingInfos: acc.checkoutShippingInfos + metric.checkoutShippingInfos,
        checkoutPaymentInfos: acc.checkoutPaymentInfos + metric.checkoutPaymentInfos,
      }),
      { views: 0, uniqueViews: 0, addToCarts: 0, viewCarts: 0, checkoutStarts: 0, checkoutShippingInfos: 0, checkoutPaymentInfos: 0 }
    );

    bucket.views = metricTotals.views || product.viewCount;
    bucket.uniqueViews = metricTotals.uniqueViews || product.uniqueViewCount;
    bucket.addToCarts = metricTotals.addToCarts || product.addToCartCount;
    bucket.viewCarts = metricTotals.viewCarts || product.viewCartCount;
    bucket.checkoutStarts = metricTotals.checkoutStarts || product.checkoutStartCount;
    bucket.checkoutShippingInfos = metricTotals.checkoutShippingInfos || product.checkoutShippingInfoCount;
    bucket.checkoutPaymentInfos = metricTotals.checkoutPaymentInfos || product.checkoutPaymentInfoCount;
    bucket.stockLeft = product.quantity;
    buckets.set(product.id, bucket);
  }

  for (const item of orderItems) {
    const productId = item.productId ?? null;
    const key = productId ?? `unlisted:${item.sku || item.name}`;
    const name = item.product?.name ?? item.name;
    const sku = item.product?.sku ?? item.sku ?? null;

    if (!buckets.has(key)) {
      const bucket = createBucket(key, name, productId, sku);
      if (item.product) {
        const metricTotals = item.product.productDailyMetrics.reduce(
          (acc, metric) => ({
            views: acc.views + metric.views,
            uniqueViews: acc.uniqueViews + metric.uniqueViews,
            addToCarts: acc.addToCarts + metric.addToCarts,
            viewCarts: acc.viewCarts + metric.viewCarts,
            checkoutStarts: acc.checkoutStarts + metric.checkoutStarts,
            checkoutShippingInfos: acc.checkoutShippingInfos + metric.checkoutShippingInfos,
            checkoutPaymentInfos: acc.checkoutPaymentInfos + metric.checkoutPaymentInfos,
          }),
          { views: 0, uniqueViews: 0, addToCarts: 0, viewCarts: 0, checkoutStarts: 0, checkoutShippingInfos: 0, checkoutPaymentInfos: 0 }
        );

        bucket.views = metricTotals.views || item.product.viewCount;
        bucket.uniqueViews = metricTotals.uniqueViews || item.product.uniqueViewCount;
        bucket.addToCarts = metricTotals.addToCarts || item.product.addToCartCount;
        bucket.viewCarts = metricTotals.viewCarts || item.product.viewCartCount;
        bucket.checkoutStarts = metricTotals.checkoutStarts || item.product.checkoutStartCount;
        bucket.checkoutShippingInfos = metricTotals.checkoutShippingInfos || item.product.checkoutShippingInfoCount;
        bucket.checkoutPaymentInfos = metricTotals.checkoutPaymentInfos || item.product.checkoutPaymentInfoCount;
        bucket.stockLeft = item.product.quantity;
      }
      buckets.set(key, bucket);
    }

    const bucket = buckets.get(key)!;
    const quantity = item.quantity;
    const itemTotal = decimalToNumber(item.total);
    const unitPrice = quantity ? itemTotal / quantity : decimalToNumber(item.price);
    const costPrice = item.product?.costPrice ? decimalToNumber(item.product.costPrice) : null;
    const grossProfit = costPrice === null ? null : (unitPrice - costPrice) * quantity;

    bucket.unitsSold += quantity;
    bucket.orders.add(item.order.id);
    bucket.totalRevenue += itemTotal;

    if (grossProfit !== null) {
      bucket.costKnown = true;
      bucket.estimatedGrossProfit = (bucket.estimatedGrossProfit ?? 0) + grossProfit;
    }

    if (isConfirmedOrder(item.order)) {
      bucket.confirmedUnits += quantity;
      bucket.confirmedOrders.add(item.order.id);
      bucket.confirmedRevenue += itemTotal;
    }

    if (isDeliveredOrder(item.order)) {
      bucket.deliveredUnits += quantity;
      bucket.deliveredOrders.add(item.order.id);
      bucket.deliveredRevenue += itemTotal;
    }

    if (isCancelledOrder(item.order)) {
      bucket.cancelledUnits += quantity;
      bucket.cancelledOrders.add(item.order.id);
      bucket.cancelledRevenue += itemTotal;
    }

    if (isReturnedOrder(item.order)) {
      bucket.returnedUnits += quantity;
      bucket.returnedOrders.add(item.order.id);
      bucket.returnedRevenue += itemTotal;
    }

    if (isRefundedOrder(item.order)) {
      bucket.refundedUnits += quantity;
      bucket.refundedOrders.add(item.order.id);
      bucket.refundedRevenue += itemTotal;
    }
  }

  const products = Array.from(buckets.values())
    .map((bucket) => {
      const confirmedOrders = bucket.confirmedOrders.size;
      const deliveredOrders = bucket.deliveredOrders.size;
      const cancelledOrders = bucket.cancelledOrders.size;
      const returnedOrders = bucket.returnedOrders.size;
      const refundedOrders = bucket.refundedOrders.size;
      const estimatedGrossProfit = bucket.costKnown ? roundMoney(bucket.estimatedGrossProfit ?? 0) : null;
      const grade = productGrade({
        confirmedOrders,
        deliveredOrders,
        cancelledOrders,
        returnedOrders,
        deliveredRevenue: bucket.deliveredRevenue,
        estimatedGrossProfit,
      });

      return {
        id: bucket.key,
        productId: bucket.productId,
        sku: bucket.sku,
        name: bucket.name,
        grade,
        views: bucket.views,
        uniqueViews: bucket.uniqueViews,
        addToCarts: bucket.addToCarts,
        viewCarts: bucket.viewCarts,
        checkoutStarts: bucket.checkoutStarts,
        checkoutShippingInfos: bucket.checkoutShippingInfos,
        checkoutPaymentInfos: bucket.checkoutPaymentInfos,
        unitsSold: bucket.unitsSold,
        confirmedUnits: bucket.confirmedUnits,
        deliveredUnits: bucket.deliveredUnits,
        cancelledUnits: bucket.cancelledUnits,
        returnedUnits: bucket.returnedUnits,
        refundedUnits: bucket.refundedUnits,
        orders: bucket.orders.size,
        confirmedOrders,
        deliveredOrders,
        cancelledOrders,
        returnedOrders,
        refundedOrders,
        totalRevenue: roundMoney(bucket.totalRevenue),
        confirmedRevenue: roundMoney(bucket.confirmedRevenue),
        deliveredRevenue: roundMoney(bucket.deliveredRevenue),
        cancelledRevenue: roundMoney(bucket.cancelledRevenue),
        returnedRevenue: roundMoney(bucket.returnedRevenue),
        refundedRevenue: roundMoney(bucket.refundedRevenue),
        estimatedGrossProfit,
        stockLeft: bucket.stockLeft,
        addToCartRate: safePercent(bucket.addToCarts, bucket.views),
        viewCartRate: safePercent(bucket.viewCarts, bucket.addToCarts),
        checkoutRate: safePercent(bucket.checkoutStarts, bucket.addToCarts),
        shippingInfoRate: safePercent(bucket.checkoutShippingInfos, bucket.checkoutStarts),
        paymentInfoRate: safePercent(bucket.checkoutPaymentInfos, bucket.checkoutShippingInfos),
        purchaseRate: safePercent(confirmedOrders, bucket.views),
        confirmationRate: safePercent(confirmedOrders, bucket.orders.size),
        deliveryRate: safePercent(deliveredOrders, confirmedOrders),
        cancelRate: safePercent(cancelledOrders, bucket.orders.size),
        returnRate: safePercent(returnedOrders, deliveredOrders),
        refundRate: safePercent(refundedOrders, confirmedOrders),
      };
    })
    .sort((a, b) => b.deliveredRevenue - a.deliveredRevenue || b.confirmedRevenue - a.confirmedRevenue)
    .slice(0, limit);

  return NextResponse.json({
    ok: true,
    range,
    window: {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
    },
    products,
    summary: {
      totalProducts: products.length,
      gradeA: products.filter((product) => product.grade === 'A').length,
      gradeB: products.filter((product) => product.grade === 'B').length,
      gradeC: products.filter((product) => product.grade === 'C').length,
      gradeD: products.filter((product) => product.grade === 'D').length,
      metricsNote:
        'Product funnel counters now include add-to-cart, view-cart, checkout-start, shipping-info, and payment-info actions from ProductDailyMetric for the selected range; lifecycle hooks persist status transitions, while this endpoint keeps order-item fallback for older rows and item-level units.',
    },
  });
}
