import 'server-only';

import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/cache/redis';
import { getFirstClientIp, shouldSkipProductAnalyticsRequest } from '@/lib/tracking/traffic-filter';
import {
  decimalToNumber,
  isCancelledOrder,
  isConfirmedOrder,
  isDeliveredOrder,
  productGrade,
  roundMoney,
  safePercent,
} from '@/lib/analytics/business';

export const PRODUCT_VIEW_DEDUP_SECONDS = 30 * 60;
export const PRODUCT_VIEW_DEDUP_WINDOW_LABEL = '30m';


type ProductMetricAction = 'view' | 'add_to_cart' | 'view_cart' | 'checkout_start' | 'checkout_shipping_info' | 'checkout_payment_info';

type ProductMetricItem = {
  productId: string;
  quantity?: number;
};

type ProductMetricResult = {
  ok: boolean;
  skipped?: boolean;
  counted?: boolean;
  reason?: string;
  productId?: string;
};

type PrismaExecutor = typeof prisma;

function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 128 ? normalized : null;
}

function normalizeCounterQuantity(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(1, Math.trunc(parsed)), 999);
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getUserAgent(request: NextRequest): string | null {
  const userAgent = request.headers.get('user-agent')?.trim();
  return userAgent || null;
}

function normalizeVisitorSource(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function getVisitorKey(request: NextRequest): { visitorKey: string; source: 'mb_vid' | 'fallback' } {
  const cookieVisitorId = normalizeVisitorSource(request.cookies.get('mb_vid')?.value);
  if (cookieVisitorId) {
    return { visitorKey: `mb_vid:${cookieVisitorId}`, source: 'mb_vid' };
  }

  const ip = getFirstClientIp(request.headers) ?? 'unknown-ip';
  const userAgent = getUserAgent(request) ?? 'unknown-ua';
  return {
    visitorKey: `fallback:${sha256(`${ip}|${userAgent}`)}`,
    source: 'fallback',
  };
}

export function getDhakaMetricDate(input = new Date()): Date {
  const dhakaOffsetMs = 6 * 60 * 60 * 1000;
  const dhakaTime = new Date(input.getTime() + dhakaOffsetMs);
  dhakaTime.setUTCHours(0, 0, 0, 0);
  return new Date(dhakaTime.getTime() - dhakaOffsetMs);
}

async function tryRedisDedup(productId: string, visitorKeyHash: string): Promise<boolean | null> {
  if (!redis) return null;

  try {
    const result = await redis.set(
      `analytics:product-view:${PRODUCT_VIEW_DEDUP_WINDOW_LABEL}:${productId}:${visitorKeyHash}`,
      '1',
      'EX',
      PRODUCT_VIEW_DEDUP_SECONDS,
      'NX'
    );
    return result === 'OK';
  } catch (error) {
    console.warn('[product-metrics] Redis view dedup failed; falling back to DB dedup:', error instanceof Error ? error.message : 'unknown');
    return null;
  }
}

async function dbDedupProductView(productId: string, visitorKeyHash: string, now: Date): Promise<boolean> {
  const expiresAt = new Date(now.getTime() + PRODUCT_VIEW_DEDUP_SECONDS * 1000);

  try {
    await prisma.productViewDedup.create({
      data: {
        productId,
        visitorKeyHash,
        expiresAt,
        lastSeenAt: now,
      },
    });
    return true;
  } catch {
    const existing = await prisma.productViewDedup.findUnique({
      where: {
        productId_visitorKeyHash: {
          productId,
          visitorKeyHash,
        },
      },
      select: { id: true, expiresAt: true },
    });

    if (!existing) return false;

    if (existing.expiresAt.getTime() <= now.getTime()) {
      const updated = await prisma.productViewDedup.updateMany({
        where: {
          id: existing.id,
          expiresAt: { lte: now },
        },
        data: {
          expiresAt,
          lastSeenAt: now,
        },
      });
      return updated.count === 1;
    }

    await prisma.productViewDedup.update({
      where: { id: existing.id },
      data: { lastSeenAt: now },
    }).catch(() => null);
    return false;
  }
}

async function incrementProductMetric(
  productId: string,
  increments: Partial<Record<'viewCount' | 'uniqueViewCount' | 'addToCartCount' | 'viewCartCount' | 'checkoutStartCount' | 'checkoutShippingInfoCount' | 'checkoutPaymentInfoCount', number>>,
  metricDate = getDhakaMetricDate(),
  executor: PrismaExecutor = prisma
) {
  const views = increments.viewCount ?? 0;
  const uniqueViews = increments.uniqueViewCount ?? 0;
  const addToCarts = increments.addToCartCount ?? 0;
  const viewCarts = increments.viewCartCount ?? 0;
  const checkoutStarts = increments.checkoutStartCount ?? 0;
  const checkoutShippingInfos = increments.checkoutShippingInfoCount ?? 0;
  const checkoutPaymentInfos = increments.checkoutPaymentInfoCount ?? 0;

  await executor.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        ...(views ? { viewCount: { increment: views } } : {}),
        ...(uniqueViews ? { uniqueViewCount: { increment: uniqueViews } } : {}),
        ...(addToCarts ? { addToCartCount: { increment: addToCarts } } : {}),
        ...(viewCarts ? { viewCartCount: { increment: viewCarts } } : {}),
        ...(checkoutStarts ? { checkoutStartCount: { increment: checkoutStarts } } : {}),
        ...(checkoutShippingInfos ? { checkoutShippingInfoCount: { increment: checkoutShippingInfos } } : {}),
        ...(checkoutPaymentInfos ? { checkoutPaymentInfoCount: { increment: checkoutPaymentInfos } } : {}),
      },
      select: { id: true },
    });

    await tx.productDailyMetric.upsert({
      where: {
        productId_metricDate: {
          productId,
          metricDate,
        },
      },
      create: {
        productId,
        metricDate,
        views,
        uniqueViews,
        addToCarts,
        viewCarts,
        checkoutStarts,
        checkoutShippingInfos,
        checkoutPaymentInfos,
      },
      update: {
        ...(views ? { views: { increment: views } } : {}),
        ...(uniqueViews ? { uniqueViews: { increment: uniqueViews } } : {}),
        ...(addToCarts ? { addToCarts: { increment: addToCarts } } : {}),
        ...(viewCarts ? { viewCarts: { increment: viewCarts } } : {}),
        ...(checkoutStarts ? { checkoutStarts: { increment: checkoutStarts } } : {}),
        ...(checkoutShippingInfos ? { checkoutShippingInfos: { increment: checkoutShippingInfos } } : {}),
        ...(checkoutPaymentInfos ? { checkoutPaymentInfos: { increment: checkoutPaymentInfos } } : {}),
      },
      select: { id: true },
    });
  });
}

