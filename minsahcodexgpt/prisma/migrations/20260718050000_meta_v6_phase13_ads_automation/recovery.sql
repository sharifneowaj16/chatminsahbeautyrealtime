-- Recovery / Rollback for: 20260718050000_meta_v6_phase13_ads_automation
BEGIN;

DROP INDEX IF EXISTS "MetaAdsMutationExecution_correlationId_idx";

DROP INDEX IF EXISTS "MetaAdsMutationExecution_status_startedAt_idx";

DROP INDEX IF EXISTS "MetaAdsMutationExecution_entityType_entityId_idx";

DROP INDEX IF EXISTS "MetaAdsMutationExecution_approvalId_key";

DROP INDEX IF EXISTS "MetaAdsRecommendation_type_createdAt_idx";

DROP INDEX IF EXISTS "MetaAdsRecommendation_entityType_entityId_idx";

DROP INDEX IF EXISTS "MetaAdsRecommendation_status_expiresAt_idx";

DROP INDEX IF EXISTS "MetaAdsRecommendation_recommendationKey_key";

DROP INDEX IF EXISTS "MetaAdsInsightSnapshot_adId_dateStart_idx";

DROP INDEX IF EXISTS "MetaAdsInsightSnapshot_adSetId_dateStart_idx";

DROP INDEX IF EXISTS "MetaAdsInsightSnapshot_campaignId_dateStart_idx";

DROP INDEX IF EXISTS "MetaAdsInsightSnapshot_level_dateStart_dateStop_idx";

DROP INDEX IF EXISTS "MetaAdsInsightSnapshot_syncRunId_idx";

DROP INDEX IF EXISTS "MetaAdsInsightSnapshot_accountId_level_entityId_dateStart_dateStop_breakdownHash_key";

DROP INDEX IF EXISTS "MetaAdsInsightSyncRun_correlationId_idx";

DROP INDEX IF EXISTS "MetaAdsInsightSyncRun_status_startedAt_idx";

DROP INDEX IF EXISTS "MetaAdsInsightSyncRun_accountId_level_startedAt_idx";

DROP TABLE IF EXISTS "MetaAdsMutationExecution" CASCADE;

DROP TABLE IF EXISTS "MetaAdsRecommendation" CASCADE;

DROP TABLE IF EXISTS "MetaAdsInsightSnapshot" CASCADE;

DROP TABLE IF EXISTS "MetaAdsInsightSyncRun" CASCADE;

DROP TYPE IF EXISTS "MetaAdsMutationStatus" CASCADE;

DROP TYPE IF EXISTS "MetaAdsRecommendationStatus" CASCADE;

DROP TYPE IF EXISTS "MetaAdsRecommendationType" CASCADE;

DROP TYPE IF EXISTS "MetaAdsInsightSyncStatus" CASCADE;

DROP TYPE IF EXISTS "MetaAdsInsightLevel" CASCADE;

COMMIT;
