-- Full Rollback SQL for 20261123233000_auth_security_redesign
BEGIN;

DROP INDEX IF EXISTS "OtpRequest_phone_purpose_expiresAt_idx";
DROP INDEX IF EXISTS "User_phone_idx";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "passwordChangedAt",
  DROP COLUMN IF EXISTS "tokenVersion";

DELETE FROM "_prisma_migrations"
WHERE "migration_name" = '20261123233000_auth_security_redesign';

COMMIT;
