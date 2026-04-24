-- Add customer avatar and richer message metadata for Messenger inbox.

ALTER TABLE "FbConversation"
ADD COLUMN IF NOT EXISTS "customerAvatar" TEXT;

ALTER TABLE "FbMessage"
ADD COLUMN IF NOT EXISTS "attachmentType" "FbAttachmentType",
ADD COLUMN IF NOT EXISTS "attachmentMimeType" TEXT,
ADD COLUMN IF NOT EXISTS "attachmentName" TEXT,
ADD COLUMN IF NOT EXISTS "rawPayload" JSONB;

