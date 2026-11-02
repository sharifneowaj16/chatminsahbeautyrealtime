-- Recovery / Rollback for: 20260717030000_meta_v6_phase5_durable_jobs
BEGIN;

DROP INDEX IF EXISTS "MetaJobAudit_nextRunAt_idx";

DROP INDEX IF EXISTS "MetaJobAudit_replayOfId_idx";

DROP INDEX IF EXISTS "MetaJobAudit_sourceId_idx";

DROP INDEX IF EXISTS "MetaJobAudit_queueName_status_idx";

DROP INDEX IF EXISTS "MetaJobAudit_status_createdAt_idx";

DROP INDEX IF EXISTS "MetaJobAudit_idempotencyKey_key";

DROP TABLE IF EXISTS "MetaJobAudit" CASCADE;

DROP TYPE IF EXISTS "MetaJobStatus" CASCADE;

COMMIT;
