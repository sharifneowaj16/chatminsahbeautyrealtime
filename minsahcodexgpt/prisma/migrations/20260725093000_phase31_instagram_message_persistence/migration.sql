-- Phase 31 Layer 3.6: scoped Instagram conversation, message and outbound persistence.
-- Existing business rows are preserved. Historical scope is backfilled only when canonical receipt linkage is unambiguous.

BEGIN;

CREATE TYPE "MetaInstagramConversationKind" AS ENUM ('DIRECT','COMMENT_THREAD','STORY_THREAD','UNKNOWN');
CREATE TYPE "MetaInstagramProviderDeliveryStatus" AS ENUM ('NOT_APPLICABLE','PENDING','SENDING','SENT','DELIVERED','READ','FAILED','UNKNOWN_OUTCOME');
CREATE TYPE "MetaInstagramReconciliationStatus" AS ENUM ('NOT_REQUIRED','REQUIRED','IN_PROGRESS','RESOLVED_SENT','RESOLVED_FAILED');
CREATE TYPE "MetaInstagramPrivateReplyStatus" AS ENUM ('RESERVED','SENDING','SENT','BLOCKED','FAILED_DEFINITIVE','UNKNOWN_OUTCOME');
CREATE TYPE "MetaInstagramAttachmentDecision" AS ENUM ('PENDING','ALLOWED','QUARANTINED','REJECTED','FAILED');

ALTER TABLE "MetaSocialWebhookReceipt" ADD COLUMN "instagramMessageId" TEXT;

ALTER TABLE "MetaConversation"
  ADD COLUMN "environment" "MetaPlatformEnvironment",
  ADD COLUMN "connectionKey" TEXT,
  ADD COLUMN "accountIdentityReferenceId" TEXT,
  ADD COLUMN "participantIdentityId" TEXT,
  ADD COLUMN "providerConversationKey" TEXT,
  ADD COLUMN "conversationKind" "MetaInstagramConversationKind" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN "lastActivityProviderMessageId" TEXT,
  ADD COLUMN "lastActivityMessageId" TEXT,
  ADD COLUMN "replyWindowOpenedAt" TIMESTAMP(3),
  ADD COLUMN "replyWindowSourceMessageId" TEXT,
  ADD COLUMN "orderingVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "MetaMessage"
  ADD COLUMN "environment" "MetaPlatformEnvironment",
  ADD COLUMN "connectionKey" TEXT,
  ADD COLUMN "accountIdentityReferenceId" TEXT,
  ADD COLUMN "providerMessageId" TEXT,
  ADD COLUMN "localMessageKey" TEXT,
  ADD COLUMN "outboundIdempotencyKey" TEXT,
  ADD COLUMN "providerStatus" "MetaInstagramProviderDeliveryStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "replyToProviderMessageId" TEXT,
  ADD COLUMN "replyToMessageRecordId" TEXT,
  ADD COLUMN "digestMismatchCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastDigestMismatchAt" TIMESTAMP(3),
  ADD COLUMN "providerOccurredAt" TIMESTAMP(3),
  ADD COLUMN "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "readAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "privateReplyExpiresAt" TIMESTAMP(3);

ALTER TABLE "MetaMessageAttachment"
  ADD COLUMN "sourceUrlDigest" TEXT,
  ADD COLUMN "sourceUrlExpiresAt" TIMESTAMP(3),
  ADD COLUMN "contentDigest" TEXT,
  ADD COLUMN "validationJobReference" TEXT,
  ADD COLUMN "quarantinedAt" TIMESTAMP(3);

ALTER TABLE "MetaInstagramReplyAttempt"
  ADD COLUMN "environment" "MetaPlatformEnvironment",
  ADD COLUMN "connectionKey" TEXT,
  ADD COLUMN "accountIdentityReferenceId" TEXT,
  ADD COLUMN "providerStatus" "MetaInstagramProviderDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "reconciliationStatus" "MetaInstagramReconciliationStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "providerResponseDigest" TEXT,
  ADD COLUMN "localMessageKey" TEXT,
  ADD COLUMN "sourceCommentId" TEXT,
  ADD COLUMN "sourcePostId" TEXT,
  ADD COLUMN "failureCode" TEXT,
  ADD COLUMN "failureCategory" TEXT,
  ADD COLUMN "failureSummary" TEXT,
  ADD COLUMN "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "queuedAt" TIMESTAMP(3),
  ADD COLUMN "sendingAt" TIMESTAMP(3),
  ADD COLUMN "reconciledAt" TIMESTAMP(3);

