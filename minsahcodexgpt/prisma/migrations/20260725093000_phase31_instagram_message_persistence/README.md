# Phase 31 Layer 3.6 Instagram conversation/message/outbound persistence

This migration scopes Instagram participants, conversations, messages and reply attempts by environment, connection and canonical Instagram account identity. It adds receipt-to-message trace, monotonic ordering fields, provider/local message identity separation, delivery/reconciliation state, a DB-backed private-reply reservation and attachment policy decisions.

## Safety decisions

- Existing `MetaConversation`, `MetaMessage`, attachments and reply attempts are preserved and extended.
- Historical environment/connection/account scope is backfilled only through one unambiguous canonical Instagram receipt.
- Existing fake `outbound:<attempt>` values remain in legacy `platformId` but are not copied into `providerMessageId`.
- Global `platformId` and reply idempotency uniqueness are replaced by scoped provider/idempotency constraints only after duplicate precondition queries.
- Late messages are stored, but application updates use a monotonic timestamp/provider-key guard so conversation activity and reply windows never regress.
- Private-reply one-shot authority is the scoped source-comment unique constraint, not `privateReplySentAt`.
- Unknown provider-write outcomes retain the send/private-reply reservation and require reconciliation; they are not blindly retried.
- Attachment policy rows are persistence only. Bounded download, MIME verification and malware scanning remain Layer 4.6 work.

## Recovery warning

After multiple environments or connections legitimately store the same provider IDs, old global unique indexes may not be restorable. Recovery contains explicit duplicate preconditions and preserves all existing conversation/message rows; use a reviewed forward fix after production data depends on scoped identity.
