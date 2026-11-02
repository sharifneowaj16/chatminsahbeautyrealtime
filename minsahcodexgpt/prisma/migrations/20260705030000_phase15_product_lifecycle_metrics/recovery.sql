-- Recovery / Rollback for: 20260705030000_phase15_product_lifecycle_metrics
BEGIN;

DROP INDEX IF EXISTS "Product_refundedOrderCount_idx";

ALTER TABLE "ProductDailyMetric"
    DROP COLUMN IF EXISTS "refundedRevenue",
    DROP COLUMN IF EXISTS "refundedOrders",
    DROP COLUMN IF EXISTS "returnedRevenue",
    DROP COLUMN IF EXISTS "cancelledRevenue",
    DROP COLUMN IF EXISTS "confirmedRevenue";

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "refundedOrderCount";

COMMIT;
