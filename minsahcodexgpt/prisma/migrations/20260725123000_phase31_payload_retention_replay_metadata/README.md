# Phase 31 Layer 3.7 payload retention and replay metadata

This migration extends the canonical Meta social webhook receipt with deterministic digest-mismatch evidence, separate metadata and dedupe retention deadlines, durable replay-source eligibility, approval references and child replay result trace.

## Safety decisions

- The migration is additive and stores no raw webhook body, token, secret, message text, email, phone or attachment URL.
- Existing canonical receipt identity and DB-level dedupe constraints are unchanged.
- Metadata retention and dedupe retention are separate; pruning safe metadata must not remove the provider event key or payload digest before `dedupeRetainUntil`.
- Existing Lead, Instagram message and legacy receipt links are reused as replay sources only when present.
- Dead-lettered unknown-write outcomes remain blocked until reconciliation; replay does not authorize blind provider writes.
- Receipt replay reuses `MetaAdminApproval`; the requester and approver must be different actors and the approval must be unexpired.
- Replay result authority remains the child receipt state. `replayCompletedAt` and `replayResultCode` are trace fields, not a competing state machine.

## Recovery warning

Recovery removes only Layer 3.7 metadata, constraints and indexes. It must not be run after approved or executed replay evidence becomes operationally required. Preserve exported replay/audit evidence and use a reviewed forward fix once production relies on these fields.
