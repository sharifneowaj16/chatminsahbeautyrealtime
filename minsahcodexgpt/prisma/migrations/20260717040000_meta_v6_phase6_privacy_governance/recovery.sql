-- Recovery / Rollback for: 20260717040000_meta_v6_phase6_privacy_governance
BEGIN;

DROP INDEX IF EXISTS "MetaEventOutbox_policyVersion_policyReason_idx";

DROP INDEX IF EXISTS "MetaEventOutbox_retentionUntil_idx";

DROP INDEX IF EXISTS "TrackingSuppression_expiresAt_idx";

DROP INDEX IF EXISTS "TrackingSuppression_active_createdAt_idx";

DROP INDEX IF EXISTS "PrivacyAuditLog_retentionUntil_idx";

DROP INDEX IF EXISTS "PrivacyAuditLog_requestId_idx";

DROP INDEX IF EXISTS "PrivacyAuditLog_subjectUserId_createdAt_idx";

DROP INDEX IF EXISTS "PrivacyAuditLog_action_createdAt_idx";

DROP INDEX IF EXISTS "DataDeletionRequest_retentionUntil_idx";

DROP INDEX IF EXISTS "DataDeletionRequest_status_requestedAt_idx";

DROP INDEX IF EXISTS "DataDeletionRequest_externalRef_idx";

DROP INDEX IF EXISTS "DataDeletionRequest_userId_requestedAt_idx";

DROP INDEX IF EXISTS "TrackingConsentRecord_retentionUntil_idx";

DROP INDEX IF EXISTS "TrackingConsentRecord_state_recordedAt_idx";

DROP INDEX IF EXISTS "TrackingConsentRecord_visitorId_recordedAt_idx";

DROP INDEX IF EXISTS "TrackingConsentRecord_userId_recordedAt_idx";

DROP INDEX IF EXISTS "TrackingSuppression_identityHash_key";

DROP INDEX IF EXISTS "DataDeletionRequest_confirmationCode_key";

ALTER TABLE "MetaEventOutbox"
    DROP COLUMN IF EXISTS "retentionUntil",
    DROP COLUMN IF EXISTS "allowAdvancedMatching",
    DROP COLUMN IF EXISTS "consentVersion",
    DROP COLUMN IF EXISTS "consentState",
    DROP COLUMN IF EXISTS "policyReason",
    DROP COLUMN IF EXISTS "policyVersion";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "trackingPolicyReason",
    DROP COLUMN IF EXISTS "trackingConsentVersion";

DROP TABLE IF EXISTS "TrackingSuppression" CASCADE;

DROP TABLE IF EXISTS "PrivacyAuditLog" CASCADE;

DROP TABLE IF EXISTS "DataDeletionRequest" CASCADE;

DROP TABLE IF EXISTS "TrackingConsentRecord" CASCADE;

DROP TYPE IF EXISTS "DataDeletionRequestStatus" CASCADE;

DROP TYPE IF EXISTS "TrackingConsentState" CASCADE;

COMMIT;
