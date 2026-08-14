-- Phase 31 Layer 3.7: sanitized payload digest mismatch evidence, retention and controlled replay metadata.
-- Additive only. Raw webhook payloads, access tokens, secrets and unbounded provider responses are not introduced.

CREATE TYPE "MetaSocialWebhookRetentionClass" AS ENUM (
  'STANDARD_WEBHOOK', 'EXTENDED_FAILURE', 'REPLAY_AUDIT', 'SECURITY_REVIEW'
);
CREATE TYPE "MetaSocialWebhookReplayEligibility" AS ENUM (
  'NOT_ELIGIBLE', 'APPROVAL_REQUIRED', 'ELIGIBLE', 'SOURCE_UNAVAILABLE', 'SOURCE_EXPIRED', 'UNKNOWN_OUTCOME_BLOCKED'
);
CREATE TYPE "MetaSocialWebhookReplaySourceType" AS ENUM (
  'NONE', 'LEGACY_RECEIPT', 'NORMALIZED_LEAD', 'INSTAGRAM_MESSAGE', 'DURABLE_JOB'
);

ALTER TABLE "MetaSocialWebhookReceipt"
  ADD COLUMN "lastDigestMismatchAt" TIMESTAMP(3),
  ADD COLUMN "lastDigestMismatchCode" TEXT,
  ADD COLUMN "retentionClass" "MetaSocialWebhookRetentionClass" NOT NULL DEFAULT 'STANDARD_WEBHOOK',
  ADD COLUMN "retentionUntil" TIMESTAMP(3),
  ADD COLUMN "dedupeRetainUntil" TIMESTAMP(3),
  ADD COLUMN "metadataPrunedAt" TIMESTAMP(3),
  ADD COLUMN "replayEligibility" "MetaSocialWebhookReplayEligibility" NOT NULL DEFAULT 'NOT_ELIGIBLE',
  ADD COLUMN "replaySourceType" "MetaSocialWebhookReplaySourceType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "replaySourceId" TEXT,
  ADD COLUMN "replaySourceExpiresAt" TIMESTAMP(3),
  ADD COLUMN "replayApprovalId" TEXT,
  ADD COLUMN "replayApprovedBy" TEXT,
  ADD COLUMN "replayApprovedAt" TIMESTAMP(3),
  ADD COLUMN "replayApprovalReference" TEXT,
  ADD COLUMN "replayCompletedAt" TIMESTAMP(3),
  ADD COLUMN "replayResultCode" TEXT;

-- Deterministic, resumable backfill. Receipt metadata and the DB dedupe identity are retained separately.
UPDATE "MetaSocialWebhookReceipt"
SET
  "lastDigestMismatchAt" = CASE WHEN "digestMismatchCount" > 0 THEN "lastSeenAt" ELSE NULL END,
  "lastDigestMismatchCode" = CASE WHEN "digestMismatchCount" > 0 THEN 'META_WEBHOOK_PAYLOAD_DIGEST_MISMATCH' ELSE NULL END,
  "retentionClass" = CASE
    WHEN "replayAttempt" > 0 THEN 'REPLAY_AUDIT'::"MetaSocialWebhookRetentionClass"
    WHEN "state" IN ('FAILED'::"MetaSocialWebhookReceiptState", 'DEAD_LETTERED'::"MetaSocialWebhookReceiptState") THEN 'EXTENDED_FAILURE'::"MetaSocialWebhookRetentionClass"
    ELSE 'STANDARD_WEBHOOK'::"MetaSocialWebhookRetentionClass" END,
  "retentionUntil" = CASE
    WHEN "replayAttempt" > 0 THEN "receivedAt" + INTERVAL '365 days'
    WHEN "state" IN ('FAILED'::"MetaSocialWebhookReceiptState", 'DEAD_LETTERED'::"MetaSocialWebhookReceiptState") THEN "receivedAt" + INTERVAL '180 days'
    ELSE "receivedAt" + INTERVAL '30 days' END,
  "dedupeRetainUntil" = CASE
    WHEN "replayAttempt" > 0 OR "state" IN ('FAILED'::"MetaSocialWebhookReceiptState", 'DEAD_LETTERED'::"MetaSocialWebhookReceiptState")
      THEN "receivedAt" + INTERVAL '730 days'
    ELSE "receivedAt" + INTERVAL '365 days' END,
  "replaySourceType" = CASE
    WHEN "normalizedLeadId" IS NOT NULL THEN 'NORMALIZED_LEAD'::"MetaSocialWebhookReplaySourceType"
    WHEN "instagramMessageId" IS NOT NULL THEN 'INSTAGRAM_MESSAGE'::"MetaSocialWebhookReplaySourceType"
    WHEN "legacyReceiptId" IS NOT NULL THEN 'LEGACY_RECEIPT'::"MetaSocialWebhookReplaySourceType"
    ELSE 'NONE'::"MetaSocialWebhookReplaySourceType" END,
  "replaySourceId" = COALESCE("normalizedLeadId", "instagramMessageId", "legacyReceiptId"),
  "replaySourceExpiresAt" = CASE
    WHEN "normalizedLeadId" IS NOT NULL THEN (SELECT lead."retentionUntil" FROM "MetaLead" lead WHERE lead."id"="MetaSocialWebhookReceipt"."normalizedLeadId")
    WHEN "legacyReceiptType"='MetaWebhookReceipt' AND "legacyReceiptId" IS NOT NULL THEN
      (SELECT legacy."cleanupAfter" FROM "MetaWebhookReceipt" legacy WHERE legacy."id"="MetaSocialWebhookReceipt"."legacyReceiptId")
    WHEN "legacyReceiptType"='MetaInstagramWebhookReceipt' AND "legacyReceiptId" IS NOT NULL THEN
      (SELECT legacy."retentionUntil" FROM "MetaInstagramWebhookReceipt" legacy WHERE legacy."id"="MetaSocialWebhookReceipt"."legacyReceiptId")
    ELSE NULL END,
  "replayEligibility" = CASE
    WHEN "state" <> 'DEAD_LETTERED'::"MetaSocialWebhookReceiptState" THEN 'NOT_ELIGIBLE'::"MetaSocialWebhookReplayEligibility"
    WHEN COALESCE("failureCode", '') ~* 'UNKNOWN[_-]?OUTCOME' OR COALESCE("failureCategory", '') ~* 'UNKNOWN[_-]?OUTCOME' THEN 'UNKNOWN_OUTCOME_BLOCKED'::"MetaSocialWebhookReplayEligibility"
    WHEN COALESCE("normalizedLeadId", "instagramMessageId", "legacyReceiptId") IS NULL THEN 'SOURCE_UNAVAILABLE'::"MetaSocialWebhookReplayEligibility"
    WHEN CASE
      WHEN "normalizedLeadId" IS NOT NULL THEN (SELECT lead."retentionUntil" FROM "MetaLead" lead WHERE lead."id"="MetaSocialWebhookReceipt"."normalizedLeadId")
      WHEN "legacyReceiptType"='MetaWebhookReceipt' AND "legacyReceiptId" IS NOT NULL THEN (SELECT legacy."cleanupAfter" FROM "MetaWebhookReceipt" legacy WHERE legacy."id"="MetaSocialWebhookReceipt"."legacyReceiptId")
      WHEN "legacyReceiptType"='MetaInstagramWebhookReceipt' AND "legacyReceiptId" IS NOT NULL THEN (SELECT legacy."retentionUntil" FROM "MetaInstagramWebhookReceipt" legacy WHERE legacy."id"="MetaSocialWebhookReceipt"."legacyReceiptId")
      ELSE NULL END <= CURRENT_TIMESTAMP THEN 'SOURCE_EXPIRED'::"MetaSocialWebhookReplayEligibility"
    ELSE 'APPROVAL_REQUIRED'::"MetaSocialWebhookReplayEligibility" END
