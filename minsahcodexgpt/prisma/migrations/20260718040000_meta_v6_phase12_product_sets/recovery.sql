-- Recovery / Rollback for: 20260718040000_meta_v6_phase12_product_sets
BEGIN;

DROP INDEX IF EXISTS "MetaProductSetMembership_sourceType_sourceId_idx";

DROP INDEX IF EXISTS "MetaProductSetMembership_retailerId_idx";

DROP INDEX IF EXISTS "MetaProductSetMembership_productSetId_retailerId_key";

DROP INDEX IF EXISTS "MetaProductSetPreview_consumedAt_idx";

DROP INDEX IF EXISTS "MetaProductSetPreview_productSetId_expiresAt_idx";

DROP INDEX IF EXISTS "MetaProductSetVersion_productSetId_createdAt_idx";

DROP INDEX IF EXISTS "MetaProductSetVersion_productSetId_version_key";

DROP INDEX IF EXISTS "MetaProductSet_autoSync_status_idx";

DROP INDEX IF EXISTS "MetaProductSet_syncStatus_updatedAt_idx";

DROP INDEX IF EXISTS "MetaProductSet_catalogId_status_idx";

DROP INDEX IF EXISTS "MetaProductSet_providerProductSetId_key";

DROP INDEX IF EXISTS "MetaProductSet_catalogId_slug_key";

DROP TABLE IF EXISTS "MetaProductSetMembership" CASCADE;

DROP TABLE IF EXISTS "MetaProductSetPreview" CASCADE;

DROP TABLE IF EXISTS "MetaProductSetVersion" CASCADE;

DROP TABLE IF EXISTS "MetaProductSet" CASCADE;

DROP TYPE IF EXISTS "MetaProductSetSyncStatus" CASCADE;

DROP TYPE IF EXISTS "MetaProductSetStatus" CASCADE;

COMMIT;
