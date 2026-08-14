\set ON_ERROR_STOP on
BEGIN;

-- Canonical identity required by scoped Instagram/private-reply persistence.
INSERT INTO "MetaExternalReference" (
  "id", "environment", "connectionKey", "assetType", "assetId", "objectType",
  "localId", "providerId", "createdAt", "updatedAt"
) VALUES (
  'l38-identity-ig', 'DEVELOPMENT', 'l38-primary', 'INSTAGRAM_ACCOUNT', 'ig-account-1',
  'INSTAGRAM_ACCOUNT', 'local-ig-1', 'provider-ig-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Atomic receipt create-or-get behavior: one row, duplicate metadata increments, first digest remains immutable.
INSERT INTO "MetaSocialWebhookReceipt" (
  "id", "provider", "platform", "environment", "connectionKey", "providerDeliveryId",
  "providerEventKey", "payloadDigest", "lastPayloadDigest", "safeMetadata", "state",
  "correlationId", "primaryIdentityReferenceId", "updatedAt"
) VALUES (
  'l38-receipt-1', 'META', 'INSTAGRAM', 'DEVELOPMENT', 'l38-primary', 'delivery-1',
  'event-1', repeat('a', 64), repeat('a', 64),
  '{"objectType":"instagram","eventType":"messages","signatureStatus":"VALID"}'::jsonb,
  'RECEIVED', 'l38-correlation-1', 'l38-identity-ig', CURRENT_TIMESTAMP
);

INSERT INTO "MetaSocialWebhookReceipt" (
  "id", "provider", "platform", "environment", "connectionKey", "providerDeliveryId",
  "providerEventKey", "payloadDigest", "lastPayloadDigest", "safeMetadata", "state",
  "correlationId", "primaryIdentityReferenceId", "updatedAt"
) VALUES (
  'l38-receipt-duplicate', 'META', 'INSTAGRAM', 'DEVELOPMENT', 'l38-primary', 'delivery-1b',
  'event-1', repeat('b', 64), repeat('b', 64),
  '{"objectType":"instagram","eventType":"messages","signatureStatus":"VALID"}'::jsonb,
  'RECEIVED', 'l38-correlation-duplicate', 'l38-identity-ig', CURRENT_TIMESTAMP
)
ON CONFLICT ("provider", "platform", "environment", "connectionKey", "providerEventKey")
DO UPDATE SET
  "duplicateCount" = "MetaSocialWebhookReceipt"."duplicateCount" + 1,
  "digestMismatchCount" = "MetaSocialWebhookReceipt"."digestMismatchCount" +
    CASE WHEN "MetaSocialWebhookReceipt"."payloadDigest" = EXCLUDED."payloadDigest" THEN 0 ELSE 1 END,
  "lastPayloadDigest" = EXCLUDED."payloadDigest",
  "lastDigestMismatchAt" = CASE
    WHEN "MetaSocialWebhookReceipt"."payloadDigest" = EXCLUDED."payloadDigest"
      THEN "MetaSocialWebhookReceipt"."lastDigestMismatchAt"
    ELSE CURRENT_TIMESTAMP END,
  "lastDigestMismatchCode" = CASE
    WHEN "MetaSocialWebhookReceipt"."payloadDigest" = EXCLUDED."payloadDigest"
      THEN "MetaSocialWebhookReceipt"."lastDigestMismatchCode"
    ELSE 'META_WEBHOOK_PAYLOAD_DIGEST_MISMATCH' END,
  "lastSeenAt" = GREATEST("MetaSocialWebhookReceipt"."lastSeenAt", CURRENT_TIMESTAMP),
  "updatedAt" = CURRENT_TIMESTAMP;

DO $$
DECLARE row_count integer;
DECLARE duplicate_count integer;
DECLARE mismatch_count integer;
DECLARE first_digest text;
DECLARE last_digest text;
BEGIN
  SELECT COUNT(*), MAX("duplicateCount"), MAX("digestMismatchCount"),
         MAX("payloadDigest"), MAX("lastPayloadDigest")
  INTO row_count, duplicate_count, mismatch_count, first_digest, last_digest
  FROM "MetaSocialWebhookReceipt"
  WHERE "provider"='META' AND "platform"='INSTAGRAM' AND "environment"='DEVELOPMENT'
    AND "connectionKey"='l38-primary' AND "providerEventKey"='event-1';

  IF row_count <> 1 OR duplicate_count <> 1 OR mismatch_count <> 1
     OR first_digest <> repeat('a',64) OR last_digest <> repeat('b',64) THEN
    RAISE EXCEPTION 'Receipt create-or-get/digest mismatch assertion failed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MetaSocialWebhookReceipt"
    WHERE "id"='l38-receipt-1'
      AND lower("safeMetadata"::text) ~ '(access[_-]?token|app[_-]?secret|authorization|email|phone|rawpayload|message[_-]?text|sourceurl)'
  ) THEN
    RAISE EXCEPTION 'Safe metadata contains prohibited sensitive keys';
  END IF;
