-- Meta v6 Phase 8: durable Lead Ads webhook receipt, encrypted lead CRM, dedupe and assignment.
CREATE TYPE "MetaLeadStatus" AS ENUM ('NEW','CONTACTED','QUALIFIED','UNQUALIFIED','CONVERTED','LOST');
CREATE TYPE "MetaLeadRetrievalStatus" AS ENUM ('PENDING','FETCHING','RETRYING','FETCHED','NOT_FOUND','TOKEN_ERROR','PERMANENT_FAILURE');
CREATE TYPE "MetaWebhookProcessingStatus" AS ENUM ('RECEIVED','VERIFIED','QUEUED','PROCESSED','FAILED','REJECTED');
CREATE TYPE "MetaLeadDuplicateReason" AS ENUM ('LEADGEN_ID','PHONE','EMAIL');
CREATE TYPE "MetaLeadContactChannel" AS ENUM ('PHONE','WHATSAPP','EMAIL','MESSENGER','OTHER');

CREATE TABLE "MetaWebhookReceipt" (
  "id" TEXT NOT NULL,
  "objectType" TEXT NOT NULL,
  "externalId" TEXT,
  "eventKey" TEXT NOT NULL,
  "signatureOk" BOOLEAN NOT NULL,
  "payload" JSONB,
  "payloadDigest" TEXT NOT NULL,
  "payloadEncrypted" TEXT,
  "pageId" TEXT,
  "formId" TEXT,
  "leadgenId" TEXT,
  "status" "MetaWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "queuedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "cleanupAfter" TIMESTAMP(3),
  "error" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaWebhookReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MetaWebhookReceipt_eventKey_key" ON "MetaWebhookReceipt"("eventKey");
CREATE INDEX "MetaWebhookReceipt_status_receivedAt_idx" ON "MetaWebhookReceipt"("status","receivedAt");
CREATE INDEX "MetaWebhookReceipt_leadgenId_idx" ON "MetaWebhookReceipt"("leadgenId");
CREATE INDEX "MetaWebhookReceipt_pageId_formId_idx" ON "MetaWebhookReceipt"("pageId","formId");
CREATE INDEX "MetaWebhookReceipt_cleanupAfter_idx" ON "MetaWebhookReceipt"("cleanupAfter");

-- Existing lead rows are preserved and conservatively backfilled before enum conversion.
ALTER TABLE "MetaLead" RENAME COLUMN "createdTime" TO "sourceCreatedAt";
ALTER TABLE "MetaLead" RENAME COLUMN "fieldData" TO "rawFields";
ALTER TABLE "MetaLead" RENAME COLUMN "rawPayload" TO "legacyRawPayload";
ALTER TABLE "MetaLead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MetaLead" ALTER COLUMN "status" TYPE "MetaLeadStatus" USING (
  CASE WHEN "status" IN ('NEW','CONTACTED','QUALIFIED','UNQUALIFIED','CONVERTED','LOST') THEN "status"::"MetaLeadStatus" ELSE 'NEW'::"MetaLeadStatus" END
);
ALTER TABLE "MetaLead" ALTER COLUMN "status" SET DEFAULT 'NEW';
ALTER TABLE "MetaLead" ALTER COLUMN "fetchedAt" DROP NOT NULL;
ALTER TABLE "MetaLead" ADD COLUMN "adName" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "adsetName" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "campaignName" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "isOrganic" BOOLEAN;
ALTER TABLE "MetaLead" ADD COLUMN "platform" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "partnerName" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "retailerItemId" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "rawPayloadEncrypted" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "rawPayloadDigest" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "normalizedData" JSONB;
ALTER TABLE "MetaLead" ADD COLUMN "normalizedPhoneHash" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "normalizedEmailHash" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "phoneMasked" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "emailMasked" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "fullName" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "city" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "area" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "productInterest" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "retrievalStatus" "MetaLeadRetrievalStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "MetaLead" ADD COLUMN "assignedToId" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "assignmentRuleId" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "assignmentReason" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "MetaLead" ADD COLUMN "freshnessSeconds" INTEGER;
ALTER TABLE "MetaLead" ADD COLUMN "assignedAt" TIMESTAMP(3);
ALTER TABLE "MetaLead" ADD COLUMN "contactedAt" TIMESTAMP(3);
ALTER TABLE "MetaLead" ADD COLUMN "qualifiedAt" TIMESTAMP(3);
ALTER TABLE "MetaLead" ADD COLUMN "convertedAt" TIMESTAMP(3);
ALTER TABLE "MetaLead" ADD COLUMN "lostAt" TIMESTAMP(3);
ALTER TABLE "MetaLead" ADD COLUMN "convertedOrderId" TEXT;
ALTER TABLE "MetaLead" ADD COLUMN "lastError" JSONB;
ALTER TABLE "MetaLead" ADD COLUMN "retentionUntil" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '365 days');

