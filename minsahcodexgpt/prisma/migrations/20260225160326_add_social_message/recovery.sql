-- Recovery / Rollback for: 20260225160326_add_social_message
BEGIN;

DROP INDEX IF EXISTS "SocialMessage_timestamp_idx";

DROP INDEX IF EXISTS "SocialMessage_isRead_idx";

DROP INDEX IF EXISTS "SocialMessage_platform_idx";

DROP TABLE IF EXISTS "SocialMessage" CASCADE;

COMMIT;
