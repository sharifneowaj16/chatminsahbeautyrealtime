-- Phase 7: Online payment lifecycle and stock reservation.
-- Online bKash/Nagad orders reserve stock for a short TTL, become confirmed only
-- after verified payment, and can expire without permanently selling inventory.

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_EXPIRED';

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "reservedQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "reservedQuantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentExpiresAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stockReservedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stockFinalizedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stockReleasedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adminNotifiedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_paymentExpiresAt_idx" ON "Order"("paymentExpiresAt");
CREATE INDEX IF NOT EXISTS "Order_stockFinalizedAt_idx" ON "Order"("stockFinalizedAt");
CREATE INDEX IF NOT EXISTS "Order_stockReleasedAt_idx" ON "Order"("stockReleasedAt");
CREATE INDEX IF NOT EXISTS "Order_adminNotifiedAt_idx" ON "Order"("adminNotifiedAt");
