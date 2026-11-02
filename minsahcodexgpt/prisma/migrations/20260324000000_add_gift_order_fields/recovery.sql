-- Recovery / Rollback for: 20260324000000_add_gift_order_fields
BEGIN;

DROP INDEX IF EXISTS "Order_giftToken_idx";

DROP INDEX IF EXISTS "Order_isGiftOrder_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "giftToken",
    DROP COLUMN IF EXISTS "isGiftOrder";

COMMIT;
