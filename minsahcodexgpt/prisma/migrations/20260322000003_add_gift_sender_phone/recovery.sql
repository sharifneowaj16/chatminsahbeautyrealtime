-- Recovery / Rollback for: 20260322000003_add_gift_sender_phone
BEGIN;

ALTER TABLE "GiftRequest"
    DROP COLUMN IF EXISTS "senderPhone";

COMMIT;
