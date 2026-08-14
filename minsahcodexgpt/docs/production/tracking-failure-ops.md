# Phase 16 — Tracking Failure Retention + Dead Letter / Retry Ops

Phase 16 keeps Meta CAPI and GA4 Measurement Protocol failure logs production-safe. It reduces DB bloat, keeps critical token/config failures long enough for debugging, and preserves safe retry controls without exposing raw PII.

## Retention categories

| Category | Default retention | Meaning |
|---|---:|---|
| `DEBUG_NON_CRITICAL` | 30 days | Temporary/retry/debug rows that are not final failures. |
| `FINAL_RETRYABLE` | 90 days | Dead-letter style final failure rows that may need admin review/retry. |
| `CRITICAL` | 180 days | Token, permission, env, GA4 secret, or authorization failures. |

Recommended defaults:

```env
TRACKING_FAILURE_DEBUG_RETENTION_DAYS=30
TRACKING_FAILURE_FINAL_RETENTION_DAYS=90
TRACKING_FAILURE_CRITICAL_RETENTION_DAYS=180
TRACKING_FAILURE_CLEANUP_LIMIT=1000
```

## Cleanup cron

Endpoint:

```txt
/api/cron/tracking-cleanup
```

Production auth:

```txt
Authorization: Bearer <TRACKING_CLEANUP_CRON_SECRET>
x-cron-secret: <TRACKING_CLEANUP_CRON_SECRET>
```

If `TRACKING_CLEANUP_CRON_SECRET` is not set, the route falls back to `TRACKING_HEALTH_CRON_SECRET` or `CRON_SECRET`.

Dry-run first:

```bash
curl -H "Authorization: Bearer $TRACKING_CLEANUP_CRON_SECRET" \
  "https://your-domain.com/api/cron/tracking-cleanup?dryRun=true"
```

Live cleanup:

```bash
curl -X POST -H "Authorization: Bearer $TRACKING_CLEANUP_CRON_SECRET" \
  "https://your-domain.com/api/cron/tracking-cleanup"
```

CLI alternative:

```bash
npm run cron:tracking-cleanup -- --dry-run
npm run cron:tracking-cleanup
```

## Admin retry safety

The tracking-health dashboard keeps final failed rows visible and exposes retry only for eligible orders.

Retry guardrails:

- Test/internal orders are not retried.
- Meta Purchase retry is queued only when `metaPurchaseSent=false`.
- GA4 purchase retry is queued only when `gaPurchaseSent=false`.
- GA4 refund retry is queued only when the selected failure is a GA4 refund and `gaRefundSent=false`.
- Retry queues jobs; it does not mark events as sent unless Meta/GA4 accepts them.

## Safe payload rule

Admin detail panels show safe payload summaries only. No raw email, phone, access token, or complete request payload should be stored or displayed.

Safe payload examples:

```txt
has_fbp
has_fbc
has_external_id
has_email_hash
has_phone_hash
content_id_count
schema_version
value
currency
```

No raw email, raw phone, token, cookie value, or user-agent body should be exposed in admin UI.

## Suggested schedule

Run tracking cleanup daily after the low-traffic window:

```txt
0 3 * * * /api/cron/tracking-cleanup
```

Run tracking health separately:

```txt
*/30 * * * * /api/cron/tracking-health
```

## Verification checklist

- `npm run qa:phase16` passes.
- `/api/cron/tracking-cleanup?dryRun=true` returns candidate count without deleting rows.
- Live cleanup deletes only rows past `cleanupAfter` or fallback retention cutoff.
- Tracking Health page shows retention policy and safe payload summaries.
- Critical token/config failures remain visible longer than non-critical debug rows.
- Manual retry does not create duplicate Purchase events.
