-- Recovery / Rollback for: 20260628000000_add_tracking_fields
BEGIN;

DROP INDEX IF EXISTS "TrackingHealthCheck_createdAt_idx";

DROP INDEX IF EXISTS "TrackingHealthCheck_status_idx";

DROP INDEX IF EXISTS "TrackingHealthCheck_checkDate_key";

DROP INDEX IF EXISTS "MetaCapiFailure_createdAt_idx";

DROP INDEX IF EXISTS "MetaCapiFailure_finalFailed_idx";

DROP INDEX IF EXISTS "MetaCapiFailure_errorCode_idx";

DROP INDEX IF EXISTS "MetaCapiFailure_statusCode_idx";

DROP INDEX IF EXISTS "MetaCapiFailure_provider_idx";

DROP INDEX IF EXISTS "MetaCapiFailure_eventId_idx";

DROP INDEX IF EXISTS "MetaCapiFailure_eventName_idx";

DROP INDEX IF EXISTS "MetaCapiFailure_orderId_idx";

DROP INDEX IF EXISTS "Payment_verifiedAt_idx";

DROP INDEX IF EXISTS "Payment_status_idx";

DROP INDEX IF EXISTS "Payment_gateway_idx";

DROP INDEX IF EXISTS "Payment_method_idx";

DROP INDEX IF EXISTS "Payment_gatewayTransactionId_key";

DROP INDEX IF EXISTS "Order_confirmationStatus_idx";

DROP INDEX IF EXISTS "Order_courierConsignmentId_idx";

DROP INDEX IF EXISTS "Order_isTest_idx";

DROP INDEX IF EXISTS "Order_refundedAt_idx";

DROP INDEX IF EXISTS "Order_returnedAt_idx";

DROP INDEX IF EXISTS "Order_paymentPaidAt_idx";

DROP INDEX IF EXISTS "Order_phoneConfirmedAt_idx";

DROP INDEX IF EXISTS "Order_adId_idx";

DROP INDEX IF EXISTS "Order_adsetId_idx";

DROP INDEX IF EXISTS "Order_campaignId_idx";

DROP INDEX IF EXISTS "Order_utmSource_idx";

DROP INDEX IF EXISTS "Order_metaEventId_idx";

DROP INDEX IF EXISTS "Order_metaPurchaseSent_idx";

DROP INDEX IF EXISTS "Order_gaClientId_idx";

DROP INDEX IF EXISTS "Order_anonymousVisitorId_idx";

DROP INDEX IF EXISTS "Order_externalId_idx";

DROP INDEX IF EXISTS "Order_fbc_idx";

DROP INDEX IF EXISTS "Order_fbp_idx";

DROP INDEX IF EXISTS "ProductDailyMetric_grade_idx";

DROP INDEX IF EXISTS "ProductDailyMetric_metricDate_idx";

DROP INDEX IF EXISTS "ProductDailyMetric_productId_metricDate_key";

DROP INDEX IF EXISTS "Product_deliveredOrderCount_idx";

DROP INDEX IF EXISTS "Product_orderCount_idx";

DROP INDEX IF EXISTS "Product_addToCartCount_idx";

DROP INDEX IF EXISTS "Product_viewCount_idx";

ALTER TABLE "Payment"
    DROP COLUMN IF EXISTS "currencyMatched",
    DROP COLUMN IF EXISTS "amountMatched",
    DROP COLUMN IF EXISTS "signatureVerified",
    DROP COLUMN IF EXISTS "verifiedAt",
    DROP COLUMN IF EXISTS "rawPayload",
    DROP COLUMN IF EXISTS "rawStatus",
    DROP COLUMN IF EXISTS "gatewayTransactionId",
    DROP COLUMN IF EXISTS "gateway",
    DROP COLUMN IF EXISTS "currency";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "trackingSchemaVersion",
    DROP COLUMN IF EXISTS "confirmedByAdminId",
    DROP COLUMN IF EXISTS "confirmationNote",
    DROP COLUMN IF EXISTS "confirmationStatus",
    DROP COLUMN IF EXISTS "courierReturnedAt",
    DROP COLUMN IF EXISTS "courierDeliveredAt",
    DROP COLUMN IF EXISTS "courierStatus",
    DROP COLUMN IF EXISTS "courierConsignmentId",
    DROP COLUMN IF EXISTS "courierName",
    DROP COLUMN IF EXISTS "isTest",
    DROP COLUMN IF EXISTS "refundedAt",
    DROP COLUMN IF EXISTS "returnedAt",
    DROP COLUMN IF EXISTS "paymentPaidAt",
    DROP COLUMN IF EXISTS "phoneConfirmedAt",
    DROP COLUMN IF EXISTS "abVariant",
    DROP COLUMN IF EXISTS "offerVersion",
    DROP COLUMN IF EXISTS "referrer",
    DROP COLUMN IF EXISTS "firstLandingUrl",
    DROP COLUMN IF EXISTS "firstLandingPath",
    DROP COLUMN IF EXISTS "placement",
    DROP COLUMN IF EXISTS "adId",
    DROP COLUMN IF EXISTS "adsetId",
    DROP COLUMN IF EXISTS "campaignId",
    DROP COLUMN IF EXISTS "utmContent",
    DROP COLUMN IF EXISTS "utmCampaign",
    DROP COLUMN IF EXISTS "utmMedium",
    DROP COLUMN IF EXISTS "utmSource",
    DROP COLUMN IF EXISTS "metaEventId",
    DROP COLUMN IF EXISTS "metaPurchaseSentAt",
    DROP COLUMN IF EXISTS "metaPurchaseSent",
    DROP COLUMN IF EXISTS "gaRefundSentAt",
    DROP COLUMN IF EXISTS "gaRefundSent",
    DROP COLUMN IF EXISTS "gaPurchaseSentAt",
    DROP COLUMN IF EXISTS "gaPurchaseSent",
    DROP COLUMN IF EXISTS "gaSessionId",
    DROP COLUMN IF EXISTS "gaClientId",
    DROP COLUMN IF EXISTS "customerUa",
    DROP COLUMN IF EXISTS "customerIp",
    DROP COLUMN IF EXISTS "anonymousVisitorId",
    DROP COLUMN IF EXISTS "externalId",
    DROP COLUMN IF EXISTS "fbc",
    DROP COLUMN IF EXISTS "fbp";

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "analyticsRevenue",
    DROP COLUMN IF EXISTS "returnedOrderCount",
    DROP COLUMN IF EXISTS "cancelledOrderCount",
    DROP COLUMN IF EXISTS "deliveredOrderCount",
    DROP COLUMN IF EXISTS "confirmedOrderCount",
    DROP COLUMN IF EXISTS "orderCount",
    DROP COLUMN IF EXISTS "checkoutStartCount",
    DROP COLUMN IF EXISTS "addToCartCount",
    DROP COLUMN IF EXISTS "uniqueViewCount",
    DROP COLUMN IF EXISTS "viewCount";

DROP TABLE IF EXISTS "TrackingHealthCheck" CASCADE;

DROP TABLE IF EXISTS "MetaCapiFailure" CASCADE;

DROP TABLE IF EXISTS "ProductDailyMetric" CASCADE;

COMMIT;
