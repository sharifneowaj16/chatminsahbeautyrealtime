import 'server-only';

import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/cache/redis';
import { getFirstClientIp, shouldSkipProductAnalyticsRequest } from '@/lib/tracking/traffic-filter';

export const PRODUCT_VIEW_DEDUP_SECONDS = 30 * 60;
export const PRODUCT_VIEW_DEDUP_WINDOW_LABEL = '30m';


type ProductMetricAction = 'view' | 'add_to_cart' | 'checkout_start';

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
  increments: Partial<Record<'viewCount' | 'uniqueViewCount' | 'addToCartCount' | 'checkoutStartCount', number>>,
  metricDate = getDhakaMetricDate(),
  executor: PrismaExecutor = prisma
) {
  const views = increments.viewCount ?? 0;
  const uniqueViews = increments.uniqueViewCount ?? 0;
  const addToCarts = increments.addToCartCount ?? 0;
  const checkoutStarts = increments.checkoutStartCount ?? 0;

  await executor.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        ...(views ? { viewCount: { increment: views } } : {}),
        ...(uniqueViews ? { uniqueViewCount: { increment: uniqueViews } } : {}),
        ...(addToCarts ? { addToCartCount: { increment: addToCarts } } : {}),
        ...(checkoutStarts ? { checkoutStartCount: { increment: checkoutStarts } } : {}),
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
        checkoutStarts,
      },
      update: {
        ...(views ? { views: { increment: views } } : {}),
        ...(uniqueViews ? { uniqueViews: { increment: uniqueViews } } : {}),
        ...(addToCarts ? { addToCarts: { increment: addToCarts } } : {}),
        ...(checkoutStarts ? { checkoutStarts: { increment: checkoutStarts } } : {}),
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
    } else {
      await incrementProductMetric(productId, { checkoutStartCount: quantity }, metricDate);
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

type ProductMetricTransaction = {
  product: {
    update: (args: ProductUpdateArgs) => Promise<unknown>;
  };
  productDailyMetric: {
    upsert: (args: ProductDailyMetricUpsertArgs) => Promise<unknown>;
  };
};

export async function recordProductOrderCreatedInTransaction(
  tx: ProductMetricTransaction,
  orderItems: ProductOrderMetricItem[],
  metricDate = getDhakaMetricDate()
) {
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
