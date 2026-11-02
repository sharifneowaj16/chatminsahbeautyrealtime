-- Recovery / Rollback for: 20260717060000_meta_v6_phase8_lead_crm
BEGIN;

ALTER TABLE "MetaLead" DROP CONSTRAINT IF EXISTS "MetaLead_convertedOrderId_fkey";

ALTER TABLE "MetaLead" DROP CONSTRAINT IF EXISTS "MetaLead_assignedToId_fkey";

DROP INDEX IF EXISTS "MetaLeadAgentProfile_active_lastAssignedAt_idx";

DROP INDEX IF EXISTS "MetaLeadAgentProfile_adminId_key";

DROP INDEX IF EXISTS "MetaLeadAssignmentRule_formId_idx";

DROP INDEX IF EXISTS "MetaLeadAssignmentRule_campaignId_idx";

DROP INDEX IF EXISTS "MetaLeadAssignmentRule_active_priority_idx";

DROP INDEX IF EXISTS "MetaLeadContactAttempt_nextFollowUpAt_idx";

DROP INDEX IF EXISTS "MetaLeadContactAttempt_actorId_attemptedAt_idx";

DROP INDEX IF EXISTS "MetaLeadContactAttempt_leadId_attemptedAt_idx";

DROP INDEX IF EXISTS "MetaLeadDuplicate_reason_createdAt_idx";

DROP INDEX IF EXISTS "MetaLeadDuplicate_canonicalLeadId_createdAt_idx";

DROP INDEX IF EXISTS "MetaLeadDuplicate_sourceLeadgenId_key";

DROP INDEX IF EXISTS "MetaLead_retentionUntil_idx";

DROP INDEX IF EXISTS "MetaLead_convertedOrderId_idx";

DROP INDEX IF EXISTS "MetaLead_normalizedEmailHash_idx";

DROP INDEX IF EXISTS "MetaLead_normalizedPhoneHash_idx";

DROP INDEX IF EXISTS "MetaLead_assignedToId_status_idx";

DROP INDEX IF EXISTS "MetaLead_retrievalStatus_receivedAt_idx";

DROP INDEX IF EXISTS "MetaLead_status_receivedAt_idx";

DROP INDEX IF EXISTS "MetaWebhookReceipt_cleanupAfter_idx";

DROP INDEX IF EXISTS "MetaWebhookReceipt_pageId_formId_idx";

DROP INDEX IF EXISTS "MetaWebhookReceipt_leadgenId_idx";

DROP INDEX IF EXISTS "MetaWebhookReceipt_status_receivedAt_idx";

DROP INDEX IF EXISTS "MetaWebhookReceipt_eventKey_key";

ALTER TABLE "MetaLead"
    DROP COLUMN IF EXISTS "retentionUntil",
    DROP COLUMN IF EXISTS "lastError",
    DROP COLUMN IF EXISTS "convertedOrderId",
    DROP COLUMN IF EXISTS "lostAt",
    DROP COLUMN IF EXISTS "convertedAt",
    DROP COLUMN IF EXISTS "qualifiedAt",
    DROP COLUMN IF EXISTS "contactedAt",
    DROP COLUMN IF EXISTS "assignedAt",
    DROP COLUMN IF EXISTS "freshnessSeconds",
    DROP COLUMN IF EXISTS "receivedAt",
    DROP COLUMN IF EXISTS "assignmentReason",
    DROP COLUMN IF EXISTS "assignmentRuleId",
    DROP COLUMN IF EXISTS "assignedToId",
    DROP COLUMN IF EXISTS "retrievalStatus",
    DROP COLUMN IF EXISTS "productInterest",
    DROP COLUMN IF EXISTS "area",
    DROP COLUMN IF EXISTS "city",
    DROP COLUMN IF EXISTS "fullName",
    DROP COLUMN IF EXISTS "emailMasked",
    DROP COLUMN IF EXISTS "phoneMasked",
    DROP COLUMN IF EXISTS "normalizedEmailHash",
    DROP COLUMN IF EXISTS "normalizedPhoneHash",
    DROP COLUMN IF EXISTS "normalizedData",
    DROP COLUMN IF EXISTS "rawPayloadDigest",
    DROP COLUMN IF EXISTS "rawPayloadEncrypted",
    DROP COLUMN IF EXISTS "retailerItemId",
    DROP COLUMN IF EXISTS "partnerName",
    DROP COLUMN IF EXISTS "platform",
    DROP COLUMN IF EXISTS "isOrganic",
    DROP COLUMN IF EXISTS "campaignName",
    DROP COLUMN IF EXISTS "adsetName",
    DROP COLUMN IF EXISTS "adName";

DROP TABLE IF EXISTS "MetaLeadAgentProfile" CASCADE;

DROP TABLE IF EXISTS "MetaLeadAssignmentRule" CASCADE;

DROP TABLE IF EXISTS "MetaLeadContactAttempt" CASCADE;

DROP TABLE IF EXISTS "MetaLeadDuplicate" CASCADE;

DROP TABLE IF EXISTS "MetaWebhookReceipt" CASCADE;

DROP TYPE IF EXISTS "MetaLeadContactChannel" CASCADE;

DROP TYPE IF EXISTS "MetaLeadDuplicateReason" CASCADE;

DROP TYPE IF EXISTS "MetaWebhookProcessingStatus" CASCADE;

DROP TYPE IF EXISTS "MetaLeadRetrievalStatus" CASCADE;

DROP TYPE IF EXISTS "MetaLeadStatus" CASCADE;

COMMIT;
