-- DESTRUCTIVE PRE-CUTOVER RECOVERY ONLY.
-- PRECONDITION: export or confirm that no MetaSocialWebhookReceipt rows are required.
-- This drops unified receipt, duplicate, failure and replay-link evidence. Existing legacy
-- MetaWebhookReceipt, MetaInstagramWebhookReceipt and FbWebhookAudit tables are not changed.
-- After consumers depend on this table, use a reviewed forward-fix migration instead.

ALTER TABLE "MetaSocialWebhookReceipt"
  DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_parentReceiptId_fkey";

DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_legacy_idx";
DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_parent_idx";
DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_delivery_idx";
DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_correlation_idx";
DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_connection_received_idx";
DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_platform_received_idx";
DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_state_retry_idx";
DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_dedupe_scope_key";

DROP TABLE IF EXISTS "MetaSocialWebhookReceipt";
DROP TYPE IF EXISTS "MetaSocialWebhookReceiptState";
DROP TYPE IF EXISTS "MetaSocialWebhookPlatform";
DROP TYPE IF EXISTS "MetaSocialWebhookProvider";
