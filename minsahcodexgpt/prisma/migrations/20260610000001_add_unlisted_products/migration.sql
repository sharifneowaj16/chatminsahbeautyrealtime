-- Add UnlistedProduct table to track custom products from orders
CREATE TABLE IF NOT EXISTS "UnlistedProduct" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "costPrice" DECIMAL(10,2),
  "description" TEXT,
  "image" TEXT,
  "usageCount" INTEGER NOT NULL DEFAULT 1,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UnlistedProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UnlistedProduct_sku_key" ON "UnlistedProduct"("sku");
CREATE INDEX IF NOT EXISTS "UnlistedProduct_name_idx" ON "UnlistedProduct"("name");
CREATE INDEX IF NOT EXISTS "UnlistedProduct_sku_idx" ON "UnlistedProduct"("sku");
CREATE INDEX IF NOT EXISTS "UnlistedProduct_lastUsedAt_idx" ON "UnlistedProduct"("lastUsedAt");
