# Meta operation poison-message runbook

## Trigger

A `MetaOutboxMessage` is `QUARANTINED` or a `MetaOperation` has status `QUARANTINED` because the payload type/version is unsupported, malformed, oversized, digest-mismatched or contains a forbidden secret-like field.

## Response

1. Do not edit the immutable operation, event or outbox payload.
2. Inspect only safe error metadata, payload type, schema version, digest, capability, connection and asset scope.
3. Confirm that no raw credential was stored. If a credential-like field exists, treat it as a security incident and rotate the affected secret.
4. Restore/register the exact decoder when the historical schema remains supported, then create an approved new linked operation for replay. Do not reset the quarantined row to pending.
5. When the payload is invalid, correct the originating business data and create a new operation with a new idempotency key.
6. Record the incident, decision, replacement operation ID and decoder release in the audit trail.

## Forbidden actions

- Updating/deleting `MetaOperationEvent` rows.
- Editing operation/outbox payload JSON or digest.
- Blindly changing `QUARANTINED` to `PENDING`.
- Copying raw payloads into logs or tickets.
