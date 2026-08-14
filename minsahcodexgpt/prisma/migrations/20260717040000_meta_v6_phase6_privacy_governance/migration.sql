-- Meta v6 Phase 6: explicit consent, privacy policy metadata, retention and deletion governance.
-- Conservative historical policy: pre-migration rows do not prove current/versioned consent.

CREATE TYPE "TrackingConsentState" AS ENUM ('UNKNOWN', 'GRANTED', 'DENIED', 'WITHDRAWN');
CREATE TYPE "DataDeletionRequestStatus" AS ENUM ('RECEIVED', 'VERIFIED', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "Order"
  ADD COLUMN "trackingConsentVersion" TEXT,
  ADD COLUMN "trackingPolicyReason" TEXT;

ALTER TABLE "Order" ALTER COLUMN "nonEssentialTrackingAllowed" SET DEFAULT false;

-- Historical opt-in booleans lack a consent version and cannot be treated as fresh consent.
UPDATE "Order"
SET "trackingConsent" = 'unknown',
    "trackingConsentVersion" = NULL,
    "trackingPolicyReason" = 'HISTORICAL_CONSENT_UNVERSIONED',
    "nonEssentialTrackingAllowed" = false,
    "trackingFilteredReason" = COALESCE("trackingFilteredReason", 'CONSENT_NOT_GRANTED')
WHERE "trackingConsentVersion" IS NULL;

CREATE TABLE "TrackingConsentRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "visitorId" TEXT,
  "state" "TrackingConsentState" NOT NULL,
  "version" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawnAt" TIMESTAMP(3),
  "retentionUntil" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrackingConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataDeletionRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "externalRef" TEXT,
  "source" TEXT NOT NULL,
  "confirmationCode" TEXT NOT NULL,
  "status" "DataDeletionRequestStatus" NOT NULL DEFAULT 'RECEIVED',
  "policyVersion" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "error" JSONB,
  "retentionUntil" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivacyAuditLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "subjectUserId" TEXT,
  "requestId" TEXT,
  "policyVersion" TEXT NOT NULL,
  "safeDetails" JSONB,
  "retentionUntil" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrivacyAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrackingSuppression" (
  "id" TEXT NOT NULL,
  "identityHash" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "TrackingSuppression_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MetaEventOutbox"
  ADD COLUMN "policyVersion" TEXT NOT NULL DEFAULT 'meta-v6-2026-07-17.1',
  ADD COLUMN "policyReason" TEXT NOT NULL DEFAULT 'CONSENT_UNKNOWN',
  ADD COLUMN "consentState" "TrackingConsentState" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "consentVersion" TEXT,
  ADD COLUMN "allowAdvancedMatching" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "retentionUntil" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days');

CREATE UNIQUE INDEX "DataDeletionRequest_confirmationCode_key" ON "DataDeletionRequest"("confirmationCode");
CREATE UNIQUE INDEX "TrackingSuppression_identityHash_key" ON "TrackingSuppression"("identityHash");
CREATE INDEX "TrackingConsentRecord_userId_recordedAt_idx" ON "TrackingConsentRecord"("userId", "recordedAt");
CREATE INDEX "TrackingConsentRecord_visitorId_recordedAt_idx" ON "TrackingConsentRecord"("visitorId", "recordedAt");
CREATE INDEX "TrackingConsentRecord_state_recordedAt_idx" ON "TrackingConsentRecord"("state", "recordedAt");
CREATE INDEX "TrackingConsentRecord_retentionUntil_idx" ON "TrackingConsentRecord"("retentionUntil");
CREATE INDEX "DataDeletionRequest_userId_requestedAt_idx" ON "DataDeletionRequest"("userId", "requestedAt");
CREATE INDEX "DataDeletionRequest_externalRef_idx" ON "DataDeletionRequest"("externalRef");
CREATE INDEX "DataDeletionRequest_status_requestedAt_idx" ON "DataDeletionRequest"("status", "requestedAt");
CREATE INDEX "DataDeletionRequest_retentionUntil_idx" ON "DataDeletionRequest"("retentionUntil");
CREATE INDEX "PrivacyAuditLog_action_createdAt_idx" ON "PrivacyAuditLog"("action", "createdAt");
CREATE INDEX "PrivacyAuditLog_subjectUserId_createdAt_idx" ON "PrivacyAuditLog"("subjectUserId", "createdAt");
CREATE INDEX "PrivacyAuditLog_requestId_idx" ON "PrivacyAuditLog"("requestId");
CREATE INDEX "PrivacyAuditLog_retentionUntil_idx" ON "PrivacyAuditLog"("retentionUntil");
CREATE INDEX "TrackingSuppression_active_createdAt_idx" ON "TrackingSuppression"("active", "createdAt");
CREATE INDEX "TrackingSuppression_expiresAt_idx" ON "TrackingSuppression"("expiresAt");
CREATE INDEX "MetaEventOutbox_retentionUntil_idx" ON "MetaEventOutbox"("retentionUntil");
CREATE INDEX "MetaEventOutbox_policyVersion_policyReason_idx" ON "MetaEventOutbox"("policyVersion", "policyReason");
