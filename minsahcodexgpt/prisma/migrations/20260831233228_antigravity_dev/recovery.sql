-- Manual recovery script for failed migration: 20260831233228_antigravity_dev
-- Reason: original migration ran in a single transaction; it failed partway
-- (duplicate column on "Order") which rolled back most, but not all,
-- statements (some earlier statements had already committed via a separate
-- DDL burst before the failure point / due to prior manual db push).
-- This script is idempotent (IF EXISTS / IF NOT EXISTS / DO blocks) so it
-- safely applies only what was actually missing, run in production on 2026-09-01.
-- After running this, migration was marked applied via:
--   npx prisma migrate resolve --applied "20260831233228_antigravity_dev"

BEGIN;

ALTER TABLE "InventoryShortlist" DROP CONSTRAINT IF EXISTS "InventoryShortlist_adminId_fkey";
ALTER TABLE "MetaSocialWebhookReceipt" DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_replayApprovalId_fkey";

DROP INDEX IF EXISTS "MetaLead_fetchedAt_idx";
DROP INDEX IF EXISTS "MetaLead_status_idx";
DROP INDEX IF EXISTS "PurchaseShortlist_createdAt_idx";

ALTER TABLE "AdminNotification" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "FbDeadLetterJob" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "FbOutboxMessage" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "InventoryShortlist" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MarketingAttribution" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MarketingAttributionDailyAggregate" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaApiVersionPolicy" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaCapiFailure" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaCatalogSyncItem" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaConnection" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaEventOutbox"
  ALTER COLUMN "updatedAt" DROP DEFAULT,
  ALTER COLUMN "policyVersion" DROP DEFAULT,
  ALTER COLUMN "policyReason" DROP DEFAULT,
  ALTER COLUMN "consentState" DROP DEFAULT,
  ALTER COLUMN "retentionUntil" DROP DEFAULT;
ALTER TABLE "MetaInstagramAttachmentPolicyDecision" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaInstagramParticipant" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaInstagramPrivateReplyReservation" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaJobAudit" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "MetaLead" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "MetaLead" ALTER COLUMN "fetchedAt" DROP DEFAULT;
ALTER TABLE "MetaLead" ALTER COLUMN "receivedAt" DROP DEFAULT;
ALTER TABLE "MetaLead" ALTER COLUMN "retentionUntil" DROP DEFAULT;

ALTER TABLE "MetaLeadAgentProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaLeadAssignmentRule" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaLeadHandoff" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaLeadProcessingAttempt" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaOperation" ALTER COLUMN "priority" SET DEFAULT 'P2';
ALTER TABLE "MetaOutboxMessage" ALTER COLUMN "priority" SET DEFAULT 'P2';
ALTER TABLE "MetaProductSet" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaProviderIdentityRelationship" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MetaSocialWebhookReceipt"
  ALTER COLUMN "retentionUntil" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  ALTER COLUMN "dedupeRetainUntil" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '365 days');
ALTER TABLE "MetaWebhookReceipt" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "steadfastConsignmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "steadfastSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "steadfastStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "steadfastTrackingCode" TEXT;

ALTER TABLE "PathaoWebhookEvent" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "ProductDailyMetric" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "ProductViewDedup" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "PurchaseShortlist" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "SteadfastWebhookEvent" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Supplier" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "SupplierProduct" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "TelegramActionToken" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "TrackingHealthCheck" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE INDEX IF NOT EXISTS "Order_steadfastConsignmentId_idx" ON "Order"("steadfastConsignmentId");
CREATE INDEX IF NOT EXISTS "Order_steadfastTrackingCode_idx" ON "Order"("steadfastTrackingCode");
CREATE INDEX IF NOT EXISTS "Supplier_code_idx" ON "Supplier"("code");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MetaInstagramPrivateReply_accountIdentityReferenceId_fkey') THEN
    ALTER TABLE "MetaInstagramPrivateReplyReservation" RENAME CONSTRAINT "MetaInstagramPrivateReply_accountIdentityReferenceId_fkey" TO "MetaInstagramPrivateReplyReservation_accountIdentityRefere_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MetaInstagramPrivateReply_conversationId_fkey') THEN
    ALTER TABLE "MetaInstagramPrivateReplyReservation" RENAME CONSTRAINT "MetaInstagramPrivateReply_conversationId_fkey" TO "MetaInstagramPrivateReplyReservation_conversationId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MetaInstagramPrivateReply_replyAttemptId_fkey') THEN
    ALTER TABLE "MetaInstagramPrivateReplyReservation" RENAME CONSTRAINT "MetaInstagramPrivateReply_replyAttemptId_fkey" TO "MetaInstagramPrivateReplyReservation_replyAttemptId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MetaInstagramPrivateReply_sourceMessageId_fkey') THEN
    ALTER TABLE "MetaInstagramPrivateReplyReservation" RENAME CONSTRAINT "MetaInstagramPrivateReply_sourceMessageId_fkey" TO "MetaInstagramPrivateReplyReservation_sourceMessageId_fkey";
  END IF;
END $$;

ALTER TABLE "InventoryShortlist" ADD CONSTRAINT "InventoryShortlist_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MetaSocialWebhookReceipt" ADD CONSTRAINT "MetaSocialWebhookReceipt_replayApprovalId_fkey" FOREIGN KEY ("replayApprovalId") REFERENCES "MetaAdminApproval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER INDEX IF EXISTS "MarketingAttributionDailyAggregate_campaign_date_idx" RENAME TO "MarketingAttributionDailyAggregate_utmCampaign_aggregateDat_idx";
ALTER INDEX IF EXISTS "MarketingAttributionDailyAggregate_date_model_idx" RENAME TO "MarketingAttributionDailyAggregate_aggregateDate_sourceMode_idx";
ALTER INDEX IF EXISTS "MarketingAttributionDailyAggregate_identity_key" RENAME TO "MarketingAttributionDailyAggregate_aggregateDate_sourceMode_key";
ALTER INDEX IF EXISTS "MetaAdsInsightSnapshot_accountId_level_entityId_dateStart_dateS" RENAME TO "MetaAdsInsightSnapshot_accountId_level_entityId_dateStart_d_key";
ALTER INDEX IF EXISTS "MetaCatalogBatch_deletePlan_status_idx" RENAME TO "MetaCatalogBatch_deletePlanId_status_idx";
ALTER INDEX IF EXISTS "MetaCatalogBatchItem_batch_provider_idx" RENAME TO "MetaCatalogBatchItem_batchId_providerIndex_idx";
ALTER INDEX IF EXISTS "MetaCatalogBatchItem_retryOf_idx" RENAME TO "MetaCatalogBatchItem_retryOfBatchItemId_idx";
ALTER INDEX IF EXISTS "MetaCatalogDeletePlan_catalog_status_expiry_idx" RENAME TO "MetaCatalogDeletePlan_catalogId_status_expiresAt_idx";
ALTER INDEX IF EXISTS "MetaCatalogDeletePlan_correlation_idx" RENAME TO "MetaCatalogDeletePlan_correlationId_idx";
ALTER INDEX IF EXISTS "MetaCatalogDeletePlan_requested_created_idx" RENAME TO "MetaCatalogDeletePlan_requestedById_createdAt_idx";
ALTER INDEX IF EXISTS "MetaInstagramPrivateReply_replyAttemptId_key" RENAME TO "MetaInstagramPrivateReplyReservation_replyAttemptId_key";

COMMIT;
