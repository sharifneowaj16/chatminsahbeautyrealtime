import 'server-only';
import prisma from '@/lib/prisma';
import type { AttributionDb } from '@/lib/attribution/repository';
import { refreshAttributionDailyAggregates } from '@/lib/attribution/aggregation-worker';
import { linkLeadAttributionToOrder } from '@/lib/attribution/repository';
import { getAttributionDataQuality } from '@/lib/attribution/reports';

const db = prisma as unknown as AttributionDb;

export async function ATTRIBUTION_DAILY_AGGREGATE(input: { from?: Date; to?: Date } = {}) {
  const to = input.to ?? new Date();
  const from = input.from ?? new Date(to.getTime() - 24 * 60 * 60 * 1_000);
  return refreshAttributionDailyAggregates(db, { from, to });
}

export async function ATTRIBUTION_ORDER_BACKFILL(input: { from?: Date; limit?: number } = {}) {
  const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT o."id" FROM "Order" o LEFT JOIN "MarketingAttribution" a ON a."orderId"=o."id"
     WHERE a."id" IS NULL AND o."createdAt" >= $1 ORDER BY o."createdAt" ASC LIMIT $2`,
    input.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000), Math.max(1, Math.min(input.limit ?? 100, 1_000))
  );
  return { candidates: rows.map((row) => row.id), action: 'REQUIRES_ORDER_REQUEST_CONTEXT_OR_EXPLICIT_CORRECTION_AUDIT' };
}

export function ATTRIBUTION_LEAD_CONVERSION_LINK(input: { leadId: string; orderId: string; actorId?: string }) {
  return linkLeadAttributionToOrder(db, input);
}

export function ATTRIBUTION_DATA_QUALITY(input: { windowDays?: number } = {}) {
  return getAttributionDataQuality(db, input.windowDays ?? 30);
}
