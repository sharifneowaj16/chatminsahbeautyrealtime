-- Recovery / Rollback for: 20260428163000_add_pathao_address_fields
BEGIN;

ALTER TABLE "Address"
    DROP COLUMN IF EXISTS "pathaoAreaId",
    DROP COLUMN IF EXISTS "pathaoZoneId",
    DROP COLUMN IF EXISTS "pathaoCityId";

COMMIT;
