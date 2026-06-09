-- Allow nullable productId in PurchaseShortlist for custom products
-- This enables custom products (without DB product entries) to be tracked in purchase shortlist

-- Step 1: Drop existing foreign key constraint
ALTER TABLE "PurchaseShortlist"
DROP CONSTRAINT IF EXISTS "PurchaseShortlist_productId_fkey";

-- Step 2: Make productId nullable
ALTER TABLE "PurchaseShortlist"
ALTER COLUMN "productId" DROP NOT NULL;

-- Step 3: Recreate foreign key as nullable (SET NULL on delete)
ALTER TABLE "PurchaseShortlist"
ADD CONSTRAINT "PurchaseShortlist_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 4: Ensure the unique constraint allows NULL productIds
-- PostgreSQL naturally allows multiple NULLs in UNIQUE constraints
-- So the existing @@unique([orderId, productId]) will work correctly

COMMENT ON TABLE "PurchaseShortlist" IS 'Tracks products in custom purchase orders. productId can be NULL for custom products.';
COMMENT ON COLUMN "PurchaseShortlist"."productId" IS 'FK to Product. NULL for custom/ad-hoc products not in catalog.';
