-- Recovery / Rollback for: 20260424004000_add_steadfast_webhook_events
BEGIN;

DROP INDEX IF EXISTS "SteadfastWebhookEvent_processingStatus_receivedAt_idx";

DROP INDEX IF EXISTS "SteadfastWebhookEvent_trackingCode_idx";

DROP INDEX IF EXISTS "SteadfastWebhookEvent_consignmentId_idx";

DROP INDEX IF EXISTS "SteadfastWebhookEvent_invoice_idx";

DROP INDEX IF EXISTS "SteadfastWebhookEvent_eventType_receivedAt_idx";

DROP INDEX IF EXISTS "SteadfastWebhookEvent_eventKey_key";

DROP TABLE IF EXISTS "SteadfastWebhookEvent" CASCADE;

COMMIT;
