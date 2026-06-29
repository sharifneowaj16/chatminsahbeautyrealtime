-- Add race-safe processing guard for GA4 Measurement Protocol Purchase.
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "gaPurchaseProcessingAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_gaPurchaseSent_idx" ON "Order" ("gaPurchaseSent");
CREATE INDEX IF NOT EXISTS "Order_gaPurchaseProcessingAt_idx" ON "Order" ("gaPurchaseProcessingAt");
