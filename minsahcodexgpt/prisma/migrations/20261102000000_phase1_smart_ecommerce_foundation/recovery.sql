-- Phase 1 Recovery / Rollback DDL: Revert Phase 1 Smart E-Commerce foundation
-- Recovery for: 20261102000000_phase1_smart_ecommerce_foundation

-- Drop tables
DROP TABLE IF EXISTS "PaymentRefund" CASCADE;
DROP TABLE IF EXISTS "CampaignRedemptionLedger" CASCADE;
DROP TABLE IF EXISTS "CampaignCustomerUsage" CASCADE;

-- Drop Enums
DROP TYPE IF EXISTS "PaymentRefundStatus" CASCADE;
DROP TYPE IF EXISTS "CampaignRedemptionStatus" CASCADE;

-- Revert OrderItem columns
ALTER TABLE "OrderItem"
DROP COLUMN IF EXISTS "bundleInstanceId",
DROP COLUMN IF EXISTS "bundleGroupId",
DROP COLUMN IF EXISTS "campaignRef",
DROP COLUMN IF EXISTS "pricingSource",
DROP COLUMN IF EXISTS "discountAmount",
DROP COLUMN IF EXISTS "originalPrice";

-- Revert Order columns
DROP INDEX IF EXISTS "Order_pathaoBookingStatus_idx";

ALTER TABLE "Order"
DROP COLUMN IF EXISTS "pathaoBookingLockedBy",
DROP COLUMN IF EXISTS "pathaoBookingLockedAt",
DROP COLUMN IF EXISTS "pathaoBookingAttemptId",
DROP COLUMN IF EXISTS "pathaoBookingStatus",
DROP COLUMN IF EXISTS "codCalculatedAt",
DROP COLUMN IF EXISTS "codPolicyApplied",
DROP COLUMN IF EXISTS "pathaoAmountToCollect",
DROP COLUMN IF EXISTS "codCollectionAmount",
DROP COLUMN IF EXISTS "advancePaidAmount";

-- Revert CartItem columns
DROP INDEX IF EXISTS "CartItem_userId_lineKey_idx";

ALTER TABLE "CartItem"
DROP COLUMN IF EXISTS "bundleInstanceId",
DROP COLUMN IF EXISTS "bundleGroupId",
DROP COLUMN IF EXISTS "bundleId",
DROP COLUMN IF EXISTS "campaignRef",
DROP COLUMN IF EXISTS "pricingSource",
DROP COLUMN IF EXISTS "lineKey";