export async function recordProductView(request: NextRequest, productIdInput: unknown): Promise<ProductMetricResult> {
  const productId = normalizeId(productIdInput);
  if (!productId) return { ok: false, skipped: true, reason: 'INVALID_PRODUCT_ID' };

  const skippedTraffic = shouldSkipProductAnalyticsRequest(request);
  if (skippedTraffic) {
    return { ok: true, skipped: true, reason: skippedTraffic.reason, productId };
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null, isActive: true },
    select: { id: true },
  });
  if (!product) return { ok: false, skipped: true, reason: 'PRODUCT_NOT_FOUND_OR_INACTIVE', productId };

  const now = new Date();
  const { visitorKey } = getVisitorKey(request);
  const visitorKeyHash = sha256(visitorKey);

  const redisDecision = await tryRedisDedup(productId, visitorKeyHash);
  const shouldCount = redisDecision ?? await dbDedupProductView(productId, visitorKeyHash, now);

  if (!shouldCount) return { ok: true, counted: false, reason: 'DEDUPED_30_MINUTES', productId };

  await incrementProductMetric(productId, { viewCount: 1, uniqueViewCount: 1 }, getDhakaMetricDate(now));

  return { ok: true, counted: true, productId };
}

export async function recordProductMetricAction(
  action: Exclude<ProductMetricAction, 'view'>,
  itemsInput: ProductMetricItem[]
): Promise<{ ok: boolean; updated: number; skipped: number }> {
  const collapsed = new Map<string, number>();

  for (const item of itemsInput) {
    const productId = normalizeId(item.productId);
    if (!productId) continue;
    collapsed.set(productId, (collapsed.get(productId) ?? 0) + normalizeCounterQuantity(item.quantity));
  }

  let updated = 0;
  let skipped = 0;
  const metricDate = getDhakaMetricDate();

  for (const [productId, quantity] of collapsed.entries()) {
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!product) {
      skipped += 1;
      continue;
    }

    if (action === 'add_to_cart') {
      await incrementProductMetric(productId, { addToCartCount: quantity }, metricDate);
    } else if (action === 'view_cart') {
      await incrementProductMetric(productId, { viewCartCount: quantity }, metricDate);
    } else if (action === 'checkout_start') {
      await incrementProductMetric(productId, { checkoutStartCount: quantity }, metricDate);
    } else if (action === 'checkout_shipping_info') {
      await incrementProductMetric(productId, { checkoutShippingInfoCount: quantity }, metricDate);
    } else if (action === 'checkout_payment_info') {
      await incrementProductMetric(productId, { checkoutPaymentInfoCount: quantity }, metricDate);
    }
    updated += 1;
  }

  return { ok: true, updated, skipped };
}

