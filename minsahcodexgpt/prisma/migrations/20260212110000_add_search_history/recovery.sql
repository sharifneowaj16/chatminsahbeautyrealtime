-- Recovery / Rollback for: 20260212110000_add_search_history
BEGIN;

DROP INDEX IF EXISTS "SearchHistory_deviceId_idx";

DROP INDEX IF EXISTS "SearchHistory_userId_idx";

DROP INDEX IF EXISTS "SearchHistory_deviceId_key";

DROP INDEX IF EXISTS "SearchHistory_userId_key";

DROP TABLE IF EXISTS "SearchHistory" CASCADE;

COMMIT;
