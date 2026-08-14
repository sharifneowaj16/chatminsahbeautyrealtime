-- Phase 31 Layer 3.5: additive receipt-first normalized Meta Lead storage.
-- Existing MetaLead, MetaWebhookReceipt, assignment, lifecycle, and encrypted payload rows are preserved.

CREATE TYPE "MetaLeadHandoffDestination" AS ENUM ('INTERNAL_CRM', 'CUSTOMER', 'CONTACT', 'ORDER', 'ADMIN_ASSIGNMENT');
CREATE TYPE "MetaLeadHandoffStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'BLOCKED');

ALTER TABLE "MetaLead"
  ADD COLUMN "provider" "MetaSocialWebhookProvider" NOT NULL DEFAULT 'META',
  ADD COLUMN "environment" "MetaPlatformEnvironment",
  ADD COLUMN "connectionKey" TEXT,
  ADD COLUMN "pageIdentityReferenceId" TEXT,
  ADD COLUMN "formIdentityReferenceId" TEXT,
  ADD COLUMN "phoneFingerprint" TEXT,
  ADD COLUMN "emailFingerprint" TEXT,
  ADD COLUMN "fingerprintVersion" TEXT,
  ADD COLUMN "isTestLead" BOOLEAN;

ALTER TABLE "MetaSocialWebhookReceipt"
  ADD COLUMN "normalizedLeadId" TEXT;

ALTER TABLE "MetaLeadDuplicate"
  ADD COLUMN "canonicalReceiptId" TEXT;

CREATE TABLE "MetaLeadProcessingAttempt" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "providerLeadId" TEXT NOT NULL,
  "provider" "MetaSocialWebhookProvider" NOT NULL DEFAULT 'META',
  "environment" "MetaPlatformEnvironment" NOT NULL,
  "connectionKey" TEXT NOT NULL,
  "pageId" TEXT,
  "formId" TEXT,
  "pageIdentityReferenceId" TEXT,
  "formIdentityReferenceId" TEXT,
  "retrievalStatus" "MetaLeadRetrievalStatus" NOT NULL DEFAULT 'PENDING',
  "retrievalAttempt" INTEGER NOT NULL DEFAULT 0,
  "lastRetrievalAt" TIMESTAMP(3),
  "nextRetrievalAt" TIMESTAMP(3),
  "normalizedLeadId" TEXT,
  "duplicateReason" "MetaLeadDuplicateReason",
  "isTestLead" BOOLEAN,
  "failureCode" TEXT,
  "failureCategory" TEXT,
  "failureSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaLeadProcessingAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaLeadProcessingAttempt_retrieval_attempt_check" CHECK ("retrievalAttempt" >= 0),
  CONSTRAINT "MetaLeadProcessingAttempt_identity_scope_check" CHECK (
    ("pageIdentityReferenceId" IS NULL OR "pageId" IS NOT NULL)
    AND ("formIdentityReferenceId" IS NULL OR "formId" IS NOT NULL)
  )
);

CREATE TABLE "MetaLeadHandoff" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "destination" "MetaLeadHandoffDestination" NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "MetaLeadHandoffStatus" NOT NULL DEFAULT 'PENDING',
  "targetType" TEXT,
  "targetId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureSummary" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaLeadHandoff_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaLeadHandoff_attempt_count_check" CHECK ("attemptCount" >= 0)
);

-- Existing provider Lead duplicate precondition. This query must return zero rows;
-- the historical MetaLead_leadgenId_key remains the authoritative provider-id boundary.
-- SELECT "leadgenId", COUNT(*) FROM "MetaLead" GROUP BY "leadgenId" HAVING COUNT(*) > 1;

