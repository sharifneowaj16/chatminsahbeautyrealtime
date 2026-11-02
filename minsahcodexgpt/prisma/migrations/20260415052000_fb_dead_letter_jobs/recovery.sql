-- Recovery / Rollback for: 20260415052000_fb_dead_letter_jobs
BEGIN;

DROP INDEX IF EXISTS "FbDeadLetterJob_outboxMessageId_idx";

DROP INDEX IF EXISTS "FbDeadLetterJob_fbMessageId_idx";

DROP INDEX IF EXISTS "FbDeadLetterJob_pageId_threadId_idx";

DROP INDEX IF EXISTS "FbDeadLetterJob_source_status_idx";

DROP INDEX IF EXISTS "FbDeadLetterJob_status_lastFailedAt_idx";

DROP INDEX IF EXISTS "FbDeadLetterJob_dedupeKey_key";

DROP TABLE IF EXISTS "FbDeadLetterJob" CASCADE;

DROP TYPE IF EXISTS "FbDeadLetterStatus" CASCADE;

DROP TYPE IF EXISTS "FbDeadLetterSource" CASCADE;

COMMIT;
