-- Phase 26: distributed reliability metadata, operation priorities and expiry.
CREATE TYPE "MetaOperationPriority" AS ENUM ('P0', 'P1', 'P2', 'P3', 'P4');

ALTER TYPE "MetaOperationEventType" ADD VALUE IF NOT EXISTS 'EXECUTION_DEFERRED';
ALTER TYPE "MetaOperationEventType" ADD VALUE IF NOT EXISTS 'OPERATION_EXPIRED';
ALTER TYPE "MetaOperationEventType" ADD VALUE IF NOT EXISTS 'QUEUE_BACKPRESSURE';

ALTER TABLE "MetaOperation"
  ADD COLUMN "priority" "MetaOperationPriority" NOT NULL DEFAULT 'P2',
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3);

UPDATE "MetaOperation"
SET "expiresAt" = "createdAt" + INTERVAL '24 hours'
WHERE "expiresAt" IS NULL;

ALTER TABLE "MetaOperation"
  ALTER COLUMN "expiresAt" SET NOT NULL,
  ALTER COLUMN "priority" DROP DEFAULT;

ALTER TABLE "MetaOperation"
  ADD CONSTRAINT "MetaOperation_expiry_after_creation" CHECK ("expiresAt" > "createdAt");

ALTER TABLE "MetaOutboxMessage"
  ADD COLUMN "priority" "MetaOperationPriority" NOT NULL DEFAULT 'P2';

UPDATE "MetaOutboxMessage" AS outbox
SET "priority" = operation."priority"
FROM "MetaOperation" AS operation
WHERE operation."id" = outbox."operationId";

ALTER TABLE "MetaOutboxMessage" ALTER COLUMN "priority" DROP DEFAULT;

DROP INDEX IF EXISTS "MetaOperation_status_created_idx";
DROP INDEX IF EXISTS "MetaOutboxMessage_due_idx";
CREATE INDEX "MetaOperation_status_priority_due_idx"
  ON "MetaOperation"("status", "priority", "nextAttemptAt", "createdAt");
CREATE INDEX "MetaOperation_expiry_idx" ON "MetaOperation"("expiresAt");
CREATE INDEX "MetaOutboxMessage_priority_due_idx"
  ON "MetaOutboxMessage"("state", "priority", "availableAt");

-- Priority and expiry are immutable command identity/governance fields.
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
    OR NEW."priority" IS DISTINCT FROM OLD."priority"
    OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt"
    OR NEW."replayOfOperationId" IS DISTINCT FROM OLD."replayOfOperationId"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN
    RAISE EXCEPTION 'MetaOperation immutable fields cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    OR NEW."priority" IS DISTINCT FROM OLD."priority"
    OR NEW."maxAttempts" IS DISTINCT FROM OLD."maxAttempts"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN
    RAISE EXCEPTION 'MetaOutboxMessage immutable fields cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