END $$;

-- Same provider event in a different connection must not collide.
INSERT INTO "MetaSocialWebhookReceipt" (
  "id", "provider", "platform", "environment", "connectionKey", "providerEventKey",
  "payloadDigest", "lastPayloadDigest", "safeMetadata", "state", "correlationId", "updatedAt"
) VALUES (
  'l38-receipt-other-connection', 'META', 'INSTAGRAM', 'DEVELOPMENT', 'l38-secondary', 'event-1',
  repeat('a',64), repeat('a',64), '{}'::jsonb, 'RECEIVED', 'l38-correlation-2', CURRENT_TIMESTAMP
);

-- Provider Lead ID, receipt processing and CRM handoff idempotency.
INSERT INTO "MetaLead" (
  "id", "leadgenId", "environment", "connectionKey", "rawFields", "receivedAt",
  "retentionUntil", "updatedAt"
) VALUES (
  'l38-lead-1', 'provider-lead-1', 'DEVELOPMENT', 'l38-primary', '{}'::jsonb,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', CURRENT_TIMESTAMP
);

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO "MetaLead" (
      "id", "leadgenId", "environment", "connectionKey", "rawFields", "receivedAt",
      "retentionUntil", "updatedAt"
    ) VALUES (
      'l38-lead-duplicate', 'provider-lead-1', 'DEVELOPMENT', 'l38-primary', '{}'::jsonb,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', CURRENT_TIMESTAMP
    );
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Duplicate provider Lead ID was not blocked'; END IF;
END $$;

INSERT INTO "MetaLeadProcessingAttempt" (
  "id", "receiptId", "providerLeadId", "environment", "connectionKey", "normalizedLeadId", "updatedAt"
) VALUES (
  'l38-lead-attempt-1', 'l38-receipt-1', 'provider-lead-1', 'DEVELOPMENT', 'l38-primary', 'l38-lead-1', CURRENT_TIMESTAMP
);

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO "MetaLeadProcessingAttempt" (
      "id", "receiptId", "providerLeadId", "environment", "connectionKey", "normalizedLeadId", "updatedAt"
    ) VALUES (
      'l38-lead-attempt-duplicate', 'l38-receipt-1', 'provider-lead-1', 'DEVELOPMENT', 'l38-primary', 'l38-lead-1', CURRENT_TIMESTAMP
    );
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Duplicate Lead processing receipt was not blocked'; END IF;
END $$;

INSERT INTO "MetaLeadHandoff" (
  "id", "leadId", "destination", "idempotencyKey", "updatedAt"
) VALUES ('l38-handoff-1', 'l38-lead-1', 'INTERNAL_CRM', 'l38-handoff-key-1', CURRENT_TIMESTAMP);

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO "MetaLeadHandoff" (
      "id", "leadId", "destination", "idempotencyKey", "updatedAt"
    ) VALUES ('l38-handoff-duplicate', 'l38-lead-1', 'INTERNAL_CRM', 'l38-handoff-key-2', CURRENT_TIMESTAMP);
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Duplicate Lead destination handoff was not blocked'; END IF;
END $$;

