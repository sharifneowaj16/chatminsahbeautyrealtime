-- Recovery / Rollback for: 20260213000000_add_returns
BEGIN;

DROP INDEX IF EXISTS "ReturnItem_returnId_idx";

DROP INDEX IF EXISTS "Return_status_idx";

DROP INDEX IF EXISTS "Return_userId_idx";

DROP INDEX IF EXISTS "Return_orderId_idx";

DROP INDEX IF EXISTS "Return_returnNumber_key";

DROP TABLE IF EXISTS "ReturnItem" CASCADE;

DROP TABLE IF EXISTS "Return" CASCADE;

DROP TYPE IF EXISTS "ReturnStatus" CASCADE;

COMMIT;
