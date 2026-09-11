-- CreateEnum (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LoyaltyTransactionType') THEN
        CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARNED', 'REDEEMED', 'CLAWBACK', 'EXPIRED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LoyaltyTransactionSource') THEN
        CREATE TYPE "LoyaltyTransactionSource" AS ENUM (
            'PURCHASE', 'REVIEW', 'REFERRAL', 'SIGNUP', 'BONUS', 
            'ADMIN', 'ORDER_CANCELLED', 'ORDER_REFUNDED', 'RETURN_REFUND'
        );
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "source" "LoyaltyTransactionSource" NOT NULL,
    "description" TEXT NOT NULL,
    "orderId" TEXT,
    "returnId" TEXT,
    "balanceAfter" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_userId_idx" ON "LoyaltyTransaction"("userId");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_orderId_idx" ON "LoyaltyTransaction"("orderId");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_returnId_idx" ON "LoyaltyTransaction"("returnId");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_createdAt_idx" ON "LoyaltyTransaction"("createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyTransaction_userId_fkey'
    ) THEN
        ALTER TABLE "LoyaltyTransaction" 
        ADD CONSTRAINT "LoyaltyTransaction_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CheckConstraint to ensure non-negative points at DB level
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_loyalty_points_non_negative'
    ) THEN
        ALTER TABLE "User" ADD CONSTRAINT "user_loyalty_points_non_negative" CHECK ("loyaltyPoints" >= 0);
    END IF;
END $$;
