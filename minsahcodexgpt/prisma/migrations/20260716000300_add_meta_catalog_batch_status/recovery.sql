-- Recovery / Rollback for: 20260716000300_add_meta_catalog_batch_status
BEGIN;

DROP INDEX IF EXISTS "MetaCatalogBatch_submittedAt_idx";

DROP INDEX IF EXISTS "MetaCatalogBatch_status_idx";

DROP INDEX IF EXISTS "MetaCatalogBatch_catalogId_idx";

DROP INDEX IF EXISTS "MetaCatalogBatch_handle_key";

DROP TABLE IF EXISTS "MetaCatalogBatch" CASCADE;

COMMIT;