-- Legacy raw JSON may contain PII. It is deliberately removed rather than silently treated as encrypted data.
UPDATE "MetaLead" SET "rawFields" = COALESCE("rawFields", '[]'::jsonb), "legacyRawPayload" = NULL;
ALTER TABLE "MetaLead" DROP COLUMN "legacyRawPayload";
DROP INDEX IF EXISTS "MetaLead_createdTime_idx";
CREATE INDEX "MetaLead_status_receivedAt_idx" ON "MetaLead"("status","receivedAt");
CREATE INDEX "MetaLead_retrievalStatus_receivedAt_idx" ON "MetaLead"("retrievalStatus","receivedAt");
CREATE INDEX "MetaLead_assignedToId_status_idx" ON "MetaLead"("assignedToId","status");
CREATE INDEX "MetaLead_normalizedPhoneHash_idx" ON "MetaLead"("normalizedPhoneHash");
CREATE INDEX "MetaLead_normalizedEmailHash_idx" ON "MetaLead"("normalizedEmailHash");
CREATE INDEX "MetaLead_convertedOrderId_idx" ON "MetaLead"("convertedOrderId");
CREATE INDEX "MetaLead_retentionUntil_idx" ON "MetaLead"("retentionUntil");

CREATE TABLE "MetaLeadDuplicate" (
  "id" TEXT NOT NULL, "sourceLeadgenId" TEXT NOT NULL, "canonicalLeadId" TEXT NOT NULL,
  "reason" "MetaLeadDuplicateReason" NOT NULL, "matchedValueHash" TEXT, "receiptId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaLeadDuplicate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MetaLeadDuplicate_sourceLeadgenId_key" ON "MetaLeadDuplicate"("sourceLeadgenId");
CREATE INDEX "MetaLeadDuplicate_canonicalLeadId_createdAt_idx" ON "MetaLeadDuplicate"("canonicalLeadId","createdAt");
CREATE INDEX "MetaLeadDuplicate_reason_createdAt_idx" ON "MetaLeadDuplicate"("reason","createdAt");

CREATE TABLE "MetaLeadContactAttempt" (
  "id" TEXT NOT NULL, "leadId" TEXT NOT NULL, "actorId" TEXT, "channel" "MetaLeadContactChannel" NOT NULL,
  "outcome" TEXT NOT NULL, "notes" TEXT, "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextFollowUpAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaLeadContactAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MetaLeadContactAttempt_leadId_attemptedAt_idx" ON "MetaLeadContactAttempt"("leadId","attemptedAt");
CREATE INDEX "MetaLeadContactAttempt_actorId_attemptedAt_idx" ON "MetaLeadContactAttempt"("actorId","attemptedAt");
CREATE INDEX "MetaLeadContactAttempt_nextFollowUpAt_idx" ON "MetaLeadContactAttempt"("nextFollowUpAt");

CREATE TABLE "MetaLeadAssignmentRule" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "priority" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true,
  "campaignId" TEXT, "formId" TEXT, "city" TEXT, "area" TEXT, "productInterest" TEXT, "assignedToId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaLeadAssignmentRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MetaLeadAssignmentRule_active_priority_idx" ON "MetaLeadAssignmentRule"("active","priority");
CREATE INDEX "MetaLeadAssignmentRule_campaignId_idx" ON "MetaLeadAssignmentRule"("campaignId");
CREATE INDEX "MetaLeadAssignmentRule_formId_idx" ON "MetaLeadAssignmentRule"("formId");

CREATE TABLE "MetaLeadAgentProfile" (
  "id" TEXT NOT NULL, "adminId" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "maxOpenLeads" INTEGER NOT NULL DEFAULT 50, "lastAssignedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaLeadAgentProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MetaLeadAgentProfile_adminId_key" ON "MetaLeadAgentProfile"("adminId");
CREATE INDEX "MetaLeadAgentProfile_active_lastAssignedAt_idx" ON "MetaLeadAgentProfile"("active","lastAssignedAt");

ALTER TABLE "MetaLead" ADD CONSTRAINT "MetaLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaLead" ADD CONSTRAINT "MetaLead_convertedOrderId_fkey" FOREIGN KEY ("convertedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaLeadDuplicate" ADD CONSTRAINT "MetaLeadDuplicate_canonicalLeadId_fkey" FOREIGN KEY ("canonicalLeadId") REFERENCES "MetaLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaLeadContactAttempt" ADD CONSTRAINT "MetaLeadContactAttempt_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "MetaLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaLeadContactAttempt" ADD CONSTRAINT "MetaLeadContactAttempt_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaLeadAssignmentRule" ADD CONSTRAINT "MetaLeadAssignmentRule_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaLeadAgentProfile" ADD CONSTRAINT "MetaLeadAgentProfile_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
