-- Recovery / Rollback for: 20260429123000_repair_pathao_shipping_objects
BEGIN;

DROP INDEX IF EXISTS "PathaoWebhookEvent_processingStatus_receivedAt_idx";

DROP INDEX IF EXISTS "PathaoWebhookEvent_consignmentId_idx";

DROP INDEX IF EXISTS "PathaoWebhookEvent_orderRef_idx";

DROP INDEX IF EXISTS "PathaoWebhookEvent_eventType_receivedAt_idx";

DROP INDEX IF EXISTS "PathaoWebhookEvent_eventKey_key";

DROP INDEX IF EXISTS "Order_pathaoTrackingCode_idx";

DROP INDEX IF EXISTS "Order_pathaoConsignmentId_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "pathaoResponse",
    DROP COLUMN IF EXISTS "pathaoSentAt",
    DROP COLUMN IF EXISTS "pathaoTrackingCode",
    DROP COLUMN IF EXISTS "pathaoConsignmentId",
    DROP COLUMN IF EXISTS "pathaoStatus";

ALTER TABLE "Address"
    DROP COLUMN IF EXISTS "pathaoAreaId",
    DROP COLUMN IF EXISTS "pathaoZoneId",
    DROP COLUMN IF EXISTS "pathaoCityId";

DROP TABLE IF EXISTS "PathaoWebhookEvent" CASCADE;

COMMIT;
