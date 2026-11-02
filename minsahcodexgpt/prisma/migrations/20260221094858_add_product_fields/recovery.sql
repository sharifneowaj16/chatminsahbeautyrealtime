-- Recovery / Rollback for: 20260221094858_add_product_fields
BEGIN;

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "subcategory",
    DROP COLUMN IF EXISTS "skinType",
    DROP COLUMN IF EXISTS "shippingWeight",
    DROP COLUMN IF EXISTS "shelfLife",
    DROP COLUMN IF EXISTS "salePrice",
    DROP COLUMN IF EXISTS "returnEligible",
    DROP COLUMN IF EXISTS "relatedProducts",
    DROP COLUMN IF EXISTS "preOrderOption",
    DROP COLUMN IF EXISTS "originCountry",
    DROP COLUMN IF EXISTS "offerStartDate",
    DROP COLUMN IF EXISTS "offerEndDate",
    DROP COLUMN IF EXISTS "isFragile",
    DROP COLUMN IF EXISTS "ingredients",
    DROP COLUMN IF EXISTS "flashSaleEligible",
    DROP COLUMN IF EXISTS "expiryDate",
    DROP COLUMN IF EXISTS "discountPercentage",
    DROP COLUMN IF EXISTS "codAvailable",
    DROP COLUMN IF EXISTS "barcode";

COMMIT;
