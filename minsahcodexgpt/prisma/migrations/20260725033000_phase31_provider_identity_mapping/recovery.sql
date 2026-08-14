-- WARNING: destructive recovery for Phase 31 Layer 3.4 metadata only.
-- PRECONDITIONS:
-- 1. Stop webhook/worker processes that may attach provider identities.
-- 2. Export any MetaProviderIdentityRelationship rows that must be retained.
-- 3. Verify no receipt trace requires primaryIdentityReferenceId after recovery.
-- 4. This recovery intentionally preserves MetaExternalReference, MetaConnection,
--    MetaSocialWebhookReceipt, Lead, and Instagram business rows.

ALTER TABLE "MetaSocialWebhookReceipt"
  DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_primaryIdentityReferenceId_fkey";
DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_primary_identity_idx";
ALTER TABLE "MetaSocialWebhookReceipt"
  DROP COLUMN IF EXISTS "primaryIdentityReferenceId";

ALTER TABLE "MetaProviderIdentityRelationship"
  DROP CONSTRAINT IF EXISTS "MetaProviderIdentityRelationship_parentReferenceId_fkey",
  DROP CONSTRAINT IF EXISTS "MetaProviderIdentityRelationship_childReferenceId_fkey";
DROP TABLE IF EXISTS "MetaProviderIdentityRelationship";

DROP INDEX IF EXISTS "MetaExternalReference_identity_health_idx";
DROP INDEX IF EXISTS "MetaExternalReference_identity_select_idx";
ALTER TABLE "MetaExternalReference"
  DROP COLUMN IF EXISTS "statusReason",
  DROP COLUMN IF EXISTS "revokedAt",
  DROP COLUMN IF EXISTS "disabledAt",
  DROP COLUMN IF EXISTS "lastSeenAt",
  DROP COLUMN IF EXISTS "permissionMetadata",
  DROP COLUMN IF EXISTS "permissionHealth",
  DROP COLUMN IF EXISTS "identityStatus";

DROP TYPE IF EXISTS "MetaProviderIdentityRelationshipStatus";
DROP TYPE IF EXISTS "MetaProviderIdentityRelationshipType";
DROP TYPE IF EXISTS "MetaProviderPermissionHealth";
DROP TYPE IF EXISTS "MetaProviderIdentityStatus";
