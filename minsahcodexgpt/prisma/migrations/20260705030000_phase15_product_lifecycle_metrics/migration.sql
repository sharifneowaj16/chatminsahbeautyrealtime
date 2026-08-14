-- Phase 15: Product lifecycle analytics wiring
-- Adds persistent lifecycle revenue/refund fields used by status-transition hooks.

ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "refundedOrderCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProductDailyMetric"
ADD COLUMN IF NOT EXISTS "confirmedRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "cancelledRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "returnedRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "refundedOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "refundedRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Product_refundedOrderCount_idx" ON "Product" ("refundedOrderCount");