CREATE TABLE "MetaInstagramParticipant" (
  "id" TEXT NOT NULL,
  "environment" "MetaPlatformEnvironment" NOT NULL,
  "connectionKey" TEXT NOT NULL,
  "accountIdentityReferenceId" TEXT NOT NULL,
  "providerParticipantId" TEXT NOT NULL,
  "username" TEXT,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "profileDigest" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastVerifiedAt" TIMESTAMP(3),
  "profileFetchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaInstagramParticipant_pkey" PRIMARY KEY ("id")
);

-- Required before the participant backfill uses ON CONFLICT.
CREATE UNIQUE INDEX "MetaInstagramParticipant_scope_provider_key" ON "MetaInstagramParticipant"("environment","connectionKey","accountIdentityReferenceId","providerParticipantId");

CREATE TABLE "MetaInstagramPrivateReplyReservation" (
  "id" TEXT NOT NULL,
  "environment" "MetaPlatformEnvironment" NOT NULL,
  "connectionKey" TEXT NOT NULL,
  "accountIdentityReferenceId" TEXT NOT NULL,
  "sourceCommentId" TEXT NOT NULL,
  "sourceMessageId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "replyAttemptId" TEXT,
  "status" "MetaInstagramPrivateReplyStatus" NOT NULL DEFAULT 'RESERVED',
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "failureCode" TEXT,
  "failureSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaInstagramPrivateReplyReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaInstagramPrivateReply_expiry_check" CHECK ("expiresAt" > "reservedAt")
);

CREATE TABLE "MetaInstagramAttachmentPolicyDecision" (
  "id" TEXT NOT NULL,
  "attachmentId" TEXT NOT NULL,
  "decision" "MetaInstagramAttachmentDecision" NOT NULL DEFAULT 'PENDING',
  "reasonCode" TEXT,
  "validatorVersion" TEXT,
  "contentDigest" TEXT,
  "validationJobRef" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaInstagramAttachmentPolicyDecision_pkey" PRIMARY KEY ("id")
);

-- Duplicate preconditions. All queries must return zero rows before old global uniqueness is removed.
-- SELECT "environment","connectionKey","accountIdentityReferenceId","providerConversationKey",COUNT(*) FROM "MetaConversation" WHERE "environment" IS NOT NULL GROUP BY 1,2,3,4 HAVING COUNT(*) > 1;
-- SELECT "environment","connectionKey","accountIdentityReferenceId","providerMessageId",COUNT(*) FROM "MetaMessage" WHERE "providerMessageId" IS NOT NULL GROUP BY 1,2,3,4 HAVING COUNT(*) > 1;
-- SELECT "environment","connectionKey","accountIdentityReferenceId","idempotencyKey",COUNT(*) FROM "MetaInstagramReplyAttempt" WHERE "environment" IS NOT NULL GROUP BY 1,2,3,4 HAVING COUNT(*) > 1;
-- SELECT "providerMessageId",COUNT(*) FROM "MetaInstagramReplyAttempt" WHERE "providerMessageId" IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1;

-- Deterministic compatibility values. Fake outbound legacy IDs remain only in platformId.
UPDATE "MetaMessage" SET
  "providerMessageId"=CASE WHEN "platformId" LIKE 'outbound:%' THEN NULL ELSE "platformId" END,
  "localMessageKey"='legacy-message:' || "id",
  "replyToProviderMessageId"="replyToMessageId",
  "providerOccurredAt"="sentAt",
  "providerStatus"=CASE WHEN "direction"='OUTBOUND' AND "status"='SENT' THEN 'SENT'::"MetaInstagramProviderDeliveryStatus" ELSE 'NOT_APPLICABLE'::"MetaInstagramProviderDeliveryStatus" END
