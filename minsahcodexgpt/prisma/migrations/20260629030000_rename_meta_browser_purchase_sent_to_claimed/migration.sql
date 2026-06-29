-- Rename Browser Pixel Purchase guard to reflect real semantics.
-- This timestamp means the signed browser purchase flow was claimed/authorized,
-- not that the browser Pixel delivery to Meta was server-confirmed.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Order'
      AND column_name = 'metaBrowserPurchaseSentAt'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Order'
      AND column_name = 'metaBrowserPurchaseClaimedAt'
  ) THEN
    ALTER TABLE "Order" RENAME COLUMN "metaBrowserPurchaseSentAt" TO "metaBrowserPurchaseClaimedAt";
  END IF;
END $$;

DROP INDEX IF EXISTS "Order_metaBrowserPurchaseSentAt_idx";
CREATE INDEX IF NOT EXISTS "Order_metaBrowserPurchaseClaimedAt_idx" ON "Order"("metaBrowserPurchaseClaimedAt");
