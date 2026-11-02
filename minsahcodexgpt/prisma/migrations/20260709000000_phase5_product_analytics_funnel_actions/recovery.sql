-- Recovery / Rollback for: 20260709000000_phase5_product_analytics_funnel_actions
BEGIN;

DROP INDEX IF EXISTS "Product_checkoutPaymentInfoCount_idx";

DROP INDEX IF EXISTS "Product_checkoutShippingInfoCount_idx";

DROP INDEX IF EXISTS "Product_checkoutStartCount_idx";

DROP INDEX IF EXISTS "Product_viewCartCount_idx";

ALTER TABLE "ProductDailyMetric"
    DROP COLUMN IF EXISTS "checkoutPaymentInfos",
    DROP COLUMN IF EXISTS "checkoutShippingInfos",
    DROP COLUMN IF EXISTS "viewCarts";

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "checkoutPaymentInfoCount",
    DROP COLUMN IF EXISTS "checkoutShippingInfoCount",
    DROP COLUMN IF EXISTS "viewCartCount";

COMMIT;
