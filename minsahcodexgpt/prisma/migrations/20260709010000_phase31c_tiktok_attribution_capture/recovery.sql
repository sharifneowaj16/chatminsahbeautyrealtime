-- Recovery / Rollback for: 20260709010000_phase31c_tiktok_attribution_capture
BEGIN;

DROP INDEX IF EXISTS "Order_tiktokPurchaseProcessingAt_idx";

DROP INDEX IF EXISTS "Order_tiktokPurchaseSent_idx";

DROP INDEX IF EXISTS "Order_tiktokEventId_idx";

DROP INDEX IF EXISTS "Order_tiktokClickId_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "tiktokPurchaseProcessingAt",
    DROP COLUMN IF EXISTS "tiktokPurchaseSentAt",
    DROP COLUMN IF EXISTS "tiktokPurchaseSent",
    DROP COLUMN IF EXISTS "tiktokEventId",
    DROP COLUMN IF EXISTS "tiktokExternalId",
    DROP COLUMN IF EXISTS "tiktokTtp",
    DROP COLUMN IF EXISTS "tiktokClickId";

COMMIT;