WHERE "localMessageKey" IS NULL;
UPDATE "MetaConversation" SET "providerConversationKey"="platformId", "lastActivityAt"="lastMessageAt", "lastActivityProviderMessageId"=NULL WHERE "providerConversationKey" IS NULL;
UPDATE "MetaInstagramReplyAttempt" SET
  "localMessageKey"='outbound:legacy:' || "id",
  "providerStatus"=CASE WHEN "status"='SENT' THEN 'SENT'::"MetaInstagramProviderDeliveryStatus" WHEN "status"='FAILED' THEN 'FAILED'::"MetaInstagramProviderDeliveryStatus" ELSE 'PENDING'::"MetaInstagramProviderDeliveryStatus" END,
  "queuedAt"=CASE WHEN "status"='QUEUED' THEN "attemptedAt" ELSE NULL END
WHERE "localMessageKey" IS NULL;

-- Link canonical Instagram receipts to one existing legacy message by normalized provider message ID.
UPDATE "MetaSocialWebhookReceipt" canonical SET "instagramMessageId"=message."id", "updatedAt"=CURRENT_TIMESTAMP
FROM "MetaInstagramWebhookReceipt" legacy
JOIN "MetaMessage" message ON message."platformId" = legacy."platformMessageId"
WHERE canonical."platform"='INSTAGRAM'::"MetaSocialWebhookPlatform"
  AND canonical."legacyReceiptType"='MetaInstagramWebhookReceipt' AND canonical."legacyReceiptId"=legacy."id"
  AND canonical."instagramMessageId" IS NULL AND legacy."platformMessageId" IS NOT NULL;

-- Scope messages only when one canonical receipt supplies one exact account identity.
WITH scoped AS (
  SELECT message."id" AS "messageId", MIN(receipt."environment"::text) AS environment,
         MIN(receipt."connectionKey") AS "connectionKey", MIN(receipt."primaryIdentityReferenceId") AS "identityId"
  FROM "MetaMessage" message JOIN "MetaSocialWebhookReceipt" receipt ON receipt."instagramMessageId"=message."id"
  WHERE receipt."primaryIdentityReferenceId" IS NOT NULL
  GROUP BY message."id"
  HAVING COUNT(DISTINCT receipt."environment"::text || E'\\x1f' || receipt."connectionKey" || E'\\x1f' || receipt."primaryIdentityReferenceId")=1
)
UPDATE "MetaMessage" message SET "environment"=scoped.environment::"MetaPlatformEnvironment", "connectionKey"=scoped."connectionKey",
  "accountIdentityReferenceId"=scoped."identityId", "updatedAt"=CURRENT_TIMESTAMP
FROM scoped WHERE message."id"=scoped."messageId" AND message."environment" IS NULL;

-- Scope conversations only when all scoped messages agree.
WITH scoped AS (
  SELECT "conversationId", MIN("environment"::text) AS environment, MIN("connectionKey") AS "connectionKey",
         MIN("accountIdentityReferenceId") AS "identityId"
  FROM "MetaMessage" WHERE "environment" IS NOT NULL GROUP BY "conversationId"
  HAVING COUNT(DISTINCT "environment"::text || E'\\x1f' || "connectionKey" || E'\\x1f' || "accountIdentityReferenceId")=1
)
UPDATE "MetaConversation" conversation SET "environment"=scoped.environment::"MetaPlatformEnvironment", "connectionKey"=scoped."connectionKey",
  "accountIdentityReferenceId"=scoped."identityId", "updatedAt"=CURRENT_TIMESTAMP
FROM scoped WHERE conversation."id"=scoped."conversationId" AND conversation."environment" IS NULL;

