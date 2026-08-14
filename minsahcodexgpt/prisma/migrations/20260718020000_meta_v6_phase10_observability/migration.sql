CREATE TYPE "MetaCatalogDiagnosticSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');
CREATE TYPE "MetaCatalogDiagnosticStatus" AS ENUM ('ACTIVE', 'RESOLVED');
CREATE TYPE "MetaIncidentType" AS ENUM ('CATALOG_DIAGNOSTIC', 'CATALOG_BATCH_STUCK', 'CATALOG_FAILURE_SPIKE', 'TOKEN_INVALID', 'GRAPH_VERSION_EXPIRING', 'CAPI_FAILURE_SPIKE', 'PURCHASE_SILENCE', 'WEBHOOK_SILENCE', 'QUEUE_BACKLOG', 'MASS_DELETE_CANDIDATE');
CREATE TYPE "MetaIncidentSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');
CREATE TYPE "MetaIncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

ALTER TABLE "MetaEventOutbox" ADD COLUMN "correlationId" TEXT;
UPDATE "MetaEventOutbox" SET "correlationId" = 'meta-event:' || substr(md5("id"), 1, 24) WHERE "correlationId" IS NULL;
ALTER TABLE "MetaEventOutbox" ALTER COLUMN "correlationId" SET NOT NULL;
ALTER TABLE "MetaCatalogBatch" ADD COLUMN "correlationId" TEXT;
ALTER TABLE "MetaJobAudit" ADD COLUMN "correlationId" TEXT;
ALTER TABLE "MetaWebhookReceipt" ADD COLUMN "correlationId" TEXT;

CREATE TABLE "MetaCatalogDiagnostic" (
  "id" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "diagnosticKey" TEXT NOT NULL,
  "issueType" TEXT NOT NULL,
  "severity" "MetaCatalogDiagnosticSeverity" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "affectedItemCount" INTEGER NOT NULL DEFAULT 0,
  "status" "MetaCatalogDiagnosticStatus" NOT NULL DEFAULT 'ACTIVE',
  "correlationId" TEXT,
  "rawData" JSONB,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaCatalogDiagnostic_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MetaCatalogDiagnosticItem" (
  "id" TEXT NOT NULL,
  "diagnosticId" TEXT NOT NULL,
  "retailerId" TEXT NOT NULL,
  "providerItemId" TEXT,
  "status" "MetaCatalogDiagnosticStatus" NOT NULL DEFAULT 'ACTIVE',
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaCatalogDiagnosticItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MetaIncident" (
  "id" TEXT NOT NULL,
  "incidentType" "MetaIncidentType" NOT NULL,
  "severity" "MetaIncidentSeverity" NOT NULL,
  "status" "MetaIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "dedupeKey" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "summary" TEXT NOT NULL,
  "details" JSONB,
  "correlationId" TEXT,
  "runbookUrl" TEXT,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cooldownUntil" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaIncident_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaCatalogDiagnostic_catalogId_diagnosticKey_key" ON "MetaCatalogDiagnostic"("catalogId", "diagnosticKey");
CREATE INDEX "MetaCatalogDiagnostic_catalogId_status_severity_idx" ON "MetaCatalogDiagnostic"("catalogId", "status", "severity");
CREATE INDEX "MetaCatalogDiagnostic_issueType_status_idx" ON "MetaCatalogDiagnostic"("issueType", "status");
CREATE INDEX "MetaCatalogDiagnostic_lastSeenAt_idx" ON "MetaCatalogDiagnostic"("lastSeenAt");
CREATE INDEX "MetaCatalogDiagnostic_correlationId_idx" ON "MetaCatalogDiagnostic"("correlationId");
CREATE UNIQUE INDEX "MetaCatalogDiagnosticItem_diagnosticId_retailerId_key" ON "MetaCatalogDiagnosticItem"("diagnosticId", "retailerId");
CREATE INDEX "MetaCatalogDiagnosticItem_retailerId_status_idx" ON "MetaCatalogDiagnosticItem"("retailerId", "status");
CREATE INDEX "MetaCatalogDiagnosticItem_status_lastSeenAt_idx" ON "MetaCatalogDiagnosticItem"("status", "lastSeenAt");
CREATE UNIQUE INDEX "MetaIncident_dedupeKey_key" ON "MetaIncident"("dedupeKey");
CREATE INDEX "MetaIncident_status_severity_lastSeenAt_idx" ON "MetaIncident"("status", "severity", "lastSeenAt");
CREATE INDEX "MetaIncident_incidentType_status_idx" ON "MetaIncident"("incidentType", "status");
CREATE INDEX "MetaIncident_resourceType_resourceId_idx" ON "MetaIncident"("resourceType", "resourceId");
CREATE INDEX "MetaIncident_correlationId_idx" ON "MetaIncident"("correlationId");
CREATE INDEX "MetaEventOutbox_correlationId_idx" ON "MetaEventOutbox"("correlationId");
CREATE INDEX "MetaCatalogBatch_correlationId_idx" ON "MetaCatalogBatch"("correlationId");
CREATE INDEX "MetaJobAudit_correlationId_idx" ON "MetaJobAudit"("correlationId");
CREATE INDEX "MetaWebhookReceipt_correlationId_idx" ON "MetaWebhookReceipt"("correlationId");

ALTER TABLE "MetaCatalogDiagnosticItem" ADD CONSTRAINT "MetaCatalogDiagnosticItem_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "MetaCatalogDiagnostic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaIncident" ADD CONSTRAINT "MetaIncident_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaIncident" ADD CONSTRAINT "MetaIncident_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
