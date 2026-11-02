-- Recovery / Rollback for: 20260530000000_add_secondary_seo_fields
BEGIN;

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "ogDescription",
    DROP COLUMN IF EXISTS "bengaliFocusKeyword",
    DROP COLUMN IF EXISTS "secondaryKeywords";

COMMIT;
