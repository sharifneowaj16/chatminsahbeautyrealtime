-- Add product semantic SEO/content fields for TOVCH-style import data
-- Run through Prisma migration if possible; this SQL is for review/reference.

ALTER TABLE "Product"
  ALTER COLUMN "secondaryKeywords" SET DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "bengaliSecondaryKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "searchIntent" TEXT,
  ADD COLUMN "targetAudience" TEXT,
  ADD COLUMN "primaryConcern" TEXT,
  ADD COLUMN "keyBenefits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "buyingIntentKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "searchTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "synonyms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "banglaSearchTerms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "reviewKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "entities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "descriptionSections" JSONB,
  ADD COLUMN "productSpecs" JSONB,
  ADD COLUMN "productAttributes" JSONB,
  ADD COLUMN "shadeOptions" JSONB,
  ADD COLUMN "usageInstructions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "imageAltTexts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "faqSchemaReady" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "gender" TEXT;
