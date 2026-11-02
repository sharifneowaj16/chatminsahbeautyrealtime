-- Recovery / Rollback for: 20260424000000_fb_inbox_profile_and_attachment_meta
BEGIN;

ALTER TABLE "FbMessage"
    DROP COLUMN IF EXISTS "rawPayload",
    DROP COLUMN IF EXISTS "attachmentName",
    DROP COLUMN IF EXISTS "attachmentMimeType",
    DROP COLUMN IF EXISTS "attachmentType";

ALTER TABLE "FbConversation"
    DROP COLUMN IF EXISTS "customerAvatar";

COMMIT;
