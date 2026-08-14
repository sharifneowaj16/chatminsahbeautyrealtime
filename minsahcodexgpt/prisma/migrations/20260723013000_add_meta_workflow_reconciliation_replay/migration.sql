-- Phase 27: resumable workflows, provider jobs, reconciliation, fenced locks and controlled replay.
-- Existing Phase 25 operations remain the durable command parent. No producer cutover is performed here.

CREATE TYPE "MetaWorkflowStatus" AS ENUM (
  'PENDING', 'RUNNING', 'WAITING_RECONCILIATION', 'COMPENSATING',
  'SUCCEEDED', 'FAILED', 'COMPENSATED', 'CANCELLED'
);

CREATE TYPE "MetaWorkflowStepStatus" AS ENUM (
  'PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'UNKNOWN',
  'COMPENSATING', 'COMPENSATED', 'SKIPPED'
);

CREATE TYPE "MetaProviderJobStatus" AS ENUM (
  'PENDING', 'SUBMITTED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'UNKNOWN', 'CANCELLED'
);

CREATE TYPE "MetaReconciliationStatus" AS ENUM (
  'PENDING', 'RUNNING', 'RESOLVED_SUCCEEDED', 'RESOLVED_FAILED', 'NEEDS_REVIEW', 'EXPIRED'
);

CREATE TYPE "MetaReplayStatus" AS ENUM ('REQUESTED', 'CREATED', 'REJECTED');

CREATE TABLE "MetaWorkflow" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "definitionVersion" INTEGER NOT NULL,
  "status" "MetaWorkflowStatus" NOT NULL DEFAULT 'PENDING',
  "currentStepKey" TEXT,
  "priority" "MetaOperationPriority" NOT NULL DEFAULT 'P2',
  "context" JSONB NOT NULL DEFAULT '{}',
  "version" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastError" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaWorkflow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaWorkflow_definition_version_positive" CHECK ("definitionVersion" > 0),
  CONSTRAINT "MetaWorkflow_version_positive" CHECK ("version" > 0)
);

CREATE TABLE "MetaWorkflowStep" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "stepKey" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "status" "MetaWorkflowStepStatus" NOT NULL DEFAULT 'PENDING',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "input" JSONB,
  "output" JSONB,
  "beforeState" JSONB,
  "afterState" JSONB,
  "lastError" JSONB,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaWorkflowStep_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaWorkflowStep_ordinal_nonnegative" CHECK ("ordinal" >= 0),
  CONSTRAINT "MetaWorkflowStep_attempt_nonnegative" CHECK ("attempt" >= 0),
  CONSTRAINT "MetaWorkflowStep_version_positive" CHECK ("version" > 0)
);

CREATE TABLE "MetaProviderJob" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "capability" TEXT NOT NULL,
  "operationType" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "providerJobType" TEXT,
  "providerJobId" TEXT,
  "providerObjectId" TEXT,
  "status" "MetaProviderJobStatus" NOT NULL DEFAULT 'PENDING',
  "requestState" JSONB,
  "responseState" JSONB,
  "beforeState" JSONB,
  "afterState" JSONB,
  "unknownSince" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaProviderJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaProviderJob_version_positive" CHECK ("version" > 0),
  CONSTRAINT "MetaProviderJob_unknown_timestamp" CHECK ("status" <> 'UNKNOWN' OR "unknownSince" IS NOT NULL)
);

CREATE TABLE "MetaReconciliation" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "providerJobId" TEXT NOT NULL,
  "capability" TEXT NOT NULL,
  "operationType" TEXT NOT NULL,
  "resolverKey" TEXT NOT NULL,
  "status" "MetaReconciliationStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "evidence" JSONB,
  "resolution" JSONB,
  "lastError" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaReconciliation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaReconciliation_attempts_nonnegative" CHECK ("attempts" >= 0),
  CONSTRAINT "MetaReconciliation_version_positive" CHECK ("version" > 0),
  CONSTRAINT "MetaReconciliation_expiry_after_create" CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE "MetaReplay" (
  "id" TEXT NOT NULL,
  "sourceOperationId" TEXT NOT NULL,
  "replayOperationId" TEXT,
  "requestedBy" TEXT NOT NULL,
  "approvedBy" TEXT,
  "reason" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "MetaReplayStatus" NOT NULL DEFAULT 'REQUESTED',
  "rejectionCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaReplay_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaReplay_reason_required" CHECK (length(trim("reason")) >= 10),
  CONSTRAINT "MetaReplay_two_person_approval" CHECK ("approvedBy" IS NULL OR "approvedBy" <> "requestedBy")
);

