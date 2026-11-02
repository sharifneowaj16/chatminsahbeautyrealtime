-- Recovery / Rollback for: 202606100003_add_Product_SEO_1_22_rendering_fields
BEGIN;

DROP INDEX IF EXISTS "Product_canonicalUrl_idx";

DROP INDEX IF EXISTS "Product_isActive_deletedAt_idx";

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "internalLinks",
    DROP COLUMN IF EXISTS "variantComparisonTable",
    DROP COLUMN IF EXISTS "variantPriceTable",
    DROP COLUMN IF EXISTS "variantUrlStrategy",
    DROP COLUMN IF EXISTS "sitemapIndexing",
    DROP COLUMN IF EXISTS "breadcrumbJsonLd",
    DROP COLUMN IF EXISTS "merchantListingJsonLd",
    DROP COLUMN IF EXISTS "productGroupJsonLd",
    DROP COLUMN IF EXISTS "structuredDataJsonLd",
    DROP COLUMN IF EXISTS "seoValidationChecklist",
    DROP COLUMN IF EXISTS "ingredientVerificationStatus",
    DROP COLUMN IF EXISTS "authenticityNote",
    DROP COLUMN IF EXISTS "faqSchemaNote",
    DROP COLUMN IF EXISTS "seoIntro",
    DROP COLUMN IF EXISTS "pageH1";

COMMIT;
