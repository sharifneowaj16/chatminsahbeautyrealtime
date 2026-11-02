-- Recovery / Rollback for: 20260709020000_phase31e_tiktok_tracking_health_dashboard
BEGIN;

ALTER TABLE "TrackingHealthCheck"
    DROP COLUMN IF EXISTS "tiktokFailureCount",
    DROP COLUMN IF EXISTS "tiktokPurchaseSent";

COMMIT;
