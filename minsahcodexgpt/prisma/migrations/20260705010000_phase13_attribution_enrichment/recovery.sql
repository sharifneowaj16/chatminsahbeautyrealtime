-- Recovery / Rollback for: 20260705010000_phase13_attribution_enrichment
BEGIN;

DROP INDEX IF EXISTS "Order_attributionCouponCode_idx";

DROP INDEX IF EXISTS "Order_abVariant_idx";

DROP INDEX IF EXISTS "Order_offerVersion_idx";

DROP INDEX IF EXISTS "Order_utmTerm_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "campaignSourceUrl",
    DROP COLUMN IF EXISTS "freeDeliveryThreshold",
    DROP COLUMN IF EXISTS "attributionCouponCode",
    DROP COLUMN IF EXISTS "landingOffer",
    DROP COLUMN IF EXISTS "utmTerm";

COMMIT;
