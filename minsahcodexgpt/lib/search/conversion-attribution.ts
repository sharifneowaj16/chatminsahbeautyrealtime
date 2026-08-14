/**
 * Phase 23 conversion attribution.
 *
 * Search conversions are updated only from verified order/payment flows. Public
 * clients must never send conversion or revenue values into search analytics.
 */
import prisma from '@/lib/prisma';

const ATTRIBUTION_WINDOW_DAYS = 30;

type AttributionSource =
  | 'online_paid_payment_verified'
  | 'cod_phone_confirmed_admin'
  | 'cod_phone_confirmed_telegram';

function toNumber(value: unknown): number {
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

export async function attributeVerifiedSearchConversionsForOrder(
  orderId: string,
  options: { source: AttributionSource }
): Promise<{ attributed: number; source: AttributionSource; skipped?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      isTest: true,
      items: {
        select: {
          productId: true,
          total: true,
        },
      },
    },
  });

  if (!order) return { attributed: 0, source: options.source, skipped: 'ORDER_NOT_FOUND' };
  if (order.isTest) return { attributed: 0, source: options.source, skipped: 'TEST_ORDER' };

  const since = new Date(order.createdAt.getTime() - ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  let attributed = 0;
  const seen = new Set<string>();

  for (const item of order.items) {
    if (!item.productId) continue;

    const click = await prisma.searchClickEvent.findFirst({
      where: {
        productId: item.productId,
        userId: order.userId,
        clickedAt: {
          gte: since,
          lte: order.createdAt,
        },
      },
      orderBy: { clickedAt: 'desc' },
      select: {
        query: true,
        productId: true,
      },
    });

    if (!click) continue;

    const key = `${click.query}:${click.productId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    await prisma.searchClickMetrics.updateMany({
      where: {
        query: click.query,
        productId: click.productId,
      },
      data: {
        conversions: { increment: 1 },
        revenue: { increment: toNumber(item.total) },
      },
    });

    attributed += 1;
  }

  return { attributed, source: options.source };
}
