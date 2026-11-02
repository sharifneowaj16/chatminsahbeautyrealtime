-- Recovery / Rollback for: 20260716000100_add_meta_business_platform
BEGIN;

DROP INDEX IF EXISTS "MetaBusinessSyncLog_createdAt_idx";

DROP INDEX IF EXISTS "MetaBusinessSyncLog_status_idx";

DROP INDEX IF EXISTS "MetaBusinessSyncLog_resourceId_idx";

DROP INDEX IF EXISTS "MetaBusinessSyncLog_operation_idx";

DROP INDEX IF EXISTS "MetaLead_fetchedAt_idx";

DROP INDEX IF EXISTS "MetaLead_createdTime_idx";

DROP INDEX IF EXISTS "MetaLead_status_idx";

DROP INDEX IF EXISTS "MetaLead_campaignId_idx";

DROP INDEX IF EXISTS "MetaLead_adsetId_idx";

DROP INDEX IF EXISTS "MetaLead_adId_idx";

DROP INDEX IF EXISTS "MetaLead_pageId_idx";

DROP INDEX IF EXISTS "MetaLead_formId_idx";

DROP INDEX IF EXISTS "MetaLead_leadgenId_key";

DROP TABLE IF EXISTS "MetaBusinessSyncLog" CASCADE;

DROP TABLE IF EXISTS "MetaLead" CASCADE;

COMMIT;
