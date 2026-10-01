-- Rollback: Revert PurchaseShortlist unique constraint to orderId, productId
DROP INDEX IF EXISTS "PurchaseShortlist_orderId_productId_productName_key";
CREATE UNIQUE INDEX "PurchaseShortlist_orderId_productId_key" ON "PurchaseShortlist"("orderId", "productId");