-- Resumable participant backfill for scoped conversations.
INSERT INTO "MetaInstagramParticipant" ("id","environment","connectionKey","accountIdentityReferenceId","providerParticipantId","username","displayName","avatarUrl","firstSeenAt","lastSeenAt","createdAt","updatedAt")
SELECT 'phase31-ig-participant:' || conversation."id", conversation."environment", conversation."connectionKey", conversation."accountIdentityReferenceId",
       conversation."participantId", conversation."participantUsername", conversation."participantName", conversation."participantAvatarUrl",
       conversation."createdAt", COALESCE(conversation."lastActivityAt",conversation."updatedAt"), conversation."createdAt", CURRENT_TIMESTAMP
FROM "MetaConversation" conversation WHERE conversation."environment" IS NOT NULL AND conversation."participantIdentityId" IS NULL
ON CONFLICT ("environment","connectionKey","accountIdentityReferenceId","providerParticipantId") DO NOTHING;
UPDATE "MetaConversation" conversation SET "participantIdentityId"=participant."id", "updatedAt"=CURRENT_TIMESTAMP
FROM "MetaInstagramParticipant" participant
WHERE conversation."environment"=participant."environment" AND conversation."connectionKey"=participant."connectionKey"
  AND conversation."accountIdentityReferenceId"=participant."accountIdentityReferenceId"
  AND conversation."participantId"=participant."providerParticipantId" AND conversation."participantIdentityId" IS NULL;

-- Scope historical reply attempts from their conversation.
UPDATE "MetaInstagramReplyAttempt" attempt SET "environment"=conversation."environment", "connectionKey"=conversation."connectionKey",
  "accountIdentityReferenceId"=conversation."accountIdentityReferenceId"
FROM "MetaConversation" conversation WHERE attempt."conversationId"=conversation."id" AND conversation."environment" IS NOT NULL AND attempt."environment" IS NULL;

CREATE INDEX "MetaInstagramParticipant_account_seen_idx" ON "MetaInstagramParticipant"("accountIdentityReferenceId","lastSeenAt");
CREATE UNIQUE INDEX "MetaConversation_scope_provider_key" ON "MetaConversation"("environment","connectionKey","accountIdentityReferenceId","providerConversationKey");
CREATE INDEX "MetaConversation_legacy_platform_idx" ON "MetaConversation"("platformId");
CREATE INDEX "MetaConversation_scope_activity_idx" ON "MetaConversation"("environment","connectionKey","accountIdentityReferenceId","status","lastActivityAt");
CREATE INDEX "MetaConversation_participant_identity_idx" ON "MetaConversation"("participantIdentityId");
CREATE UNIQUE INDEX "MetaMessage_localMessageKey_key" ON "MetaMessage"("localMessageKey");
CREATE UNIQUE INDEX "MetaMessage_scope_provider_key" ON "MetaMessage"("environment","connectionKey","accountIdentityReferenceId","providerMessageId");
CREATE UNIQUE INDEX "MetaMessage_scope_outbound_idempotency_key" ON "MetaMessage"("environment","connectionKey","accountIdentityReferenceId","outboundIdempotencyKey");
CREATE INDEX "MetaMessage_legacy_platform_idx" ON "MetaMessage"("platformId");
CREATE INDEX "MetaMessage_conversation_order_idx" ON "MetaMessage"("conversationId","providerOccurredAt","providerMessageId");
CREATE INDEX "MetaMessage_provider_status_idx" ON "MetaMessage"("providerStatus","sentAt");
CREATE INDEX "MetaMessage_reply_record_idx" ON "MetaMessage"("replyToMessageRecordId");
CREATE UNIQUE INDEX "MetaInstagramReplyAttempt_scope_idempotency_key" ON "MetaInstagramReplyAttempt"("environment","connectionKey","accountIdentityReferenceId","idempotencyKey");
CREATE UNIQUE INDEX "MetaInstagramReplyAttempt_scope_provider_message_key" ON "MetaInstagramReplyAttempt"("environment","connectionKey","accountIdentityReferenceId","providerMessageId");
CREATE INDEX "MetaInstagramReplyAttempt_legacy_idempotency_idx" ON "MetaInstagramReplyAttempt"("idempotencyKey");
CREATE INDEX "MetaInstagramReplyAttempt_reconcile_idx" ON "MetaInstagramReplyAttempt"("providerStatus","reconciliationStatus","attemptedAt");
CREATE UNIQUE INDEX "MetaInstagramPrivateReply_replyAttemptId_key" ON "MetaInstagramPrivateReplyReservation"("replyAttemptId");
CREATE UNIQUE INDEX "MetaInstagramPrivateReply_scope_comment_key" ON "MetaInstagramPrivateReplyReservation"("environment","connectionKey","accountIdentityReferenceId","sourceCommentId");
CREATE INDEX "MetaInstagramPrivateReply_status_expiry_idx" ON "MetaInstagramPrivateReplyReservation"("status","expiresAt");
CREATE INDEX "MetaInstagramPrivateReply_conversation_idx" ON "MetaInstagramPrivateReplyReservation"("conversationId","reservedAt");
CREATE UNIQUE INDEX "MetaInstagramAttachmentPolicyDecision_attachmentId_key" ON "MetaInstagramAttachmentPolicyDecision"("attachmentId");
CREATE INDEX "MetaInstagramAttachmentDecision_status_idx" ON "MetaInstagramAttachmentPolicyDecision"("decision","decidedAt");
CREATE INDEX "MetaInstagramAttachmentDecision_job_idx" ON "MetaInstagramAttachmentPolicyDecision"("validationJobRef");
CREATE INDEX "MetaMessageAttachment_validation_job_idx" ON "MetaMessageAttachment"("validationJobReference");
CREATE INDEX "MetaSocialWebhookReceipt_instagram_message_idx" ON "MetaSocialWebhookReceipt"("instagramMessageId");

