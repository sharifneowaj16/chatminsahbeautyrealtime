-- Recovery / Rollback for: 20260717050000_meta_v6_phase7_connection_health
BEGIN;

DROP INDEX IF EXISTS "MetaApiVersionPolicy_reviewBy_idx";

DROP INDEX IF EXISTS "MetaApiVersionPolicy_expirationDate_idx";

DROP INDEX IF EXISTS "MetaApiVersionPolicy_regressionStatus_idx";

DROP INDEX IF EXISTS "MetaApiVersionPolicy_latestOfficial_idx";

DROP INDEX IF EXISTS "MetaApiVersionPolicy_graphApiVersion_key";

DROP INDEX IF EXISTS "MetaConnectionCheck_status_checkedAt_idx";

DROP INDEX IF EXISTS "MetaConnectionCheck_connectionId_checkedAt_idx";

DROP INDEX IF EXISTS "MetaConnection_lastCheckedAt_idx";

DROP INDEX IF EXISTS "MetaConnection_tokenExpiresAt_idx";

DROP INDEX IF EXISTS "MetaConnection_status_idx";

DROP INDEX IF EXISTS "MetaConnection_name_key";

DROP TABLE IF EXISTS "MetaApiVersionPolicy" CASCADE;

DROP TABLE IF EXISTS "MetaConnectionCheck" CASCADE;

DROP TABLE IF EXISTS "MetaConnection" CASCADE;

DROP TYPE IF EXISTS "MetaVersionRegressionStatus" CASCADE;

DROP TYPE IF EXISTS "MetaConnectionStatus" CASCADE;

COMMIT;
