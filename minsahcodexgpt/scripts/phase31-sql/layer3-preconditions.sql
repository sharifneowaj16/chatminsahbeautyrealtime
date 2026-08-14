\set ON_ERROR_STOP on

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "MetaSocialWebhookReceipt"
    GROUP BY "provider", "platform", "environment", "connectionKey", "providerEventKey"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Layer 3 precondition failed: duplicate canonical webhook receipt scope';
  END IF;

  IF EXISTS (SELECT 1 FROM "MetaLead" GROUP BY "leadgenId" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Layer 3 precondition failed: duplicate provider Lead ID';
  END IF;

  IF EXISTS (SELECT 1 FROM "MetaLeadProcessingAttempt" GROUP BY "receiptId" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Layer 3 precondition failed: duplicate Lead processing attempt receipt';
  END IF;

  IF EXISTS (SELECT 1 FROM "MetaLeadHandoff" GROUP BY "leadId", "destination" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Layer 3 precondition failed: duplicate Lead handoff destination';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MetaConversation"
    WHERE "environment" IS NOT NULL
    GROUP BY "environment", "connectionKey", "accountIdentityReferenceId", "providerConversationKey"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Layer 3 precondition failed: duplicate scoped Instagram conversation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MetaMessage"
    WHERE "providerMessageId" IS NOT NULL
    GROUP BY "environment", "connectionKey", "accountIdentityReferenceId", "providerMessageId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Layer 3 precondition failed: duplicate scoped Instagram provider message';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MetaMessage"
    WHERE "outboundIdempotencyKey" IS NOT NULL
    GROUP BY "environment", "connectionKey", "accountIdentityReferenceId", "outboundIdempotencyKey"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Layer 3 precondition failed: duplicate Instagram outbound idempotency key';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MetaInstagramPrivateReplyReservation"
    GROUP BY "environment", "connectionKey", "accountIdentityReferenceId", "sourceCommentId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Layer 3 precondition failed: duplicate private reply reservation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MetaSocialWebhookReceipt"
    WHERE "retentionUntil" IS NULL
       OR "dedupeRetainUntil" IS NULL
       OR "dedupeRetainUntil" < "retentionUntil"
  ) THEN
    RAISE EXCEPTION 'Layer 3 precondition failed: invalid receipt retention ordering';
  END IF;
END $$;

SELECT 'PASS layer3 duplicate and retention preconditions' AS result;
