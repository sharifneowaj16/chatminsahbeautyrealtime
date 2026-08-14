import 'server-only';
import type { AttributionDb } from './repository';

export async function refreshAttributionDailyAggregates(db: AttributionDb, input: { from: Date; to: Date }) {
  if (input.to < input.from) throw new Error('ATTRIBUTION_AGGREGATE_RANGE_INVALID');
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `DELETE FROM "MarketingAttributionDailyAggregate" WHERE "aggregateDate" BETWEEN $1::date AND $2::date`, input.from, input.to
    );
    return tx.$executeRawUnsafe(
      `INSERT INTO "MarketingAttributionDailyAggregate" (
        "id","aggregateDate","sourceModel","utmSource","utmMedium","utmCampaign","sessions","leads","orders","revenue","attributedOrders","missingClickIds","consentDenied","createdAt","updatedAt"
      ) SELECT md5(random()::text || clock_timestamp()::text), DATE("createdAt"), "sourceModel",
        COALESCE("utmSource",'direct'),COALESCE("utmMedium",'none'),COALESCE("utmCampaign",'unattributed'),
        COUNT(*) FILTER (WHERE "conversionType"='SESSION'), COUNT(*) FILTER (WHERE "conversionType"='LEAD'), COUNT(*) FILTER (WHERE "conversionType"='ORDER'),
        COALESCE(SUM("conversionValue") FILTER (WHERE "conversionType"='ORDER'),0),
        COUNT(*) FILTER (WHERE "conversionType"='ORDER' AND COALESCE("utmCampaign","fbc","leadId") IS NOT NULL),
        COUNT(*) FILTER (WHERE "fbc" IS NULL AND "fbclid" IS NULL),
        COUNT(*) FILTER (WHERE UPPER(COALESCE("consentState",'')) IN ('DENIED','WITHDRAWN')),NOW(),NOW()
       FROM "MarketingAttribution" WHERE DATE("createdAt") BETWEEN $1::date AND $2::date
       GROUP BY DATE("createdAt"),"sourceModel",COALESCE("utmSource",'direct'),COALESCE("utmMedium",'none'),COALESCE("utmCampaign",'unattributed')`,
      input.from, input.to
    );
  });
}
