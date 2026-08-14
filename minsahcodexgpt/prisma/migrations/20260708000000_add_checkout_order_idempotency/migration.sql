-- Phase 6: checkout idempotency / duplicate order protection
ALTER TABLE "Order" ADD COLUMN "checkoutIdempotencyKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "checkoutPayloadHash" TEXT;

CREATE UNIQUE INDEX "Order_userId_checkoutIdempotencyKey_key"
  ON "Order"("userId", "checkoutIdempotencyKey");

CREATE INDEX "Order_checkoutIdempotencyKey_idx"
  ON "Order"("checkoutIdempotencyKey");