-- New receipt and handoff constraints are added only after duplicate detection. The new
-- tables are initially empty; if operators stage rows before this point, both queries must return zero rows.
-- SELECT "receiptId", COUNT(*) FROM "MetaLeadProcessingAttempt" GROUP BY "receiptId" HAVING COUNT(*) > 1;
-- SELECT "leadId", "destination", COUNT(*) FROM "MetaLeadHandoff" GROUP BY 1,2 HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX "MetaLeadProcessingAttempt_receiptId_key" ON "MetaLeadProcessingAttempt"("receiptId");
CREATE INDEX "MetaLeadProcessingAttempt_provider_lead_idx" ON "MetaLeadProcessingAttempt"("providerLeadId", "createdAt");
CREATE INDEX "MetaLeadProcessingAttempt_retry_idx" ON "MetaLeadProcessingAttempt"("environment", "connectionKey", "retrievalStatus", "nextRetrievalAt");
CREATE INDEX "MetaLeadProcessingAttempt_normalized_lead_idx" ON "MetaLeadProcessingAttempt"("normalizedLeadId");
CREATE INDEX "MetaLeadProcessingAttempt_page_identity_idx" ON "MetaLeadProcessingAttempt"("pageIdentityReferenceId");
CREATE INDEX "MetaLeadProcessingAttempt_form_identity_idx" ON "MetaLeadProcessingAttempt"("formIdentityReferenceId");

CREATE UNIQUE INDEX "MetaLeadHandoff_idempotencyKey_key" ON "MetaLeadHandoff"("idempotencyKey");
CREATE UNIQUE INDEX "MetaLeadHandoff_lead_destination_key" ON "MetaLeadHandoff"("leadId", "destination");
CREATE INDEX "MetaLeadHandoff_retry_idx" ON "MetaLeadHandoff"("status", "nextRetryAt");
CREATE INDEX "MetaLeadHandoff_target_idx" ON "MetaLeadHandoff"("targetType", "targetId");

CREATE INDEX "MetaSocialWebhookReceipt_normalized_lead_idx" ON "MetaSocialWebhookReceipt"("normalizedLeadId");
CREATE INDEX "MetaLeadDuplicate_canonical_receipt_idx" ON "MetaLeadDuplicate"("canonicalReceiptId");
CREATE INDEX "MetaLead_phoneFingerprint_idx" ON "MetaLead"("phoneFingerprint");
CREATE INDEX "MetaLead_emailFingerprint_idx" ON "MetaLead"("emailFingerprint");
CREATE INDEX "MetaLead_scope_received_idx" ON "MetaLead"("environment", "connectionKey", "receivedAt");
CREATE INDEX "MetaLead_page_identity_idx" ON "MetaLead"("pageIdentityReferenceId");
CREATE INDEX "MetaLead_form_identity_idx" ON "MetaLead"("formIdentityReferenceId");

