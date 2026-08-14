# Phase 31 Layer 7.6 Result — Queue, dead-letter and replay visibility

Status: COMPLETE (gate evidence: `evidence/phase31-meta-social-crm/logs/phase31_layer7.6_gate.log`)

## Result

Added durable job audit pagination, grouped queue states, retry/dead-letter visibility, sanitized failures and policy-backed replay/cancel eligibility without returning job payloads.

## Primary outputs

- `lib/meta-platform/admin/jobs-dto.ts`
- `lib/meta-platform/admin/jobs-status.ts`
- `app/api/admin/meta/jobs/route.ts`
- `app/api/admin/meta/operations/summary/route.ts`

## Claim boundary

The focused source tests and audits are reproducible without application dependencies. This item does not claim a full Next.js build/typecheck or live PostgreSQL, Redis/BullMQ, realtime or Meta provider execution.
