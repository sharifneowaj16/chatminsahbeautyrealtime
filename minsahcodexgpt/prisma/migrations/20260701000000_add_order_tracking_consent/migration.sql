-- Phase 6: Persist checkout-time non-essential tracking consent on orders.
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "trackingConsent" TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "nonEssentialTrackingAllowed" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "trackingFilteredReason" TEXT;

CREATE INDEX IF NOT EXISTS "Order_trackingConsent_idx" ON "Order"("trackingConsent");
CREATE INDEX IF NOT EXISTS "Order_nonEssentialTrackingAllowed_idx" ON "Order"("nonEssentialTrackingAllowed");
