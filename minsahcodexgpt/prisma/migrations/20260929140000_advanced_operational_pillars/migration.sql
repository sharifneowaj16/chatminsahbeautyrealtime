-- Migration: 11 Advanced Operational & Loss Prevention Pillars
-- Supports: Damaged loss, Item-level return/exchange, Fraud risk scoring, Daily Cash Register

-- 1. Extend StockMovementType enum
DO $$
BEGIN
    ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'DAMAGED_LOSS';
    ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'EXPIRED_DISCARD';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. AlterTable Order
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "fraudRiskScore" INTEGER,
ADD COLUMN IF NOT EXISTS "fraudRiskLevel" TEXT,
ADD COLUMN IF NOT EXISTS "fraudRiskDetails" JSONB;

CREATE INDEX IF NOT EXISTS "Order_fraudRiskLevel_idx" ON "Order"("fraudRiskLevel");

-- 3. AlterTable OrderItem
ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "itemStatus" TEXT NOT NULL DEFAULT 'FULFILLED',
ADD COLUMN IF NOT EXISTS "returnReason" TEXT;

CREATE INDEX IF NOT EXISTS "OrderItem_itemStatus_idx" ON "OrderItem"("itemStatus");

-- 4. CreateTable DailyCashRegister
CREATE TABLE IF NOT EXISTS "DailyCashRegister" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "openingCash" DECIMAL(10, 2) NOT NULL,
    "codCollected" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "runnerExpenses" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "officeExpenses" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "expectedCash" DECIMAL(10, 2) NOT NULL,
    "actualCashCounted" DECIMAL(10, 2) NOT NULL,
    "discrepancy" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closedByAdminId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCashRegister_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyCashRegister_date_key" ON "DailyCashRegister"("date");
CREATE INDEX IF NOT EXISTS "DailyCashRegister_date_idx" ON "DailyCashRegister"("date");
CREATE INDEX IF NOT EXISTS "DailyCashRegister_status_idx" ON "DailyCashRegister"("status");
