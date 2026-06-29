-- Minsah Beauty tracking schema migration
-- PostgreSQL / Prisma
-- Safe additive migration: nullable fields/defaults only.

-- ==========================================
-- Product tracking counters
-- ==========================================

ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "uniqueViewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "addToCartCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "checkoutStartCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "orderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "confirmedOrderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "deliveredOrderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "cancelledOrderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "returnedOrderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "analyticsRevenue" DECIMAL(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Product_viewCount_idx" ON "Product" ("viewCount");
CREATE INDEX IF NOT EXISTS "Product_addToCartCount_idx" ON "Product" ("addToCartCount");
CREATE INDEX IF NOT EXISTS "Product_orderCount_idx" ON "Product" ("orderCount");
CREATE INDEX IF NOT EXISTS "Product_deliveredOrderCount_idx" ON "Product" ("deliveredOrderCount");

-- ==========================================
-- Daily product analytics metrics
-- ==========================================

CREATE TABLE IF NOT EXISTS "ProductDailyMetric" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "metricDate" TIMESTAMP(3) NOT NULL,

  "views" INTEGER NOT NULL DEFAULT 0,
  "uniqueViews" INTEGER NOT NULL DEFAULT 0,
  "addToCarts" INTEGER NOT NULL DEFAULT 0,
  "checkoutStarts" INTEGER NOT NULL DEFAULT 0,
  "orders" INTEGER NOT NULL DEFAULT 0,
  "confirmedOrders" INTEGER NOT NULL DEFAULT 0,
  "deliveredOrders" INTEGER NOT NULL DEFAULT 0,
  "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
  "returnedOrders" INTEGER NOT NULL DEFAULT 0,

  "revenue" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "deliveredRevenue" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "estimatedProfit" DECIMAL(12, 2),

  "addToCartRate" DECIMAL(7, 4),
  "checkoutRate" DECIMAL(7, 4),
  "purchaseRate" DECIMAL(7, 4),
  "confirmationRate" DECIMAL(7, 4),
  "deliveryRate" DECIMAL(7, 4),
  "returnRate" DECIMAL(7, 4),

  "grade" TEXT,
  "notes" TEXT,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductDailyMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductDailyMetric_productId_metricDate_key"
ON "ProductDailyMetric" ("productId", "metricDate");

CREATE INDEX IF NOT EXISTS "ProductDailyMetric_metricDate_idx" ON "ProductDailyMetric" ("metricDate");
CREATE INDEX IF NOT EXISTS "ProductDailyMetric_grade_idx" ON "ProductDailyMetric" ("grade");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductDailyMetric_productId_fkey'
  ) THEN
    ALTER TABLE "ProductDailyMetric"
    ADD CONSTRAINT "ProductDailyMetric_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ==========================================
-- Order tracking fields
-- ==========================================

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "fbp" TEXT,
ADD COLUMN IF NOT EXISTS "fbc" TEXT,
ADD COLUMN IF NOT EXISTS "externalId" TEXT,
ADD COLUMN IF NOT EXISTS "anonymousVisitorId" TEXT,
ADD COLUMN IF NOT EXISTS "customerIp" TEXT,
ADD COLUMN IF NOT EXISTS "customerUa" TEXT,

ADD COLUMN IF NOT EXISTS "gaClientId" TEXT,
ADD COLUMN IF NOT EXISTS "gaSessionId" TEXT,
ADD COLUMN IF NOT EXISTS "gaPurchaseSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "gaPurchaseSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "gaRefundSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "gaRefundSentAt" TIMESTAMP(3),

ADD COLUMN IF NOT EXISTS "metaPurchaseSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "metaPurchaseSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "metaEventId" TEXT,

ADD COLUMN IF NOT EXISTS "utmSource" TEXT,
ADD COLUMN IF NOT EXISTS "utmMedium" TEXT,
ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT,
ADD COLUMN IF NOT EXISTS "utmContent" TEXT,
ADD COLUMN IF NOT EXISTS "campaignId" TEXT,
ADD COLUMN IF NOT EXISTS "adsetId" TEXT,
ADD COLUMN IF NOT EXISTS "adId" TEXT,
ADD COLUMN IF NOT EXISTS "placement" TEXT,

