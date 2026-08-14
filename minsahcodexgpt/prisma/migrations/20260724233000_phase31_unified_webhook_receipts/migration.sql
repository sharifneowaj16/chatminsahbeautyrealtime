-- Phase 31 Layer 3.2: additive unified durable receipt for Meta social webhooks.
-- Existing MetaWebhookReceipt, MetaInstagramWebhookReceipt and FbWebhookAudit rows remain untouched.

CREATE TYPE "MetaSocialWebhookProvider" AS ENUM ('META');
CREATE TYPE "MetaSocialWebhookPlatform" AS ENUM ('LEAD_ADS', 'INSTAGRAM', 'FACEBOOK_PAGE');
CREATE TYPE "MetaSocialWebhookReceiptState" AS ENUM (
  'RECEIVED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'BLOCKED', 'FAILED', 'DEAD_LETTERED'
);

CREATE TABLE "MetaSocialWebhookReceipt" (
  "id" TEXT NOT NULL,
  "provider" "MetaSocialWebhookProvider" NOT NULL DEFAULT 'META',
  "platform" "MetaSocialWebhookPlatform" NOT NULL,
  "environment" "MetaPlatformEnvironment" NOT NULL,
  "connectionKey" TEXT NOT NULL,
  "providerDeliveryId" TEXT,
  "providerEventKey" TEXT NOT NULL,
  "payloadDigest" TEXT NOT NULL,
  "lastPayloadDigest" TEXT NOT NULL,
  "digestMismatchCount" INTEGER NOT NULL DEFAULT 0,
  "safeMetadata" JSONB NOT NULL DEFAULT '{}',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "state" "MetaSocialWebhookReceiptState" NOT NULL DEFAULT 'RECEIVED',
  "queueName" TEXT,
  "jobReference" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureCategory" TEXT,
  "failureSummary" TEXT,
  "deadLetteredAt" TIMESTAMP(3),
  "correlationId" TEXT NOT NULL,
  "parentReceiptId" TEXT,
  "replayAttempt" INTEGER NOT NULL DEFAULT 0,
  "replayReason" TEXT,
  "replayRequestedBy" TEXT,
  "replayRequestedAt" TIMESTAMP(3),
  "legacyReceiptType" TEXT,
  "legacyReceiptId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MetaSocialWebhookReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaSocialWebhookReceipt_connection_key" CHECK (
    length("connectionKey") BETWEEN 1 AND 80
    AND "connectionKey" ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'
  ),
  CONSTRAINT "MetaSocialWebhookReceipt_event_key" CHECK (length("providerEventKey") BETWEEN 1 AND 512),
  CONSTRAINT "MetaSocialWebhookReceipt_delivery_id" CHECK (
    "providerDeliveryId" IS NULL OR length("providerDeliveryId") BETWEEN 1 AND 512
  ),
  CONSTRAINT "MetaSocialWebhookReceipt_payload_digest" CHECK (
    "payloadDigest" ~ '^[a-f0-9]{64}$' AND "lastPayloadDigest" ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT "MetaSocialWebhookReceipt_safe_metadata" CHECK (jsonb_typeof("safeMetadata") = 'object'),
  CONSTRAINT "MetaSocialWebhookReceipt_counts" CHECK (
    "duplicateCount" >= 0 AND "digestMismatchCount" >= 0 AND "attemptCount" >= 0 AND "replayAttempt" >= 0
  ),
  CONSTRAINT "MetaSocialWebhookReceipt_seen_order" CHECK ("firstSeenAt" <= "lastSeenAt"),
  CONSTRAINT "MetaSocialWebhookReceipt_correlation" CHECK (length("correlationId") BETWEEN 1 AND 160),
  CONSTRAINT "MetaSocialWebhookReceipt_replay_parent" CHECK (
    "replayAttempt" = 0 OR "parentReceiptId" IS NOT NULL
  ),
  CONSTRAINT "MetaSocialWebhookReceipt_legacy_pair" CHECK (
    ("legacyReceiptType" IS NULL AND "legacyReceiptId" IS NULL)
    OR ("legacyReceiptType" IS NOT NULL AND "legacyReceiptId" IS NOT NULL)
  )
);

-- Duplicate-data precondition. This additive table is empty at creation, but the guard
-- remains immediately before the production uniqueness boundary for migration review.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "MetaSocialWebhookReceipt"
    GROUP BY "provider", "platform", "environment", "connectionKey", "providerEventKey"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'MetaSocialWebhookReceipt duplicate scope detected before unique index creation';
  END IF;
END $$;

CREATE UNIQUE INDEX "MetaSocialWebhookReceipt_dedupe_scope_key"
  ON "MetaSocialWebhookReceipt"("provider", "platform", "environment", "connectionKey", "providerEventKey");
CREATE INDEX "MetaSocialWebhookReceipt_state_retry_idx"
  ON "MetaSocialWebhookReceipt"("state", "nextRetryAt");
CREATE INDEX "MetaSocialWebhookReceipt_platform_received_idx"
  ON "MetaSocialWebhookReceipt"("platform", "receivedAt");
CREATE INDEX "MetaSocialWebhookReceipt_connection_received_idx"
  ON "MetaSocialWebhookReceipt"("environment", "connectionKey", "receivedAt");
CREATE INDEX "MetaSocialWebhookReceipt_correlation_idx"
  ON "MetaSocialWebhookReceipt"("correlationId");
CREATE INDEX "MetaSocialWebhookReceipt_delivery_idx"
  ON "MetaSocialWebhookReceipt"("providerDeliveryId");
CREATE INDEX "MetaSocialWebhookReceipt_parent_idx"
  ON "MetaSocialWebhookReceipt"("parentReceiptId");
CREATE INDEX "MetaSocialWebhookReceipt_legacy_idx"
  ON "MetaSocialWebhookReceipt"("legacyReceiptType", "legacyReceiptId");

ALTER TABLE "MetaSocialWebhookReceipt"
  ADD CONSTRAINT "MetaSocialWebhookReceipt_parentReceiptId_fkey"
  FOREIGN KEY ("parentReceiptId") REFERENCES "MetaSocialWebhookReceipt"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