CREATE TABLE "MetaWorkflowLock" (
  "scopeKey" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "leaseToken" TEXT NOT NULL,
  "fencingToken" BIGINT NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaWorkflowLock_pkey" PRIMARY KEY ("scopeKey"),
  CONSTRAINT "MetaWorkflowLock_fencing_nonnegative" CHECK ("fencingToken" >= 0)
);

CREATE UNIQUE INDEX "MetaWorkflow_operationId_key" ON "MetaWorkflow"("operationId");
CREATE INDEX "MetaWorkflow_status_priority_idx" ON "MetaWorkflow"("status", "priority", "updatedAt");
CREATE INDEX "MetaWorkflow_definition_idx" ON "MetaWorkflow"("definitionId", "definitionVersion");
CREATE UNIQUE INDEX "MetaWorkflowStep_workflow_key" ON "MetaWorkflowStep"("workflowId", "stepKey");
CREATE UNIQUE INDEX "MetaWorkflowStep_workflow_ordinal_key" ON "MetaWorkflowStep"("workflowId", "ordinal");
CREATE INDEX "MetaWorkflowStep_status_idx" ON "MetaWorkflowStep"("workflowId", "status", "ordinal");
CREATE UNIQUE INDEX "MetaProviderJob_step_fingerprint_key" ON "MetaProviderJob"("stepId", "requestFingerprint");
CREATE INDEX "MetaProviderJob_workflow_step_status_idx" ON "MetaProviderJob"("workflowId", "stepId", "status");
CREATE INDEX "MetaProviderJob_fingerprint_idx" ON "MetaProviderJob"("capability", "operationType", "requestFingerprint");
CREATE INDEX "MetaProviderJob_provider_job_idx" ON "MetaProviderJob"("providerJobId");
CREATE INDEX "MetaProviderJob_provider_object_idx" ON "MetaProviderJob"("providerObjectId");
CREATE UNIQUE INDEX "MetaReconciliation_providerJobId_key" ON "MetaReconciliation"("providerJobId");
CREATE INDEX "MetaReconciliation_due_idx" ON "MetaReconciliation"("status", "nextCheckAt");
CREATE INDEX "MetaReconciliation_workflow_status_idx" ON "MetaReconciliation"("workflowId", "status");
CREATE INDEX "MetaReconciliation_expiry_idx" ON "MetaReconciliation"("expiresAt");
CREATE UNIQUE INDEX "MetaReplay_replayOperationId_key" ON "MetaReplay"("replayOperationId");
CREATE UNIQUE INDEX "MetaReplay_idempotencyKey_key" ON "MetaReplay"("idempotencyKey");
CREATE INDEX "MetaReplay_source_created_idx" ON "MetaReplay"("sourceOperationId", "createdAt");
CREATE INDEX "MetaReplay_status_created_idx" ON "MetaReplay"("status", "createdAt");
CREATE UNIQUE INDEX "MetaWorkflowLock_leaseToken_key" ON "MetaWorkflowLock"("leaseToken");
CREATE INDEX "MetaWorkflowLock_expiry_idx" ON "MetaWorkflowLock"("expiresAt");

ALTER TABLE "MetaWorkflow" ADD CONSTRAINT "MetaWorkflow_operationId_fkey"
FOREIGN KEY ("operationId") REFERENCES "MetaOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaWorkflowStep" ADD CONSTRAINT "MetaWorkflowStep_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "MetaWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaProviderJob" ADD CONSTRAINT "MetaProviderJob_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "MetaWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaProviderJob" ADD CONSTRAINT "MetaProviderJob_stepId_fkey"
FOREIGN KEY ("stepId") REFERENCES "MetaWorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaReconciliation" ADD CONSTRAINT "MetaReconciliation_operationId_fkey"
FOREIGN KEY ("operationId") REFERENCES "MetaOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaReconciliation" ADD CONSTRAINT "MetaReconciliation_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "MetaWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaReconciliation" ADD CONSTRAINT "MetaReconciliation_stepId_fkey"
FOREIGN KEY ("stepId") REFERENCES "MetaWorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaReconciliation" ADD CONSTRAINT "MetaReconciliation_providerJobId_fkey"
FOREIGN KEY ("providerJobId") REFERENCES "MetaProviderJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaReplay" ADD CONSTRAINT "MetaReplay_sourceOperationId_fkey"
FOREIGN KEY ("sourceOperationId") REFERENCES "MetaOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MetaReplay" ADD CONSTRAINT "MetaReplay_replayOperationId_fkey"
FOREIGN KEY ("replayOperationId") REFERENCES "MetaOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "meta_workflow_protect_immutable_fields"()
RETURNS trigger AS $$
BEGIN
  IF NEW."operationId" IS DISTINCT FROM OLD."operationId"
    OR NEW."definitionId" IS DISTINCT FROM OLD."definitionId"
    OR NEW."definitionVersion" IS DISTINCT FROM OLD."definitionVersion"
    OR NEW."priority" IS DISTINCT FROM OLD."priority"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN RAISE EXCEPTION 'MetaWorkflow immutable fields cannot be changed'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "MetaWorkflow_protect_immutable_fields" BEFORE UPDATE ON "MetaWorkflow"
