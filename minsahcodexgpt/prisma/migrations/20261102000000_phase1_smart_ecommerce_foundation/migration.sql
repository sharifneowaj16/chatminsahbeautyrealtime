-- Phase 1 Expand DDL: Smart E-Commerce, Pricing, Cart, Campaign, Delivery & Payment Engine
-- Migration: 20261102000000_phase1_smart_ecommerce_foundation

-- Create Enums
DO $$ BEGIN
    CREATE TYPE "CampaignRedemptionStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'RELEASED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentRefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Expand CartItem table with non-breaking nullable/default columns
ALTER TABLE "CartItem"
ADD COLUMN IF NOT EXISTS "lineKey" TEXT,
ADD COLUMN IF NOT EXISTS "pricingSource" TEXT NOT NULL DEFAULT 'REGULAR',
ADD COLUMN IF NOT EXISTS "campaignRef" TEXT,
ADD COLUMN IF NOT EXISTS "bundleId" TEXT,
ADD COLUMN IF NOT EXISTS "bundleGroupId" TEXT,
ADD COLUMN IF NOT EXISTS "bundleInstanceId" TEXT;

CREATE INDEX IF NOT EXISTS "CartItem_userId_lineKey_idx" ON "CartItem"("userId", "lineKey");

-- Expand Order table with authoritative COD and booking mutex columns
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "advancePaidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "codCollectionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "pathaoAmountToCollect" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "codPolicyApplied" TEXT,
ADD COLUMN IF NOT EXISTS "codCalculatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "pathaoBookingStatus" TEXT NOT NULL DEFAULT 'READY',
ADD COLUMN IF NOT EXISTS "pathaoBookingAttemptId" TEXT,
ADD COLUMN IF NOT EXISTS "pathaoBookingLockedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "pathaoBookingLockedBy" TEXT;

CREATE INDEX IF NOT EXISTS "Order_pathaoBookingStatus_idx" ON "Order"("pathaoBookingStatus");

-- Expand OrderItem table with pricing source, campaign and bundle metadata
ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "originalPrice" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "pricingSource" TEXT NOT NULL DEFAULT 'REGULAR',
ADD COLUMN IF NOT EXISTS "campaignRef" TEXT,
ADD COLUMN IF NOT EXISTS "bundleGroupId" TEXT,
ADD COLUMN IF NOT EXISTS "bundleInstanceId" TEXT;

-- Create CampaignCustomerUsage table
CREATE TABLE IF NOT EXISTS "CampaignCustomerUsage" (
    "id" TEXT NOT NULL,
    "campaignRef" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confirmedQty" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignCustomerUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CampaignCustomerUsage_campaignRef_phone_key" ON "CampaignCustomerUsage"("campaignRef", "phone");
CREATE INDEX IF NOT EXISTS "CampaignCustomerUsage_campaignRef_userId_idx" ON "CampaignCustomerUsage"("campaignRef", "userId");

-- Create CampaignRedemptionLedger table
CREATE TABLE IF NOT EXISTS "CampaignRedemptionLedger" (
    "id" TEXT NOT NULL,
    "campaignRef" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "quantity" INTEGER NOT NULL,
    "status" "CampaignRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "CampaignRedemptionLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CampaignRedemptionLedger_campaignRef_phone_idx" ON "CampaignRedemptionLedger"("campaignRef", "phone");
CREATE INDEX IF NOT EXISTS "CampaignRedemptionLedger_orderId_idx" ON "CampaignRedemptionLedger"("orderId");
CREATE INDEX IF NOT EXISTS "CampaignRedemptionLedger_status_reservedUntil_idx" ON "CampaignRedemptionLedger"("status", "reservedUntil");

ALTER TABLE "CampaignRedemptionLedger"
ADD CONSTRAINT "CampaignRedemptionLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignRedemptionLedger"
ADD CONSTRAINT "CampaignRedemptionLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create PaymentRefund table (Internal Admin-Managed Refund Ledger)
CREATE TABLE IF NOT EXISTS "PaymentRefund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "refundNumber" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "refundMethod" TEXT NOT NULL,
    "recipientAccount" TEXT NOT NULL,
    "transactionRef" TEXT,
    "paymentProofUrl" TEXT,
    "processedByAdminId" TEXT NOT NULL,
    "adminEmail" TEXT,
    "notes" TEXT,
    "status" "PaymentRefundStatus" NOT NULL DEFAULT 'PENDING',
    "returnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRefund_refundNumber_key" ON "PaymentRefund"("refundNumber");
CREATE INDEX IF NOT EXISTS "PaymentRefund_paymentId_idx" ON "PaymentRefund"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentRefund_orderId_idx" ON "PaymentRefund"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentRefund_status_idx" ON "PaymentRefund"("status");
CREATE INDEX IF NOT EXISTS "PaymentRefund_processedByAdminId_idx" ON "PaymentRefund"("processedByAdminId");

ALTER TABLE "PaymentRefund"
ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentRefund"
ADD CONSTRAINT "PaymentRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentRefund"
ADD CONSTRAINT "PaymentRefund_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE SET NULL ON UPDATE CASCADE;
