-- Recovery / Rollback for: 20260629020000_add_ga4_purchase_processing
BEGIN;

DROP INDEX IF EXISTS "Order_gaPurchaseProcessingAt_idx";

DROP INDEX IF EXISTS "Order_gaPurchaseSent_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "gaPurchaseProcessingAt";

COMMIT;
