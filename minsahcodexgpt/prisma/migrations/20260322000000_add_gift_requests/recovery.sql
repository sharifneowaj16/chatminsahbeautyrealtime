-- Recovery / Rollback for: 20260322000000_add_gift_requests
BEGIN;

DROP INDEX IF EXISTS "GiftRequest_status_idx";

DROP INDEX IF EXISTS "GiftRequest_productId_idx";

DROP INDEX IF EXISTS "GiftRequest_token_idx";

DROP INDEX IF EXISTS "GiftRequest_token_key";

DROP TABLE IF EXISTS "GiftRequest" CASCADE;

DROP TYPE IF EXISTS "GiftStatus" CASCADE;

COMMIT;
