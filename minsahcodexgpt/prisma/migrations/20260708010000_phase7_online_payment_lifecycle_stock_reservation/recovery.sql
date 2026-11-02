-- Recovery / Rollback for: 20260708010000_phase7_online_payment_lifecycle_stock_reservation
BEGIN;

DROP INDEX IF EXISTS "Order_adminNotifiedAt_idx";

DROP INDEX IF EXISTS "Order_stockReleasedAt_idx";

DROP INDEX IF EXISTS "Order_stockFinalizedAt_idx";

DROP INDEX IF EXISTS "Order_paymentExpiresAt_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "adminNotifiedAt",
    DROP COLUMN IF EXISTS "stockReleasedAt",
    DROP COLUMN IF EXISTS "stockFinalizedAt",
    DROP COLUMN IF EXISTS "stockReservedAt",
    DROP COLUMN IF EXISTS "paymentExpiresAt";

ALTER TABLE "ProductVariant"
    DROP COLUMN IF EXISTS "reservedQuantity";

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "reservedQuantity";

COMMIT;
