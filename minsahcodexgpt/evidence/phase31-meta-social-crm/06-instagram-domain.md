# Phase 31 Layer 5 — Instagram Domain Evidence

## Item 5.6 — Inbound conversation domain

The production Instagram worker now enters the Phase 31 inbound domain runtime. The domain validates account, sender, recipient, conversation, provider-message, timestamp, correlation and attachment metadata. Persistence remains provider-message idempotent and preserves out-of-order ordering rules. Side effects are planned from the durable `message.created` result: duplicate inbound events schedule no media-validation jobs, publish no realtime event and do not repeat participant-profile work. Legacy inbound execution is reachable only with `META_PHASE31_INSTAGRAM_INBOUND_RUNTIME=LEGACY_ROLLBACK`. No Prisma schema change was required.

## Item 5.7 — standard reply domain

- Canonical text and idempotency validation is owned by `domains/instagram/send-reply.ts`; empty and whitespace-only replies are rejected.
- The admin reply route requests standard messages through `requestInstagramStandardReplyProduction`.
- The production Instagram worker executes standard messages through `executeInstagramStandardReplyProduction` and reads the write kill switch from the current execution environment.
- `SENDING`, `UNKNOWN_OUTCOME`, and reconciliation-required attempts never enter a blind retry. They are marked/reported for reconciliation and terminate the BullMQ retry path.
- Legacy outbound authority is available only through `META_PHASE31_INSTAGRAM_OUTBOUND_RUNTIME=LEGACY_ROLLBACK`.

## Item 5.8 — private reply domain

- The admin route and production Instagram worker use the private-reply domain runtime; legacy outbound execution remains available only through `META_PHASE31_INSTAGRAM_OUTBOUND_RUNTIME=LEGACY_ROLLBACK`.
- Source message, conversation, account, comment and post relationships are validated fail-closed. The seven-day expiry is derived from the source event and checked against persisted state.
- One-shot reservations remain enforced by the scoped database uniqueness boundary. Sent, blocked, failed, or unknown-outcome reservations cannot be reused.
- Instagram Live private replies require an explicit current `liveBroadcastActive=true` policy state at execution time.
- Provider response capture stores only the provider message identifier and a digest of a bounded safe projection; unknown outcomes enter reconciliation and are never blindly retried.
- Focused evidence: `evidence/phase31-meta-social-crm/logs/layer5.8-instagram-private-reply.log`. Prisma schema unchanged.

## Item 5.9 — attachment and media domain integration

- Inbound attachment metadata now enters `domains/instagram/media-policy.ts` by default; the previous validator is available only through `META_PHASE31_INSTAGRAM_MEDIA_RUNTIME=LEGACY_ROLLBACK`.
- Validation jobs contain only scoped IDs and a source digest. The production social-media worker returns safe projections without source URLs, filenames, storage paths, tokens, or generic metadata.
- Admin conversation list/detail routes use attachment-safe projections. Quarantine and rejection reasons remain visible as bounded reason codes.
- Outbound attachment input is policy checked and unsafe or unsupported media is blocked before any provider write.
- Focused evidence: `evidence/phase31-meta-social-crm/logs/layer5.9-instagram-media.log`. Prisma schema unchanged.
