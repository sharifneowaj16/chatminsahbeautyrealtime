-- Recovery / Rollback for: 20260705000000_add_delivery_offer_pricing_foundation
BEGIN;

DROP INDEX IF EXISTS "Order_deliveryOfferProductId_idx";

DROP INDEX IF EXISTS "Order_deliveryPricingSource_idx";

DROP INDEX IF EXISTS "Product_deliveryOfferType_idx";

DROP INDEX IF EXISTS "Product_deliveryOfferEnabled_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "deliveryOfferBadgeText",
    DROP COLUMN IF EXISTS "deliveryOfferProductId",
    DROP COLUMN IF EXISTS "deliveryOfferType",
    DROP COLUMN IF EXISTS "deliveryPricingSource",
    DROP COLUMN IF EXISTS "deliveryDiscountAmount",
    DROP COLUMN IF EXISTS "courierDeliveryCharge";

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "deliveryOfferBadgeText",
    DROP COLUMN IF EXISTS "deliveryOfferEndDate",
    DROP COLUMN IF EXISTS "deliveryOfferStartDate",
    DROP COLUMN IF EXISTS "deliveryOfferAmount",
    DROP COLUMN IF EXISTS "deliveryOfferType",
    DROP COLUMN IF EXISTS "deliveryOfferEnabled";

DROP TYPE IF EXISTS "DeliveryPricingSource" CASCADE;

DROP TYPE IF EXISTS "DeliveryOfferType" CASCADE;

COMMIT;
