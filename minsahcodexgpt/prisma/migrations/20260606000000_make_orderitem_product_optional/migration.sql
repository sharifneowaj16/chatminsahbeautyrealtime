-- Make OrderItem.productId nullable to support custom (non-DB) products
-- Previously: productId TEXT NOT NULL (FK → Product)
-- Now:        productId TEXT NULL        (FK → Product, nullable)

-- Step 1: Drop the existing FK constraint
ALTER TABLE "OrderItem"
  DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";

-- Step 2: Make the column nullable
ALTER TABLE "OrderItem"
  ALTER COLUMN "productId" DROP NOT NULL;

-- Step 3: Re-add the FK as nullable (ON DELETE RESTRICT only when non-null)
--         PostgreSQL allows FK on nullable columns — NULL simply skips the check
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
