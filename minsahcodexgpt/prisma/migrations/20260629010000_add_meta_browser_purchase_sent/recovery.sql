-- Recovery / Rollback for: 20260629010000_add_meta_browser_purchase_sent
BEGIN;

DROP INDEX IF EXISTS "Order_metaBrowserPurchaseSentAt_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "metaBrowserPurchaseSentAt";

COMMIT;
