ALTER TYPE "MetaIncidentType" ADD VALUE IF NOT EXISTS 'INSTAGRAM_PERMISSION_FAILURE';
ALTER TYPE "MetaIncidentType" ADD VALUE IF NOT EXISTS 'INSTAGRAM_WEBHOOK_FAILURE';
ALTER TYPE "MetaIncidentType" ADD VALUE IF NOT EXISTS 'INSTAGRAM_REPLY_FAILURE';

CREATE TYPE "MetaInstagramWebhookStatus" AS ENUM ('RECEIVED', 'VERIFIED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');
CREATE TYPE "MetaInstagramConversationStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'SPAM', 'ARCHIVED');
CREATE TYPE "MetaInstagramMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "MetaInstagramMessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'STORY_REPLY', 'COMMENT_PRIVATE_REPLY', 'POSTBACK', 'UNKNOWN');
CREATE TYPE "MetaInstagramMessageStatus" AS ENUM ('RECEIVED', 'QUEUED', 'PROCESSED', 'SENT', 'FAILED', 'BLOCKED');
CREATE TYPE "MetaInstagramAttachmentStatus" AS ENUM ('PENDING', 'READY', 'REJECTED', 'FAILED');
CREATE TYPE "MetaInstagramLinkType" AS ENUM ('CUSTOMER', 'LEAD', 'PRODUCT', 'ORDER');
CREATE TYPE "MetaInstagramReplyEligibility" AS ENUM ('ELIGIBLE', 'WINDOW_EXPIRED', 'PERMISSION_MISSING', 'ACCOUNT_MISMATCH', 'UNSUPPORTED', 'CONVERSATION_CLOSED', 'PRIVATE_REPLY_ALREADY_SENT');

