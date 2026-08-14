-- Meta v6 Phase 7: persisted connection, token, permission, asset and API version health.
CREATE TYPE "MetaConnectionStatus" AS ENUM (
  'UNCONFIGURED',
  'HEALTHY',
  'DEGRADED',
  'INVALID_TOKEN',
  'MISSING_PERMISSION',
  'ASSET_NOT_FOUND',
  'VERSION_WARNING',
  'ERROR'
);

CREATE TYPE "MetaVersionRegressionStatus" AS ENUM ('PENDING', 'PASS', 'FAIL', 'WAIVED');

CREATE TABLE "MetaConnection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "appId" TEXT,
  "businessId" TEXT,
  "catalogId" TEXT,
  "datasetId" TEXT,
  "pixelId" TEXT,
  "adAccountId" TEXT,
  "pageId" TEXT,
  "instagramAccountId" TEXT,
  "tokenRef" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "dataAccessExpiresAt" TIMESTAMP(3),
  "graphApiVersion" TEXT NOT NULL,
  "sdkVersion" TEXT,
  "status" "MetaConnectionStatus" NOT NULL DEFAULT 'UNCONFIGURED',
  "permissions" JSONB,
  "assets" JSONB,
  "warnings" JSONB,
  "lastCheckedAt" TIMESTAMP(3),
  "lastSuccessfulAt" TIMESTAMP(3),
  "lastError" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaConnection_name_key" ON "MetaConnection"("name");
CREATE INDEX "MetaConnection_status_idx" ON "MetaConnection"("status");
CREATE INDEX "MetaConnection_tokenExpiresAt_idx" ON "MetaConnection"("tokenExpiresAt");
CREATE INDEX "MetaConnection_lastCheckedAt_idx" ON "MetaConnection"("lastCheckedAt");

CREATE TABLE "MetaConnectionCheck" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "status" "MetaConnectionStatus" NOT NULL,
  "tokenValid" BOOLEAN,
  "tokenExpiresAt" TIMESTAMP(3),
  "dataAccessExpiresAt" TIMESTAMP(3),
  "appIdMatches" BOOLEAN,
  "permissions" JSONB,
  "assets" JSONB,
  "versionPolicy" JSONB,
  "warnings" JSONB,
  "safeError" JSONB,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaConnectionCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MetaConnectionCheck_connectionId_checkedAt_idx" ON "MetaConnectionCheck"("connectionId", "checkedAt");
CREATE INDEX "MetaConnectionCheck_status_checkedAt_idx" ON "MetaConnectionCheck"("status", "checkedAt");
ALTER TABLE "MetaConnectionCheck" ADD CONSTRAINT "MetaConnectionCheck_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "MetaConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MetaApiVersionPolicy" (
  "id" TEXT NOT NULL,
  "graphApiVersion" TEXT NOT NULL,
  "releaseDate" TIMESTAMP(3),
  "expirationDate" TIMESTAMP(3),
  "warningDate" TIMESTAMP(3),
  "blockDate" TIMESTAMP(3),
  "reviewBy" TIMESTAMP(3),
  "latestOfficial" BOOLEAN NOT NULL DEFAULT false,
  "minimumSupported" BOOLEAN NOT NULL DEFAULT false,
  "sdkVersion" TEXT,
  "regressionStatus" "MetaVersionRegressionStatus" NOT NULL DEFAULT 'PENDING',
  "regressionEvidence" JSONB,
  "sourceUrl" TEXT,
  "lastVerifiedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaApiVersionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaApiVersionPolicy_graphApiVersion_key" ON "MetaApiVersionPolicy"("graphApiVersion");
CREATE INDEX "MetaApiVersionPolicy_latestOfficial_idx" ON "MetaApiVersionPolicy"("latestOfficial");
CREATE INDEX "MetaApiVersionPolicy_regressionStatus_idx" ON "MetaApiVersionPolicy"("regressionStatus");
CREATE INDEX "MetaApiVersionPolicy_expirationDate_idx" ON "MetaApiVersionPolicy"("expirationDate");
CREATE INDEX "MetaApiVersionPolicy_reviewBy_idx" ON "MetaApiVersionPolicy"("reviewBy");

-- Seed the controlled v24 -> v25 policy without inventing an official expiration date.
INSERT INTO "MetaApiVersionPolicy" (
  "id", "graphApiVersion", "releaseDate", "warningDate", "blockDate", "reviewBy",
  "latestOfficial", "minimumSupported", "sdkVersion", "regressionStatus", "sourceUrl", "lastVerifiedAt", "updatedAt"
) VALUES
  ('meta-api-v24-policy', 'v24.0', '2025-10-08T00:00:00.000Z', '2026-07-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', false, true, '24.0.1', 'PASS', 'https://developers.facebook.com/docs/graph-api/changelog/versions/', '2026-07-17T00:00:00.000Z', CURRENT_TIMESTAMP),
  ('meta-api-v25-policy', 'v25.0', '2026-02-18T00:00:00.000Z', NULL, NULL, '2026-08-18T00:00:00.000Z', true, false, NULL, 'PENDING', 'https://developers.facebook.com/docs/graph-api/changelog/versions/', '2026-07-17T00:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT ("graphApiVersion") DO NOTHING;