WHERE "retentionUntil" IS NULL OR "dedupeRetainUntil" IS NULL;

ALTER TABLE "MetaSocialWebhookReceipt"
  ALTER COLUMN "retentionUntil" SET NOT NULL,
  ALTER COLUMN "retentionUntil" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  ALTER COLUMN "dedupeRetainUntil" SET NOT NULL,
  ALTER COLUMN "dedupeRetainUntil" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '365 days');

-- Preconditions before constraints. All queries must return zero rows.
-- SELECT "id" FROM "MetaSocialWebhookReceipt" WHERE "retentionUntil" IS NULL OR "dedupeRetainUntil" IS NULL;
-- SELECT "id" FROM "MetaSocialWebhookReceipt" WHERE "dedupeRetainUntil" < "retentionUntil";
-- SELECT "id" FROM "MetaSocialWebhookReceipt" WHERE ("replaySourceType"='NONE') <> ("replaySourceId" IS NULL);
-- SELECT "id" FROM "MetaSocialWebhookReceipt" WHERE num_nonnulls("replayApprovalId","replayApprovedBy","replayApprovedAt") NOT IN (0,3);
-- SELECT "id" FROM "MetaSocialWebhookReceipt" WHERE "replayApprovalId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "MetaAdminApproval" a WHERE a."id"="replayApprovalId");

ALTER TABLE "MetaSocialWebhookReceipt"
  ADD CONSTRAINT "MetaSocialWebhookReceipt_retention_order_check" CHECK ("dedupeRetainUntil" >= "retentionUntil"),
  ADD CONSTRAINT "MetaSocialWebhookReceipt_replay_source_pair_check" CHECK (("replaySourceType"='NONE') = ("replaySourceId" IS NULL)),
  ADD CONSTRAINT "MetaSocialWebhookReceipt_replay_approval_complete_check" CHECK (num_nonnulls("replayApprovalId","replayApprovedBy","replayApprovedAt") IN (0,3)),
  ADD CONSTRAINT "MetaSocialWebhookReceipt_replay_result_pair_check" CHECK (("replayCompletedAt" IS NULL) = ("replayResultCode" IS NULL)),
  ADD CONSTRAINT "MetaSocialWebhookReceipt_replayApprovalId_fkey" FOREIGN KEY ("replayApprovalId") REFERENCES "MetaAdminApproval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "MetaSocialWebhookReceipt_retention_idx" ON "MetaSocialWebhookReceipt"("retentionClass", "retentionUntil");
CREATE INDEX "MetaSocialWebhookReceipt_dedupe_retention_idx" ON "MetaSocialWebhookReceipt"("dedupeRetainUntil");
CREATE INDEX "MetaSocialWebhookReceipt_replay_eligibility_idx" ON "MetaSocialWebhookReceipt"("replayEligibility", "replaySourceExpiresAt");
CREATE INDEX "MetaSocialWebhookReceipt_replay_approval_idx" ON "MetaSocialWebhookReceipt"("replayApprovalId");
