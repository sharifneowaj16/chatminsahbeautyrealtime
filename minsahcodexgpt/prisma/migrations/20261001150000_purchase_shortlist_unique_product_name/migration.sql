-- AlterTable: PurchaseShortlist unique constraint for custom products
DROP INDEX IF EXISTS "PurchaseShortlist_orderId_productId_key";
CREATE UNIQUE INDEX "PurchaseShortlist_orderId_productId_productName_key" ON "PurchaseShortlist"("orderId", "productId", "productName");
