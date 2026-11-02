-- Recovery / Rollback for: 20260718020000_meta_v6_phase10_observability
BEGIN;

DROP INDEX IF EXISTS "MetaWebhookReceipt_correlationId_idx";

DROP INDEX IF EXISTS "MetaJobAudit_correlationId_idx";

DROP INDEX IF EXISTS "MetaCatalogBatch_correlationId_idx";

DROP INDEX IF EXISTS "MetaEventOutbox_correlationId_idx";

DROP INDEX IF EXISTS "MetaIncident_correlationId_idx";

DROP INDEX IF EXISTS "MetaIncident_resourceType_resourceId_idx";

DROP INDEX IF EXISTS "MetaIncident_incidentType_status_idx";

DROP INDEX IF EXISTS "MetaIncident_status_severity_lastSeenAt_idx";

DROP INDEX IF EXISTS "MetaIncident_dedupeKey_key";

DROP INDEX IF EXISTS "MetaCatalogDiagnosticItem_status_lastSeenAt_idx";

DROP INDEX IF EXISTS "MetaCatalogDiagnosticItem_retailerId_status_idx";

DROP INDEX IF EXISTS "MetaCatalogDiagnosticItem_diagnosticId_retailerId_key";

DROP INDEX IF EXISTS "MetaCatalogDiagnostic_correlationId_idx";

DROP INDEX IF EXISTS "MetaCatalogDiagnostic_lastSeenAt_idx";

DROP INDEX IF EXISTS "MetaCatalogDiagnostic_issueType_status_idx";

DROP INDEX IF EXISTS "MetaCatalogDiagnostic_catalogId_status_severity_idx";

DROP INDEX IF EXISTS "MetaCatalogDiagnostic_catalogId_diagnosticKey_key";

ALTER TABLE "MetaWebhookReceipt"
    DROP COLUMN IF EXISTS "correlationId";

ALTER TABLE "MetaJobAudit"
    DROP COLUMN IF EXISTS "correlationId";

ALTER TABLE "MetaCatalogBatch"
    DROP COLUMN IF EXISTS "correlationId";

ALTER TABLE "MetaEventOutbox"
    DROP COLUMN IF EXISTS "correlationId";

DROP TABLE IF EXISTS "MetaIncident" CASCADE;

DROP TABLE IF EXISTS "MetaCatalogDiagnosticItem" CASCADE;

DROP TABLE IF EXISTS "MetaCatalogDiagnostic" CASCADE;

DROP TYPE IF EXISTS "MetaIncidentStatus" CASCADE;

DROP TYPE IF EXISTS "MetaIncidentSeverity" CASCADE;

DROP TYPE IF EXISTS "MetaIncidentType" CASCADE;

DROP TYPE IF EXISTS "MetaCatalogDiagnosticStatus" CASCADE;

DROP TYPE IF EXISTS "MetaCatalogDiagnosticSeverity" CASCADE;

COMMIT;
