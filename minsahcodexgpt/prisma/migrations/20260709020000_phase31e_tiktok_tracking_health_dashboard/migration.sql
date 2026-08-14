-- Phase 31E: TikTok tracking health/dashboard metrics
-- Additive only. Existing Meta CAPI and GA4 health columns remain untouched.
ALTER TABLE "TrackingHealthCheck"
  ADD COLUMN IF NOT EXISTS "tiktokPurchaseSent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tiktokFailureCount" INTEGER NOT NULL DEFAULT 0;
