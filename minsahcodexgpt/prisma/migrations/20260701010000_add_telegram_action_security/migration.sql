-- Phase 10: Telegram bot production hardening
-- Tokenized callbacks + durable action audit log.

CREATE TABLE IF NOT EXISTS "TelegramActionToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "telegramChatId" TEXT,
  "messageId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TelegramActionToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramActionToken_tokenHash_key" ON "TelegramActionToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "TelegramActionToken_orderId_idx" ON "TelegramActionToken"("orderId");
CREATE INDEX IF NOT EXISTS "TelegramActionToken_action_idx" ON "TelegramActionToken"("action");
CREATE INDEX IF NOT EXISTS "TelegramActionToken_expiresAt_idx" ON "TelegramActionToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "TelegramActionToken_consumedAt_idx" ON "TelegramActionToken"("consumedAt");

CREATE TABLE IF NOT EXISTS "TelegramActionLog" (
  "id" TEXT NOT NULL,
  "callbackQueryId" TEXT,
  "telegramUserId" TEXT NOT NULL,
  "telegramUsername" TEXT,
  "action" TEXT NOT NULL,
  "orderId" TEXT,
  "status" TEXT NOT NULL,
  "errorMessage" TEXT,
  "messageId" TEXT,
  "chatId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TelegramActionLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramActionLog_callbackQueryId_key" ON "TelegramActionLog"("callbackQueryId");
CREATE INDEX IF NOT EXISTS "TelegramActionLog_orderId_idx" ON "TelegramActionLog"("orderId");
CREATE INDEX IF NOT EXISTS "TelegramActionLog_telegramUserId_idx" ON "TelegramActionLog"("telegramUserId");
CREATE INDEX IF NOT EXISTS "TelegramActionLog_action_idx" ON "TelegramActionLog"("action");
CREATE INDEX IF NOT EXISTS "TelegramActionLog_status_idx" ON "TelegramActionLog"("status");
CREATE INDEX IF NOT EXISTS "TelegramActionLog_createdAt_idx" ON "TelegramActionLog"("createdAt");