CREATE TABLE "MetaInstagramWebhookReceipt" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "objectType" TEXT NOT NULL,
  "accountId" TEXT,
  "senderId" TEXT,
  "conversationKey" TEXT,
  "platformMessageId" TEXT,
  "signatureOk" BOOLEAN NOT NULL,
  "payloadDigest" TEXT NOT NULL,
  "normalizedEvent" JSONB NOT NULL,
  "correlationId" TEXT NOT NULL,
  "status" "MetaInstagramWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "queuedAt" TIMESTAMP(3),
  "processingAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "retentionUntil" TIMESTAMP(3) NOT NULL,
  "errorData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaInstagramWebhookReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaConversation" (
  "id" TEXT NOT NULL,
  "platformId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "participantUsername" TEXT,
  "participantName" TEXT,
  "participantAvatarUrl" TEXT,
  "assignedToId" TEXT,
  "status" "MetaInstagramConversationStatus" NOT NULL DEFAULT 'OPEN',
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "subject" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "lastInboundAt" TIMESTAMP(3),
  "replyWindowExpiresAt" TIMESTAMP(3),
  "privateReplySentAt" TIMESTAMP(3),
  "policyData" JSONB,
  "correlationId" TEXT,
  "retentionUntil" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaMessage" (
  "id" TEXT NOT NULL,
  "platformId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "direction" "MetaInstagramMessageDirection" NOT NULL,
  "messageType" "MetaInstagramMessageType" NOT NULL,
  "status" "MetaInstagramMessageStatus" NOT NULL DEFAULT 'RECEIVED',
  "text" TEXT,
  "replyToMessageId" TEXT,
  "storyMediaId" TEXT,
  "commentId" TEXT,
  "postId" TEXT,
  "payloadDigest" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaMessageAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "externalId" TEXT,
  "type" "MetaInstagramMessageType" NOT NULL,
  "status" "MetaInstagramAttachmentStatus" NOT NULL DEFAULT 'PENDING',
  "mimeType" TEXT,
  "fileName" TEXT,
  "fileSize" INTEGER,
  "sourceUrl" TEXT,
  "storageKey" TEXT,
  "storageUrl" TEXT,
  "thumbnailUrl" TEXT,
  "failureCode" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaMessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaConversationLink" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "linkType" "MetaInstagramLinkType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "verificationMethod" TEXT NOT NULL,
  "evidence" JSONB,
  "linkedById" TEXT NOT NULL,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unlinkedAt" TIMESTAMP(3),
  CONSTRAINT "MetaConversationLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaInstagramReplyAttempt" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "sourceMessageId" TEXT,
  "actorId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "eligibility" "MetaInstagramReplyEligibility" NOT NULL,
  "status" "MetaInstagramMessageStatus" NOT NULL,
  "textHash" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "payloadHash" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "failureData" JSONB,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "MetaInstagramReplyAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaInstagramWebhookReceipt_eventKey_key" ON "MetaInstagramWebhookReceipt"("eventKey");
CREATE INDEX "MetaInstagramWebhookReceipt_status_receivedAt_idx" ON "MetaInstagramWebhookReceipt"("status", "receivedAt");
CREATE INDEX "MetaInstagramWebhookReceipt_accountId_receivedAt_idx" ON "MetaInstagramWebhookReceipt"("accountId", "receivedAt");
CREATE INDEX "MetaInstagramWebhookReceipt_senderId_receivedAt_idx" ON "MetaInstagramWebhookReceipt"("senderId", "receivedAt");
CREATE INDEX "MetaInstagramWebhookReceipt_platformMessageId_idx" ON "MetaInstagramWebhookReceipt"("platformMessageId");
CREATE INDEX "MetaInstagramWebhookReceipt_correlationId_idx" ON "MetaInstagramWebhookReceipt"("correlationId");
CREATE INDEX "MetaInstagramWebhookReceipt_retentionUntil_idx" ON "MetaInstagramWebhookReceipt"("retentionUntil");
CREATE UNIQUE INDEX "MetaConversation_platformId_key" ON "MetaConversation"("platformId");
CREATE INDEX "MetaConversation_accountId_status_lastMessageAt_idx" ON "MetaConversation"("accountId", "status", "lastMessageAt");
CREATE INDEX "MetaConversation_participantId_idx" ON "MetaConversation"("participantId");
CREATE INDEX "MetaConversation_assignedToId_status_idx" ON "MetaConversation"("assignedToId", "status");
CREATE INDEX "MetaConversation_lastInboundAt_idx" ON "MetaConversation"("lastInboundAt");
CREATE INDEX "MetaConversation_retentionUntil_idx" ON "MetaConversation"("retentionUntil");
CREATE INDEX "MetaConversation_correlationId_idx" ON "MetaConversation"("correlationId");
CREATE UNIQUE INDEX "MetaMessage_platformId_key" ON "MetaMessage"("platformId");
CREATE INDEX "MetaMessage_conversationId_sentAt_idx" ON "MetaMessage"("conversationId", "sentAt");
CREATE INDEX "MetaMessage_direction_status_sentAt_idx" ON "MetaMessage"("direction", "status", "sentAt");
CREATE INDEX "MetaMessage_commentId_idx" ON "MetaMessage"("commentId");
CREATE INDEX "MetaMessage_postId_idx" ON "MetaMessage"("postId");
CREATE INDEX "MetaMessage_correlationId_idx" ON "MetaMessage"("correlationId");
CREATE UNIQUE INDEX "MetaMessageAttachment_messageId_externalId_key" ON "MetaMessageAttachment"("messageId", "externalId");
CREATE INDEX "MetaMessageAttachment_messageId_status_idx" ON "MetaMessageAttachment"("messageId", "status");
CREATE INDEX "MetaMessageAttachment_type_status_idx" ON "MetaMessageAttachment"("type", "status");
CREATE UNIQUE INDEX "MetaConversationLink_conversationId_linkType_targetId_key" ON "MetaConversationLink"("conversationId", "linkType", "targetId");
CREATE INDEX "MetaConversationLink_linkType_targetId_idx" ON "MetaConversationLink"("linkType", "targetId");
CREATE INDEX "MetaConversationLink_conversationId_linkedAt_idx" ON "MetaConversationLink"("conversationId", "linkedAt");
CREATE UNIQUE INDEX "MetaInstagramReplyAttempt_idempotencyKey_key" ON "MetaInstagramReplyAttempt"("idempotencyKey");
CREATE INDEX "MetaInstagramReplyAttempt_conversationId_attemptedAt_idx" ON "MetaInstagramReplyAttempt"("conversationId", "attemptedAt");
CREATE INDEX "MetaInstagramReplyAttempt_actorId_attemptedAt_idx" ON "MetaInstagramReplyAttempt"("actorId", "attemptedAt");
CREATE INDEX "MetaInstagramReplyAttempt_status_attemptedAt_idx" ON "MetaInstagramReplyAttempt"("status", "attemptedAt");
CREATE INDEX "MetaInstagramReplyAttempt_correlationId_idx" ON "MetaInstagramReplyAttempt"("correlationId");

ALTER TABLE "MetaMessage" ADD CONSTRAINT "MetaMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MetaConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaMessageAttachment" ADD CONSTRAINT "MetaMessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "MetaMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaConversationLink" ADD CONSTRAINT "MetaConversationLink_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MetaConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaInstagramReplyAttempt" ADD CONSTRAINT "MetaInstagramReplyAttempt_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MetaConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaInstagramReplyAttempt" ADD CONSTRAINT "MetaInstagramReplyAttempt_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "MetaMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
