-- Recovery / Rollback for: 20260322000001_add_gift_type
BEGIN;

DROP INDEX IF EXISTS "GiftRequest_giftType_idx";

ALTER TABLE "GiftRequest"
    DROP COLUMN IF EXISTS "requesterPhone",
    DROP COLUMN IF EXISTS "requesterAddress",
    DROP COLUMN IF EXISTS "giftType";

COMMIT;
