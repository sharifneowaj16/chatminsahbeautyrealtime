-- Recovery / Rollback for: 20260629000000_add_meta_purchase_processing_at
BEGIN;

DROP INDEX IF EXISTS "Order_metaPurchaseProcessingAt_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "metaPurchaseProcessingAt";

COMMIT;
