-- Recovery for Phase 31 Layer 3.7.
-- WARNING: this removes retention/replay audit metadata only. It preserves canonical receipts, dedupe keys, Leads, Instagram messages and legacy receipt rows.
-- Apply only before production operations depend on approval links or replay audit evidence.
-- Preconditions: no approved/executing replay may depend on these fields.
-- SELECT "id" FROM "MetaSocialWebhookReceipt" WHERE "replayApprovalId" IS NOT NULL OR "replayAttempt" > 0 OR "metadataPrunedAt" IS NOT NULL;

ALTER TABLE "MetaSocialWebhookReceipt" DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_replayApprovalId_fkey";
ALTER TABLE "MetaSocialWebhookReceipt" DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_replay_result_pair_check";
ALTER TABLE "MetaSocialWebhookReceipt" DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_replay_approval_complete_check";
ALTER TABLE "MetaSocialWebhookReceipt" DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_replay_source_pair_check";
ALTER TABLE "MetaSocialWebhookReceipt" DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_retention_order_check";

DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_replay_approval_idx";
DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_replay_eligibility_idx";
DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_dedupe_retention_idx";
DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_retention_idx";

ALTER TABLE "MetaSocialWebhookReceipt"
  DROP COLUMN IF EXISTS "replayResultCode",
  DROP COLUMN IF EXISTS "replayCompletedAt",
  DROP COLUMN IF EXISTS "replayApprovalReference",
  DROP COLUMN IF EXISTS "replayApprovedAt",
  DROP COLUMN IF EXISTS "replayApprovedBy",
  DROP COLUMN IF EXISTS "replayApprovalId",
  DROP COLUMN IF EXISTS "replaySourceExpiresAt",
  DROP COLUMN IF EXISTS "replaySourceId",
  DROP COLUMN IF EXISTS "replaySourceType",
  DROP COLUMN IF EXISTS "replayEligibility",
  DROP COLUMN IF EXISTS "metadataPrunedAt",
  DROP COLUMN IF EXISTS "dedupeRetainUntil",
  DROP COLUMN IF EXISTS "retentionUntil",
  DROP COLUMN IF EXISTS "retentionClass",
  DROP COLUMN IF EXISTS "lastDigestMismatchCode",
  DROP COLUMN IF EXISTS "lastDigestMismatchAt";

DROP TYPE IF EXISTS "MetaSocialWebhookReplaySourceType";
DROP TYPE IF EXISTS "MetaSocialWebhookReplayEligibility";
DROP TYPE IF EXISTS "MetaSocialWebhookRetentionClass";
