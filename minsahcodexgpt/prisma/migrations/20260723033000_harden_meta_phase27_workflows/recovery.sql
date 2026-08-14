-- Pre-cutover recovery for the Phase 27 correction migration.
-- PostgreSQL enum values are intentionally retained because removing enum values
-- is destructive. After any production record depends on these fields, use a
-- reviewed forward-fix instead of this recovery script.

ALTER TABLE "MetaReplay" DROP CONSTRAINT IF EXISTS "MetaReplay_approval_complete";
ALTER TABLE "MetaReplay" DROP CONSTRAINT IF EXISTS "MetaReplay_expiry_after_create";
ALTER TABLE "MetaReplay" DROP CONSTRAINT IF EXISTS "MetaReplay_request_digest_required";
ALTER TABLE "MetaReplay"
  DROP COLUMN IF EXISTS "approvedAt",
  DROP COLUMN IF EXISTS "expiresAt",
  DROP COLUMN IF EXISTS "requestDigest",
  DROP COLUMN IF EXISTS "approvalRole";

DROP INDEX IF EXISTS "MetaProviderJob_step_purpose_fingerprint_key";
CREATE UNIQUE INDEX IF NOT EXISTS "MetaProviderJob_step_fingerprint_key"
  ON "MetaProviderJob"("stepId", "requestFingerprint");
ALTER TABLE "MetaProviderJob" DROP COLUMN IF EXISTS "purpose";
DROP TYPE IF EXISTS "MetaProviderJobPurpose";

CREATE OR REPLACE FUNCTION "meta_provider_job_protect_immutable_fields"()
RETURNS trigger AS $$
BEGIN
  IF NEW."workflowId" IS DISTINCT FROM OLD."workflowId"
    OR NEW."stepId" IS DISTINCT FROM OLD."stepId"
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
    OR NEW."approvedBy" IS DISTINCT FROM OLD."approvedBy"
    OR NEW."reason" IS DISTINCT FROM OLD."reason"
    OR NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN RAISE EXCEPTION 'MetaReplay immutable fields cannot be changed'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
