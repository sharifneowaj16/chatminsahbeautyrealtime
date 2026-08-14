-- Phase 30: immutable catalog deletion plans and item-level batch outcomes.
CREATE TYPE "MetaCatalogDeletePlanStatus" AS ENUM (
  'DRAFT', 'APPROVAL_PENDING', 'QUEUED', 'EXECUTING', 'SUBMITTED',
  'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED'
);

ALTER TABLE "MetaCatalogBatch"
  ADD COLUMN "operationKind" TEXT NOT NULL DEFAULT 'SYNC',
  ADD COLUMN "deletePlanId" TEXT;

ALTER TABLE "MetaCatalogBatchItem"
  ADD COLUMN "providerIndex" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "retryOfBatchItemId" TEXT;

CREATE TABLE "MetaCatalogDeletePlan" (
  "id" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "retailerIds" TEXT[] NOT NULL,
  "itemCount" INTEGER NOT NULL,
  "sourceSnapshotHash" TEXT NOT NULL,
  "managedItemCount" INTEGER NOT NULL,
  "deleteRatio" DOUBLE PRECISION NOT NULL,
  "requiresEmergencyOverride" BOOLEAN NOT NULL DEFAULT false,
  "status" "MetaCatalogDeletePlanStatus" NOT NULL DEFAULT 'DRAFT',
  "approvalId" TEXT,
  "requestedById" TEXT NOT NULL,
  "executedById" TEXT,
  "correlationId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "resultData" JSONB,
  "errorData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaCatalogDeletePlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaCatalogDeletePlan_item_count" CHECK ("itemCount" > 0 AND "itemCount" = cardinality("retailerIds")),
  CONSTRAINT "MetaCatalogDeletePlan_digest" CHECK (length("digest") = 64 AND length("sourceSnapshotHash") = 64),
  CONSTRAINT "MetaCatalogDeletePlan_ratio" CHECK ("deleteRatio" >= 0 AND "deleteRatio" <= 1),
  CONSTRAINT "MetaCatalogDeletePlan_expiry" CHECK ("expiresAt" > "createdAt")
);

CREATE UNIQUE INDEX "MetaCatalogDeletePlan_approvalId_key" ON "MetaCatalogDeletePlan"("approvalId");
CREATE INDEX "MetaCatalogDeletePlan_catalog_status_expiry_idx" ON "MetaCatalogDeletePlan"("catalogId", "status", "expiresAt");
CREATE INDEX "MetaCatalogDeletePlan_requested_created_idx" ON "MetaCatalogDeletePlan"("requestedById", "createdAt");
CREATE INDEX "MetaCatalogDeletePlan_correlation_idx" ON "MetaCatalogDeletePlan"("correlationId");
CREATE INDEX "MetaCatalogBatch_deletePlan_status_idx" ON "MetaCatalogBatch"("deletePlanId", "status");
CREATE INDEX "MetaCatalogBatchItem_retryOf_idx" ON "MetaCatalogBatchItem"("retryOfBatchItemId");
CREATE INDEX "MetaCatalogBatchItem_batch_provider_idx" ON "MetaCatalogBatchItem"("batchId", "providerIndex");

ALTER TABLE "MetaCatalogBatch" ADD CONSTRAINT "MetaCatalogBatch_deletePlanId_fkey"
FOREIGN KEY ("deletePlanId") REFERENCES "MetaCatalogDeletePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Approval-bound request fields are immutable after creation.
CREATE OR REPLACE FUNCTION "meta_catalog_delete_plan_protect_request"()
RETURNS trigger AS $$
BEGIN
  IF NEW."catalogId" IS DISTINCT FROM OLD."catalogId"
    OR NEW."digest" IS DISTINCT FROM OLD."digest"
    OR NEW."retailerIds" IS DISTINCT FROM OLD."retailerIds"
    OR NEW."itemCount" IS DISTINCT FROM OLD."itemCount"
    OR NEW."sourceSnapshotHash" IS DISTINCT FROM OLD."sourceSnapshotHash"
    OR NEW."managedItemCount" IS DISTINCT FROM OLD."managedItemCount"
    OR NEW."deleteRatio" IS DISTINCT FROM OLD."deleteRatio"
    OR NEW."requiresEmergencyOverride" IS DISTINCT FROM OLD."requiresEmergencyOverride"
    OR NEW."requestedById" IS DISTINCT FROM OLD."requestedById"
    OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN RAISE EXCEPTION 'MetaCatalogDeletePlan immutable request fields cannot be changed'; END IF;
  IF OLD."approvalId" IS NOT NULL AND NEW."approvalId" IS DISTINCT FROM OLD."approvalId"
  THEN RAISE EXCEPTION 'MetaCatalogDeletePlan approval binding cannot be changed'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "MetaCatalogDeletePlan_protect_request" BEFORE UPDATE ON "MetaCatalogDeletePlan"
FOR EACH ROW EXECUTE FUNCTION "meta_catalog_delete_plan_protect_request"();
