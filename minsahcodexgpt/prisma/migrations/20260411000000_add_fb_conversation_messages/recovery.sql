-- Recovery / Rollback for: 20260411000000_add_fb_conversation_messages
BEGIN;

DROP INDEX IF EXISTS "FbMessage_timestamp_idx";

DROP INDEX IF EXISTS "FbMessage_conversationId_idx";

DROP INDEX IF EXISTS "FbMessage_fbMessageId_key";

DROP INDEX IF EXISTS "FbConversation_isReplied_idx";

DROP INDEX IF EXISTS "FbConversation_lastMessageAt_idx";

DROP INDEX IF EXISTS "FbConversation_pageId_idx";

DROP INDEX IF EXISTS "FbConversation_threadId_key";

DROP TABLE IF EXISTS "FbMessage" CASCADE;

DROP TABLE IF EXISTS "FbConversation" CASCADE;

DROP TYPE IF EXISTS "FbSenderType" CASCADE;

COMMIT;
