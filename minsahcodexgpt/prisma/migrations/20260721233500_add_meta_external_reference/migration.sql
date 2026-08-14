-- Unified Meta Platform Phase 21: environment-scoped local ↔ provider identity mapping.
-- Existing MetaConnection rows do not contain trustworthy environment provenance, so this
-- migration intentionally performs no automatic backfill. Backfill must supply an explicit
-- environment and verified asset context through the Phase 21 runbook.

CREATE TYPE "MetaPlatformEnvironment" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');
CREATE TYPE "MetaAssetType" AS ENUM (
  'APP',
  'BUSINESS',
  'AD_ACCOUNT',
  'CATALOG',
  'DATASET',
  'PIXEL',
  'PAGE',
  'INSTAGRAM_ACCOUNT',
  'LEAD_FORM'
);
CREATE TYPE "MetaExternalReferenceSource" AS ENUM ('RUNTIME', 'BACKFILL', 'RECONCILIATION', 'MANUAL');

CREATE TABLE "MetaExternalReference" (
  "id" TEXT NOT NULL,
  "environment" "MetaPlatformEnvironment" NOT NULL,
  "connectionKey" TEXT NOT NULL,
  "assetType" "MetaAssetType" NOT NULL,
  "assetId" TEXT NOT NULL,
  "objectType" TEXT NOT NULL,
  "localId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "providerParentId" TEXT,
  "canonicalKey" TEXT,
  "source" "MetaExternalReferenceSource" NOT NULL DEFAULT 'RUNTIME',
  "metadata" JSONB,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaExternalReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaExternalReference_local_scope_key"
  ON "MetaExternalReference"("environment", "connectionKey", "assetType", "assetId", "objectType", "localId");
CREATE UNIQUE INDEX "MetaExternalReference_provider_scope_key"
  ON "MetaExternalReference"("environment", "connectionKey", "assetType", "assetId", "objectType", "providerId");
CREATE INDEX "MetaExternalReference_canonical_lookup_idx"
  ON "MetaExternalReference"("environment", "connectionKey", "objectType", "canonicalKey");
CREATE INDEX "MetaExternalReference_provider_parent_idx"
  ON "MetaExternalReference"("providerParentId");
