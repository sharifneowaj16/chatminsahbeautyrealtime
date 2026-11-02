-- Recovery / Rollback for: 20260701010000_add_telegram_action_security
BEGIN;

DROP INDEX IF EXISTS "TelegramActionLog_createdAt_idx";

DROP INDEX IF EXISTS "TelegramActionLog_status_idx";

DROP INDEX IF EXISTS "TelegramActionLog_action_idx";

DROP INDEX IF EXISTS "TelegramActionLog_telegramUserId_idx";

DROP INDEX IF EXISTS "TelegramActionLog_orderId_idx";

DROP INDEX IF EXISTS "TelegramActionLog_callbackQueryId_key";

DROP INDEX IF EXISTS "TelegramActionToken_consumedAt_idx";

DROP INDEX IF EXISTS "TelegramActionToken_expiresAt_idx";

DROP INDEX IF EXISTS "TelegramActionToken_action_idx";

DROP INDEX IF EXISTS "TelegramActionToken_orderId_idx";

DROP INDEX IF EXISTS "TelegramActionToken_tokenHash_key";

DROP TABLE IF EXISTS "TelegramActionLog" CASCADE;

DROP TABLE IF EXISTS "TelegramActionToken" CASCADE;

COMMIT;
