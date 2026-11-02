-- Recovery / Rollback for: 20260705040000_phase16_tracking_failure_retention
BEGIN;

DROP INDEX IF EXISTS "MetaCapiFailure_resolvedAt_idx";

DROP INDEX IF EXISTS "MetaCapiFailure_cleanupAfter_idx";

DROP INDEX IF EXISTS "MetaCapiFailure_failureCategory_idx";

ALTER TABLE "MetaCapiFailure"
    DROP COLUMN IF EXISTS "cleanupAfter",
    DROP COLUMN IF EXISTS "resolvedAt",
    DROP COLUMN IF EXISTS "lastRetryAt",
    DROP COLUMN IF EXISTS "failureCategory";

COMMIT;
