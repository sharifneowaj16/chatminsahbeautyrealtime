-- DESTRUCTIVE LIFECYCLE-METADATA RECOVERY ONLY.
-- PRECONDITION: no MetaSocialWebhookReceipt row may be PROCESSING and no worker may hold a lease.
-- This removes Layer 3.3 lease and transition evidence but preserves the Layer 3.2 receipt table,
-- dedupe key, payload digest, duplicate history, legacy links and all legacy receipt tables.
-- Prefer a reviewed forward-fix after workers adopt the guarded lifecycle.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "MetaSocialWebhookReceipt"
    WHERE "state"='PROCESSING' OR "leaseToken" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Active MetaSocialWebhookReceipt processing lease exists; recovery refused';
  END IF;
END $$;

DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_state_lease_idx";

ALTER TABLE "MetaSocialWebhookReceipt"
  DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_lifecycle_order",
  DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_transition_actor_length",
  DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_transition_code_length",
  DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_lease_owner_length",
  DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_processing_lease",
  DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_lease_triplet",
  DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_state_version",
  DROP COLUMN IF EXISTS "stateVersion",
  DROP COLUMN IF EXISTS "lastTransitionActor",
  DROP COLUMN IF EXISTS "lastTransitionCode",
  DROP COLUMN IF EXISTS "lastTransitionAt",
  DROP COLUMN IF EXISTS "failedAt",
  DROP COLUMN IF EXISTS "blockedAt",
  DROP COLUMN IF EXISTS "processedAt",
  DROP COLUMN IF EXISTS "processingStartedAt",
  DROP COLUMN IF EXISTS "queuedAt",
  DROP COLUMN IF EXISTS "leaseExpiresAt",
  DROP COLUMN IF EXISTS "leaseOwner",
  DROP COLUMN IF EXISTS "leaseToken";
