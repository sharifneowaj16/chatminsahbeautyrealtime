CREATE TYPE "FbDeadLetterSource" AS ENUM ('REPLAY_QUEUE', 'MEDIA_RETRY', 'OUTGOING_RETRY');

CREATE TYPE "FbDeadLetterStatus" AS ENUM ('OPEN', 'REQUEUED', 'RESOLVED');

CREATE TABLE "FbDeadLetterJob" (
    "id" TEXT NOT NULL,
    "source" "FbDeadLetterSource" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "pageId" TEXT,
    "threadId" TEXT,
    "fbMessageId" TEXT,
    "outboxMessageId" TEXT,
    "status" "FbDeadLetterStatus" NOT NULL DEFAULT 'OPEN',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL,
    "failureCount" INTEGER NOT NULL DEFAULT 1,
    "replayCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "payload" JSONB NOT NULL,
    "firstFailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRequeuedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FbDeadLetterJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FbDeadLetterJob_dedupeKey_key" ON "FbDeadLetterJob"("dedupeKey");
CREATE INDEX "FbDeadLetterJob_status_lastFailedAt_idx" ON "FbDeadLetterJob"("status", "lastFailedAt");
CREATE INDEX "FbDeadLetterJob_source_status_idx" ON "FbDeadLetterJob"("source", "status");
CREATE INDEX "FbDeadLetterJob_pageId_threadId_idx" ON "FbDeadLetterJob"("pageId", "threadId");
CREATE INDEX "FbDeadLetterJob_fbMessageId_idx" ON "FbDeadLetterJob"("fbMessageId");
CREATE INDEX "FbDeadLetterJob_outboxMessageId_idx" ON "FbDeadLetterJob"("outboxMessageId");
