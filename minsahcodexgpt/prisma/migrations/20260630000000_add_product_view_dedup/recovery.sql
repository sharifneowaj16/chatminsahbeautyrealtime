-- Recovery / Rollback for: 20260630000000_add_product_view_dedup
BEGIN;

DROP INDEX IF EXISTS "ProductViewDedup_productId_idx";

DROP INDEX IF EXISTS "ProductViewDedup_expiresAt_idx";

DROP INDEX IF EXISTS "ProductViewDedup_productId_visitorKeyHash_key";

DROP TABLE IF EXISTS "ProductViewDedup" CASCADE;

COMMIT;
