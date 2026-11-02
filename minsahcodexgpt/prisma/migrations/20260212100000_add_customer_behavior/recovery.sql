-- Recovery / Rollback for: 20260212100000_add_customer_behavior
BEGIN;

DROP INDEX IF EXISTS "CustomerBehavior_deviceId_idx";

DROP INDEX IF EXISTS "CustomerBehavior_userId_idx";

DROP INDEX IF EXISTS "CustomerBehavior_deviceId_key";

DROP INDEX IF EXISTS "CustomerBehavior_userId_key";

DROP TABLE IF EXISTS "CustomerBehavior" CASCADE;

COMMIT;
