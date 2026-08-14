-- WARNING: destructive recovery of Layer 3.6 trace/policy metadata.
-- PRECONDITIONS:
-- 1. Stop Instagram webhook workers, outbound send jobs, private replies and media validation.
-- 2. Export participant, private-reply reservation, attachment-decision and receipt-message evidence.
-- 3. The following queries must return zero rows before restoring old global uniqueness:
--    SELECT "platformId",COUNT(*) FROM "MetaConversation" GROUP BY 1 HAVING COUNT(*) > 1;
--    SELECT "platformId",COUNT(*) FROM "MetaMessage" GROUP BY 1 HAVING COUNT(*) > 1;
--    SELECT "idempotencyKey",COUNT(*) FROM "MetaInstagramReplyAttempt" GROUP BY 1 HAVING COUNT(*) > 1;

BEGIN;

ALTER TABLE "MetaInstagramAttachmentPolicyDecision" DROP CONSTRAINT IF EXISTS "MetaInstagramAttachmentPolicyDecision_attachmentId_fkey";
ALTER TABLE "MetaInstagramPrivateReplyReservation" DROP CONSTRAINT IF EXISTS "MetaInstagramPrivateReply_accountIdentityReferenceId_fkey", DROP CONSTRAINT IF EXISTS "MetaInstagramPrivateReply_sourceMessageId_fkey", DROP CONSTRAINT IF EXISTS "MetaInstagramPrivateReply_conversationId_fkey", DROP CONSTRAINT IF EXISTS "MetaInstagramPrivateReply_replyAttemptId_fkey";
ALTER TABLE "MetaInstagramReplyAttempt" DROP CONSTRAINT IF EXISTS "MetaInstagramReplyAttempt_accountIdentityReferenceId_fkey";
ALTER TABLE "MetaSocialWebhookReceipt" DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_instagramMessageId_fkey";
ALTER TABLE "MetaMessage" DROP CONSTRAINT IF EXISTS "MetaMessage_accountIdentityReferenceId_fkey", DROP CONSTRAINT IF EXISTS "MetaMessage_replyToMessageRecordId_fkey", DROP CONSTRAINT IF EXISTS "MetaMessage_digest_mismatch_check", DROP CONSTRAINT IF EXISTS "MetaMessage_scope_pair_check";
ALTER TABLE "MetaConversation" DROP CONSTRAINT IF EXISTS "MetaConversation_accountIdentityReferenceId_fkey", DROP CONSTRAINT IF EXISTS "MetaConversation_participantIdentityId_fkey", DROP CONSTRAINT IF EXISTS "MetaConversation_ordering_version_check", DROP CONSTRAINT IF EXISTS "MetaConversation_scope_pair_check";
ALTER TABLE "MetaInstagramParticipant" DROP CONSTRAINT IF EXISTS "MetaInstagramParticipant_accountIdentityReferenceId_fkey";

DROP TABLE IF EXISTS "MetaInstagramAttachmentPolicyDecision";
DROP TABLE IF EXISTS "MetaInstagramPrivateReplyReservation";
DROP TABLE IF EXISTS "MetaInstagramParticipant";

DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_instagram_message_idx";
ALTER TABLE "MetaSocialWebhookReceipt" DROP COLUMN IF EXISTS "instagramMessageId";

DROP INDEX IF EXISTS "MetaMessageAttachment_validation_job_idx";
ALTER TABLE "MetaMessageAttachment" DROP COLUMN IF EXISTS "quarantinedAt", DROP COLUMN IF EXISTS "validationJobReference", DROP COLUMN IF EXISTS "contentDigest", DROP COLUMN IF EXISTS "sourceUrlExpiresAt", DROP COLUMN IF EXISTS "sourceUrlDigest";

