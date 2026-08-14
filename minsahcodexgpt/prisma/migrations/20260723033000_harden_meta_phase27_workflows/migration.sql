-- Phase 27 correction: monotonic workflow command identity, resumable compensation,
-- atomic reconciliation support, and independent controlled-replay approval evidence.
-- This is a forward migration; the historical Phase 27 migration remains immutable.

ALTER TYPE "MetaWorkflowStatus" ADD VALUE IF NOT EXISTS 'COMPENSATION_FAILED_RETRYABLE';
ALTER TYPE "MetaWorkflowStepStatus" ADD VALUE IF NOT EXISTS 'COMPENSATION_FAILED_RETRYABLE';
ALTER TYPE "MetaReplayStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

CREATE TYPE "MetaProviderJobPurpose" AS ENUM ('EXECUTION', 'COMPENSATION');

ALTER TABLE "MetaProviderJob"
  ADD COLUMN "purpose" "MetaProviderJobPurpose" NOT NULL DEFAULT 'EXECUTION';

DROP INDEX "MetaProviderJob_step_fingerprint_key";
CREATE UNIQUE INDEX "MetaProviderJob_step_purpose_fingerprint_key"
  ON "MetaProviderJob"("stepId", "purpose", "requestFingerprint");

ALTER TABLE "MetaReplay"
  ADD COLUMN "approvalRole" TEXT,
  ADD COLUMN "requestDigest" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Pre-cutover legacy rows cannot prove a modern request digest, so bind them to
-- a deterministic non-secret legacy marker and a bounded historical expiry.
UPDATE "MetaReplay"
SET "requestDigest" = 'legacy:' || "id",
    "expiresAt" = "createdAt" + INTERVAL '24 hours'
WHERE "requestDigest" IS NULL OR "expiresAt" IS NULL;

ALTER TABLE "MetaReplay"
  ALTER COLUMN "requestDigest" SET NOT NULL,
  ALTER COLUMN "expiresAt" SET NOT NULL;

ALTER TABLE "MetaReplay"
  ADD CONSTRAINT "MetaReplay_request_digest_required" CHECK (length(trim("requestDigest")) >= 16),
  ADD CONSTRAINT "MetaReplay_expiry_after_create" CHECK ("expiresAt" > "createdAt"),
  ADD CONSTRAINT "MetaReplay_approval_complete" CHECK (
    ("status" = 'REQUESTED' AND "approvedBy" IS NULL AND "approvalRole" IS NULL AND "approvedAt" IS NULL)
    OR
    ("status" IN ('APPROVED', 'CREATED') AND "approvedBy" IS NOT NULL AND "approvalRole" IS NOT NULL AND "approvedAt" IS NOT NULL)
    OR
    ("status" = 'REJECTED' AND (
      ("approvedBy" IS NULL AND "approvalRole" IS NULL AND "approvedAt" IS NULL)
      OR ("approvedBy" IS NOT NULL AND "approvalRole" IS NOT NULL AND "approvedAt" IS NOT NULL)
    ))
  );

CREATE OR REPLACE FUNCTION "meta_provider_job_protect_immutable_fields"()
RETURNS trigger AS $$
BEGIN
  IF NEW."workflowId" IS DISTINCT FROM OLD."workflowId"
    OR NEW."stepId" IS DISTINCT FROM OLD."stepId"
    OR NEW."purpose" IS DISTINCT FROM OLD."purpose"
    OR NEW."capability" IS DISTINCT FROM OLD."capability"
    OR NEW."operationType" IS DISTINCT FROM OLD."operationType"
    OR NEW."requestFingerprint" IS DISTINCT FROM OLD."requestFingerprint"
    OR NEW."requestState" IS DISTINCT FROM OLD."requestState"
    OR NEW."beforeState" IS DISTINCT FROM OLD."beforeState"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN RAISE EXCEPTION 'MetaProviderJob immutable fields cannot be changed'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "meta_replay_protect_immutable_fields"()
RETURNS trigger AS $$
BEGIN
  IF NEW."sourceOperationId" IS DISTINCT FROM OLD."sourceOperationId"
    OR NEW."requestedBy" IS DISTINCT FROM OLD."requestedBy"
    OR NEW."reason" IS DISTINCT FROM OLD."reason"
    OR NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey"
    OR NEW."requestDigest" IS DISTINCT FROM OLD."requestDigest"
    OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN RAISE EXCEPTION 'MetaReplay immutable request fields cannot be changed'; END IF;

  IF OLD."approvedBy" IS NOT NULL AND (
    NEW."approvedBy" IS DISTINCT FROM OLD."approvedBy"
    OR NEW."approvalRole" IS DISTINCT FROM OLD."approvalRole"
    OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt"
  ) THEN RAISE EXCEPTION 'MetaReplay approval evidence cannot be changed'; END IF;

  IF OLD."approvedBy" IS NULL AND NEW."approvedBy" IS NOT NULL AND NOT (
    OLD."status" = 'REQUESTED'
    AND NEW."status" = 'APPROVED'
    AND NEW."approvalRole" IS NOT NULL
    AND NEW."approvedAt" IS NOT NULL
    AND NEW."approvedBy" <> NEW."requestedBy"
  ) THEN RAISE EXCEPTION 'MetaReplay approval requires an independent REQUESTED to APPROVED transition'; END IF;

  IF NEW."status" = 'CREATED' AND (OLD."status" <> 'APPROVED' OR NEW."replayOperationId" IS NULL) THEN
    RAISE EXCEPTION 'MetaReplay creation requires prior approval and a replay operation';
  END IF;

  IF NEW."status" = 'REJECTED' AND NEW."rejectionCode" IS NULL THEN
    RAISE EXCEPTION 'MetaReplay rejection requires a reason code';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
