# Minsah Beauty — Production QA Matrix

This file is the final release checklist for the tracking/payment/analytics system. It is intentionally strict: a production deploy should not be called 100/100 ready until the required QA flags are set from real evidence.

## Commands

Run before release:

```bash
npm run audit:security
npm run qa:phase8-static
npm run qa:telegram-security
npm run typecheck
npm run build
npm run qa:production
```

Or run all in one:

```bash
npm run qa:predeploy
```

## Required QA evidence flags

Set these only after completing the matching test. Store supporting screenshots/logs in the matching optional `_EVIDENCE_URL` variable.

| Flag | What must be proven |
|---|---|
| `QA_LEGACY_PAYMENT_LOCK_VERIFIED` | Legacy card/COD/bKash bypasses are disabled and raw card UI/server fields do not exist. |
| `QA_CANONICAL_ONLINE_PURCHASE_VERIFIED` | Online Purchase fires only after signed verified payment flow and rejects amount/currency/method mismatch. |
| `QA_COD_PHONE_CONFIRMED_PURCHASE_VERIFIED` | COD Purchase does not fire on order submit; Phone Confirmed sends server-only Meta + GA4 purchase. |
| `QA_PURCHASE_DEDUP_REFRESH_RETRY_VERIFIED` | Refresh, webhook retry, and repeated admin save cannot duplicate Purchase. |
| `QA_META_CATALOG_VARIANT_MAPPING_VERIFIED` | Variant/shade products use parent product `content_ids`, `product_group`, and preserve variant metadata. |
| `QA_EXTERNAL_ID_PARITY_VERIFIED` | Browser Pixel and Server CAPI use the same normalized lowercase+trimmed SHA-256 `external_id`. |
| `QA_PRODUCT_VIEW_DEDUP_VERIFIED` | Same visitor + same product within 30 minutes increments product view counters once. |
| `QA_CONSENT_DENIED_GATE_VERIFIED` | Denied consent blocks non-essential browser tags while checkout still works. |
| `QA_INTERNAL_BOT_FILTER_VERIFIED` | Staff/internal/bot/social-preview traffic is excluded from production analytics/tracking endpoints. |
| `QA_GA4_APP_ROUTER_PAGEVIEW_VERIFIED` | GA4 sends exactly one manual `page_view` per App Router URL change. |
| `QA_GA4_PAYMENT_REFERRAL_VERIFIED` | Payment gateway return does not overwrite original source/medium. |
| `QA_SENSITIVE_PAYMENT_URL_SANITIZED_VERIFIED` | GA4 page_location never contains payment tokens/secrets/signatures. |
| `QA_QUEUE_RETRY_DEAD_LETTER_VERIFIED` | CAPI retry/backoff/dead-letter behavior works and preserves original event_time. |
| `QA_TRACKING_HEALTH_CRON_ALERT_VERIFIED` | Tracking health cron persists checks and sends alert on WARN/CRITICAL. |
| `QA_EXTERNAL_META_SETUP_VERIFIED` | Meta domain verification, AEM priority, System User token, catalog diagnostics, and audiences are verified externally. |
| `QA_BACKEND_META_GA4_RECONCILIATION_VERIFIED` | Backend confirmed/paid purchases reconcile with Meta and GA4 within expected tolerance. |
| `QA_TELEGRAM_BOT_HARDENING_VERIFIED` | Telegram webhook fails closed, wrong secret/non-allowlisted Telegram user is rejected, callback buttons are tokenized, actions are logged, and double taps cannot duplicate COD Purchase/Pathao dispatch. |
| `QA_PREDEPLOY_SCRIPTS_VERIFIED` | Predeploy scripts were run and logs are attached to release notes. |

## Recommended QA evidence flag

| Flag | What must be proven |
|---|---|
| `QA_GA4_REFUND_VERIFIED` | GA4 refund event fires once with original transaction ID and refunded item/value data. |

## Telegram bot QA tests

| Test | Expected |
|---|---|
| Missing `TELEGRAM_WEBHOOK_SECRET` in production | Callback route fails closed with 503. |
| Wrong Telegram webhook secret | Callback route returns 401. |
| Valid secret + non-allowlisted Telegram user | Callback is rejected with 403 and Telegram alert. |
| Forged raw `phone_confirm_{orderId}` callback | Rejected; only `t:<token>` callback_data is accepted. |
| Phone Confirmed COD | Order confirmed and Meta CAPI + GA4 Purchase are queued once. |
| Repeated Phone Confirm tap | No duplicate Purchase. |
| Phone Off after confirmed/shipped/delivered | Blocked. |
| Cancel after confirmed/paid/shipped/Pathao-dispatched | Blocked. |
| Pathao Send before phone confirmation | Blocked. |
| Pathao Send repeated | No duplicate courier dispatch. |

## Optional evidence URL variables

Every required flag has a matching evidence URL variable. Examples:

```env
QA_LEGACY_PAYMENT_LOCK_EVIDENCE_URL=https://private-link.example/legacy-lock
QA_CANONICAL_ONLINE_PURCHASE_EVIDENCE_URL=https://private-link.example/online-purchase
QA_COD_PHONE_CONFIRMED_PURCHASE_EVIDENCE_URL=https://private-link.example/cod-purchase
QA_META_CATALOG_VARIANT_MAPPING_EVIDENCE_URL=https://private-link.example/catalog-mapping
QA_BACKEND_META_GA4_RECONCILIATION_EVIDENCE_URL=https://private-link.example/reconciliation
```

## Manual test routes

Use these admin tools while testing:

- `/admin/production-qa`
- `/admin/tracking-health`
- `/admin/tracking`

Use external tools:

- Meta Events Manager Test Events
- Meta Pixel Helper
- Meta Catalog diagnostics
- GA4 DebugView / Realtime
- Browser DevTools Network/Application tabs
- Gateway sandbox/live test flow

## Release rule

If `/admin/production-qa` returns `BLOCKED`, do not deploy.

If it returns `WARN`, review warnings and document why they are acceptable.

If it returns `READY`, deploy only after release owner signs off on the attached evidence.