export function sanitizeProductMetricItems(value: unknown): ProductMetricItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): ProductMetricItem[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as { productId?: unknown; id?: unknown; quantity?: unknown };
    const productId = normalizeId(candidate.productId) ?? normalizeId(candidate.id);
    if (!productId) return [];
    return [{ productId, quantity: normalizeCounterQuantity(candidate.quantity) }];
  });
}

export type ProductOrderMetricItem = {
  productId: string | null;
  quantity?: number;
  total?: number;
};

type ProductUpdateArgs = Parameters<typeof prisma.product.update>[0];
type ProductDailyMetricUpsertArgs = Parameters<typeof prisma.productDailyMetric.upsert>[0];
type ProductDailyMetricFindUniqueArgs = Parameters<typeof prisma.productDailyMetric.findUnique>[0];
type ProductDailyMetricUpdateArgs = Parameters<typeof prisma.productDailyMetric.update>[0];
type OrderItemFindManyArgs = Parameters<typeof prisma.orderItem.findMany>[0];

type ProductMetricTransaction = {
  product: {
    update: (args: ProductUpdateArgs) => Promise<unknown>;
  };
  productDailyMetric: {
    upsert: (args: ProductDailyMetricUpsertArgs) => Promise<unknown>;
    findUnique: (args: ProductDailyMetricFindUniqueArgs) => Promise<unknown>;
    update: (args: ProductDailyMetricUpdateArgs) => Promise<unknown>;
  };
  orderItem: {
    findMany: (args: OrderItemFindManyArgs) => Promise<unknown[]>;
  };
};

export async function recordProductOrderCreatedInTransaction(
  tx: ProductMetricTransaction,
  orderItems: ProductOrderMetricItem[],
  metricDate = getDhakaMetricDate(),
  options: { skip?: boolean; reason?: string } = {}
) {
  if (options.skip) return;
  const byProduct = new Map<string, { orderCount: number; revenue: number }>();

  for (const item of orderItems) {
    const productId = normalizeId(item.productId);
    if (!productId) continue;
    const current = byProduct.get(productId) ?? { orderCount: 0, revenue: 0 };
    current.orderCount += 1;
    const total = Number(item.total);
    if (Number.isFinite(total) && total > 0) current.revenue += Math.round(total * 100) / 100;
    byProduct.set(productId, current);
  }

  for (const [productId, metric] of byProduct.entries()) {
    await tx.product.update({
      where: { id: productId },
      data: {
        orderCount: { increment: metric.orderCount },
        ...(metric.revenue > 0 ? { analyticsRevenue: { increment: metric.revenue } } : {}),
      },
      select: { id: true },
    });

    await tx.productDailyMetric.upsert({
      where: {
        productId_metricDate: {
          productId,
          metricDate,
        },
      },
      create: {
        productId,
        metricDate,
        orders: metric.orderCount,
        revenue: metric.revenue,
      },
      update: {
        orders: { increment: metric.orderCount },
        ...(metric.revenue > 0 ? { revenue: { increment: metric.revenue } } : {}),
      },
      select: { id: true },
    });
  }
}


