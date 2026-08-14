ALTER TABLE "MetaCapiFailure"
  ADD COLUMN IF NOT EXISTS "failureCategory" TEXT NOT NULL DEFAULT 'DEBUG_NON_CRITICAL',
  ADD COLUMN IF NOT EXISTS "lastRetryAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cleanupAfter" TIMESTAMP(3);

UPDATE "MetaCapiFailure"
SET "failureCategory" = CASE
  WHEN "errorCode" IN ('META_ENV_MISSING', 'GA4_ENV_MISSING', '190')
    OR "statusCode" IN (401, 403)
    OR COALESCE("errorCode", '') ILIKE '%TOKEN%'
    OR COALESCE("errorCode", '') ILIKE '%AUTH%'
    OR COALESCE("errorCode", '') ILIKE '%PERMISSION%'
    OR COALESCE("errorMessage", '') ILIKE '%access token%'
    OR COALESCE("errorMessage", '') ILIKE '%invalid oauth%'
    OR COALESCE("errorMessage", '') ILIKE '%permission%'
    OR COALESCE("errorMessage", '') ILIKE '%api secret%'
    OR COALESCE("errorMessage", '') ILIKE '%measurement id%'
    THEN 'CRITICAL'
  WHEN "finalFailed" = true THEN 'FINAL_RETRYABLE'
  ELSE 'DEBUG_NON_CRITICAL'
END
WHERE "failureCategory" IS NULL OR "failureCategory" = 'DEBUG_NON_CRITICAL';

UPDATE "MetaCapiFailure"
SET "cleanupAfter" = CASE
  WHEN "failureCategory" = 'CRITICAL' THEN "createdAt" + INTERVAL '180 days'
  WHEN "failureCategory" = 'FINAL_RETRYABLE' THEN "createdAt" + INTERVAL '90 days'
  ELSE "createdAt" + INTERVAL '30 days'
END
WHERE "cleanupAfter" IS NULL;

CREATE INDEX IF NOT EXISTS "MetaCapiFailure_failureCategory_idx" ON "MetaCapiFailure" ("failureCategory");
CREATE INDEX IF NOT EXISTS "MetaCapiFailure_cleanupAfter_idx" ON "MetaCapiFailure" ("cleanupAfter");
CREATE INDEX IF NOT EXISTS "MetaCapiFailure_resolvedAt_idx" ON "MetaCapiFailure" ("resolvedAt");
