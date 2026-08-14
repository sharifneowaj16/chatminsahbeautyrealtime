-- Phase 13: Attribution enrichment for ad/creative/offer-level reporting.
-- These columns are nullable and additive so existing orders remain untouched.

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "utmTerm" TEXT,
ADD COLUMN IF NOT EXISTS "landingOffer" TEXT,
ADD COLUMN IF NOT EXISTS "attributionCouponCode" TEXT,
ADD COLUMN IF NOT EXISTS "freeDeliveryThreshold" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "campaignSourceUrl" TEXT;

CREATE INDEX IF NOT EXISTS "Order_utmTerm_idx" ON "Order" ("utmTerm");
CREATE INDEX IF NOT EXISTS "Order_offerVersion_idx" ON "Order" ("offerVersion");
CREATE INDEX IF NOT EXISTS "Order_abVariant_idx" ON "Order" ("abVariant");
CREATE INDEX IF NOT EXISTS "Order_attributionCouponCode_idx" ON "Order" ("attributionCouponCode");
