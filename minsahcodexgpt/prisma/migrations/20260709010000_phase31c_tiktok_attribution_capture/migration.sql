-- Phase 31C: TikTok attribution capture and future Events API Purchase idempotency fields.
-- This is additive only: Meta CAPI and GA4 columns/indexes are untouched.

ALTER TABLE "Order"
  ADD COLUMN "tiktokClickId" TEXT,
  ADD COLUMN "tiktokTtp" TEXT,
  ADD COLUMN "tiktokExternalId" TEXT,
  ADD COLUMN "tiktokEventId" TEXT,
  ADD COLUMN "tiktokPurchaseSent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "tiktokPurchaseSentAt" TIMESTAMP(3),
  ADD COLUMN "tiktokPurchaseProcessingAt" TIMESTAMP(3);

CREATE INDEX "Order_tiktokClickId_idx" ON "Order"("tiktokClickId");
CREATE INDEX "Order_tiktokEventId_idx" ON "Order"("tiktokEventId");
CREATE INDEX "Order_tiktokPurchaseSent_idx" ON "Order"("tiktokPurchaseSent");
CREATE INDEX "Order_tiktokPurchaseProcessingAt_idx" ON "Order"("tiktokPurchaseProcessingAt");
