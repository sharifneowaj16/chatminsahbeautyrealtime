-- Recovery / Rollback for: 20260718010000_meta_v6_phase9_admin_operations
BEGIN;

DROP INDEX IF EXISTS "MetaAdminAudit_outcome_createdAt_idx";

DROP INDEX IF EXISTS "MetaAdminAudit_approvalId_idx";

DROP INDEX IF EXISTS "MetaAdminAudit_resourceType_resourceId_idx";

DROP INDEX IF EXISTS "MetaAdminAudit_actionKey_createdAt_idx";

DROP INDEX IF EXISTS "MetaAdminAudit_actorId_createdAt_idx";

DROP INDEX IF EXISTS "MetaAdminApproval_requestedById_requestedAt_idx";

DROP INDEX IF EXISTS "MetaAdminApproval_resourceType_resourceId_idx";

DROP INDEX IF EXISTS "MetaAdminApproval_actionKey_status_idx";

DROP INDEX IF EXISTS "MetaAdminApproval_status_expiresAt_idx";

DROP TABLE IF EXISTS "MetaAdminAudit" CASCADE;

DROP TABLE IF EXISTS "MetaAdminApproval" CASCADE;

DROP TYPE IF EXISTS "MetaAdminAuditOutcome" CASCADE;

DROP TYPE IF EXISTS "MetaAdminApprovalStatus" CASCADE;

DROP TYPE IF EXISTS "MetaAdminActionRisk" CASCADE;

COMMIT;
