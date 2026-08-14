# Phase 31 Layer 5 — Leads Domain Evidence

## Item 5.2 — Normalize and mapping

The canonical mapper separates sensitive contact values from safe projections. Generic custom fields retain metadata only; raw values remain in the encrypted/provider-sensitive boundary.

## Item 5.3 — Processing and CRM handoff

- The production Lead worker calls the Phase 31 domain runtime.
- Legacy receipt processing is reachable only with `META_PHASE31_LEAD_RUNTIME=LEGACY_ROLLBACK`.
- Manual form sync creates canonical receipts and enqueues the normal Lead processing job instead of persisting through the legacy parallel path.
- CRM assignment is guarded by a durable `MetaLeadHandoff` claim/complete/fail lifecycle and the existing unique `(leadId, destination)` boundary.
- Access, not-found, policy, transient and permanent failures are reduced to safe, redacted classifications.
- Queue payloads contain receipt/provider references, not Lead field values.
- No Prisma schema change was required.

## Item 5.4 — Test Lead isolation

Provider-marked and admin-created Test Leads use the normal receipt and queue path but are durably blocked at the CRM handoff boundary. Assignment and notification side effects are suppressed. Admin evidence contains only provider/page/form identifiers, isolation state and cleanup eligibility. Synthetic fixtures use reserved test values, and a super-admin cleanup path purges encrypted/raw/contact-derived fields after the seven-day evidence window. Normal CRM processing is not entered unintentionally.
