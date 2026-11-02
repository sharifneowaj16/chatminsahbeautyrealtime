-- Recovery / Rollback for: 20260505120000_add_product_deleted_at
BEGIN;

DROP INDEX IF EXISTS "Product_deletedAt_idx";

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "deletedAt";

COMMIT;