DROP INDEX IF EXISTS "MetaInstagramReplyAttempt_reconcile_idx";
DROP INDEX IF EXISTS "MetaInstagramReplyAttempt_legacy_idempotency_idx";
DROP INDEX IF EXISTS "MetaInstagramReplyAttempt_scope_provider_message_key";
DROP INDEX IF EXISTS "MetaInstagramReplyAttempt_scope_idempotency_key";
CREATE UNIQUE INDEX IF NOT EXISTS "MetaInstagramReplyAttempt_idempotencyKey_key" ON "MetaInstagramReplyAttempt"("idempotencyKey");
ALTER TABLE "MetaInstagramReplyAttempt" DROP COLUMN IF EXISTS "reconciledAt", DROP COLUMN IF EXISTS "sendingAt", DROP COLUMN IF EXISTS "queuedAt", DROP COLUMN IF EXISTS "requestedAt", DROP COLUMN IF EXISTS "failureSummary", DROP COLUMN IF EXISTS "failureCategory", DROP COLUMN IF EXISTS "failureCode", DROP COLUMN IF EXISTS "sourcePostId", DROP COLUMN IF EXISTS "sourceCommentId", DROP COLUMN IF EXISTS "localMessageKey", DROP COLUMN IF EXISTS "providerResponseDigest", DROP COLUMN IF EXISTS "reconciliationStatus", DROP COLUMN IF EXISTS "providerStatus", DROP COLUMN IF EXISTS "accountIdentityReferenceId", DROP COLUMN IF EXISTS "connectionKey", DROP COLUMN IF EXISTS "environment";

DROP INDEX IF EXISTS "MetaMessage_reply_record_idx";
DROP INDEX IF EXISTS "MetaMessage_provider_status_idx";
DROP INDEX IF EXISTS "MetaMessage_conversation_order_idx";
DROP INDEX IF EXISTS "MetaMessage_legacy_platform_idx";
DROP INDEX IF EXISTS "MetaMessage_scope_outbound_idempotency_key";
DROP INDEX IF EXISTS "MetaMessage_scope_provider_key";
DROP INDEX IF EXISTS "MetaMessage_localMessageKey_key";
CREATE UNIQUE INDEX IF NOT EXISTS "MetaMessage_platformId_key" ON "MetaMessage"("platformId");
ALTER TABLE "MetaMessage" DROP COLUMN IF EXISTS "privateReplyExpiresAt", DROP COLUMN IF EXISTS "failedAt", DROP COLUMN IF EXISTS "readAt", DROP COLUMN IF EXISTS "deliveredAt", DROP COLUMN IF EXISTS "receivedAt", DROP COLUMN IF EXISTS "providerOccurredAt", DROP COLUMN IF EXISTS "lastDigestMismatchAt", DROP COLUMN IF EXISTS "digestMismatchCount", DROP COLUMN IF EXISTS "replyToMessageRecordId", DROP COLUMN IF EXISTS "replyToProviderMessageId", DROP COLUMN IF EXISTS "providerStatus", DROP COLUMN IF EXISTS "outboundIdempotencyKey", DROP COLUMN IF EXISTS "localMessageKey", DROP COLUMN IF EXISTS "providerMessageId", DROP COLUMN IF EXISTS "accountIdentityReferenceId", DROP COLUMN IF EXISTS "connectionKey", DROP COLUMN IF EXISTS "environment";

DROP INDEX IF EXISTS "MetaConversation_participant_identity_idx";
DROP INDEX IF EXISTS "MetaConversation_scope_activity_idx";
DROP INDEX IF EXISTS "MetaConversation_legacy_platform_idx";
DROP INDEX IF EXISTS "MetaConversation_scope_provider_key";
CREATE UNIQUE INDEX IF NOT EXISTS "MetaConversation_platformId_key" ON "MetaConversation"("platformId");
ALTER TABLE "MetaConversation" DROP COLUMN IF EXISTS "orderingVersion", DROP COLUMN IF EXISTS "replyWindowSourceMessageId", DROP COLUMN IF EXISTS "replyWindowOpenedAt", DROP COLUMN IF EXISTS "lastActivityMessageId", DROP COLUMN IF EXISTS "lastActivityProviderMessageId", DROP COLUMN IF EXISTS "lastActivityAt", DROP COLUMN IF EXISTS "conversationKind", DROP COLUMN IF EXISTS "providerConversationKey", DROP COLUMN IF EXISTS "participantIdentityId", DROP COLUMN IF EXISTS "accountIdentityReferenceId", DROP COLUMN IF EXISTS "connectionKey", DROP COLUMN IF EXISTS "environment";

DROP TYPE IF EXISTS "MetaInstagramAttachmentDecision";
DROP TYPE IF EXISTS "MetaInstagramPrivateReplyStatus";
DROP TYPE IF EXISTS "MetaInstagramReconciliationStatus";
DROP TYPE IF EXISTS "MetaInstagramProviderDeliveryStatus";
DROP TYPE IF EXISTS "MetaInstagramConversationKind";

COMMIT;
