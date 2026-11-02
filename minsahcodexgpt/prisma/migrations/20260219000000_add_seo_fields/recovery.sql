-- Recovery / Rollback for: 20260219000000_add_seo_fields
BEGIN;

ALTER TABLE "ProductImage"
    DROP COLUMN IF EXISTS "title";

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "reviewCount",
    DROP COLUMN IF EXISTS "averageRating",
    DROP COLUMN IF EXISTS "gtin",
    DROP COLUMN IF EXISTS "condition",
    DROP COLUMN IF EXISTS "canonicalUrl",
    DROP COLUMN IF EXISTS "ogImageUrl",
    DROP COLUMN IF EXISTS "ogTitle",
    DROP COLUMN IF EXISTS "focusKeyword",
    DROP COLUMN IF EXISTS "bengaliDescription",
    DROP COLUMN IF EXISTS "bengaliName";

COMMIT;
