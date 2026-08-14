-- Meta v6 Phase 5: durable provider-isolated job audit, scheduler dedupe and DLQ replay.
CREATE TYPE "MetaJobStatus" AS ENUM (
  'QUEUED',
  'RUNNING',
  'RETRYING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'DEAD_LETTER'
);

CREATE TABLE "MetaJobAudit" (
  "id" TEXT NOT NULL,
  "queueName" TEXT NOT NULL,
  "jobName" TEXT NOT NULL,
  "externalJobId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "status" "MetaJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "progress" INTEGER,
  "sourceId" TEXT,
  "payload" JSONB NOT NULL,
  "lastError" JSONB,
  "rateLimitState" JSONB,
  "replayOfId" TEXT,
  "replayCount" INTEGER NOT NULL DEFAULT 0,
  "requestedBy" TEXT,
  "nextRunAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastHeartbeatAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaJobAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaJobAudit_idempotencyKey_key" ON "MetaJobAudit"("idempotencyKey");
CREATE INDEX "MetaJobAudit_status_createdAt_idx" ON "MetaJobAudit"("status", "createdAt");
CREATE INDEX "MetaJobAudit_queueName_status_idx" ON "MetaJobAudit"("queueName", "status");
CREATE INDEX "MetaJobAudit_sourceId_idx" ON "MetaJobAudit"("sourceId");
CREATE INDEX "MetaJobAudit_replayOfId_idx" ON "MetaJobAudit"("replayOfId");
CREATE INDEX "MetaJobAudit_nextRunAt_idx" ON "MetaJobAudit"("nextRunAt");
