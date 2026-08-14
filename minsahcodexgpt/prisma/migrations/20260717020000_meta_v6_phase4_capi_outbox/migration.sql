-- Phase 4: durable Meta Conversions API transactional outbox.
CREATE TYPE "MetaEventOutboxStatus" AS ENUM (
  'PENDING',
  'DISPATCHED',
  'PROCESSING',
  'SENT',
  'RETRY_SCHEDULED',
  'FAILED_PERMANENT',
  'SUPPRESSED'
);

CREATE TABLE "MetaEventOutbox" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'META',
  "eventName" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "orderId" TEXT,
  "actionSource" TEXT NOT NULL,
  "eventSourceUrl" TEXT,
  "eventTime" TIMESTAMP(3) NOT NULL,
  "payload" JSONB NOT NULL,
  "safePayload" JSONB,
  "status" "MetaEventOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "dispatchedAt" TIMESTAMP(3),
  "processingAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "response" JSONB,
  "lastError" JSONB,
  "suppressReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaEventOutbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaEventOutboxStatusEvent" (
  "id" TEXT NOT NULL,
  "outboxId" TEXT NOT NULL,
  "status" "MetaEventOutboxStatus" NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "safeDetails" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaEventOutboxStatusEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaEventOutbox_provider_eventName_eventId_key"
  ON "MetaEventOutbox"("provider", "eventName", "eventId");
CREATE INDEX "MetaEventOutbox_status_nextAttemptAt_idx"
  ON "MetaEventOutbox"("status", "nextAttemptAt");
CREATE INDEX "MetaEventOutbox_leaseExpiresAt_idx" ON "MetaEventOutbox"("leaseExpiresAt");
CREATE INDEX "MetaEventOutbox_orderId_idx" ON "MetaEventOutbox"("orderId");
CREATE INDEX "MetaEventOutbox_sourceType_sourceId_idx"
  ON "MetaEventOutbox"("sourceType", "sourceId");
CREATE INDEX "MetaEventOutbox_createdAt_idx" ON "MetaEventOutbox"("createdAt");
CREATE INDEX "MetaEventOutboxStatusEvent_outboxId_createdAt_idx"
  ON "MetaEventOutboxStatusEvent"("outboxId", "createdAt");
CREATE INDEX "MetaEventOutboxStatusEvent_status_createdAt_idx"
  ON "MetaEventOutboxStatusEvent"("status", "createdAt");

ALTER TABLE "MetaEventOutbox"
  ADD CONSTRAINT "MetaEventOutbox_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaEventOutboxStatusEvent"
  ADD CONSTRAINT "MetaEventOutboxStatusEvent_outboxId_fkey"
  FOREIGN KEY ("outboxId") REFERENCES "MetaEventOutbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
