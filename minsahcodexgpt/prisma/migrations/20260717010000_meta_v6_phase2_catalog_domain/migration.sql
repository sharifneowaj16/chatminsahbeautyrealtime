-- Meta v6 Phase 2: canonical catalog lifecycle, variant overrides, and typed sync state.
CREATE TYPE "ProductAvailabilityMode" AS ENUM ('STANDARD', 'PREORDER', 'DISCONTINUED');
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'REFURBISHED', 'USED');
CREATE TYPE "MetaCatalogItemStatus" AS ENUM ('NEVER_SYNCED', 'SUBMITTED', 'ACTIVE', 'FAILED', 'DELETE_SUBMITTED', 'DELETED');
CREATE TYPE "MetaCatalogBatchStatus" AS ENUM ('SUBMITTED', 'SUCCESS', 'FAILED');

ALTER TABLE "Product"
  ALTER COLUMN "condition" DROP DEFAULT,
  ALTER COLUMN "condition" TYPE "ProductCondition" USING
    CASE
      WHEN UPPER(COALESCE("condition", 'NEW')) IN ('NEW', 'REFURBISHED', 'USED')
        THEN UPPER(COALESCE("condition", 'NEW'))::"ProductCondition"
      ELSE 'NEW'::"ProductCondition"
    END,
  ALTER COLUMN "condition" SET DEFAULT 'NEW',
  ALTER COLUMN "condition" SET NOT NULL,
  ADD COLUMN "availabilityMode" "ProductAvailabilityMode" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "preorderAvailableOn" TIMESTAMP(3),
  ADD COLUMN "mpn" TEXT,
  ADD COLUMN "googleProductCategory" TEXT,
  ADD COLUMN "facebookProductCategory" TEXT;

UPDATE "Product"
SET "availabilityMode" = 'PREORDER'
WHERE "preOrderOption" = TRUE;

ALTER TABLE "ProductVariant"
  ADD COLUMN "salePrice" DECIMAL(10,2),
  ADD COLUMN "offerStartDate" TIMESTAMP(3),
  ADD COLUMN "offerEndDate" TIMESTAMP(3),
  ADD COLUMN "allowBackorder" BOOLEAN,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "availabilityMode" "ProductAvailabilityMode",
  ADD COLUMN "preorderAvailableOn" TIMESTAMP(3),
  ADD COLUMN "condition" "ProductCondition",
  ADD COLUMN "gtin" TEXT,
  ADD COLUMN "mpn" TEXT,
  ADD COLUMN "barcode" TEXT;

CREATE INDEX "ProductVariant_isActive_deletedAt_idx" ON "ProductVariant"("isActive", "deletedAt");

ALTER TABLE "MetaCatalogSyncItem"
  ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'PRODUCT',
  ADD COLUMN "sourceId" TEXT,
  ADD COLUMN "payloadHash" TEXT,
  ADD COLUMN "status" "MetaCatalogItemStatus" NOT NULL DEFAULT 'NEVER_SYNCED',
  ADD COLUMN "lastSucceededAt" TIMESTAMP(3),
  ADD COLUMN "lastError" JSONB,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "lastSubmittedAt" DROP NOT NULL,
  ALTER COLUMN "lastSubmittedAt" DROP DEFAULT;

UPDATE "MetaCatalogSyncItem"
SET "sourceId" = "retailerId",
    "status" = 'ACTIVE',
    "lastSucceededAt" = COALESCE("lastSubmittedAt", "createdAt");

ALTER TABLE "MetaCatalogSyncItem" ALTER COLUMN "sourceId" SET NOT NULL;
CREATE INDEX "MetaCatalogSyncItem_sourceType_sourceId_idx" ON "MetaCatalogSyncItem"("sourceType", "sourceId");
CREATE INDEX "MetaCatalogSyncItem_status_idx" ON "MetaCatalogSyncItem"("status");

ALTER TABLE "MetaCatalogBatch"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "MetaCatalogBatchStatus" USING
    CASE
      WHEN UPPER("status") IN ('FINISHED', 'COMPLETED', 'SUCCESS', 'SUCCEEDED') THEN 'SUCCESS'::"MetaCatalogBatchStatus"
      WHEN UPPER("status") IN ('FAILED', 'ERROR', 'FATAL') THEN 'FAILED'::"MetaCatalogBatchStatus"
      ELSE 'SUBMITTED'::"MetaCatalogBatchStatus"
    END,
  ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

CREATE TABLE "MetaCatalogBatchItem" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "retailerId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "payloadHash" TEXT,
  "status" "MetaCatalogItemStatus" NOT NULL DEFAULT 'SUBMITTED',
  "errorData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaCatalogBatchItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MetaCatalogBatchItem_batchId_retailerId_key" ON "MetaCatalogBatchItem"("batchId", "retailerId");
CREATE INDEX "MetaCatalogBatchItem_retailerId_idx" ON "MetaCatalogBatchItem"("retailerId");
CREATE INDEX "MetaCatalogBatchItem_status_idx" ON "MetaCatalogBatchItem"("status");
ALTER TABLE "MetaCatalogBatchItem" ADD CONSTRAINT "MetaCatalogBatchItem_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "MetaCatalogBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
