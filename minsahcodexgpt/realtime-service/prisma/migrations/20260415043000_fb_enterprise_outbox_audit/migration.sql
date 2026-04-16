CREATE TYPE "FbAttachmentType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FILE');

CREATE TYPE "FbOutboxState" AS ENUM (
  'PENDING',
  'QUEUED',
  'RETRYING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED'
);

CREATE TYPE "FbWebhookProcessingStatus" AS ENUM (
  'RECEIVED',
  'PROCESSED',
  'PARTIAL_ERROR',
  'FAILED'
);

CREATE TABLE "FbWebhookAudit" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'facebook_messenger',
  "pageId" TEXT,
  "signatureValid" BOOLEAN NOT NULL DEFAULT false,
  "eventCount" INTEGER NOT NULL DEFAULT 0,
  "processedEvents" INTEGER NOT NULL DEFAULT 0,
  "failedEvents" INTEGER NOT NULL DEFAULT 0,
  "processingStatus" "FbWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
  "rawBody" TEXT NOT NULL,
  "payload" JSONB,
  "error" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "FbWebhookAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FbOutboxMessage" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "customerPsid" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "clientMessageId" TEXT,
  "text" TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "attachmentType" "FbAttachmentType",
  "conversationId" TEXT,
  "localMessageId" TEXT,
  "fbMessageId" TEXT,
  "state" "FbOutboxState" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "lastAttemptAt" TIMESTAMP(3),
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FbOutboxMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FbOutboxStatusEvent" (
  "id" TEXT NOT NULL,
  "outboxMessageId" TEXT NOT NULL,
  "state" "FbOutboxState" NOT NULL,
  "attempt" INTEGER NOT NULL,
  "fbMessageId" TEXT,
  "conversationId" TEXT,
  "localMessageId" TEXT,
  "error" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FbOutboxStatusEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FbOutboxMessage_clientMessageId_key" ON "FbOutboxMessage"("clientMessageId");
CREATE UNIQUE INDEX "FbOutboxMessage_fbMessageId_key" ON "FbOutboxMessage"("fbMessageId");
CREATE INDEX "FbWebhookAudit_processingStatus_receivedAt_idx" ON "FbWebhookAudit"("processingStatus", "receivedAt");
CREATE INDEX "FbWebhookAudit_pageId_receivedAt_idx" ON "FbWebhookAudit"("pageId", "receivedAt");
CREATE INDEX "FbOutboxMessage_customerPsid_queuedAt_idx" ON "FbOutboxMessage"("customerPsid", "queuedAt");
CREATE INDEX "FbOutboxMessage_state_queuedAt_idx" ON "FbOutboxMessage"("state", "queuedAt");
CREATE INDEX "FbOutboxMessage_pageId_customerPsid_idx" ON "FbOutboxMessage"("pageId", "customerPsid");
CREATE INDEX "FbOutboxStatusEvent_outboxMessageId_createdAt_idx" ON "FbOutboxStatusEvent"("outboxMessageId", "createdAt");
CREATE INDEX "FbOutboxStatusEvent_fbMessageId_idx" ON "FbOutboxStatusEvent"("fbMessageId");

ALTER TABLE "FbOutboxStatusEvent"
ADD CONSTRAINT "FbOutboxStatusEvent_outboxMessageId_fkey"
FOREIGN KEY ("outboxMessageId") REFERENCES "FbOutboxMessage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
