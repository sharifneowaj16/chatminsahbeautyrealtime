-- Recovery / Rollback for: 20260610000001_add_unlisted_products
BEGIN;

DROP INDEX IF EXISTS "UnlistedProduct_lastUsedAt_idx";

DROP INDEX IF EXISTS "UnlistedProduct_sku_idx";

DROP INDEX IF EXISTS "UnlistedProduct_name_idx";

DROP INDEX IF EXISTS "UnlistedProduct_sku_key";

DROP TABLE IF EXISTS "UnlistedProduct" CASCADE;

COMMIT;
