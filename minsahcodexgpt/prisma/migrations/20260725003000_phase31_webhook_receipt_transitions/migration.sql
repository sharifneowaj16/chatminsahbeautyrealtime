-- Phase 31 Layer 3.3: additive guarded receipt lifecycle, processing leases and crash recovery.
-- Layer 3.2 dedupe scope and all legacy receipt tables remain unchanged.

ALTER TABLE "MetaSocialWebhookReceipt"
  ADD COLUMN "leaseToken" TEXT,
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "queuedAt" TIMESTAMP(3),
  ADD COLUMN "processingStartedAt" TIMESTAMP(3),
  ADD COLUMN "processedAt" TIMESTAMP(3),
  ADD COLUMN "blockedAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "lastTransitionAt" TIMESTAMP(3),
  ADD COLUMN "lastTransitionCode" TEXT,
  ADD COLUMN "lastTransitionActor" TEXT,
  ADD COLUMN "stateVersion" INTEGER NOT NULL DEFAULT 0;

-- Safety precondition: Layer 3.2 had no canonical PROCESSING transition implementation.
-- Fail closed if an out-of-band writer nevertheless created PROCESSING rows without a lease.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "MetaSocialWebhookReceipt"
    WHERE "state"='PROCESSING'
  ) THEN
    RAISE EXCEPTION 'MetaSocialWebhookReceipt PROCESSING rows exist before lease migration; review and forward-fix before applying';
  END IF;
END $$;

-- Deterministic compatibility backfill for Layer 3.2 receipts that were born terminal.
-- firstSeenAt is the only trustworthy historical instant; no later timestamp is invented.
UPDATE "MetaSocialWebhookReceipt"
SET
  "blockedAt" = COALESCE("blockedAt", "firstSeenAt"),
  "lastTransitionAt" = COALESCE("lastTransitionAt", "firstSeenAt"),
  "lastTransitionCode" = COALESCE("lastTransitionCode", 'PRE_PROCESSING_BLOCKED'),
  "lastTransitionActor" = COALESCE("lastTransitionActor", 'phase31-layer3.3-migration')
WHERE "state"='BLOCKED';

ALTER TABLE "MetaSocialWebhookReceipt"
  ADD CONSTRAINT "MetaSocialWebhookReceipt_state_version"
    CHECK ("stateVersion" >= 0),
  ADD CONSTRAINT "MetaSocialWebhookReceipt_lease_triplet"
    CHECK (
      ("leaseToken" IS NULL AND "leaseOwner" IS NULL AND "leaseExpiresAt" IS NULL)
      OR ("leaseToken" IS NOT NULL AND "leaseOwner" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL)
    ),
  ADD CONSTRAINT "MetaSocialWebhookReceipt_processing_lease"
    CHECK (
      ("state"='PROCESSING' AND "leaseToken" IS NOT NULL AND "leaseOwner" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL)
      OR ("state"<>'PROCESSING' AND "leaseToken" IS NULL AND "leaseOwner" IS NULL AND "leaseExpiresAt" IS NULL)
    ),
  ADD CONSTRAINT "MetaSocialWebhookReceipt_lease_owner_length"
    CHECK ("leaseOwner" IS NULL OR length("leaseOwner") BETWEEN 1 AND 160),
  ADD CONSTRAINT "MetaSocialWebhookReceipt_transition_code_length"
    CHECK ("lastTransitionCode" IS NULL OR length("lastTransitionCode") BETWEEN 1 AND 80),
  ADD CONSTRAINT "MetaSocialWebhookReceipt_transition_actor_length"
    CHECK ("lastTransitionActor" IS NULL OR length("lastTransitionActor") BETWEEN 1 AND 160),
  ADD CONSTRAINT "MetaSocialWebhookReceipt_lifecycle_order"
    CHECK (
      ("queuedAt" IS NULL OR "queuedAt" >= "firstSeenAt")
      AND ("processingStartedAt" IS NULL OR "processingStartedAt" >= "firstSeenAt")
      AND ("processedAt" IS NULL OR "processedAt" >= "firstSeenAt")
      AND ("blockedAt" IS NULL OR "blockedAt" >= "firstSeenAt")
      AND ("failedAt" IS NULL OR "failedAt" >= "firstSeenAt")
    );

CREATE INDEX "MetaSocialWebhookReceipt_state_lease_idx"
  ON "MetaSocialWebhookReceipt"("state", "leaseExpiresAt");
