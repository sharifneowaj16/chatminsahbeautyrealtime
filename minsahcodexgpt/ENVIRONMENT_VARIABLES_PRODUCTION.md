# Production Environment Variables

Use `.env.example` as the template, then replace every placeholder with a real production value. Never commit `.env`, `.env.local`, generated secrets, private keys, or exported provider credentials.

## Required core runtime

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | Yes | `production` for live deploy. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL, for example `https://minsahbeauty.cloud`. |
| `NEXTAUTH_URL` | Yes | Same live app URL unless deploying behind a special proxy. |
| `NEXTAUTH_SECRET` | Yes | Random 32+ character secret. |
| `JWT_SECRET` | Yes | Random 32+ character secret. Do not reuse `NEXTAUTH_SECRET`. |
| `JWT_REFRESH_SECRET` | Yes | Random 32+ character secret. Do not reuse `JWT_SECRET`. |
| `DATABASE_URL` | Yes | Production PostgreSQL connection string. |
| `DIRECT_URL` | Recommended | Direct DB URL for migrations, if required by hosting. |
| `REDIS_URL` | Yes | Required for BullMQ queues, tracking worker, rate limit, and health checks. |

## Meta / GA4 tracking

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | Yes | Browser Pixel ID. Public by design. |
| `META_PIXEL_ID` or `META_DATASET_ID` | Yes | Server-side Dataset/Pixel ID. |
| `META_CAPI_ACCESS_TOKEN` | Yes | Server-only. Never expose in browser code, logs, or dashboards. |
| `META_GRAPH_API_VERSION` | Yes | Pin a version such as `v20.0`, then test upgrades in staging. |
| `META_TEST_EVENT_CODE` | No | Must be empty in production. |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Recommended | Browser GA4 ID. Public by design. |
| `GA4_API_SECRET` | Required for MP | Server-only Measurement Protocol secret for COD purchase/refund. |
| `GA4_PAYMENT_REFERRAL_EXCLUSIONS_VERIFIED` | Gate | Set `true` only after bKash/SSLCommerz/Nagad/aamarPay/ShurjoPay unwanted referral QA passes. |
| `GA4_EXTRA_PAYMENT_REFERRAL_DOMAINS` | Optional | Comma-separated exact gateway redirect hosts observed in GA4 DebugView/Realtime beyond the built-in list. |
| `GA4_APP_ROUTER_PAGEVIEW_VERIFIED` | Gate | Set `true` only after confirming exactly one GA4 `page_view` per Next.js App Router URL change. |
| `GA4_PAYMENT_RETURN_SOURCE_VERIFIED` | Gate | Set `true` only after a UTM/ad-click → gateway → order-confirmed test keeps original source/medium, not gateway/referral. |
| `GA4_CROSS_DOMAIN_CHECK_VERIFIED` | Gate | Set `true` after verifying checkout/payment stays on same domain or GA4 cross-domain linker is not required / correctly configured. |
| `NEXT_PUBLIC_GTM_ENABLED` | Optional | Keep `false` unless GTM tags are audited for no duplicate Meta/GA4 ecommerce events. |
| `GTM_ECOMMERCE_TAGS_AUDITED` | Gate | Set `true` only after duplicate tag audit passes. |

## Tracking health / deploy gate

| Variable | Required | Notes |
| --- | --- | --- |
| `TRACKING_HEALTH_CRON_SECRET` | Yes | Random secret. Send via `Authorization: Bearer <secret>` or `x-cron-secret`. In production, query-string secrets are intentionally rejected. |
| `TRACKING_HEALTH_ALERT_WEBHOOK_URL` | Recommended | Slack/Discord/generic webhook for WARN/CRITICAL alerts. |
| `PRODUCTION_QA_REQUIRED` | Recommended | Keep `true` so the deploy gate stays visible. |
| `DISABLE_EMBEDDED_WORKERS` | Depends | `false` for single-container deploys; `true` only if a separate `worker:meta-capi` process is running. |

## Privacy / consent / catalog gates

| Variable | Required | Notes |
| --- | --- | --- |
| `TRACKING_DISCLOSURE_VERIFIED` | Gate | Set `true` only after privacy policy explains Meta Pixel, CAPI, GA4, and Clarity. |
| `COOKIE_DISCLOSURE_VERIFIED` | Gate | Set `true` only after cookie/tracking disclosure is published. |
| `CONSENT_MODE_REQUIRED` | Context | `true` if EU/UK visitors or consent mode is needed. |
| `CONSENT_MODE_VERIFIED` | Gate | Required when `CONSENT_MODE_REQUIRED=true`. |
| `NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT` | Context | Set `true` when browser analytics/ads tags must wait for explicit opt-in. Bangladesh-only deployments may keep `false`, but user denial still blocks non-essential tags. |
| `ANALYTICS_INTERNAL_IPS` / `INTERNAL_TRAFFIC_IPS` / `STAFF_IPS` | Recommended | Comma-separated office/staff/developer IPs excluded from product analytics and public CAPI events. |
| `INTERNAL_TRAFFIC_HEADER_SECRET` | Recommended | Required for trusted `x-minsah-internal-traffic: 1` filtering in production. |
| `NEXT_PUBLIC_CLARITY_ENABLED` | Optional | Keep `false` until masking QA passes. |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Optional | Public Clarity project ID. |
| `CLARITY_SENSITIVE_MASKING_VERIFIED` | Gate | Set `true` only after checkout/account/admin sensitive fields are masked. |
| `META_CATALOG_CONNECTED` | Gate | Set `true` only after Meta Catalog is connected. |
| `META_CATALOG_QA_VERIFIED` | Gate | Set `true` only after product ID, price, image, stock, and variant mapping QA passes. |

## Courier and payment security

