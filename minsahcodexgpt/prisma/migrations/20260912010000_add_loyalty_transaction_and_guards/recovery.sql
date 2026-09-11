-- Recovery: Rollback LoyaltyTransaction table, indexes, foreign keys, enums, and check constraints

-- Drop foreign key
ALTER TABLE IF EXISTS "LoyaltyTransaction" DROP CONSTRAINT IF EXISTS "LoyaltyTransaction_userId_fkey";

-- Drop table
DROP TABLE IF EXISTS "LoyaltyTransaction";

-- Drop enums
DROP TYPE IF EXISTS "LoyaltyTransactionType";
DROP TYPE IF EXISTS "LoyaltyTransactionSource";

-- Drop check constraint
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_loyalty_points_non_negative'
    ) THEN
        ALTER TABLE "User" DROP CONSTRAINT "user_loyalty_points_non_negative";
    END IF;
END $$;
