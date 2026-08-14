CREATE TABLE "MetaLead" (
    "id" TEXT NOT NULL,
    "leadgenId" TEXT NOT NULL,
    "formId" TEXT,
    "pageId" TEXT,
    "adId" TEXT,
    "adsetId" TEXT,
    "campaignId" TEXT,
    "createdTime" TIMESTAMP(3),
    "fieldData" JSONB NOT NULL,
    "rawPayload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MetaLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaBusinessSyncLog" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "resourceId" TEXT,
    "status" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "requestData" JSONB,
    "responseData" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "MetaBusinessSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaLead_leadgenId_key" ON "MetaLead"("leadgenId");
CREATE INDEX "MetaLead_formId_idx" ON "MetaLead"("formId");
CREATE INDEX "MetaLead_pageId_idx" ON "MetaLead"("pageId");
CREATE INDEX "MetaLead_adId_idx" ON "MetaLead"("adId");
CREATE INDEX "MetaLead_adsetId_idx" ON "MetaLead"("adsetId");
CREATE INDEX "MetaLead_campaignId_idx" ON "MetaLead"("campaignId");
CREATE INDEX "MetaLead_status_idx" ON "MetaLead"("status");
CREATE INDEX "MetaLead_createdTime_idx" ON "MetaLead"("createdTime");
CREATE INDEX "MetaLead_fetchedAt_idx" ON "MetaLead"("fetchedAt");
CREATE INDEX "MetaBusinessSyncLog_operation_idx" ON "MetaBusinessSyncLog"("operation");
CREATE INDEX "MetaBusinessSyncLog_resourceId_idx" ON "MetaBusinessSyncLog"("resourceId");
CREATE INDEX "MetaBusinessSyncLog_status_idx" ON "MetaBusinessSyncLog"("status");
CREATE INDEX "MetaBusinessSyncLog_createdAt_idx" ON "MetaBusinessSyncLog"("createdAt");
