\set ON_ERROR_STOP on
DO $$
BEGIN
  IF to_regclass('public."MetaSocialWebhookReceipt"') IS NOT NULL THEN
    RAISE EXCEPTION 'Layer 3 recovery failed: canonical receipt table still exists';
  END IF;
  IF to_regclass('public."MetaLeadProcessingAttempt"') IS NOT NULL THEN
    RAISE EXCEPTION 'Layer 3 recovery failed: Lead processing attempt table still exists';
  END IF;
  IF to_regclass('public."MetaInstagramPrivateReplyReservation"') IS NOT NULL THEN
    RAISE EXCEPTION 'Layer 3 recovery failed: private reply reservation table still exists';
  END IF;
  IF to_regclass('public."MetaWebhookReceipt"') IS NULL THEN
    RAISE EXCEPTION 'Layer 3 recovery damaged legacy MetaWebhookReceipt';
  END IF;
  IF to_regclass('public."MetaInstagramWebhookReceipt"') IS NULL THEN
    RAISE EXCEPTION 'Layer 3 recovery damaged legacy MetaInstagramWebhookReceipt';
  END IF;
  IF to_regclass('public."MetaLead"') IS NULL OR to_regclass('public."MetaConversation"') IS NULL OR to_regclass('public."MetaMessage"') IS NULL THEN
    RAISE EXCEPTION 'Layer 3 recovery damaged pre-existing business tables';
  END IF;
END $$;
SELECT 'PASS Layer 3 reverse recovery preserved legacy/business tables' AS result;