export const productLifecycleOrderSelect = {
  id: true,
  createdAt: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  isTest: true,
  phoneConfirmedAt: true,
  paymentPaidAt: true,
  paidAt: true,
  deliveredAt: true,
  cancelledAt: true,
  returnedAt: true,
  refundedAt: true,
  courierDeliveredAt: true,
  courierReturnedAt: true,
} as const;

type ProductLifecycleOrderSignal = {
  id: string;
  createdAt?: Date | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  isTest?: boolean | null;
  phoneConfirmedAt?: Date | null;
  paymentPaidAt?: Date | null;
  paidAt?: Date | null;
  deliveredAt?: Date | null;
  cancelledAt?: Date | null;
  returnedAt?: Date | null;
  refundedAt?: Date | null;
  courierDeliveredAt?: Date | null;
  courierReturnedAt?: Date | null;
};

type ProductLifecycleKey = 'confirmed' | 'delivered' | 'cancelled' | 'returned' | 'refunded';

type ProductLifecycleTransition = {
  key: ProductLifecycleKey;
  metricDate: Date;
};

type ProductLifecycleItemSummary = {
  orderCount: number;
  revenue: number;
  deliveredProfit: number | null;
};

function normalizeLifecycleOrder(order: ProductLifecycleOrderSignal) {
  return {
    status: String(order.status ?? '').toUpperCase(),
    paymentStatus: String(order.paymentStatus ?? '').toUpperCase(),
    paymentMethod: order.paymentMethod ?? null,
    phoneConfirmedAt: order.phoneConfirmedAt ?? null,
    paymentPaidAt: order.paymentPaidAt ?? null,
    paidAt: order.paidAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    cancelledAt: order.cancelledAt ?? null,
    returnedAt: order.returnedAt ?? null,
    refundedAt: order.refundedAt ?? null,
    courierDeliveredAt: order.courierDeliveredAt ?? null,
    courierReturnedAt: order.courierReturnedAt ?? null,
  };
}

function isReturnedLifecycleOrder(order: ProductLifecycleOrderSignal): boolean {
  return Boolean(order.returnedAt || order.courierReturnedAt);
}

function isRefundedLifecycleOrder(order: ProductLifecycleOrderSignal): boolean {
  const normalizedStatus = String(order.status ?? '').toUpperCase();
  const normalizedPaymentStatus = String(order.paymentStatus ?? '').toUpperCase();
  return Boolean(order.refundedAt || normalizedStatus === 'REFUNDED' || normalizedPaymentStatus === 'REFUNDED');
}

function firstLifecycleDate(...dates: Array<Date | null | undefined>): Date {
  return dates.find((date): date is Date => date instanceof Date && Number.isFinite(date.getTime())) ?? new Date();
}

function getLifecycleTransitions(
  previousOrder: ProductLifecycleOrderSignal,
  nextOrder: ProductLifecycleOrderSignal
): ProductLifecycleTransition[] {
  const previous = normalizeLifecycleOrder(previousOrder);
  const next = normalizeLifecycleOrder(nextOrder);

  const transitions: ProductLifecycleTransition[] = [];

  if (!isConfirmedOrder(previous) && isConfirmedOrder(next)) {
    transitions.push({
      key: 'confirmed',
      metricDate: getDhakaMetricDate(firstLifecycleDate(next.phoneConfirmedAt, next.paymentPaidAt, next.paidAt, nextOrder.createdAt)),
    });
  }

  if (!isDeliveredOrder(previous) && isDeliveredOrder(next)) {
    transitions.push({
      key: 'delivered',
      metricDate: getDhakaMetricDate(firstLifecycleDate(next.deliveredAt, next.courierDeliveredAt)),
    });
  }

  if (!isCancelledOrder(previous) && isCancelledOrder(next)) {
    transitions.push({
      key: 'cancelled',
      metricDate: getDhakaMetricDate(firstLifecycleDate(next.cancelledAt)),
    });
  }

  if (!isReturnedLifecycleOrder(previousOrder) && isReturnedLifecycleOrder(nextOrder)) {
    transitions.push({
      key: 'returned',
      metricDate: getDhakaMetricDate(firstLifecycleDate(next.returnedAt, next.courierReturnedAt)),
    });
  }

  if (!isRefundedLifecycleOrder(previousOrder) && isRefundedLifecycleOrder(nextOrder)) {
    transitions.push({
      key: 'refunded',
      metricDate: getDhakaMetricDate(firstLifecycleDate(next.refundedAt)),
    });
  }

  return transitions;
}

