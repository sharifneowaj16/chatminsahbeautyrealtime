-- Recovery / Rollback for: 20260212000000_add_site_config
BEGIN;

DROP INDEX IF EXISTS "SiteConfig_key_idx";

DROP INDEX IF EXISTS "SiteConfig_key_key";

DROP TABLE IF EXISTS "SiteConfig" CASCADE;

COMMIT;
