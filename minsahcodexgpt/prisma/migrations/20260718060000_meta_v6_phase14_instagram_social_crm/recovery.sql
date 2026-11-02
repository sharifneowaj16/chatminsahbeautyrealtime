-- Recovery / Rollback for: 20260718060000_meta_v6_phase14_instagram_social_crm
BEGIN;

DROP INDEX IF EXISTS "MetaInstagramReplyAttempt_correlationId_idx";

DROP INDEX IF EXISTS "MetaInstagramReplyAttempt_status_attemptedAt_idx";

DROP INDEX IF EXISTS "MetaInstagramReplyAttempt_actorId_attemptedAt_idx";

DROP INDEX IF EXISTS "MetaInstagramReplyAttempt_conversationId_attemptedAt_idx";

DROP INDEX IF EXISTS "MetaInstagramReplyAttempt_idempotencyKey_key";

DROP INDEX IF EXISTS "MetaConversationLink_conversationId_linkedAt_idx";

DROP INDEX IF EXISTS "MetaConversationLink_linkType_targetId_idx";

DROP INDEX IF EXISTS "MetaConversationLink_conversationId_linkType_targetId_key";

DROP INDEX IF EXISTS "MetaMessageAttachment_type_status_idx";

DROP INDEX IF EXISTS "MetaMessageAttachment_messageId_status_idx";

DROP INDEX IF EXISTS "MetaMessageAttachment_messageId_externalId_key";

DROP INDEX IF EXISTS "MetaMessage_correlationId_idx";

DROP INDEX IF EXISTS "MetaMessage_postId_idx";

DROP INDEX IF EXISTS "MetaMessage_commentId_idx";

DROP INDEX IF EXISTS "MetaMessage_direction_status_sentAt_idx";

DROP INDEX IF EXISTS "MetaMessage_conversationId_sentAt_idx";

DROP INDEX IF EXISTS "MetaMessage_platformId_key";

DROP INDEX IF EXISTS "MetaConversation_correlationId_idx";

DROP INDEX IF EXISTS "MetaConversation_retentionUntil_idx";

DROP INDEX IF EXISTS "MetaConversation_lastInboundAt_idx";

DROP INDEX IF EXISTS "MetaConversation_assignedToId_status_idx";

DROP INDEX IF EXISTS "MetaConversation_participantId_idx";

DROP INDEX IF EXISTS "MetaConversation_accountId_status_lastMessageAt_idx";

DROP INDEX IF EXISTS "MetaConversation_platformId_key";

DROP INDEX IF EXISTS "MetaInstagramWebhookReceipt_retentionUntil_idx";

DROP INDEX IF EXISTS "MetaInstagramWebhookReceipt_correlationId_idx";

DROP INDEX IF EXISTS "MetaInstagramWebhookReceipt_platformMessageId_idx";

DROP INDEX IF EXISTS "MetaInstagramWebhookReceipt_senderId_receivedAt_idx";

DROP INDEX IF EXISTS "MetaInstagramWebhookReceipt_accountId_receivedAt_idx";

DROP INDEX IF EXISTS "MetaInstagramWebhookReceipt_status_receivedAt_idx";

DROP INDEX IF EXISTS "MetaInstagramWebhookReceipt_eventKey_key";

DROP TABLE IF EXISTS "MetaInstagramReplyAttempt" CASCADE;

DROP TABLE IF EXISTS "MetaConversationLink" CASCADE;

DROP TABLE IF EXISTS "MetaMessageAttachment" CASCADE;

DROP TABLE IF EXISTS "MetaMessage" CASCADE;

DROP TABLE IF EXISTS "MetaConversation" CASCADE;

DROP TABLE IF EXISTS "MetaInstagramWebhookReceipt" CASCADE;

DROP TYPE IF EXISTS "MetaInstagramReplyEligibility" CASCADE;

DROP TYPE IF EXISTS "MetaInstagramLinkType" CASCADE;

DROP TYPE IF EXISTS "MetaInstagramAttachmentStatus" CASCADE;

DROP TYPE IF EXISTS "MetaInstagramMessageStatus" CASCADE;

DROP TYPE IF EXISTS "MetaInstagramMessageType" CASCADE;

DROP TYPE IF EXISTS "MetaInstagramMessageDirection" CASCADE;

DROP TYPE IF EXISTS "MetaInstagramConversationStatus" CASCADE;

DROP TYPE IF EXISTS "MetaInstagramWebhookStatus" CASCADE;

COMMIT;