DROP INDEX IF EXISTS "MetaConversation_platformId_key";
DROP INDEX IF EXISTS "MetaMessage_platformId_key";
DROP INDEX IF EXISTS "MetaInstagramReplyAttempt_idempotencyKey_key";

ALTER TABLE "MetaInstagramParticipant" ADD CONSTRAINT "MetaInstagramParticipant_accountIdentityReferenceId_fkey" FOREIGN KEY ("accountIdentityReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MetaConversation"
  ADD CONSTRAINT "MetaConversation_accountIdentityReferenceId_fkey" FOREIGN KEY ("accountIdentityReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaConversation_participantIdentityId_fkey" FOREIGN KEY ("participantIdentityId") REFERENCES "MetaInstagramParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaConversation_ordering_version_check" CHECK ("orderingVersion" >= 0),
  ADD CONSTRAINT "MetaConversation_scope_pair_check" CHECK (("environment" IS NULL) = ("connectionKey" IS NULL));
ALTER TABLE "MetaMessage"
  ADD CONSTRAINT "MetaMessage_accountIdentityReferenceId_fkey" FOREIGN KEY ("accountIdentityReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaMessage_replyToMessageRecordId_fkey" FOREIGN KEY ("replyToMessageRecordId") REFERENCES "MetaMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaMessage_digest_mismatch_check" CHECK ("digestMismatchCount" >= 0),
  ADD CONSTRAINT "MetaMessage_scope_pair_check" CHECK (("environment" IS NULL) = ("connectionKey" IS NULL));
ALTER TABLE "MetaSocialWebhookReceipt" ADD CONSTRAINT "MetaSocialWebhookReceipt_instagramMessageId_fkey" FOREIGN KEY ("instagramMessageId") REFERENCES "MetaMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaInstagramReplyAttempt" ADD CONSTRAINT "MetaInstagramReplyAttempt_accountIdentityReferenceId_fkey" FOREIGN KEY ("accountIdentityReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaInstagramPrivateReplyReservation"
  ADD CONSTRAINT "MetaInstagramPrivateReply_accountIdentityReferenceId_fkey" FOREIGN KEY ("accountIdentityReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaInstagramPrivateReply_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "MetaMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaInstagramPrivateReply_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MetaConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaInstagramPrivateReply_replyAttemptId_fkey" FOREIGN KEY ("replyAttemptId") REFERENCES "MetaInstagramReplyAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaInstagramAttachmentPolicyDecision" ADD CONSTRAINT "MetaInstagramAttachmentPolicyDecision_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "MetaMessageAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
