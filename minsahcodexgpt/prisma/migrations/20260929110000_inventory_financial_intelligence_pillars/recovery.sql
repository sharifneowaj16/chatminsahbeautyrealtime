-- Recovery: Rollback Inventory & Financial Intelligence Pillars

-- 1. Drop foreign keys
ALTER TABLE IF EXISTS "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_productId_fkey";

-- 2. Drop tables
DROP TABLE IF EXISTS "StockMovement";
DROP TABLE IF EXISTS "RunnerCashLedger";

-- 3. Drop enum
DROP TYPE IF EXISTS "StockMovementType";

-- 4. Rollback PurchaseShortlist columns
ALTER TABLE "PurchaseShortlist" 
DROP COLUMN IF EXISTS "actualBuyPrice",
DROP COLUMN IF EXISTS "actualSpent",
DROP COLUMN IF EXISTS "cashGiven",
DROP COLUMN IF EXISTS "cashReturned",
DROP COLUMN IF EXISTS "reconciledStatus",
DROP COLUMN IF EXISTS "runnerId",
DROP COLUMN IF EXISTS "runnerName",
DROP COLUMN IF EXISTS "reconciledAt",
DROP COLUMN IF EXISTS "reconciledByAdminId";

-- 5. Rollback Product columns and indexes
DROP INDEX IF EXISTS "Product_quantity_idx";
DROP INDEX IF EXISTS "Product_quantity_lowStockThreshold_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "lastCostPrice";
