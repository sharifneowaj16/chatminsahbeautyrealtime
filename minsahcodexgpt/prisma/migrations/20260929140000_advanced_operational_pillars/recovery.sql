-- Recovery: Rollback 11 Advanced Operational Pillars

-- 1. Drop DailyCashRegister
DROP TABLE IF EXISTS "DailyCashRegister";

-- 2. Drop Order columns & index
DROP INDEX IF EXISTS "Order_fraudRiskLevel_idx";
ALTER TABLE "Order"
DROP COLUMN IF EXISTS "fraudRiskScore",
DROP COLUMN IF EXISTS "fraudRiskLevel",
DROP COLUMN IF EXISTS "fraudRiskDetails";

-- 3. Drop OrderItem columns & index
DROP INDEX IF EXISTS "OrderItem_itemStatus_idx";
ALTER TABLE "OrderItem"
DROP COLUMN IF EXISTS "itemStatus",
DROP COLUMN IF EXISTS "returnReason";