function addMoney(value: unknown): number {
  const amount = decimalToNumber(value);
  return Number.isFinite(amount) && amount > 0 ? roundMoney(amount) : 0;
}

function getItemCost(item: { product?: { costPrice?: unknown | null } | null; quantity?: unknown }): number | null {
  const costPrice = decimalToNumber(item.product?.costPrice);
  const quantity = normalizeCounterQuantity(item.quantity);
  if (!Number.isFinite(costPrice) || costPrice <= 0) return null;
  return roundMoney(costPrice * quantity);
}

async function summarizeLifecycleItems(
  tx: ProductMetricTransaction,
  orderId: string
): Promise<Map<string, ProductLifecycleItemSummary>> {
  const rows = await tx.orderItem.findMany({
    where: { orderId },
    select: {
      productId: true,
      quantity: true,
      total: true,
      product: {
        select: {
          costPrice: true,
        },
      },
    },
  }) as Array<{
    productId: string | null;
    quantity: number;
    total: unknown;
    product?: { costPrice?: unknown | null } | null;
  }>;

  const byProduct = new Map<string, ProductLifecycleItemSummary>();

  for (const item of rows) {
    const productId = normalizeId(item.productId);
    if (!productId) continue;

    const current = byProduct.get(productId) ?? {
      orderCount: 0,
      revenue: 0,
      deliveredProfit: null,
    };

    // Lifecycle order counters are per product per order, not per unit.
    current.orderCount = 1;
    const itemRevenue = addMoney(item.total);
    current.revenue = roundMoney(current.revenue + itemRevenue);

    const cost = getItemCost(item);
    if (cost !== null) {
      current.deliveredProfit = roundMoney((current.deliveredProfit ?? 0) + itemRevenue - cost);
    }

    byProduct.set(productId, current);
  }

  return byProduct;
}

async function recalculateProductDailyMetricRatios(
  tx: ProductMetricTransaction,
  productId: string,
  metricDate: Date
) {
  const row = await tx.productDailyMetric.findUnique({
    where: { productId_metricDate: { productId, metricDate } },
    select: {
      views: true,
      addToCarts: true,
      checkoutStarts: true,
      orders: true,
      confirmedOrders: true,
      deliveredOrders: true,
      cancelledOrders: true,
      returnedOrders: true,
      deliveredRevenue: true,
      estimatedProfit: true,
    },
  }) as {
    views: number;
    addToCarts: number;
    checkoutStarts: number;
    orders: number;
    confirmedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    returnedOrders: number;
    deliveredRevenue: unknown;
    estimatedProfit: unknown;
  } | null;

  if (!row) return;

  const estimatedProfit = row.estimatedProfit === null ? null : decimalToNumber(row.estimatedProfit);

  await tx.productDailyMetric.update({
    where: { productId_metricDate: { productId, metricDate } },
    data: {
      addToCartRate: safePercent(row.addToCarts, row.views),
      checkoutRate: safePercent(row.checkoutStarts, row.addToCarts),
      purchaseRate: safePercent(row.confirmedOrders, row.views),
      confirmationRate: safePercent(row.confirmedOrders, row.orders),
      deliveryRate: safePercent(row.deliveredOrders, row.confirmedOrders),
      returnRate: safePercent(row.returnedOrders, row.deliveredOrders),
      grade: productGrade({
        confirmedOrders: row.confirmedOrders,
        deliveredOrders: row.deliveredOrders,
        cancelledOrders: row.cancelledOrders,
        returnedOrders: row.returnedOrders,
        deliveredRevenue: decimalToNumber(row.deliveredRevenue),
        estimatedGrossProfit: estimatedProfit === null ? null : estimatedProfit,
      }),
    },
    select: { id: true },
  });
}

