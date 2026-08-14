# Phase 31 Layer 9.7 — Live Meta evidence runbook

This runbook captures authentic, redacted provider evidence. Static tests only verify the contract; they never count as live Meta proof.

## Safety rules

- Use a controlled Meta test app/Page/Instagram account and a test CRM destination.
- Never paste access tokens, app secrets, verify tokens or customer PII into evidence files.
- Redact screenshots before saving them and add a redaction review reference to the manifest.
- Store only safe provider IDs, internal receipt/correlation IDs, outcome codes and timestamps.
- Hash every artifact after redaction. Any later change invalidates the manifest.
- Do not mark mock, fixture, synthetic or fabricated data as live evidence.

## Required categories

1. Meta webhook subscription
2. Leadgen webhook delivery
3. Meta Test Lead processed
4. Instagram webhook delivery
5. Instagram inbound message
6. Instagram valid reply
7. Instagram expired reply blocked before provider call
8. Instagram private reply
9. Provider outbound message ID captured
10. Queue retry followed by recovery
11. Dead-letter evidence
12. Rollback/kill-switch blocks a queued write
13. Permission/account health evidence

## Evidence locations

- `evidence/phase31-meta-social-crm/screenshots/`
- `evidence/phase31-meta-social-crm/logs/`
- `evidence/phase31-meta-social-crm/provider-responses/`

Create the final manifest at:

`evidence/phase31-meta-social-crm/provider-responses/phase31-layer9.7-live-evidence-manifest.json`

The manifest schema is enforced by `scripts/phase31-layer9.7-evidence-contract.mjs`. Use SHA-256 values of the final redacted files. Screenshot records require `redactionReviewReference`.

## Commands

Static contract gate:

```bash
npm run qa:phase31-meta-layer9.7-source
```

Authentic live evidence gate:

```bash
PHASE31_LAYER9_7_CONFIRM_LIVE=YES npm run qa:phase31-meta-layer9.7-live
```

The combined item gate is:

```bash
PHASE31_LAYER9_7_CONFIRM_LIVE=YES npm run qa:phase31-meta-layer9.7
```

Without authentic complete artifacts the live command exits with status `2` and the item remains `BLOCKED`.
