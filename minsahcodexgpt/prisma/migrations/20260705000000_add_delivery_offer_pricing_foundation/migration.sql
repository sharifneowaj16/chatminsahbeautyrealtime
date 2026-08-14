-- Delivery pricing foundation
-- Keeps customer-facing shippingCost separate from internal courier actual cost.

CREATE TYPE "DeliveryOfferType" AS ENUM ('DEFAULT', 'FREE', 'FIXED');
CREATE TYPE "DeliveryPricingSource" AS ENUM ('DEFAULT', 'PATHAO', 'STEADFAST', 'PRODUCT_OFFER', 'MANUAL', 'FALLBACK');

ALTER TABLE "Product"
  ADD COLUMN "deliveryOfferEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deliveryOfferType" "DeliveryOfferType" NOT NULL DEFAULT 'DEFAULT',
  ADD COLUMN "deliveryOfferAmount" DECIMAL(10,2),
  ADD COLUMN "deliveryOfferStartDate" TIMESTAMP(3),
  ADD COLUMN "deliveryOfferEndDate" TIMESTAMP(3),
  ADD COLUMN "deliveryOfferBadgeText" TEXT;

ALTER TABLE "Order"
  ADD COLUMN "courierDeliveryCharge" DECIMAL(10,2),
  ADD COLUMN "deliveryDiscountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryPricingSource" "DeliveryPricingSource" NOT NULL DEFAULT 'DEFAULT',
  ADD COLUMN "deliveryOfferType" "DeliveryOfferType" NOT NULL DEFAULT 'DEFAULT',
  ADD COLUMN "deliveryOfferProductId" TEXT,
  ADD COLUMN "deliveryOfferBadgeText" TEXT;

CREATE INDEX "Product_deliveryOfferEnabled_idx" ON "Product"("deliveryOfferEnabled");
CREATE INDEX "Product_deliveryOfferType_idx" ON "Product"("deliveryOfferType");
CREATE INDEX "Order_deliveryPricingSource_idx" ON "Order"("deliveryPricingSource");
CREATE INDEX "Order_deliveryOfferProductId_idx" ON "Order"("deliveryOfferProductId");
