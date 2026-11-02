-- Phase 10 Contract DDL: Finalize CartItem Canonical lineKey & Remove Legacy Constraint
-- Migration: 20261102010000_phase10_smart_ecommerce_contract

-- Step 4 Backfill: Ensure zero null lineKey records exist before enforcing NOT NULL
UPDATE "CartItem"
SET "pricingSource" = 'LEGACY_UNATTRIBUTED',
    "lineKey" = '["LEGACY_UNATTRIBUTED",null,null,null,null,"' || "productId" || '",' || CASE WHEN "variantId" IS NOT NULL THEN '"' || "variantId" || '"' ELSE 'null' END || ',"' || "id" || '"]'
WHERE "lineKey" IS NULL;

-- Step 9 Contract DDL:
-- Drop legacy (userId, productId, variantId) unique constraint to allow dual-line coexistence
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_userId_productId_variantId_key";

-- Enforce NOT NULL on canonical lineKey
ALTER TABLE "CartItem" ALTER COLUMN "lineKey" SET NOT NULL;

-- Create canonical unique index on (userId, lineKey)
CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_userId_lineKey_key" ON "CartItem"("userId", "lineKey");
