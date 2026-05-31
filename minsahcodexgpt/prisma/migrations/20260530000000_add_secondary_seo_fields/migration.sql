-- Add secondary SEO fields to Product table
-- secondaryKeywords : array of long-tail keyword strings
-- bengaliFocusKeyword: Bengali script focus keyword
-- ogDescription     : Open Graph description (Facebook / WhatsApp share)

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "secondaryKeywords"   TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "bengaliFocusKeyword" TEXT,
  ADD COLUMN IF NOT EXISTS "ogDescription"       TEXT;
