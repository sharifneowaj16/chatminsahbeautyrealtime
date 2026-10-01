-- Recovery Script: 20260930110000_operational_safety_enhancements
-- Idempotent rollback script

-- 1. Drop Product clearance indexes and columns
DROP INDEX IF EXISTS "Product_isClearanceSale_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "clearanceDiscountPercent";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "isClearanceSale";

-- 2. Drop RunnerCashLedger carryover columns
ALTER TABLE "RunnerCashLedger" DROP COLUMN IF EXISTS "effectiveBudget";
ALTER TABLE "RunnerCashLedger" DROP COLUMN IF EXISTS "previousDue";

-- 3. Drop DailyCashRegister courier columns
ALTER TABLE "DailyCashRegister" DROP COLUMN IF EXISTS "courierSettledBank";
ALTER TABLE "DailyCashRegister" DROP COLUMN IF EXISTS "courierPendingReceivables";
