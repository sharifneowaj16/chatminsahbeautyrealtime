-- Recovery / Rollback for: 20260528000000_add_product_faqs
BEGIN;

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "faqs";

COMMIT;
