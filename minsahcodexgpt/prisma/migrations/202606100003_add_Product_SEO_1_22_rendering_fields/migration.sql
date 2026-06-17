-- Migration: add Product SEO 1-22 rendering fields
-- Safe to run on PostgreSQL. Uses IF NOT EXISTS so it will not fail if a field was already added.

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "pageH1" TEXT,
  ADD COLUMN IF NOT EXISTS "seoIntro" TEXT,
  ADD COLUMN IF NOT EXISTS "faqSchemaNote" TEXT,
  ADD COLUMN IF NOT EXISTS "authenticityNote" TEXT,
  ADD COLUMN IF NOT EXISTS "ingredientVerificationStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "seoValidationChecklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "structuredDataJsonLd" JSONB,
  ADD COLUMN IF NOT EXISTS "productGroupJsonLd" JSONB,
  ADD COLUMN IF NOT EXISTS "merchantListingJsonLd" JSONB,
  ADD COLUMN IF NOT EXISTS "breadcrumbJsonLd" JSONB,
  ADD COLUMN IF NOT EXISTS "sitemapIndexing" JSONB,
  ADD COLUMN IF NOT EXISTS "variantUrlStrategy" JSONB,
  ADD COLUMN IF NOT EXISTS "variantPriceTable" JSONB,
  ADD COLUMN IF NOT EXISTS "variantComparisonTable" JSONB,
  ADD COLUMN IF NOT EXISTS "internalLinks" JSONB;

CREATE INDEX IF NOT EXISTS "Product_isActive_deletedAt_idx" ON "Product"("isActive", "deletedAt");
CREATE INDEX IF NOT EXISTS "Product_canonicalUrl_idx" ON "Product"("canonicalUrl");
