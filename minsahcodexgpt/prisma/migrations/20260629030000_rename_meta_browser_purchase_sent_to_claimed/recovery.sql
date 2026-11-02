-- Recovery / Rollback for: 20260629030000_rename_meta_browser_purchase_sent_to_claimed
BEGIN;

DROP INDEX IF EXISTS "Order_metaBrowserPurchaseClaimedAt_idx";

COMMIT;
