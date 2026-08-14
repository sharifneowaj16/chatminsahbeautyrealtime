-- WARNING: destructive recovery for Phase 31 Layer 3.5 metadata and audit rows only.
-- PRECONDITIONS:
-- 1. Stop Lead webhook, worker, replay, assignment, and CRM handoff processes.
-- 2. Export MetaLeadProcessingAttempt and MetaLeadHandoff rows that must be retained.
-- 3. Verify no admin or incident workflow depends on receipt-to-Lead trace fields.
-- 4. Existing MetaLead rows, encrypted payloads, assignments, orders, and legacy receipts are preserved.

ALTER TABLE "MetaLeadHandoff" DROP CONSTRAINT IF EXISTS "MetaLeadHandoff_leadId_fkey";
ALTER TABLE "MetaLeadProcessingAttempt"
  DROP CONSTRAINT IF EXISTS "MetaLeadProcessingAttempt_receiptId_fkey",
  DROP CONSTRAINT IF EXISTS "MetaLeadProcessingAttempt_normalizedLeadId_fkey",
  DROP CONSTRAINT IF EXISTS "MetaLeadProcessingAttempt_pageIdentityReferenceId_fkey",
  DROP CONSTRAINT IF EXISTS "MetaLeadProcessingAttempt_formIdentityReferenceId_fkey";
ALTER TABLE "MetaLeadDuplicate" DROP CONSTRAINT IF EXISTS "MetaLeadDuplicate_canonicalReceiptId_fkey";
ALTER TABLE "MetaSocialWebhookReceipt" DROP CONSTRAINT IF EXISTS "MetaSocialWebhookReceipt_normalizedLeadId_fkey";
ALTER TABLE "MetaLead"
  DROP CONSTRAINT IF EXISTS "MetaLead_pageIdentityReferenceId_fkey",
  DROP CONSTRAINT IF EXISTS "MetaLead_formIdentityReferenceId_fkey",
  DROP CONSTRAINT IF EXISTS "MetaLead_scope_pair_check",
  DROP CONSTRAINT IF EXISTS "MetaLead_fingerprint_version_check";

DROP TABLE IF EXISTS "MetaLeadHandoff";
DROP TABLE IF EXISTS "MetaLeadProcessingAttempt";

DROP INDEX IF EXISTS "MetaLeadDuplicate_canonical_receipt_idx";
ALTER TABLE "MetaLeadDuplicate" DROP COLUMN IF EXISTS "canonicalReceiptId";

DROP INDEX IF EXISTS "MetaSocialWebhookReceipt_normalized_lead_idx";
ALTER TABLE "MetaSocialWebhookReceipt" DROP COLUMN IF EXISTS "normalizedLeadId";

DROP INDEX IF EXISTS "MetaLead_form_identity_idx";
DROP INDEX IF EXISTS "MetaLead_page_identity_idx";
DROP INDEX IF EXISTS "MetaLead_scope_received_idx";
DROP INDEX IF EXISTS "MetaLead_emailFingerprint_idx";
DROP INDEX IF EXISTS "MetaLead_phoneFingerprint_idx";
ALTER TABLE "MetaLead"
  DROP COLUMN IF EXISTS "isTestLead",
  DROP COLUMN IF EXISTS "fingerprintVersion",
  DROP COLUMN IF EXISTS "emailFingerprint",
  DROP COLUMN IF EXISTS "phoneFingerprint",
  DROP COLUMN IF EXISTS "formIdentityReferenceId",
  DROP COLUMN IF EXISTS "pageIdentityReferenceId",
  DROP COLUMN IF EXISTS "connectionKey",
  DROP COLUMN IF EXISTS "environment",
  DROP COLUMN IF EXISTS "provider";

DROP TYPE IF EXISTS "MetaLeadHandoffStatus";
DROP TYPE IF EXISTS "MetaLeadHandoffDestination";
