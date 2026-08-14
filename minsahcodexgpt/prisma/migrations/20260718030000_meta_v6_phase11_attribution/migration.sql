-- Meta v6 Phase 11: first-party attribution and growth analytics.
CREATE TYPE "MarketingAttributionConversionType" AS ENUM ('SESSION', 'LEAD', 'ORDER');
CREATE TYPE "MarketingAttributionSourceModel" AS ENUM ('FIRST_PARTY', 'META_REPORTED');

CREATE TABLE "MarketingAttribution" (
  "id" TEXT NOT NULL,
  "attributionKey" TEXT NOT NULL,
  "sessionId" TEXT,
  "visitorId" TEXT,
  "customerId" TEXT,
  "orderId" TEXT,
  "leadId" TEXT,
  "fbclid" TEXT,
  "fbc" TEXT,
  "fbp" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "utmTerm" TEXT,
  "utmContent" TEXT,
  "landingPage" TEXT,
  "firstTouch" JSONB,
  "lastTouch" JSONB,
  "checkoutSnapshot" JSONB,
  "dataQuality" JSONB,
  "correctionAudit" JSONB,
  "consentState" TEXT,
  "conversionType" "MarketingAttributionConversionType" NOT NULL DEFAULT 'SESSION',
  "sourceModel" "MarketingAttributionSourceModel" NOT NULL DEFAULT 'FIRST_PARTY',
  "conversionValue" DECIMAL(12,2),
  "currency" TEXT,
  "firstTouchedAt" TIMESTAMP(3),
  "lastTouchedAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "captureCount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingAttribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketingAttributionDailyAggregate" (
  "id" TEXT NOT NULL,
  "aggregateDate" DATE NOT NULL,
  "sourceModel" "MarketingAttributionSourceModel" NOT NULL DEFAULT 'FIRST_PARTY',
  "utmSource" TEXT NOT NULL DEFAULT 'direct',
  "utmMedium" TEXT NOT NULL DEFAULT 'none',
  "utmCampaign" TEXT NOT NULL DEFAULT 'unattributed',
  "sessions" INTEGER NOT NULL DEFAULT 0,
  "leads" INTEGER NOT NULL DEFAULT 0,
  "orders" INTEGER NOT NULL DEFAULT 0,
  "newCustomerOrders" INTEGER NOT NULL DEFAULT 0,
  "returningCustomerOrders" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "attributedOrders" INTEGER NOT NULL DEFAULT 0,
  "missingClickIds" INTEGER NOT NULL DEFAULT 0,
  "consentDenied" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingAttributionDailyAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingAttribution_attributionKey_key" ON "MarketingAttribution"("attributionKey");
CREATE INDEX "MarketingAttribution_orderId_idx" ON "MarketingAttribution"("orderId");
CREATE INDEX "MarketingAttribution_leadId_idx" ON "MarketingAttribution"("leadId");
CREATE INDEX "MarketingAttribution_sessionId_idx" ON "MarketingAttribution"("sessionId");
CREATE INDEX "MarketingAttribution_visitorId_idx" ON "MarketingAttribution"("visitorId");
CREATE INDEX "MarketingAttribution_customerId_idx" ON "MarketingAttribution"("customerId");
CREATE INDEX "MarketingAttribution_utmSource_utmMedium_utmCampaign_idx" ON "MarketingAttribution"("utmSource", "utmMedium", "utmCampaign");
CREATE INDEX "MarketingAttribution_conversionType_convertedAt_idx" ON "MarketingAttribution"("conversionType", "convertedAt");
CREATE INDEX "MarketingAttribution_sourceModel_createdAt_idx" ON "MarketingAttribution"("sourceModel", "createdAt");
CREATE UNIQUE INDEX "MarketingAttributionDailyAggregate_identity_key" ON "MarketingAttributionDailyAggregate"("aggregateDate", "sourceModel", "utmSource", "utmMedium", "utmCampaign");
CREATE INDEX "MarketingAttributionDailyAggregate_date_model_idx" ON "MarketingAttributionDailyAggregate"("aggregateDate", "sourceModel");
CREATE INDEX "MarketingAttributionDailyAggregate_campaign_date_idx" ON "MarketingAttributionDailyAggregate"("utmCampaign", "aggregateDate");
