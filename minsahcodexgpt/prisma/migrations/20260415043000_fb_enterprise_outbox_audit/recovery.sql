-- Recovery / Rollback for: 20260415043000_fb_enterprise_outbox_audit
BEGIN;

DROP INDEX IF EXISTS "FbOutboxStatusEvent_fbMessageId_idx";

DROP INDEX IF EXISTS "FbOutboxStatusEvent_outboxMessageId_createdAt_idx";

DROP INDEX IF EXISTS "FbOutboxMessage_pageId_customerPsid_idx";

DROP INDEX IF EXISTS "FbOutboxMessage_state_queuedAt_idx";

DROP INDEX IF EXISTS "FbOutboxMessage_customerPsid_queuedAt_idx";

DROP INDEX IF EXISTS "FbWebhookAudit_pageId_receivedAt_idx";

DROP INDEX IF EXISTS "FbWebhookAudit_processingStatus_receivedAt_idx";

DROP INDEX IF EXISTS "FbOutboxMessage_fbMessageId_key";

DROP INDEX IF EXISTS "FbOutboxMessage_clientMessageId_key";

DROP TABLE IF EXISTS "FbOutboxStatusEvent" CASCADE;

DROP TABLE IF EXISTS "FbOutboxMessage" CASCADE;

DROP TABLE IF EXISTS "FbWebhookAudit" CASCADE;

DROP TYPE IF EXISTS "FbWebhookProcessingStatus" CASCADE;

DROP TYPE IF EXISTS "FbOutboxState" CASCADE;

DROP TYPE IF EXISTS "FbAttachmentType" CASCADE;

COMMIT;