export async function recordProductLifecycleTransitionInTransaction(
  tx: ProductMetricTransaction,
  previousOrder: ProductLifecycleOrderSignal,
  nextOrder: ProductLifecycleOrderSignal
): Promise<{ ok: boolean; skipped?: boolean; reason?: string; transitions: ProductLifecycleKey[]; productsUpdated: number }> {
  if (nextOrder.isTest) {
    return { ok: true, skipped: true, reason: 'TEST_ORDER', transitions: [], productsUpdated: 0 };
  }

  const transitions = getLifecycleTransitions(previousOrder, nextOrder);
  if (transitions.length === 0) {
    return { ok: true, skipped: true, reason: 'NO_LIFECYCLE_TRANSITION', transitions: [], productsUpdated: 0 };
  }

  const itemsByProduct = await summarizeLifecycleItems(tx, nextOrder.id);
  if (itemsByProduct.size === 0) {
    return { ok: true, skipped: true, reason: 'NO_TRACKABLE_ORDER_ITEMS', transitions: transitions.map((item) => item.key), productsUpdated: 0 };
  }

  for (const [productId, itemSummary] of itemsByProduct.entries()) {
    const productIncrement: Record<string, { increment: number }> = {};
    const metricByDate = new Map<number, { metricDate: Date; data: Record<string, unknown> }>();

    for (const transition of transitions) {
      const key = transition.metricDate.getTime();
      const entry = metricByDate.get(key) ?? { metricDate: transition.metricDate, data: {} };

      if (transition.key === 'confirmed') {
        productIncrement.confirmedOrderCount = { increment: itemSummary.orderCount };
        entry.data.confirmedOrders = { increment: itemSummary.orderCount };
        entry.data.confirmedRevenue = { increment: itemSummary.revenue };
      }

      if (transition.key === 'delivered') {
        productIncrement.deliveredOrderCount = { increment: itemSummary.orderCount };
        entry.data.deliveredOrders = { increment: itemSummary.orderCount };
        entry.data.deliveredRevenue = { increment: itemSummary.revenue };
        if (itemSummary.deliveredProfit !== null) {
          entry.data.estimatedProfit = { increment: itemSummary.deliveredProfit };
        }
      }

      if (transition.key === 'cancelled') {
        productIncrement.cancelledOrderCount = { increment: itemSummary.orderCount };
        entry.data.cancelledOrders = { increment: itemSummary.orderCount };
        entry.data.cancelledRevenue = { increment: itemSummary.revenue };
      }

      if (transition.key === 'returned') {
        productIncrement.returnedOrderCount = { increment: itemSummary.orderCount };
        entry.data.returnedOrders = { increment: itemSummary.orderCount };
        entry.data.returnedRevenue = { increment: itemSummary.revenue };
      }

      if (transition.key === 'refunded') {
        productIncrement.refundedOrderCount = { increment: itemSummary.orderCount };
        entry.data.refundedOrders = { increment: itemSummary.orderCount };
        entry.data.refundedRevenue = { increment: itemSummary.revenue };
      }

      metricByDate.set(key, entry);
    }

    if (Object.keys(productIncrement).length > 0) {
      await tx.product.update({
        where: { id: productId },
        data: productIncrement,
        select: { id: true },
      });
    }

    for (const entry of metricByDate.values()) {
      await tx.productDailyMetric.upsert({
        where: {
          productId_metricDate: {
            productId,
            metricDate: entry.metricDate,
          },
        },
        create: {
          productId,
          metricDate: entry.metricDate,
          ...(entry.data.confirmedOrders ? { confirmedOrders: itemSummary.orderCount, confirmedRevenue: itemSummary.revenue } : {}),
          ...(entry.data.deliveredOrders ? {
            deliveredOrders: itemSummary.orderCount,
            deliveredRevenue: itemSummary.revenue,
            ...(itemSummary.deliveredProfit !== null ? { estimatedProfit: itemSummary.deliveredProfit } : {}),
          } : {}),
          ...(entry.data.cancelledOrders ? { cancelledOrders: itemSummary.orderCount, cancelledRevenue: itemSummary.revenue } : {}),
          ...(entry.data.returnedOrders ? { returnedOrders: itemSummary.orderCount, returnedRevenue: itemSummary.revenue } : {}),
          ...(entry.data.refundedOrders ? { refundedOrders: itemSummary.orderCount, refundedRevenue: itemSummary.revenue } : {}),
        },
        update: entry.data,
        select: { id: true },
      });

      await recalculateProductDailyMetricRatios(tx, productId, entry.metricDate);
    }
  }

  return {
    ok: true,
    transitions: transitions.map((item) => item.key),
    productsUpdated: itemsByProduct.size,
  };
}
