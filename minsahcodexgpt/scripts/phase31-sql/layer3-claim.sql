\set ON_ERROR_STOP on
WITH candidate AS (
  SELECT "id", "state", "leaseExpiresAt"
  FROM "MetaSocialWebhookReceipt"
  WHERE "id" = :'receipt_id'
    AND (
      "state"='QUEUED'
      OR ("state"='PROCESSING' AND "leaseExpiresAt" IS NOT NULL AND "leaseExpiresAt" <= CURRENT_TIMESTAMP)
    )
  FOR UPDATE SKIP LOCKED
), updated AS (
  UPDATE "MetaSocialWebhookReceipt" AS receipt
  SET "state"='PROCESSING'::"MetaSocialWebhookReceiptState",
      "attemptCount"=receipt."attemptCount" + 1,
      "lastAttemptAt"=CURRENT_TIMESTAMP,
      "processingStartedAt"=CURRENT_TIMESTAMP,
      "leaseToken"=:'lease_token',
      "leaseOwner"=:'lease_owner',
      "leaseExpiresAt"=CURRENT_TIMESTAMP + INTERVAL '5 minutes',
      "lastTransitionAt"=CURRENT_TIMESTAMP,
      "lastTransitionCode"=CASE WHEN candidate."state"='PROCESSING'
        THEN 'PROCESSING_RECLAIMED' ELSE 'PROCESSING_CLAIMED' END,
      "lastTransitionActor"=:'lease_owner',
      "stateVersion"=receipt."stateVersion" + 1,
      "updatedAt"=CURRENT_TIMESTAMP
  FROM candidate
  WHERE receipt."id"=candidate."id"
  RETURNING receipt."id", receipt."leaseOwner", receipt."leaseToken", receipt."attemptCount"
)
SELECT "id", "leaseOwner", "leaseToken", "attemptCount", pg_sleep(:'hold_seconds'::double precision)
FROM updated;
