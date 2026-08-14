-- Phase 31 Layer 3.4: additive provider identity health, typed relationships, and receipt tracing.
-- No legacy MetaConnection, Lead, Instagram, or receipt rows are renamed or deleted.

CREATE TYPE "MetaProviderIdentityStatus" AS ENUM ('UNVERIFIED', 'ACTIVE', 'INACTIVE', 'REVOKED');
CREATE TYPE "MetaProviderPermissionHealth" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'MISSING_PERMISSION', 'BLOCKED');
CREATE TYPE "MetaProviderIdentityRelationshipType" AS ENUM (
  'APP_ASSOCIATED_WITH_BUSINESS',
  'BUSINESS_OWNS_PAGE',
  'BUSINESS_OWNS_AD_ACCOUNT',
  'PAGE_LINKED_INSTAGRAM_ACCOUNT',
  'PAGE_CONTAINS_LEAD_FORM'
);
CREATE TYPE "MetaProviderIdentityRelationshipStatus" AS ENUM ('UNVERIFIED', 'ACTIVE', 'INACTIVE', 'REVOKED');

ALTER TABLE "MetaExternalReference"
  ADD COLUMN "identityStatus" "MetaProviderIdentityStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "permissionHealth" "MetaProviderPermissionHealth" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "permissionMetadata" JSONB,
  ADD COLUMN "lastSeenAt" TIMESTAMP(3),
  ADD COLUMN "disabledAt" TIMESTAMP(3),
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "statusReason" TEXT;

-- Existing generic references deliberately remain UNVERIFIED/UNKNOWN. No row is promoted
-- to ACTIVE by migration because provider ownership and permissions cannot be inferred safely.
CREATE INDEX "MetaExternalReference_identity_select_idx"
  ON "MetaExternalReference"("environment", "connectionKey", "assetType", "identityStatus");
CREATE INDEX "MetaExternalReference_identity_health_idx"
  ON "MetaExternalReference"("identityStatus", "permissionHealth", "lastVerifiedAt");

CREATE TABLE "MetaProviderIdentityRelationship" (
  "id" TEXT NOT NULL,
  "environment" "MetaPlatformEnvironment" NOT NULL,
  "connectionKey" TEXT NOT NULL,
  "relationshipType" "MetaProviderIdentityRelationshipType" NOT NULL,
  "parentReferenceId" TEXT NOT NULL,
  "childReferenceId" TEXT NOT NULL,
  "status" "MetaProviderIdentityRelationshipStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "source" "MetaExternalReferenceSource" NOT NULL DEFAULT 'RUNTIME',
  "metadata" JSONB,
  "lastVerifiedAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "statusReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaProviderIdentityRelationship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaProviderIdentityRelationship_distinct_refs_check" CHECK ("parentReferenceId" <> "childReferenceId")
);

-- New table is initially empty. This query is the precondition audit before creating
-- the edge uniqueness boundary if an operator preloads rows during a controlled rollout:
-- SELECT "environment", "connectionKey", "relationshipType", "parentReferenceId", "childReferenceId", COUNT(*)
-- FROM "MetaProviderIdentityRelationship"
-- GROUP BY 1,2,3,4,5 HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX "MetaProviderIdentityRelationship_scope_edge_key"
  ON "MetaProviderIdentityRelationship"("environment", "connectionKey", "relationshipType", "parentReferenceId", "childReferenceId");
CREATE INDEX "MetaProviderIdentityRelationship_parent_idx"
  ON "MetaProviderIdentityRelationship"("environment", "connectionKey", "relationshipType", "parentReferenceId");
CREATE INDEX "MetaProviderIdentityRelationship_child_idx"
  ON "MetaProviderIdentityRelationship"("environment", "connectionKey", "relationshipType", "childReferenceId");
CREATE INDEX "MetaProviderIdentityRelationship_health_idx"
  ON "MetaProviderIdentityRelationship"("status", "lastVerifiedAt");

ALTER TABLE "MetaProviderIdentityRelationship"
  ADD CONSTRAINT "MetaProviderIdentityRelationship_parentReferenceId_fkey"
  FOREIGN KEY ("parentReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaProviderIdentityRelationship_childReferenceId_fkey"
  FOREIGN KEY ("childReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MetaSocialWebhookReceipt"
  ADD COLUMN "primaryIdentityReferenceId" TEXT;
CREATE INDEX "MetaSocialWebhookReceipt_primary_identity_idx"
  ON "MetaSocialWebhookReceipt"("primaryIdentityReferenceId");
ALTER TABLE "MetaSocialWebhookReceipt"
  ADD CONSTRAINT "MetaSocialWebhookReceipt_primaryIdentityReferenceId_fkey"
  FOREIGN KEY ("primaryIdentityReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
