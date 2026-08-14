-- Phase 22: role-isolated Meta credential metadata.
-- This migration intentionally stores only secret references and safe rotation/permission metadata.
-- It performs no automatic backfill because existing connection rows do not identify a trustworthy credential role.

CREATE TYPE "MetaCredentialRole" AS ENUM ('APP', 'BUSINESS_SYSTEM_USER', 'CAPI', 'PAGE', 'INSTAGRAM');

CREATE TABLE "MetaCredentialMetadata" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT,
    "connectionKey" TEXT NOT NULL,
    "role" "MetaCredentialRole" NOT NULL,
    "secretRef" TEXT NOT NULL,
    "credentialVersion" TEXT NOT NULL,
    "appId" TEXT,
    "permissions" JSONB,
    "rotatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "dataAccessExpiresAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaCredentialMetadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaCredentialMetadata_connection_role_key"
ON "MetaCredentialMetadata"("connectionKey", "role");

CREATE INDEX "MetaCredentialMetadata_connection_idx"
ON "MetaCredentialMetadata"("connectionId");

CREATE INDEX "MetaCredentialMetadata_expires_idx"
ON "MetaCredentialMetadata"("expiresAt");

CREATE INDEX "MetaCredentialMetadata_version_idx"
ON "MetaCredentialMetadata"("credentialVersion");

ALTER TABLE "MetaCredentialMetadata"
ADD CONSTRAINT "MetaCredentialMetadata_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "MetaConnection"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
