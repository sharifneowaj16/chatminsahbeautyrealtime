-- DropForeignKey
ALTER TABLE "InventoryShortlist" DROP CONSTRAINT "InventoryShortlist_adminId_fkey";

-- DropForeignKey
ALTER TABLE "MetaSocialWebhookReceipt" DROP CONSTRAINT "MetaSocialWebhookReceipt_replayApprovalId_fkey";

-- DropIndex
DROP INDEX "MetaLead_fetchedAt_idx";

-- DropIndex
DROP INDEX "MetaLead_status_idx";

-- DropIndex
DROP INDEX "PurchaseShortlist_createdAt_idx";

-- AlterTable
ALTER TABLE "AdminNotification" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FbDeadLetterJob" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FbOutboxMessage" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InventoryShortlist" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MarketingAttribution" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MarketingAttributionDailyAggregate" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaApiVersionPolicy" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaCapiFailure" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaCatalogSyncItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaConnection" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaEventOutbox" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "policyVersion" DROP DEFAULT,
ALTER COLUMN "policyReason" DROP DEFAULT,
ALTER COLUMN "consentState" DROP DEFAULT,
ALTER COLUMN "retentionUntil" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaInstagramAttachmentPolicyDecision" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaInstagramParticipant" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaInstagramPrivateReplyReservation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaJobAudit" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaLead" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "fetchedAt" DROP DEFAULT,
ALTER COLUMN "receivedAt" DROP DEFAULT,
ALTER COLUMN "retentionUntil" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaLeadAgentProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaLeadAssignmentRule" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaLeadHandoff" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaLeadProcessingAttempt" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaOperation" ALTER COLUMN "priority" SET DEFAULT 'P2';

-- AlterTable
ALTER TABLE "MetaOutboxMessage" ALTER COLUMN "priority" SET DEFAULT 'P2';

-- AlterTable
ALTER TABLE "MetaProductSet" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaProviderIdentityRelationship" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MetaSocialWebhookReceipt" ALTER COLUMN "retentionUntil" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
ALTER COLUMN "dedupeRetainUntil" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '365 days');

-- AlterTable
ALTER TABLE "MetaWebhookReceipt" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "steadfastConsignmentId" TEXT,
ADD COLUMN     "steadfastSentAt" TIMESTAMP(3),
ADD COLUMN     "steadfastStatus" TEXT,
ADD COLUMN     "steadfastTrackingCode" TEXT;

-- AlterTable
ALTER TABLE "PathaoWebhookEvent" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductDailyMetric" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductViewDedup" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PurchaseShortlist" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SteadfastWebhookEvent" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Supplier" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupplierProduct" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TelegramActionToken" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TrackingHealthCheck" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Order_steadfastConsignmentId_idx" ON "Order"("steadfastConsignmentId");

-- CreateIndex
CREATE INDEX "Order_steadfastTrackingCode_idx" ON "Order"("steadfastTrackingCode");

-- CreateIndex
CREATE INDEX "Supplier_code_idx" ON "Supplier"("code");

-- RenameForeignKey
ALTER TABLE "MetaInstagramPrivateReplyReservation" RENAME CONSTRAINT "MetaInstagramPrivateReply_accountIdentityReferenceId_fkey" TO "MetaInstagramPrivateReplyReservation_accountIdentityRefere_fkey";

-- RenameForeignKey
ALTER TABLE "MetaInstagramPrivateReplyReservation" RENAME CONSTRAINT "MetaInstagramPrivateReply_conversationId_fkey" TO "MetaInstagramPrivateReplyReservation_conversationId_fkey";

-- RenameForeignKey
ALTER TABLE "MetaInstagramPrivateReplyReservation" RENAME CONSTRAINT "MetaInstagramPrivateReply_replyAttemptId_fkey" TO "MetaInstagramPrivateReplyReservation_replyAttemptId_fkey";

-- RenameForeignKey
ALTER TABLE "MetaInstagramPrivateReplyReservation" RENAME CONSTRAINT "MetaInstagramPrivateReply_sourceMessageId_fkey" TO "MetaInstagramPrivateReplyReservation_sourceMessageId_fkey";

-- AddForeignKey
ALTER TABLE "InventoryShortlist" ADD CONSTRAINT "InventoryShortlist_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaSocialWebhookReceipt" ADD CONSTRAINT "MetaSocialWebhookReceipt_replayApprovalId_fkey" FOREIGN KEY ("replayApprovalId") REFERENCES "MetaAdminApproval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "MarketingAttributionDailyAggregate_campaign_date_idx" RENAME TO "MarketingAttributionDailyAggregate_utmCampaign_aggregateDat_idx";

-- RenameIndex
ALTER INDEX "MarketingAttributionDailyAggregate_date_model_idx" RENAME TO "MarketingAttributionDailyAggregate_aggregateDate_sourceMode_idx";

-- RenameIndex
ALTER INDEX "MarketingAttributionDailyAggregate_identity_key" RENAME TO "MarketingAttributionDailyAggregate_aggregateDate_sourceMode_key";

-- RenameIndex
ALTER INDEX "MetaAdsInsightSnapshot_accountId_level_entityId_dateStart_dateS" RENAME TO "MetaAdsInsightSnapshot_accountId_level_entityId_dateStart_d_key";

-- RenameIndex
ALTER INDEX "MetaCatalogBatch_deletePlan_status_idx" RENAME TO "MetaCatalogBatch_deletePlanId_status_idx";

-- RenameIndex
ALTER INDEX "MetaCatalogBatchItem_batch_provider_idx" RENAME TO "MetaCatalogBatchItem_batchId_providerIndex_idx";

-- RenameIndex
ALTER INDEX "MetaCatalogBatchItem_retryOf_idx" RENAME TO "MetaCatalogBatchItem_retryOfBatchItemId_idx";

-- RenameIndex
ALTER INDEX "MetaCatalogDeletePlan_catalog_status_expiry_idx" RENAME TO "MetaCatalogDeletePlan_catalogId_status_expiresAt_idx";

-- RenameIndex
ALTER INDEX "MetaCatalogDeletePlan_correlation_idx" RENAME TO "MetaCatalogDeletePlan_correlationId_idx";

-- RenameIndex
ALTER INDEX "MetaCatalogDeletePlan_requested_created_idx" RENAME TO "MetaCatalogDeletePlan_requestedById_createdAt_idx";

-- RenameIndex
ALTER INDEX "MetaInstagramPrivateReply_replyAttemptId_key" RENAME TO "MetaInstagramPrivateReplyReservation_replyAttemptId_key";