ADD COLUMN IF NOT EXISTS "firstLandingPath" TEXT,
ADD COLUMN IF NOT EXISTS "firstLandingUrl" TEXT,
ADD COLUMN IF NOT EXISTS "referrer" TEXT,
ADD COLUMN IF NOT EXISTS "offerVersion" TEXT,
ADD COLUMN IF NOT EXISTS "abVariant" TEXT,

ADD COLUMN IF NOT EXISTS "phoneConfirmedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "paymentPaidAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "returnedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3),

ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false,

ADD COLUMN IF NOT EXISTS "courierName" TEXT,
ADD COLUMN IF NOT EXISTS "courierConsignmentId" TEXT,
ADD COLUMN IF NOT EXISTS "courierStatus" TEXT,
ADD COLUMN IF NOT EXISTS "courierDeliveredAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "courierReturnedAt" TIMESTAMP(3),

ADD COLUMN IF NOT EXISTS "confirmationStatus" TEXT,
ADD COLUMN IF NOT EXISTS "confirmationNote" TEXT,
ADD COLUMN IF NOT EXISTS "confirmedByAdminId" TEXT,

ADD COLUMN IF NOT EXISTS "trackingSchemaVersion" TEXT DEFAULT 'mb_tracking_v1';

CREATE INDEX IF NOT EXISTS "Order_fbp_idx" ON "Order" ("fbp");
CREATE INDEX IF NOT EXISTS "Order_fbc_idx" ON "Order" ("fbc");
CREATE INDEX IF NOT EXISTS "Order_externalId_idx" ON "Order" ("externalId");
CREATE INDEX IF NOT EXISTS "Order_anonymousVisitorId_idx" ON "Order" ("anonymousVisitorId");
CREATE INDEX IF NOT EXISTS "Order_gaClientId_idx" ON "Order" ("gaClientId");
CREATE INDEX IF NOT EXISTS "Order_metaPurchaseSent_idx" ON "Order" ("metaPurchaseSent");
CREATE INDEX IF NOT EXISTS "Order_metaEventId_idx" ON "Order" ("metaEventId");
CREATE INDEX IF NOT EXISTS "Order_utmSource_idx" ON "Order" ("utmSource");
CREATE INDEX IF NOT EXISTS "Order_campaignId_idx" ON "Order" ("campaignId");
CREATE INDEX IF NOT EXISTS "Order_adsetId_idx" ON "Order" ("adsetId");
CREATE INDEX IF NOT EXISTS "Order_adId_idx" ON "Order" ("adId");
CREATE INDEX IF NOT EXISTS "Order_phoneConfirmedAt_idx" ON "Order" ("phoneConfirmedAt");
CREATE INDEX IF NOT EXISTS "Order_paymentPaidAt_idx" ON "Order" ("paymentPaidAt");
CREATE INDEX IF NOT EXISTS "Order_returnedAt_idx" ON "Order" ("returnedAt");
CREATE INDEX IF NOT EXISTS "Order_refundedAt_idx" ON "Order" ("refundedAt");
CREATE INDEX IF NOT EXISTS "Order_isTest_idx" ON "Order" ("isTest");
CREATE INDEX IF NOT EXISTS "Order_courierConsignmentId_idx" ON "Order" ("courierConsignmentId");
CREATE INDEX IF NOT EXISTS "Order_confirmationStatus_idx" ON "Order" ("confirmationStatus");

-- ==========================================
-- Existing Payment model extension
-- ==========================================

ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'BDT',
ADD COLUMN IF NOT EXISTS "gateway" TEXT,
ADD COLUMN IF NOT EXISTS "gatewayTransactionId" TEXT,
ADD COLUMN IF NOT EXISTS "rawStatus" TEXT,
ADD COLUMN IF NOT EXISTS "rawPayload" JSONB,
ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "amountMatched" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "currencyMatched" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_gatewayTransactionId_key"
ON "Payment" ("gatewayTransactionId");

