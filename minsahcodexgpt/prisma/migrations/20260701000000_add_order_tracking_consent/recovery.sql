-- Recovery / Rollback for: 20260701000000_add_order_tracking_consent
BEGIN;

DROP INDEX IF EXISTS "Order_nonEssentialTrackingAllowed_idx";

DROP INDEX IF EXISTS "Order_trackingConsent_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "trackingFilteredReason",
    DROP COLUMN IF EXISTS "nonEssentialTrackingAllowed",
    DROP COLUMN IF EXISTS "trackingConsent";

COMMIT;
