-- Recovery / Rollback for: 20260717010000_meta_v6_phase2_catalog_domain
BEGIN;

DROP INDEX IF EXISTS "MetaCatalogBatchItem_status_idx";

DROP INDEX IF EXISTS "MetaCatalogBatchItem_retailerId_idx";

DROP INDEX IF EXISTS "MetaCatalogBatchItem_batchId_retailerId_key";

DROP INDEX IF EXISTS "MetaCatalogSyncItem_status_idx";

DROP INDEX IF EXISTS "MetaCatalogSyncItem_sourceType_sourceId_idx";

DROP INDEX IF EXISTS "ProductVariant_isActive_deletedAt_idx";

ALTER TABLE "MetaCatalogSyncItem"
    DROP COLUMN IF EXISTS "updatedAt",
    DROP COLUMN IF EXISTS "deletedAt",
    DROP COLUMN IF EXISTS "lastError",
    DROP COLUMN IF EXISTS "lastSucceededAt",
    DROP COLUMN IF EXISTS "status",
    DROP COLUMN IF EXISTS "payloadHash",
    DROP COLUMN IF EXISTS "sourceId",
    DROP COLUMN IF EXISTS "sourceType";

ALTER TABLE "ProductVariant"
    DROP COLUMN IF EXISTS "barcode",
    DROP COLUMN IF EXISTS "mpn",
    DROP COLUMN IF EXISTS "gtin",
    DROP COLUMN IF EXISTS "condition",
    DROP COLUMN IF EXISTS "preorderAvailableOn",
    DROP COLUMN IF EXISTS "availabilityMode",
    DROP COLUMN IF EXISTS "deletedAt",
    DROP COLUMN IF EXISTS "isActive",
    DROP COLUMN IF EXISTS "allowBackorder",
    DROP COLUMN IF EXISTS "offerEndDate",
    DROP COLUMN IF EXISTS "offerStartDate",
    DROP COLUMN IF EXISTS "salePrice";

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "facebookProductCategory",
    DROP COLUMN IF EXISTS "googleProductCategory",
    DROP COLUMN IF EXISTS "mpn",
    DROP COLUMN IF EXISTS "preorderAvailableOn",
    DROP COLUMN IF EXISTS "availabilityMode";

DROP TABLE IF EXISTS "MetaCatalogBatchItem" CASCADE;

DROP TYPE IF EXISTS "MetaCatalogBatchStatus" CASCADE;

DROP TYPE IF EXISTS "MetaCatalogItemStatus" CASCADE;

DROP TYPE IF EXISTS "ProductCondition" CASCADE;

DROP TYPE IF EXISTS "ProductAvailabilityMode" CASCADE;

COMMIT;
