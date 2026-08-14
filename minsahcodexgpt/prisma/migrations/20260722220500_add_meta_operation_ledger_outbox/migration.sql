-- Phase 25: immutable Meta operation ledger, append-only events and transactional outbox.
-- Provider calls are intentionally not performed inside database transactions.

CREATE TYPE "MetaOperationStatus" AS ENUM (
  'ACCEPTED', 'DISPATCHING', 'QUEUED', 'RUNNING', 'SUCCEEDED',
  'RETRYABLE_FAILURE', 'PERMANENT_FAILURE', 'QUARANTINED', 'CANCELLED'
);

CREATE TYPE "MetaOperationEventType" AS ENUM (
  'OPERATION_ACCEPTED', 'OUTBOX_CREATED', 'OUTBOX_CLAIMED', 'OUTBOX_PUBLISHED',
  'OUTBOX_RELEASED', 'EXECUTION_STARTED', 'EXECUTION_SUCCEEDED', 'EXECUTION_FAILED',
  'PAYLOAD_QUARANTINED', 'DUPLICATE_IGNORED', 'OPERATION_CANCELLED'
);

CREATE TYPE "MetaOutboxMessageState" AS ENUM (
  'PENDING', 'CLAIMED', 'PUBLISHED', 'RETRY_SCHEDULED', 'QUARANTINED', 'DEAD_LETTER'
);

CREATE TABLE "MetaOperation" (
  "id" TEXT NOT NULL,
  "environment" "MetaPlatformEnvironment" NOT NULL,
  "connectionKey" TEXT NOT NULL,
  "capability" TEXT NOT NULL,
  "operationType" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorReference" TEXT,
  "assetType" "MetaAssetType",
  "assetId" TEXT,
  "credentialRole" "MetaCredentialRole",
  "payloadType" TEXT NOT NULL,
  "payloadSchemaVersion" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "payloadDigest" TEXT NOT NULL,
  "status" "MetaOperationStatus" NOT NULL DEFAULT 'ACCEPTED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "replayOfOperationId" TEXT,
  "result" JSONB,
  "lastError" JSONB,
  "executionLeaseToken" TEXT,
  "executionLeaseExpiresAt" TIMESTAMP(3),
  "nextEventSequence" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaOperation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaOperation_payload_version_positive" CHECK ("payloadSchemaVersion" > 0),
  CONSTRAINT "MetaOperation_attempts_nonnegative" CHECK ("attempts" >= 0),
  CONSTRAINT "MetaOperation_event_sequence_nonnegative" CHECK ("nextEventSequence" >= 0)
);

CREATE TABLE "MetaOperationEvent" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "eventType" "MetaOperationEventType" NOT NULL,
  "fromStatus" "MetaOperationStatus",
  "toStatus" "MetaOperationStatus",
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "safeDetails" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaOperationEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaOperationEvent_sequence_positive" CHECK ("sequence" > 0),
  CONSTRAINT "MetaOperationEvent_attempt_nonnegative" CHECK ("attempt" >= 0)
);

CREATE TABLE "MetaOutboxMessage" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "partitionKey" TEXT NOT NULL,
  "payloadType" TEXT NOT NULL,
  "payloadSchemaVersion" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "payloadDigest" TEXT NOT NULL,
  "state" "MetaOutboxMessageState" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 10,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "lastError" JSONB,
  "quarantineReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaOutboxMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaOutboxMessage_payload_version_positive" CHECK ("payloadSchemaVersion" > 0),
  CONSTRAINT "MetaOutboxMessage_attempt_bounds" CHECK ("attempts" >= 0 AND "maxAttempts" > 0)
);

CREATE UNIQUE INDEX "MetaOperation_idempotency_scope_key"
ON "MetaOperation"("environment", "connectionKey", "idempotencyKey");
CREATE INDEX "MetaOperation_status_created_idx" ON "MetaOperation"("status", "createdAt");
CREATE INDEX "MetaOperation_correlation_idx" ON "MetaOperation"("correlationId");
CREATE INDEX "MetaOperation_scope_type_idx" ON "MetaOperation"("environment", "connectionKey", "capability", "operationType");
CREATE INDEX "MetaOperation_asset_idx" ON "MetaOperation"("assetType", "assetId");
CREATE INDEX "MetaOperation_execution_lease_idx" ON "MetaOperation"("executionLeaseExpiresAt");
CREATE INDEX "MetaOperation_replay_idx" ON "MetaOperation"("replayOfOperationId");

CREATE UNIQUE INDEX "MetaOperationEvent_operation_sequence_key"
ON "MetaOperationEvent"("operationId", "sequence");
CREATE INDEX "MetaOperationEvent_operation_created_idx" ON "MetaOperationEvent"("operationId", "createdAt");
CREATE INDEX "MetaOperationEvent_type_created_idx" ON "MetaOperationEvent"("eventType", "createdAt");