| Variable | Required | Notes |
| --- | --- | --- |
| `PAYMENT_WEBHOOK_SECRET` | Yes for online payment | HMAC secret used by verified payment callbacks. |
| `META_BROWSER_PURCHASE_TOKEN_SECRET` | Yes for online purchase browser dedup | Random server-only secret. |
| `PATHAO_WEBHOOK_SECRET` | Yes if Pathao webhook used | Must match Pathao merchant panel webhook secret. |
| `PATHAO_WEBHOOK_INTEGRATION_SECRET` | Yes if Pathao webhook test used | Random secret returned only for Pathao integration test. No hardcoded default is used. |
| `STEADFAST_WEBHOOK_SECRET` / `STEADFAST_WEBHOOK_AUTH_TOKEN` | If Steadfast webhook used | Configure at least one accepted Steadfast webhook auth secret/token. |


## Telegram order bot security

| Variable | Required | Notes |
| --- | --- | --- |
| `TELEGRAM_RELAY_BASE` | Recommended | Defaults to `https://api.telegram.org/bot`; set only if using an approved Telegram relay/proxy. |
| `TELEGRAM_ORDER_BOT_TOKEN` | Yes if Telegram order ops used | Order bot token. Server-only. Do not use generic legacy `TELEGRAM_BOT_TOKEN` for order actions. |
| `TELEGRAM_ORDER_CHAT_ID` | Yes if Telegram order ops used | Chat/channel ID that receives order notifications. |
| `TELEGRAM_WEBHOOK_SECRET` | Yes in production | Must match Telegram webhook `secret_token`; callback route fails closed without it in production. |
| `TELEGRAM_ADMIN_USER_IDS` | Yes in production | Comma-separated allowlisted Telegram numeric user IDs that can tap order action buttons. |

## Realtime inbox secrets

| Variable | Required | Notes |
| --- | --- | --- |
| `WS_AUTH_SECRET` | Yes if realtime inbox used | Server-only token signing secret. Do not use a `NEXT_PUBLIC_` secret for signing. |
| `REPLY_API_SECRET` | Yes if realtime service used | Random shared secret between app and realtime service. |
| `NEXT_PUBLIC_REALTIME_WS_URL` | If realtime inbox used | Public WebSocket URL. This is not a signing secret. |

## Rotation checklist

Rotate immediately if any secret was committed, pasted into logs, sent in screenshots, or shared outside the deployment provider. After rotation, verify `/admin/production-qa`, `/admin/tracking-health`, and the payment/courier webhooks again.

## Phase 8 full QA evidence flags

These flags are release evidence, not feature switches. Set a flag to `true` only after the matching test is completed and documented. Optional evidence links should use the matching `_EVIDENCE_URL` variable.

| Variable | Required before 100/100 ready | Notes |
| --- | --- | --- |
| `QA_LEGACY_PAYMENT_LOCK_VERIFIED` | Yes | Legacy payment bypasses and raw-card surfaces are disabled. |
| `QA_CANONICAL_ONLINE_PURCHASE_VERIFIED` | Yes | Online Purchase only fires from signed verified payment flow. |
| `QA_COD_PHONE_CONFIRMED_PURCHASE_VERIFIED` | Yes | COD Purchase only fires after Phone Confirmed, server-side only. |
| `QA_PURCHASE_DEDUP_REFRESH_RETRY_VERIFIED` | Yes | Refresh/webhook retry/admin repeat cannot duplicate Purchase. |
| `QA_META_CATALOG_VARIANT_MAPPING_VERIFIED` | Yes | Variant/shade catalog mapping is verified in Meta payloads/diagnostics. |
| `QA_EXTERNAL_ID_PARITY_VERIFIED` | Yes | Browser Pixel and CAPI external_id hash parity is verified. |
| `QA_PRODUCT_VIEW_DEDUP_VERIFIED` | Yes | 30-minute product view dedup is verified. |
| `QA_CONSENT_DENIED_GATE_VERIFIED` | Yes | Consent denied blocks non-essential browser tracking. |
| `QA_INTERNAL_BOT_FILTER_VERIFIED` | Yes | Internal/staff/bot traffic exclusion is verified. |
| `QA_GA4_APP_ROUTER_PAGEVIEW_VERIFIED` | Yes | Exactly one GA4 page_view per App Router URL change. |
| `QA_GA4_PAYMENT_REFERRAL_VERIFIED` | Yes | Payment gateway referrer does not overwrite original GA4 source/medium. |
| `QA_SENSITIVE_PAYMENT_URL_SANITIZED_VERIFIED` | Yes | Payment tokens/signatures are not sent to GA4 page_location. |
| `QA_QUEUE_RETRY_DEAD_LETTER_VERIFIED` | Yes | Retry/backoff/dead-letter behavior is verified. |
| `QA_TRACKING_HEALTH_CRON_ALERT_VERIFIED` | Yes | Cron persistence and WARN/CRITICAL alerting are verified. |
| `QA_EXTERNAL_META_SETUP_VERIFIED` | Yes | Meta domain/AEM/System User/Catalog/audience setup is verified externally. |
| `QA_BACKEND_META_GA4_RECONCILIATION_VERIFIED` | Yes | Backend vs Meta vs GA4 reconciliation is verified. |
| `QA_PREDEPLOY_SCRIPTS_VERIFIED` | Yes | `npm run qa:predeploy` logs are attached to release notes. |
| `QA_TELEGRAM_BOT_HARDENING_VERIFIED` | Yes | Telegram webhook secret, admin allowlist, tokenized callbacks, state guards, action log, double-tap idempotency, and COD Purchase safety are verified. |
| `QA_GA4_REFUND_VERIFIED` | Recommended | GA4 refund event is verified. |