FOR EACH ROW EXECUTE FUNCTION "meta_workflow_protect_immutable_fields"();

CREATE OR REPLACE FUNCTION "meta_workflow_step_protect_immutable_fields"()
RETURNS trigger AS $$
BEGIN
  IF NEW."workflowId" IS DISTINCT FROM OLD."workflowId"
    OR NEW."stepKey" IS DISTINCT FROM OLD."stepKey"
    OR NEW."ordinal" IS DISTINCT FROM OLD."ordinal"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN RAISE EXCEPTION 'MetaWorkflowStep immutable fields cannot be changed'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "MetaWorkflowStep_protect_immutable_fields" BEFORE UPDATE ON "MetaWorkflowStep"
FOR EACH ROW EXECUTE FUNCTION "meta_workflow_step_protect_immutable_fields"();

CREATE OR REPLACE FUNCTION "meta_provider_job_protect_immutable_fields"()
RETURNS trigger AS $$
BEGIN
  IF NEW."workflowId" IS DISTINCT FROM OLD."workflowId"
    OR NEW."stepId" IS DISTINCT FROM OLD."stepId"
    OR NEW."capability" IS DISTINCT FROM OLD."capability"
    OR NEW."operationType" IS DISTINCT FROM OLD."operationType"
    OR NEW."requestFingerprint" IS DISTINCT FROM OLD."requestFingerprint"
    OR NEW."requestState" IS DISTINCT FROM OLD."requestState"
    OR NEW."beforeState" IS DISTINCT FROM OLD."beforeState"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN RAISE EXCEPTION 'MetaProviderJob immutable fields cannot be changed'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "MetaProviderJob_protect_immutable_fields" BEFORE UPDATE ON "MetaProviderJob"
FOR EACH ROW EXECUTE FUNCTION "meta_provider_job_protect_immutable_fields"();

CREATE OR REPLACE FUNCTION "meta_reconciliation_protect_immutable_fields"()
RETURNS trigger AS $$
BEGIN
  IF NEW."operationId" IS DISTINCT FROM OLD."operationId"
    OR NEW."workflowId" IS DISTINCT FROM OLD."workflowId"
    OR NEW."stepId" IS DISTINCT FROM OLD."stepId"
    OR NEW."providerJobId" IS DISTINCT FROM OLD."providerJobId"
    OR NEW."capability" IS DISTINCT FROM OLD."capability"
    OR NEW."operationType" IS DISTINCT FROM OLD."operationType"
    OR NEW."resolverKey" IS DISTINCT FROM OLD."resolverKey"
    OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN RAISE EXCEPTION 'MetaReconciliation immutable fields cannot be changed'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "MetaReconciliation_protect_immutable_fields" BEFORE UPDATE ON "MetaReconciliation"
FOR EACH ROW EXECUTE FUNCTION "meta_reconciliation_protect_immutable_fields"();

CREATE OR REPLACE FUNCTION "meta_replay_protect_immutable_fields"()
RETURNS trigger AS $$
BEGIN
  IF NEW."sourceOperationId" IS DISTINCT FROM OLD."sourceOperationId"
    OR NEW."requestedBy" IS DISTINCT FROM OLD."requestedBy"
    OR NEW."approvedBy" IS DISTINCT FROM OLD."approvedBy"
    OR NEW."reason" IS DISTINCT FROM OLD."reason"
    OR NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN RAISE EXCEPTION 'MetaReplay immutable fields cannot be changed'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "MetaReplay_protect_immutable_fields" BEFORE UPDATE ON "MetaReplay"
FOR EACH ROW EXECUTE FUNCTION "meta_replay_protect_immutable_fields"();
