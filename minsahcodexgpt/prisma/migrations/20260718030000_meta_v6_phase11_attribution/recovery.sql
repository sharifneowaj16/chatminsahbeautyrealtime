-- Recovery / Rollback for: 20260718030000_meta_v6_phase11_attribution
BEGIN;

DROP INDEX IF EXISTS "MarketingAttributionDailyAggregate_campaign_date_idx";

DROP INDEX IF EXISTS "MarketingAttributionDailyAggregate_date_model_idx";

DROP INDEX IF EXISTS "MarketingAttributionDailyAggregate_identity_key";

DROP INDEX IF EXISTS "MarketingAttribution_sourceModel_createdAt_idx";

DROP INDEX IF EXISTS "MarketingAttribution_conversionType_convertedAt_idx";

DROP INDEX IF EXISTS "MarketingAttribution_utmSource_utmMedium_utmCampaign_idx";

DROP INDEX IF EXISTS "MarketingAttribution_customerId_idx";

DROP INDEX IF EXISTS "MarketingAttribution_visitorId_idx";

DROP INDEX IF EXISTS "MarketingAttribution_sessionId_idx";

DROP INDEX IF EXISTS "MarketingAttribution_leadId_idx";

DROP INDEX IF EXISTS "MarketingAttribution_orderId_idx";

DROP INDEX IF EXISTS "MarketingAttribution_attributionKey_key";

DROP TABLE IF EXISTS "MarketingAttributionDailyAggregate" CASCADE;

DROP TABLE IF EXISTS "MarketingAttribution" CASCADE;

DROP TYPE IF EXISTS "MarketingAttributionSourceModel" CASCADE;

DROP TYPE IF EXISTS "MarketingAttributionConversionType" CASCADE;

COMMIT;