-- Instagram conversation and inbound/outbound message DB idempotency.
INSERT INTO "MetaConversation" (
  "id", "platformId", "environment", "connectionKey", "accountIdentityReferenceId",
  "providerConversationKey", "accountId", "participantId", "retentionUntil", "updatedAt"
) VALUES (
  'l38-conversation-1', 'legacy-conversation-1', 'DEVELOPMENT', 'l38-primary', 'l38-identity-ig',
  'provider-conversation-1', 'provider-ig-1', 'participant-1', CURRENT_TIMESTAMP + INTERVAL '30 days', CURRENT_TIMESTAMP
);

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO "MetaConversation" (
      "id", "platformId", "environment", "connectionKey", "accountIdentityReferenceId",
      "providerConversationKey", "accountId", "participantId", "retentionUntil", "updatedAt"
    ) VALUES (
      'l38-conversation-duplicate', 'legacy-conversation-duplicate', 'DEVELOPMENT', 'l38-primary', 'l38-identity-ig',
      'provider-conversation-1', 'provider-ig-1', 'participant-2', CURRENT_TIMESTAMP + INTERVAL '30 days', CURRENT_TIMESTAMP
    );
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Duplicate scoped Instagram conversation was not blocked'; END IF;
END $$;

INSERT INTO "MetaMessage" (
  "id", "platformId", "environment", "connectionKey", "accountIdentityReferenceId",
  "providerMessageId", "conversationId", "direction", "messageType", "sentAt", "updatedAt"
) VALUES (
  'l38-message-in-1', 'provider-message-in-1', 'DEVELOPMENT', 'l38-primary', 'l38-identity-ig',
  'provider-message-in-1', 'l38-conversation-1', 'INBOUND', 'TEXT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO "MetaMessage" (
      "id", "platformId", "environment", "connectionKey", "accountIdentityReferenceId",
      "providerMessageId", "conversationId", "direction", "messageType", "sentAt", "updatedAt"
    ) VALUES (
      'l38-message-in-duplicate', 'provider-message-in-duplicate', 'DEVELOPMENT', 'l38-primary', 'l38-identity-ig',
      'provider-message-in-1', 'l38-conversation-1', 'INBOUND', 'TEXT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Duplicate inbound provider message was not blocked'; END IF;
END $$;

INSERT INTO "MetaMessage" (
  "id", "platformId", "environment", "connectionKey", "accountIdentityReferenceId",
  "localMessageKey", "outboundIdempotencyKey", "conversationId", "direction", "messageType",
  "status", "providerStatus", "sentAt", "updatedAt"
) VALUES (
  'l38-message-out-1', 'outbound:l38:1', 'DEVELOPMENT', 'l38-primary', 'l38-identity-ig',
  'l38-local-out-1', 'l38-outbound-key-1', 'l38-conversation-1', 'OUTBOUND', 'TEXT',
  'QUEUED', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO "MetaMessage" (
      "id", "platformId", "environment", "connectionKey", "accountIdentityReferenceId",
      "localMessageKey", "outboundIdempotencyKey", "conversationId", "direction", "messageType",
      "status", "providerStatus", "sentAt", "updatedAt"
    ) VALUES (
      'l38-message-out-duplicate', 'outbound:l38:2', 'DEVELOPMENT', 'l38-primary', 'l38-identity-ig',
      'l38-local-out-2', 'l38-outbound-key-1', 'l38-conversation-1', 'OUTBOUND', 'TEXT',
      'QUEUED', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Duplicate outbound idempotency key was not blocked'; END IF;
END $$;

INSERT INTO "MetaInstagramPrivateReplyReservation" (
  "id", "environment", "connectionKey", "accountIdentityReferenceId", "sourceCommentId",
  "sourceMessageId", "conversationId", "expiresAt", "updatedAt"
) VALUES (
  'l38-private-reply-1', 'DEVELOPMENT', 'l38-primary', 'l38-identity-ig', 'source-comment-1',
  'l38-message-in-1', 'l38-conversation-1', CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP
);

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO "MetaInstagramPrivateReplyReservation" (
      "id", "environment", "connectionKey", "accountIdentityReferenceId", "sourceCommentId",
      "sourceMessageId", "conversationId", "expiresAt", "updatedAt"
    ) VALUES (
      'l38-private-reply-duplicate', 'DEVELOPMENT', 'l38-primary', 'l38-identity-ig', 'source-comment-1',
      'l38-message-in-1', 'l38-conversation-1', CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP
    );
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Second private reply reservation was not blocked'; END IF;
END $$;

SELECT 'PASS receipt/lead/instagram DB idempotency and safe projection assertions' AS result;
ROLLBACK;
