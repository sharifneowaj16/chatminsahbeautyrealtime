# Phase 31 Layer 3.5 receipt-first normalized Lead storage

This migration is additive. It keeps the existing `MetaLead` and legacy `MetaWebhookReceipt` architecture, then adds canonical receipt tracing, one Lead-processing attempt per canonical receipt, scoped provider identity references, replay-safe handoff records, and versioned keyed fingerprints.

## Safety decisions

- `MetaLead.leadgenId` remains the authoritative DB idempotency key for provider Lead IDs.
- Existing encrypted raw payloads, masked values, legacy SHA-256 hashes, assignments, orders, and lifecycle fields are retained.
- Historical environment/connection scope is backfilled only when one canonical Lead Ads receipt gives an unambiguous scope.
- Existing references are not guessed from raw IDs. New runtime writes resolve Page/Form identities through the Layer 3.4 repository.
- New keyed fingerprints are produced only on future application writes because SQL has neither plaintext PII nor the application secret.
- `isTestLead` remains nullable; historical rows are not falsely classified as live Leads.
- Handoff rows are durable references only. Layer 5.3 performs actual CRM/customer/contact execution.

## Duplicate preconditions

Before applying unique constraints, run the provider Lead, receipt-attempt, and Lead-destination duplicate queries documented in `migration.sql`. The migration must stop for manual reconciliation rather than delete or merge rows.

## Backfill behavior

Backfill statements are deterministic and resumable:

- canonical receipts link to the existing unique `MetaLead` by legacy receipt and `leadgenId`;
- scope is populated only for one unambiguous environment/connection;
- processing-attempt IDs are deterministic (`phase31-lead-attempt:<receiptId>`);
- legacy duplicate rows retain `receiptId` and gain `canonicalReceiptId` where exact linkage exists.

## Recovery warning

Recovery removes Layer 3.5 attempt/handoff audit rows and new trace/fingerprint columns. Export required evidence first. It does not drop `MetaLead`, decrypt or delete raw Lead data, alter assignments/orders, or remove Layer 3.2–3.4 receipt and identity infrastructure.