CREATE INDEX IF NOT EXISTS "Payment_method_idx" ON "Payment" ("method");
CREATE INDEX IF NOT EXISTS "Payment_gateway_idx" ON "Payment" ("gateway");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment" ("status");
CREATE INDEX IF NOT EXISTS "Payment_verifiedAt_idx" ON "Payment" ("verifiedAt");

-- ==========================================
-- Meta CAPI failure log
-- ==========================================

CREATE TABLE IF NOT EXISTS "MetaCapiFailure" (
  "id" TEXT NOT NULL,
  "orderId" TEXT,

  "eventName" TEXT NOT NULL,
  "eventId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'META',
  "schemaVersion" TEXT DEFAULT 'mb_tracking_v1',

  "statusCode" INTEGER,
  "errorCode" TEXT,
  "errorSubcode" TEXT,
  "errorMessage" TEXT,

  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "finalFailed" BOOLEAN NOT NULL DEFAULT false,

  "hasFbp" BOOLEAN NOT NULL DEFAULT false,
  "hasFbc" BOOLEAN NOT NULL DEFAULT false,
  "hasExternalId" BOOLEAN NOT NULL DEFAULT false,
  "hasEmailHash" BOOLEAN NOT NULL DEFAULT false,
  "hasPhoneHash" BOOLEAN NOT NULL DEFAULT false,
  "hasIp" BOOLEAN NOT NULL DEFAULT false,
  "hasUa" BOOLEAN NOT NULL DEFAULT false,

  "safePayload" JSONB,
  "responsePayload" JSONB,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MetaCapiFailure_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MetaCapiFailure_orderId_idx" ON "MetaCapiFailure" ("orderId");
CREATE INDEX IF NOT EXISTS "MetaCapiFailure_eventName_idx" ON "MetaCapiFailure" ("eventName");
CREATE INDEX IF NOT EXISTS "MetaCapiFailure_eventId_idx" ON "MetaCapiFailure" ("eventId");
CREATE INDEX IF NOT EXISTS "MetaCapiFailure_provider_idx" ON "MetaCapiFailure" ("provider");
CREATE INDEX IF NOT EXISTS "MetaCapiFailure_statusCode_idx" ON "MetaCapiFailure" ("statusCode");
CREATE INDEX IF NOT EXISTS "MetaCapiFailure_errorCode_idx" ON "MetaCapiFailure" ("errorCode");
CREATE INDEX IF NOT EXISTS "MetaCapiFailure_finalFailed_idx" ON "MetaCapiFailure" ("finalFailed");
CREATE INDEX IF NOT EXISTS "MetaCapiFailure_createdAt_idx" ON "MetaCapiFailure" ("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MetaCapiFailure_orderId_fkey'
  ) THEN
    ALTER TABLE "MetaCapiFailure"
    ADD CONSTRAINT "MetaCapiFailure_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ==========================================
-- Daily tracking health check
-- ==========================================

CREATE TABLE IF NOT EXISTS "TrackingHealthCheck" (
  "id" TEXT NOT NULL,
  "checkDate" TIMESTAMP(3) NOT NULL,

  "ordersCreated" INTEGER NOT NULL DEFAULT 0,
  "ordersConfirmed" INTEGER NOT NULL DEFAULT 0,
  "metaPurchaseSent" INTEGER NOT NULL DEFAULT 0,
  "gaPurchaseSent" INTEGER NOT NULL DEFAULT 0,
  "capiFailureCount" INTEGER NOT NULL DEFAULT 0,

  "status" TEXT NOT NULL DEFAULT 'OK',
  "notes" TEXT,
  "details" JSONB,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TrackingHealthCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrackingHealthCheck_checkDate_key"
ON "TrackingHealthCheck" ("checkDate");

CREATE INDEX IF NOT EXISTS "TrackingHealthCheck_status_idx" ON "TrackingHealthCheck" ("status");
CREATE INDEX IF NOT EXISTS "TrackingHealthCheck_createdAt_idx" ON "TrackingHealthCheck" ("createdAt");
