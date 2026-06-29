-- AddColumn: metaBrowserPurchaseSentAt
-- Purpose: DB-level atomic cross-browser guard for Meta Browser Pixel Purchase.
-- Replaces localStorage-only dedup. First caller claims with UPDATE WHERE NULL;
-- subsequent callers (any browser/device/incognito) get count=0 → no re-fire.
ALTER TABLE "Order" ADD COLUMN "metaBrowserPurchaseSentAt" TIMESTAMP(3);

CREATE INDEX "Order_metaBrowserPurchaseSentAt_idx" ON "Order"("metaBrowserPurchaseSentAt");
