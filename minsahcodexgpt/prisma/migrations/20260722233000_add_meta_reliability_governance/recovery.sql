-- Recovery is destructive and must only be used before Phase 26 consumers depend on these fields.
-- After rollout, prefer a forward-fix migration.
BEGIN;

DROP INDEX IF EXISTS "MetaOutboxMessage_priority_due_idx";
DROP INDEX IF EXISTS "MetaOperation_expiry_idx";
DROP INDEX IF EXISTS "MetaOperation_status_priority_due_idx";
CREATE INDEX IF NOT EXISTS "MetaOperation_status_created_idx" ON "MetaOperation"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "MetaOutboxMessage_due_idx" ON "MetaOutboxMessage"("state", "availableAt");
ALTER TABLE "MetaOperation" DROP CONSTRAINT IF EXISTS "MetaOperation_expiry_after_creation";

-- Restore the pre-Phase-26 trigger bodies before removing priority/expiry columns.
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

ALTER TABLE "MetaOutboxMessage" DROP COLUMN IF EXISTS "priority";
ALTER TABLE "MetaOperation" DROP COLUMN IF EXISTS "nextAttemptAt", DROP COLUMN IF EXISTS "expiresAt", DROP COLUMN IF EXISTS "priority";
DROP TYPE IF EXISTS "MetaOperationPriority";
-- PostgreSQL enum values added to MetaOperationEventType are intentionally retained; removing enum values requires type recreation.

COMMIT;
