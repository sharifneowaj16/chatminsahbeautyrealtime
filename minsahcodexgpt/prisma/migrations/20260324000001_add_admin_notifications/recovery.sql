-- Recovery / Rollback for: 20260324000001_add_admin_notifications
BEGIN;

DROP INDEX IF EXISTS "AdminNotification_orderId_idx";

DROP INDEX IF EXISTS "AdminNotification_createdAt_idx";

DROP INDEX IF EXISTS "AdminNotification_type_idx";

DROP INDEX IF EXISTS "AdminNotification_isRead_idx";

DROP TABLE IF EXISTS "AdminNotification" CASCADE;

COMMIT;
