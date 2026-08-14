CREATE TYPE "MetaAdsInsightLevel" AS ENUM ('ACCOUNT', 'CAMPAIGN', 'ADSET', 'AD');
CREATE TYPE "MetaAdsInsightSyncStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "MetaAdsRecommendationType" AS ENUM ('SCALE_BUDGET', 'REDUCE_BUDGET', 'PAUSE_ENTITY', 'RESUME_ENTITY', 'REVIEW_CREATIVE');
CREATE TYPE "MetaAdsRecommendationStatus" AS ENUM ('OPEN', 'APPROVAL_REQUESTED', 'APPLIED', 'DISMISSED', 'EXPIRED');
CREATE TYPE "MetaAdsMutationStatus" AS ENUM ('EXECUTING', 'SUCCEEDED', 'FAILED', 'RECONCILIATION_REQUIRED');

CREATE TABLE "MetaAdsInsightSyncRun" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "level" "MetaAdsInsightLevel" NOT NULL,
  "dateStart" TIMESTAMP(3) NOT NULL,
  "dateStop" TIMESTAMP(3) NOT NULL,
  "status" "MetaAdsInsightSyncStatus" NOT NULL DEFAULT 'RUNNING',
  "requestedById" TEXT,
  "correlationId" TEXT,
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "errorData" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaAdsInsightSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaAdsInsightSnapshot" (
  "id" TEXT NOT NULL,
  "syncRunId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "level" "MetaAdsInsightLevel" NOT NULL,
  "entityId" TEXT NOT NULL,
  "entityName" TEXT,
  "campaignId" TEXT,
  "campaignName" TEXT,
  "adSetId" TEXT,
  "adSetName" TEXT,
  "adId" TEXT,
  "adName" TEXT,
  "dateStart" TIMESTAMP(3) NOT NULL,
  "dateStop" TIMESTAMP(3) NOT NULL,
  "breakdownHash" TEXT NOT NULL,
  "breakdown" JSONB,
  "impressions" BIGINT NOT NULL DEFAULT 0,
  "reach" BIGINT NOT NULL DEFAULT 0,
  "clicks" BIGINT NOT NULL DEFAULT 0,
  "inlineLinkClicks" BIGINT NOT NULL DEFAULT 0,
  "spend" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "ctr" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "cpc" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "cpm" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "purchases" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "purchaseValue" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "roas" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "frequency" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "actions" JSONB,
  "actionValues" JSONB,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaAdsInsightSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaAdsRecommendation" (
  "id" TEXT NOT NULL,
  "recommendationKey" TEXT NOT NULL,
  "snapshotId" TEXT,
  "accountId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "entityName" TEXT,
  "type" "MetaAdsRecommendationType" NOT NULL,
  "status" "MetaAdsRecommendationStatus" NOT NULL DEFAULT 'OPEN',
  "severity" "MetaIncidentSeverity" NOT NULL DEFAULT 'WARNING',
  "rationale" TEXT NOT NULL,
  "proposedMutation" JSONB NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "approvalId" TEXT,
  "appliedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaAdsRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaAdsMutationExecution" (
  "id" TEXT NOT NULL,
  "approvalId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "payloadHash" TEXT NOT NULL,
  "status" "MetaAdsMutationStatus" NOT NULL DEFAULT 'EXECUTING',
  "requestedById" TEXT NOT NULL,
  "correlationId" TEXT,
  "beforeData" JSONB,
  "providerResult" JSONB,
  "afterData" JSONB,
  "errorData" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaAdsMutationExecution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MetaAdsInsightSyncRun_accountId_level_startedAt_idx" ON "MetaAdsInsightSyncRun"("accountId", "level", "startedAt");
CREATE INDEX "MetaAdsInsightSyncRun_status_startedAt_idx" ON "MetaAdsInsightSyncRun"("status", "startedAt");
CREATE INDEX "MetaAdsInsightSyncRun_correlationId_idx" ON "MetaAdsInsightSyncRun"("correlationId");
CREATE UNIQUE INDEX "MetaAdsInsightSnapshot_accountId_level_entityId_dateStart_dateStop_breakdownHash_key" ON "MetaAdsInsightSnapshot"("accountId", "level", "entityId", "dateStart", "dateStop", "breakdownHash");
CREATE INDEX "MetaAdsInsightSnapshot_syncRunId_idx" ON "MetaAdsInsightSnapshot"("syncRunId");
CREATE INDEX "MetaAdsInsightSnapshot_level_dateStart_dateStop_idx" ON "MetaAdsInsightSnapshot"("level", "dateStart", "dateStop");
CREATE INDEX "MetaAdsInsightSnapshot_campaignId_dateStart_idx" ON "MetaAdsInsightSnapshot"("campaignId", "dateStart");
CREATE INDEX "MetaAdsInsightSnapshot_adSetId_dateStart_idx" ON "MetaAdsInsightSnapshot"("adSetId", "dateStart");
CREATE INDEX "MetaAdsInsightSnapshot_adId_dateStart_idx" ON "MetaAdsInsightSnapshot"("adId", "dateStart");
CREATE UNIQUE INDEX "MetaAdsRecommendation_recommendationKey_key" ON "MetaAdsRecommendation"("recommendationKey");
CREATE INDEX "MetaAdsRecommendation_status_expiresAt_idx" ON "MetaAdsRecommendation"("status", "expiresAt");
CREATE INDEX "MetaAdsRecommendation_entityType_entityId_idx" ON "MetaAdsRecommendation"("entityType", "entityId");
CREATE INDEX "MetaAdsRecommendation_type_createdAt_idx" ON "MetaAdsRecommendation"("type", "createdAt");
CREATE UNIQUE INDEX "MetaAdsMutationExecution_approvalId_key" ON "MetaAdsMutationExecution"("approvalId");
CREATE INDEX "MetaAdsMutationExecution_entityType_entityId_idx" ON "MetaAdsMutationExecution"("entityType", "entityId");
CREATE INDEX "MetaAdsMutationExecution_status_startedAt_idx" ON "MetaAdsMutationExecution"("status", "startedAt");
CREATE INDEX "MetaAdsMutationExecution_correlationId_idx" ON "MetaAdsMutationExecution"("correlationId");

ALTER TABLE "MetaAdsInsightSnapshot" ADD CONSTRAINT "MetaAdsInsightSnapshot_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "MetaAdsInsightSyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaAdsRecommendation" ADD CONSTRAINT "MetaAdsRecommendation_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MetaAdsInsightSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