ALTER TABLE "MetaLead"
  ADD CONSTRAINT "MetaLead_scope_pair_check" CHECK (("environment" IS NULL) = ("connectionKey" IS NULL)),
  ADD CONSTRAINT "MetaLead_fingerprint_version_check" CHECK (
    ("phoneFingerprint" IS NULL AND "emailFingerprint" IS NULL AND "fingerprintVersion" IS NULL)
    OR ("fingerprintVersion" IS NOT NULL AND ("phoneFingerprint" IS NOT NULL OR "emailFingerprint" IS NOT NULL))
  ),
  ADD CONSTRAINT "MetaLead_pageIdentityReferenceId_fkey" FOREIGN KEY ("pageIdentityReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaLead_formIdentityReferenceId_fkey" FOREIGN KEY ("formIdentityReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MetaSocialWebhookReceipt"
  ADD CONSTRAINT "MetaSocialWebhookReceipt_normalizedLeadId_fkey" FOREIGN KEY ("normalizedLeadId") REFERENCES "MetaLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MetaLeadDuplicate"
  ADD CONSTRAINT "MetaLeadDuplicate_canonicalReceiptId_fkey" FOREIGN KEY ("canonicalReceiptId") REFERENCES "MetaSocialWebhookReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MetaLeadProcessingAttempt"
  ADD CONSTRAINT "MetaLeadProcessingAttempt_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "MetaSocialWebhookReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaLeadProcessingAttempt_normalizedLeadId_fkey" FOREIGN KEY ("normalizedLeadId") REFERENCES "MetaLead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaLeadProcessingAttempt_pageIdentityReferenceId_fkey" FOREIGN KEY ("pageIdentityReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "MetaLeadProcessingAttempt_formIdentityReferenceId_fkey" FOREIGN KEY ("formIdentityReferenceId") REFERENCES "MetaExternalReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MetaLeadHandoff"
  ADD CONSTRAINT "MetaLeadHandoff_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "MetaLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deterministic, resumable backfill: attach canonical Lead Ads receipts only when the legacy
-- receipt has one provider lead ID and that ID resolves to the existing unique MetaLead row.
UPDATE "MetaSocialWebhookReceipt" canonical
SET "normalizedLeadId" = lead."id", "updatedAt" = CURRENT_TIMESTAMP
FROM "MetaWebhookReceipt" legacy
JOIN "MetaLead" lead ON lead."leadgenId" = legacy."leadgenId"
WHERE canonical."platform" = 'LEAD_ADS'::"MetaSocialWebhookPlatform"
  AND canonical."legacyReceiptType" = 'MetaWebhookReceipt'
  AND canonical."legacyReceiptId" = legacy."id"
  AND canonical."normalizedLeadId" IS NULL;

-- Scope backfill is intentionally limited to unambiguous canonical receipt matches. Historical
-- manual imports or leads seen under more than one scope remain NULL for explicit reconciliation.
WITH scoped AS (
  SELECT lead."id" AS "leadId", MIN(receipt."environment"::text) AS environment,
         MIN(receipt."connectionKey") AS "connectionKey"
  FROM "MetaLead" lead
  JOIN "MetaWebhookReceipt" legacy ON legacy."leadgenId" = lead."leadgenId"
  JOIN "MetaSocialWebhookReceipt" receipt
    ON receipt."legacyReceiptType" = 'MetaWebhookReceipt'
   AND receipt."legacyReceiptId" = legacy."id"
   AND receipt."platform" = 'LEAD_ADS'::"MetaSocialWebhookPlatform"
  GROUP BY lead."id"
  HAVING COUNT(DISTINCT receipt."environment"::text || E'\\x1f' || receipt."connectionKey") = 1
)
UPDATE "MetaLead" lead
SET "environment" = scoped.environment::"MetaPlatformEnvironment",
    "connectionKey" = scoped."connectionKey",
    "updatedAt" = CURRENT_TIMESTAMP
FROM scoped
WHERE lead."id" = scoped."leadId" AND lead."environment" IS NULL AND lead."connectionKey" IS NULL;

-- Create one durable processing-attempt audit row for each canonical receipt with a legacy Lead receipt.
INSERT INTO "MetaLeadProcessingAttempt" (
  "id", "receiptId", "providerLeadId", "provider", "environment", "connectionKey",
  "pageId", "formId", "retrievalStatus", "retrievalAttempt", "lastRetrievalAt",
  "normalizedLeadId", "duplicateReason", "createdAt", "updatedAt"
)
SELECT 'phase31-lead-attempt:' || canonical."id", canonical."id", legacy."leadgenId", canonical."provider",
       canonical."environment", canonical."connectionKey", legacy."pageId", legacy."formId",
       CASE WHEN lead."id" IS NOT NULL THEN 'FETCHED'::"MetaLeadRetrievalStatus"
            WHEN legacy."status" = 'FAILED'::"MetaWebhookProcessingStatus" THEN 'RETRYING'::"MetaLeadRetrievalStatus"
            ELSE 'PENDING'::"MetaLeadRetrievalStatus" END,
       legacy."attemptCount", legacy."lastAttemptAt", lead."id", NULL, canonical."createdAt", CURRENT_TIMESTAMP
FROM "MetaSocialWebhookReceipt" canonical
JOIN "MetaWebhookReceipt" legacy
  ON canonical."legacyReceiptType" = 'MetaWebhookReceipt' AND canonical."legacyReceiptId" = legacy."id"
LEFT JOIN "MetaLead" lead ON lead."leadgenId" = legacy."leadgenId"
WHERE canonical."platform" = 'LEAD_ADS'::"MetaSocialWebhookPlatform" AND legacy."leadgenId" IS NOT NULL
ON CONFLICT ("receiptId") DO NOTHING;

-- Preserve the legacy receiptId while adding the canonical receipt reference when unambiguous.
UPDATE "MetaLeadDuplicate" duplicate
SET "canonicalReceiptId" = canonical."id"
FROM "MetaSocialWebhookReceipt" canonical
WHERE duplicate."canonicalReceiptId" IS NULL
  AND duplicate."receiptId" IS NOT NULL
  AND canonical."legacyReceiptType" = 'MetaWebhookReceipt'
  AND canonical."legacyReceiptId" = duplicate."receiptId"
  AND canonical."platform" = 'LEAD_ADS'::"MetaSocialWebhookPlatform";
