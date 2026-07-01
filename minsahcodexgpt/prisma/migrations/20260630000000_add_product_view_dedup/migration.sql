-- Phase 5: durable product-view dedup fallback.
-- Redis is used as the primary 30-minute dedup layer when available.
-- This table is the production fallback so counters still remain safe if Redis is unavailable.

CREATE TABLE IF NOT EXISTS "ProductViewDedup" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "visitorKeyHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductViewDedup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductViewDedup_productId_visitorKeyHash_key"
ON "ProductViewDedup" ("productId", "visitorKeyHash");

CREATE INDEX IF NOT EXISTS "ProductViewDedup_expiresAt_idx"
ON "ProductViewDedup" ("expiresAt");

CREATE INDEX IF NOT EXISTS "ProductViewDedup_productId_idx"
ON "ProductViewDedup" ("productId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductViewDedup_productId_fkey'
  ) THEN
    ALTER TABLE "ProductViewDedup"
    ADD CONSTRAINT "ProductViewDedup_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
