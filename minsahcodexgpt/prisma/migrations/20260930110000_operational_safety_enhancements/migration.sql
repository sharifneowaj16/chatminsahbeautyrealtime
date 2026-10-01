-- Migration: 20260930110000_operational_safety_enhancements
-- Safe, idempotent migration for 7 Operational Safety & Friction-Free Workflow Enhancements

-- 1. Extend StockMovementType enum
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'VENDOR_DEFECT_CLAIM';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'VENDOR_DEFECT_EXCHANGED';

-- 2. Extend Product model with clearance sale flags
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isClearanceSale" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "clearanceDiscountPercent" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Product_isClearanceSale_idx" ON "Product"("isClearanceSale");

-- 3. Extend RunnerCashLedger model with debt carry-over and effective budget
ALTER TABLE "RunnerCashLedger" ADD COLUMN IF NOT EXISTS "previousDue" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "RunnerCashLedger" ADD COLUMN IF NOT EXISTS "effectiveBudget" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 4. Extend DailyCashRegister model with courier pending receivables and settled bank
ALTER TABLE "DailyCashRegister" ADD COLUMN IF NOT EXISTS "courierPendingReceivables" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "DailyCashRegister" ADD COLUMN IF NOT EXISTS "courierSettledBank" DECIMAL(10,2) NOT NULL DEFAULT 0;
