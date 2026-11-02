-- Recovery / Rollback for: 20260428171000_add_pathao_webhook_and_consignment_fields
BEGIN;

DROP INDEX IF EXISTS "PathaoWebhookEvent_processingStatus_receivedAt_idx";

DROP INDEX IF EXISTS "PathaoWebhookEvent_consignmentId_idx";

DROP INDEX IF EXISTS "PathaoWebhookEvent_orderRef_idx";

DROP INDEX IF EXISTS "PathaoWebhookEvent_eventType_receivedAt_idx";

DROP INDEX IF EXISTS "PathaoWebhookEvent_eventKey_key";

DROP INDEX IF EXISTS "Order_pathaoTrackingCode_idx";

DROP INDEX IF EXISTS "Order_pathaoConsignmentId_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "pathaoSentAt",
    DROP COLUMN IF EXISTS "pathaoTrackingCode",
    DROP COLUMN IF EXISTS "pathaoConsignmentId";

DROP TABLE IF EXISTS "PathaoWebhookEvent" CASCADE;

COMMIT;
