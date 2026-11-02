-- Phase 10 Rollback & Recovery Script
-- Recovery: 20261102010000_phase10_smart_ecommerce_contract

DROP INDEX IF EXISTS "CartItem_userId_lineKey_key";

ALTER TABLE "CartItem" ALTER COLUMN "lineKey" DROP NOT NULL;

DO $$ BEGIN
    ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_productId_variantId_key" UNIQUE ("userId", "productId", "variantId");
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN null;
END $$;
