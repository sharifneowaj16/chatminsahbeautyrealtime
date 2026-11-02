-- Recovery / Rollback for: 20260708000000_add_checkout_order_idempotency
BEGIN;

DROP INDEX IF EXISTS "Order_checkoutIdempotencyKey_idx";

DROP INDEX IF EXISTS "Order_userId_checkoutIdempotencyKey_key";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "checkoutPayloadHash",
    DROP COLUMN IF EXISTS "checkoutIdempotencyKey";

COMMIT;