CREATE UNIQUE INDEX "MetaOutboxMessage_operationId_key" ON "MetaOutboxMessage"("operationId");
CREATE INDEX "MetaOutboxMessage_due_idx" ON "MetaOutboxMessage"("state", "availableAt");
CREATE INDEX "MetaOutboxMessage_lease_idx" ON "MetaOutboxMessage"("leaseExpiresAt");
CREATE INDEX "MetaOutboxMessage_partition_idx" ON "MetaOutboxMessage"("topic", "partitionKey", "createdAt");

ALTER TABLE "MetaOperation"
ADD CONSTRAINT "MetaOperation_replayOfOperationId_fkey"
FOREIGN KEY ("replayOfOperationId") REFERENCES "MetaOperation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MetaOperationEvent"
ADD CONSTRAINT "MetaOperationEvent_operationId_fkey"
FOREIGN KEY ("operationId") REFERENCES "MetaOperation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MetaOutboxMessage"
ADD CONSTRAINT "MetaOutboxMessage_operationId_fkey"
FOREIGN KEY ("operationId") REFERENCES "MetaOperation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Event rows are append-only audit history. Corrections use a new event.
CREATE OR REPLACE FUNCTION "meta_operation_event_append_only"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'MetaOperationEvent is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "MetaOperationEvent_no_update"
BEFORE UPDATE ON "MetaOperationEvent"
FOR EACH ROW EXECUTE FUNCTION "meta_operation_event_append_only"();

CREATE TRIGGER "MetaOperationEvent_no_delete"
BEFORE DELETE ON "MetaOperationEvent"
FOR EACH ROW EXECUTE FUNCTION "meta_operation_event_append_only"();

-- The operation identity, scope and command payload are immutable after insert.
CREATE OR REPLACE FUNCTION "meta_operation_protect_immutable_fields"()
RETURNS trigger AS $$
BEGIN
  IF NEW."environment" IS DISTINCT FROM OLD."environment"
    OR NEW."connectionKey" IS DISTINCT FROM OLD."connectionKey"
    OR NEW."capability" IS DISTINCT FROM OLD."capability"
    OR NEW."operationType" IS DISTINCT FROM OLD."operationType"
    OR NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey"
    OR NEW."correlationId" IS DISTINCT FROM OLD."correlationId"
    OR NEW."actorType" IS DISTINCT FROM OLD."actorType"
    OR NEW."actorReference" IS DISTINCT FROM OLD."actorReference"
    OR NEW."assetType" IS DISTINCT FROM OLD."assetType"
    OR NEW."assetId" IS DISTINCT FROM OLD."assetId"
    OR NEW."credentialRole" IS DISTINCT FROM OLD."credentialRole"
    OR NEW."payloadType" IS DISTINCT FROM OLD."payloadType"
    OR NEW."payloadSchemaVersion" IS DISTINCT FROM OLD."payloadSchemaVersion"
    OR NEW."payload" IS DISTINCT FROM OLD."payload"
    OR NEW."payloadDigest" IS DISTINCT FROM OLD."payloadDigest"
    OR NEW."replayOfOperationId" IS DISTINCT FROM OLD."replayOfOperationId"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN
    RAISE EXCEPTION 'MetaOperation immutable fields cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "MetaOperation_protect_immutable_fields"
BEFORE UPDATE ON "MetaOperation"
FOR EACH ROW EXECUTE FUNCTION "meta_operation_protect_immutable_fields"();

-- Outbox routing and payload identity are immutable; only delivery projection may change.
CREATE OR REPLACE FUNCTION "meta_outbox_protect_immutable_fields"()
RETURNS trigger AS $$
BEGIN
  IF NEW."operationId" IS DISTINCT FROM OLD."operationId"
    OR NEW."topic" IS DISTINCT FROM OLD."topic"
    OR NEW."partitionKey" IS DISTINCT FROM OLD."partitionKey"
    OR NEW."payloadType" IS DISTINCT FROM OLD."payloadType"
    OR NEW."payloadSchemaVersion" IS DISTINCT FROM OLD."payloadSchemaVersion"
    OR NEW."payload" IS DISTINCT FROM OLD."payload"
    OR NEW."payloadDigest" IS DISTINCT FROM OLD."payloadDigest"
    OR NEW."maxAttempts" IS DISTINCT FROM OLD."maxAttempts"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN
    RAISE EXCEPTION 'MetaOutboxMessage immutable fields cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "MetaOutboxMessage_protect_immutable_fields"
BEFORE UPDATE ON "MetaOutboxMessage"
FOR EACH ROW EXECUTE FUNCTION "meta_outbox_protect_immutable_fields"();
