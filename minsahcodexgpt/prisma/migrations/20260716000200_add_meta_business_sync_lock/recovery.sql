-- Recovery / Rollback for: 20260716000200_add_meta_business_sync_lock
BEGIN;

DROP INDEX IF EXISTS "MetaCatalogSyncItem_lastSubmittedAt_idx";

DROP INDEX IF EXISTS "MetaCatalogSyncItem_catalogId_idx";

DROP INDEX IF EXISTS "MetaCatalogSyncItem_catalogId_retailerId_key";

DROP INDEX IF EXISTS "MetaBusinessSyncLock_expiresAt_idx";

DROP TABLE IF EXISTS "MetaCatalogSyncItem" CASCADE;

DROP TABLE IF EXISTS "MetaBusinessSyncLock" CASCADE;

COMMIT;
