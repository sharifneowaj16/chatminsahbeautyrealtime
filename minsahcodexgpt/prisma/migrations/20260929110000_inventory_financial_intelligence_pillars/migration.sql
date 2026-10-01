-- Migration: Inventory & Financial Intelligence Pillars
-- Supports: Actual Buy Price, Low Stock Alert, Sales Daily Report, Runner Cash Ledger, Order-to-Stock Reconciliation

-- 1. CreateEnum StockMovementType (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockMovementType') THEN
        CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'ORDER_FULFILLMENT', 'RETURN_RESTOCK', 'MANUAL_ADJUSTMENT');
    END IF;
END $$;

-- 2. AlterTable Product
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS "lastCostPrice" DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS "Product_quantity_idx" ON "Product"("quantity");
CREATE INDEX IF NOT EXISTS "Product_quantity_lowStockThreshold_idx" ON "Product"("quantity", "lowStockThreshold");

-- 3. AlterTable PurchaseShortlist
ALTER TABLE "PurchaseShortlist" 
ADD COLUMN IF NOT EXISTS "actualBuyPrice" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "actualSpent" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "cashGiven" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "cashReturned" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "reconciledStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "runnerId" TEXT,
ADD COLUMN IF NOT EXISTS "runnerName" TEXT,
ADD COLUMN IF NOT EXISTS "reconciledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "reconciledByAdminId" TEXT;

CREATE INDEX IF NOT EXISTS "PurchaseShortlist_reconciledStatus_idx" ON "PurchaseShortlist"("reconciledStatus");
CREATE INDEX IF NOT EXISTS "PurchaseShortlist_runnerId_idx" ON "PurchaseShortlist"("runnerId");

-- 4. CreateTable StockMovement
CREATE TABLE IF NOT EXISTS "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "referenceId" TEXT,
    "costPriceAtTime" DECIMAL(10, 2),
    "notes" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX IF NOT EXISTS "StockMovement_type_idx" ON "StockMovement"("type");
CREATE INDEX IF NOT EXISTS "StockMovement_referenceId_idx" ON "StockMovement"("referenceId");
CREATE INDEX IF NOT EXISTS "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'StockMovement_productId_fkey'
    ) THEN
        ALTER TABLE "StockMovement" 
        ADD CONSTRAINT "StockMovement_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. CreateTable RunnerCashLedger
CREATE TABLE IF NOT EXISTS "RunnerCashLedger" (
    "id" TEXT NOT NULL,
    "shortlistId" TEXT,
    "runnerId" TEXT,
    "runnerName" TEXT NOT NULL,
    "cashGiven" DECIMAL(10, 2) NOT NULL,
    "actualSpent" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "cashReturned" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "discrepancy" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "slipPhotoUrl" TEXT,
    "adminSignoffBy" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunnerCashLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RunnerCashLedger_shortlistId_idx" ON "RunnerCashLedger"("shortlistId");
CREATE INDEX IF NOT EXISTS "RunnerCashLedger_runnerId_idx" ON "RunnerCashLedger"("runnerId");
CREATE INDEX IF NOT EXISTS "RunnerCashLedger_status_idx" ON "RunnerCashLedger"("status");
CREATE INDEX IF NOT EXISTS "RunnerCashLedger_createdAt_idx" ON "RunnerCashLedger"("createdAt");
