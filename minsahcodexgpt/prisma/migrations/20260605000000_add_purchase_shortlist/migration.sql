-- CreateTable: PurchaseShortlist (for tracking products to buy per order)
-- This tracks which products from which orders need to be purchased from suppliers
-- Each product in an order gets its own shortlist item with purchase tracking

CREATE TABLE IF NOT EXISTS "PurchaseShortlist" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "buyPrice" DECIMAL(10, 2) NOT NULL,
    "sellPrice" DECIMAL(10, 2) NOT NULL,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "purchasedAt" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseShortlist_pkey" PRIMARY KEY ("id")
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseShortlist_orderId_productId_key" ON "PurchaseShortlist"("orderId", "productId");
CREATE INDEX IF NOT EXISTS "PurchaseShortlist_orderId_idx" ON "PurchaseShortlist"("orderId");
CREATE INDEX IF NOT EXISTS "PurchaseShortlist_productId_idx" ON "PurchaseShortlist"("productId");
CREATE INDEX IF NOT EXISTS "PurchaseShortlist_purchased_idx" ON "PurchaseShortlist"("purchased");
CREATE INDEX IF NOT EXISTS "PurchaseShortlist_priority_idx" ON "PurchaseShortlist"("priority");
CREATE INDEX IF NOT EXISTS "PurchaseShortlist_adminId_idx" ON "PurchaseShortlist"("adminId");
CREATE INDEX IF NOT EXISTS "PurchaseShortlist_createdAt_idx" ON "PurchaseShortlist"("createdAt");

-- Foreign keys
ALTER TABLE "PurchaseShortlist"
ADD CONSTRAINT "PurchaseShortlist_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PurchaseShortlist"
ADD CONSTRAINT "PurchaseShortlist_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PurchaseShortlist"
ADD CONSTRAINT "PurchaseShortlist_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
