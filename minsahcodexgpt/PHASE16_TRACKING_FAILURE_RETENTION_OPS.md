# Phase 16 — Tracking Failure Retention & Dead Letter Operations

## Delivery status

Failure logs use categorized retention windows, bounded cleanup, safe payload summaries, duplicate-safe retries, and SUPER_ADMIN operations.

## Retention

- Debug/non-critical: 30 days
- Final retryable: 90 days
- Critical/auth/configuration: 180 days
- Cleanup supports dry-run and bounded limits through the cron route and admin tracking-health action.

## Dead Letter and retry safety

Permanent or retry-exhausted events stay auditable without raw email/phone payloads. Manual replay preserves event identity and refuses test/internal orders.

## QA

Run `npm run qa:tracking-retention`. Production cron authorization and actual deletion counts must be attached as environment evidence.
