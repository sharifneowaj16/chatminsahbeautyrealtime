-- Recovery / Rollback for: 20260409000000_add_social_message_attachments
BEGIN;

DROP INDEX IF EXISTS "SocialMessageAttachment_messageId_externalId_key";

DROP INDEX IF EXISTS "SocialMessage_platform_externalId_key";

DROP INDEX IF EXISTS "SocialMessageAttachment_type_idx";

DROP INDEX IF EXISTS "SocialMessageAttachment_messageId_idx";

ALTER TABLE "SocialMessage"
    DROP COLUMN IF EXISTS "rawPayload";

DROP TABLE IF EXISTS "SocialMessageAttachment" CASCADE;

COMMIT;
