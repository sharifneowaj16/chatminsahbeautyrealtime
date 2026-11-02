-- Recovery / Rollback for: 20260605000000_add_purchase_shortlist
BEGIN;

DROP INDEX IF EXISTS "PurchaseShortlist_createdAt_idx";

DROP INDEX IF EXISTS "PurchaseShortlist_adminId_idx";

DROP INDEX IF EXISTS "PurchaseShortlist_priority_idx";

DROP INDEX IF EXISTS "PurchaseShortlist_purchased_idx";

DROP INDEX IF EXISTS "PurchaseShortlist_productId_idx";

DROP INDEX IF EXISTS "PurchaseShortlist_orderId_idx";

DROP INDEX IF EXISTS "PurchaseShortlist_orderId_productId_key";

DROP TABLE IF EXISTS "PurchaseShortlist" CASCADE;

COMMIT;
