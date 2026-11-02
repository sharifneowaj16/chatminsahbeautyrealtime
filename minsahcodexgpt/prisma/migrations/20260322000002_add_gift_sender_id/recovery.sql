-- Recovery / Rollback for: 20260322000002_add_gift_sender_id
BEGIN;

ALTER TABLE "GiftRequest" DROP CONSTRAINT IF EXISTS "GiftRequest_recipientId_fkey";

ALTER TABLE "GiftRequest" DROP CONSTRAINT IF EXISTS "GiftRequest_senderId_fkey";

DROP INDEX IF EXISTS "GiftRequest_recipientId_idx";

DROP INDEX IF EXISTS "GiftRequest_senderId_idx";

ALTER TABLE "GiftRequest"
    DROP COLUMN IF EXISTS "recipientId",
    DROP COLUMN IF EXISTS "senderId";

COMMIT;
