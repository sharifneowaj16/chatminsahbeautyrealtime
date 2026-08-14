import 'server-only';
import { calculateAttributionCoverage, labelAttributionModel } from './aggregation';
import type { AttributionCampaignRow, AttributionCoverage } from './types';
import type { AttributionDb } from './repository';

function number(value: unknown) {
  if (typeof value === 'bigint') return Number(value);
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getAttributionCoverage(db: AttributionDb, windowDays = 30): Promise<AttributionCoverage> {
  const days = Math.max(1, Math.min(windowDays, 365));
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT
      COUNT(*)::bigint AS "totalOrders",
      COUNT(*) FILTER (WHERE a."id" IS NOT NULL AND COALESCE(a."utmCampaign",a."fbc",a."leadId") IS NOT NULL)::bigint AS "attributedOrders",
      COUNT(*) FILTER (WHERE a."fbp" IS NOT NULL)::bigint AS "withFbp",
      COUNT(*) FILTER (WHERE a."fbc" IS NOT NULL)::bigint AS "withFbc",
      COUNT(*) FILTER (WHERE UPPER(COALESCE(a."consentState",o."trackingConsent",'')) IN ('DENIED','WITHDRAWN'))::bigint AS "consentDenied",
      COUNT(*) FILTER (WHERE a."leadId" IS NOT NULL)::bigint AS "leadLinkedOrders"
     FROM "Order" o LEFT JOIN "MarketingAttribution" a ON a."orderId"=o."id" AND a."sourceModel"='FIRST_PARTY'
     WHERE o."createdAt" >= NOW() - ($1::text || ' days')::interval AND o."isTest"=false`,
    String(days)
  );
  const row = rows[0] ?? {};
  return calculateAttributionCoverage({
    windowDays: days,
    totalOrders: number(row.totalOrders), attributedOrders: number(row.attributedOrders),
    withFbp: number(row.withFbp), withFbc: number(row.withFbc), consentDenied: number(row.consentDenied), leadLinkedOrders: number(row.leadLinkedOrders),
  });
}

export async function getFirstPartyCampaignReport(db: AttributionDb, windowDays = 30, limit = 50): Promise<AttributionCampaignRow[]> {
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT 'FIRST_PARTY' AS "sourceModel", COALESCE("utmSource",'direct') AS "utmSource",
      COALESCE("utmMedium",'none') AS "utmMedium", COALESCE("utmCampaign",'unattributed') AS "utmCampaign",
      COUNT(*) FILTER (WHERE "conversionType"='SESSION')::bigint AS sessions,
      COUNT(*) FILTER (WHERE "conversionType"='LEAD')::bigint AS leads,
      COUNT(*) FILTER (WHERE "conversionType"='ORDER')::bigint AS orders,
      COALESCE(SUM("conversionValue") FILTER (WHERE "conversionType"='ORDER'),0) AS revenue,
      COUNT(*) FILTER (WHERE "conversionType"='ORDER' AND COALESCE("utmCampaign","fbc","leadId") IS NOT NULL)::bigint AS "attributedOrders"
     FROM "MarketingAttribution" WHERE "sourceModel"='FIRST_PARTY' AND "createdAt" >= NOW() - ($1::text || ' days')::interval
     GROUP BY COALESCE("utmSource",'direct'),COALESCE("utmMedium",'none'),COALESCE("utmCampaign",'unattributed')
     ORDER BY revenue DESC, orders DESC LIMIT $2`,
    String(Math.max(1, Math.min(windowDays, 365))), Math.max(1, Math.min(limit, 200))
  );
  return rows.map((row) => ({
    sourceModel: 'FIRST_PARTY', utmSource: String(row.utmSource), utmMedium: String(row.utmMedium), utmCampaign: String(row.utmCampaign),
    sessions: number(row.sessions), leads: number(row.leads), orders: number(row.orders), revenue: number(row.revenue), attributedOrders: number(row.attributedOrders),
  }));
}

export async function getAttributionDataQuality(db: AttributionDb, windowDays = 30) {
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE "fbc" IS NULL AND "fbclid" IS NULL)::bigint AS "missingClickId",
      COUNT(*) FILTER (WHERE "fbp" IS NULL)::bigint AS "missingFbp",
      COUNT(*) FILTER (WHERE "firstTouch" IS NULL)::bigint AS "missingFirstTouch",
      COUNT(*) FILTER (WHERE "lastTouch" IS NULL)::bigint AS "missingLastTouch",
      COUNT(*) FILTER (WHERE UPPER(COALESCE("consentState",'')) IN ('DENIED','WITHDRAWN'))::bigint AS "consentDenied"
     FROM "MarketingAttribution" WHERE "createdAt" >= NOW() - ($1::text || ' days')::interval`,
    String(Math.max(1, Math.min(windowDays, 365)))
  );
  const row = rows[0] ?? {};
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, number(value)]));
}

export async function getAttributionReport(db: AttributionDb, input: { windowDays?: number; limit?: number } = {}) {
  const windowDays = Math.max(1, Math.min(input.windowDays ?? 30, 365));
  const [coverage, campaigns, dataQuality] = await Promise.all([
    getAttributionCoverage(db, windowDays), getFirstPartyCampaignReport(db, windowDays, input.limit), getAttributionDataQuality(db, windowDays),
  ]);
  return {
    generatedAt: new Date().toISOString(), windowDays,
    models: {
      firstParty: { ...labelAttributionModel('FIRST_PARTY'), rows: campaigns },
      metaReported: { ...labelAttributionModel('META_REPORTED'), rows: [], availability: 'Use the separately labelled Meta Insights endpoint; values are not merged into first-party attribution.' },
    },
    coverage, dataQuality,
  };
}
