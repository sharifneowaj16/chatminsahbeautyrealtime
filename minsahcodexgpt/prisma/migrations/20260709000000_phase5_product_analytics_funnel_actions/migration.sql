-- Phase 5: persist full product-analytics funnel actions.
-- Before this migration, the browser sent view_cart / checkout_shipping_info /
-- checkout_payment_info, but the server only persisted add_to_cart and checkout_start.

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "viewCartCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "checkoutShippingInfoCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "checkoutPaymentInfoCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProductDailyMetric"
  ADD COLUMN IF NOT EXISTS "viewCarts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "checkoutShippingInfos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "checkoutPaymentInfos" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Product_viewCartCount_idx" ON "Product"("viewCartCount");
CREATE INDEX IF NOT EXISTS "Product_checkoutStartCount_idx" ON "Product"("checkoutStartCount");
CREATE INDEX IF NOT EXISTS "Product_checkoutShippingInfoCount_idx" ON "Product"("checkoutShippingInfoCount");
CREATE INDEX IF NOT EXISTS "Product_checkoutPaymentInfoCount_idx" ON "Product"("checkoutPaymentInfoCount");
