-- Recovery / Rollback for: 20260610000000_allow_null_productId_for_custom_products
ALTER TABLE "PurchaseShortlist" DROP CONSTRAINT IF EXISTS "PurchaseShortlist_productId_fkey";
ALTER TABLE "PurchaseShortlist" ALTER COLUMN "productId" SET NOT NULL;
DO $$ BEGIN
    ALTER TABLE "PurchaseShortlist" ADD CONSTRAINT "PurchaseShortlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
