DO $$ BEGIN
  CREATE TYPE "MetaProductSetStatus" AS ENUM ('DRAFT','READY','SYNCING','ACTIVE','EMPTY','BROKEN','ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MetaProductSetSyncStatus" AS ENUM ('NOT_SYNCED','SUBMITTED','SUCCEEDED','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "MetaIncidentType" ADD VALUE IF NOT EXISTS 'PRODUCT_SET_EMPTY';
ALTER TYPE "MetaIncidentType" ADD VALUE IF NOT EXISTS 'PRODUCT_SET_BROKEN';

CREATE TABLE IF NOT EXISTS "MetaProductSet" (
  "id" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "status" "MetaProductSetStatus" NOT NULL DEFAULT 'DRAFT',
  "syncStatus" "MetaProductSetSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
  "providerProductSetId" TEXT,
  "ruleVersion" INTEGER NOT NULL DEFAULT 1,
  "ruleJson" JSONB NOT NULL,
  "ruleHash" TEXT NOT NULL,
  "membershipHash" TEXT,
  "memberCount" INTEGER NOT NULL DEFAULT 0,
  "autoSync" BOOLEAN NOT NULL DEFAULT false,
  "previewedAt" TIMESTAMP(3),
  "previewExpiresAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "lastSucceededAt" TIMESTAMP(3),
  "lastError" JSONB,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaProductSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MetaProductSetVersion" (
  "id" TEXT NOT NULL,
  "productSetId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "ruleJson" JSONB NOT NULL,
  "ruleHash" TEXT NOT NULL,
  "membershipHash" TEXT,
  "memberCount" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaProductSetVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MetaProductSetPreview" (
  "id" TEXT NOT NULL,
  "productSetId" TEXT NOT NULL,
  "ruleVersion" INTEGER NOT NULL,
  "ruleHash" TEXT NOT NULL,
  "membershipHash" TEXT NOT NULL,
  "memberCount" INTEGER NOT NULL,
  "sampledRetailerIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaProductSetPreview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MetaProductSetMembership" (
  "id" TEXT NOT NULL,
  "productSetId" TEXT NOT NULL,
  "retailerId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "includedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaProductSetMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MetaProductSet_catalogId_slug_key" ON "MetaProductSet"("catalogId","slug");
CREATE UNIQUE INDEX IF NOT EXISTS "MetaProductSet_providerProductSetId_key" ON "MetaProductSet"("providerProductSetId");
CREATE INDEX IF NOT EXISTS "MetaProductSet_catalogId_status_idx" ON "MetaProductSet"("catalogId","status");
CREATE INDEX IF NOT EXISTS "MetaProductSet_syncStatus_updatedAt_idx" ON "MetaProductSet"("syncStatus","updatedAt");
CREATE INDEX IF NOT EXISTS "MetaProductSet_autoSync_status_idx" ON "MetaProductSet"("autoSync","status");
CREATE UNIQUE INDEX IF NOT EXISTS "MetaProductSetVersion_productSetId_version_key" ON "MetaProductSetVersion"("productSetId","version");
CREATE INDEX IF NOT EXISTS "MetaProductSetVersion_productSetId_createdAt_idx" ON "MetaProductSetVersion"("productSetId","createdAt");
CREATE INDEX IF NOT EXISTS "MetaProductSetPreview_productSetId_expiresAt_idx" ON "MetaProductSetPreview"("productSetId","expiresAt");
CREATE INDEX IF NOT EXISTS "MetaProductSetPreview_consumedAt_idx" ON "MetaProductSetPreview"("consumedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "MetaProductSetMembership_productSetId_retailerId_key" ON "MetaProductSetMembership"("productSetId","retailerId");
CREATE INDEX IF NOT EXISTS "MetaProductSetMembership_retailerId_idx" ON "MetaProductSetMembership"("retailerId");
CREATE INDEX IF NOT EXISTS "MetaProductSetMembership_sourceType_sourceId_idx" ON "MetaProductSetMembership"("sourceType","sourceId");

DO $$ BEGIN
  ALTER TABLE "MetaProductSetVersion" ADD CONSTRAINT "MetaProductSetVersion_productSetId_fkey" FOREIGN KEY ("productSetId") REFERENCES "MetaProductSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MetaProductSetPreview" ADD CONSTRAINT "MetaProductSetPreview_productSetId_fkey" FOREIGN KEY ("productSetId") REFERENCES "MetaProductSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MetaProductSetMembership" ADD CONSTRAINT "MetaProductSetMembership_productSetId_fkey" FOREIGN KEY ("productSetId") REFERENCES "MetaProductSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
