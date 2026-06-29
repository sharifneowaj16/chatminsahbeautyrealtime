# Meta Pixel / CAPI / GA4 Strict Tracking Fixes

## Current patch: HttpOnly Browser Purchase token bridge

- Added `app/checkout/payment-bridge/route.ts`.
  - Accepts the one-time signed `bpt` only on a server route.
  - Verifies the token against the UUID `orderId`.
  - Sets the token into an HttpOnly `SameSite=Lax` cookie.
  - Immediately redirects to a clean `/checkout/payment-complete?orderId=...` URL without `bpt`.

- Updated `app/checkout/payment-complete/page.tsx`.
  - No longer reads `bpt` from query string.
  - No longer sends token in request body.
  - Calls `/api/tracking/meta/online-purchase` with only `{ orderId }`; the server reads the HttpOnly cookie.

- Updated `app/api/tracking/meta/online-purchase/route.ts`.
  - Requires the HttpOnly browser purchase token cookie.
  - Clears the cookie after success/terminal skip.
  - Keeps the existing verified-paid, amount/currency, and atomic DB claim checks.

- Updated `app/api/payments/verified/route.ts`.
  - Returns `paymentBridgeURL` for customer redirect.
  - Returns clean `paymentCompleteURL` for display/reference.
  - Server CAPI Purchase queue remains independent.

- Updated `lib/tracking/pixels/FacebookPixel.tsx`.
  - Sanitizes sensitive query params from CAPI `event_source_url` defensively.

- Updated `lib/tracking/manager.ts`.
  - GA4 tracking manager now supports both canonical `NEXT_PUBLIC_GA4_MEASUREMENT_ID` and legacy `NEXT_PUBLIC_GA_MEASUREMENT_ID`.



## Follow-up patch: verified payment customer redirect mode

- Updated `app/api/payments/verified/route.ts` again.
  - Supports customer-return redirect mode via `?redirect=1` or `?customerRedirect=true`.
  - In redirect mode, the route still requires the normal signed webhook payload and verifies signature, paid status, amount, and currency before marking the order paid.
  - After verified paid handling, it returns an HTTP `303` redirect to `paymentBridgeURL`.
  - Failed/pending/mismatched payments redirect to `/checkout/order-confirmed?...&payment=...` and do not fire Purchase.
  - JSON webhook/API behavior remains unchanged when redirect mode is not requested.

Integration option for payment gateways/server callbacks:

```txt
POST /api/payments/verified?redirect=1
Headers: x-payment-signature: sha256=<HMAC over raw JSON body>
Body: { orderId, gateway, transactionId, amount, currency: "BDT", status: "paid" }

Success response: 303 Location: /checkout/payment-bridge?orderId=...&bpt=...
```

## Required integration note

For online Browser Pixel Purchase to fire, payment success/return must redirect the customer to `paymentBridgeURL`, not directly to `/checkout/order-confirmed` and not directly to the clean `paymentCompleteURL`.

Meta Pixel, Meta CAPI, and GA4 are all kept enabled by this patch; the Browser Purchase token is removed from rendered pages and from Meta PageView CAPI URLs.

## bKash/Nagad payment-return wiring for strict Meta Purchase flow

- Checkout order creation now redirects bKash/Nagad orders to the provider payment page instead of the generic order-confirmed page.
- bKash/Nagad payment pages pass the created `orderId` to provider create APIs; provider create APIs use DB order total and order number instead of trusting frontend cart totals.
- Added `/api/payments/bkash/callback` and `/api/payments/nagad/callback` provider return handlers.
- Provider return handlers verify/execute provider payment, then call the existing signed `/api/payments/verified?redirect=1` flow server-to-server.
- Verified paid provider returns now redirect the customer into `/checkout/payment-bridge`, which sets the HttpOnly browser-purchase token cookie and continues to clean `/checkout/payment-complete`.
- Failed/cancelled/pending provider returns redirect to `/checkout/order-confirmed` with a payment status reason and do not fire Purchase.

## Meta CAPI Core Event Queue Fix

- `/api/facebook-capi` no longer sends non-Purchase Meta CAPI events directly to Graph API.
- PageView, ViewContent, AddToCart, InitiateCheckout, AddToWishlist, Search, and CompleteRegistration now enqueue `core_event` jobs into the existing BullMQ Meta CAPI queue.
- Browser Pixel still fires immediately with `eventID`; queued CAPI uses the same `event_id` for Meta deduplication.
- Core CAPI jobs preserve the original `event_time`, `event_id`, and sanitized `event_source_url` across retries.
- The Meta CAPI worker now processes both Purchase jobs and core CAPI event jobs.
- Core CAPI failures are logged to `MetaCapiFailure` using safe summaries only: event name/id, order id when present, status/error code/message, and matching-signal booleans.
- Retry behavior matches Purchase queue: max 5 attempts, exponential backoff, retry 429/5xx/network, do not blindly retry 4xx/code 100/code 190.
- `sanitizeUrl()` now removes `bpt`, `access_token`, `signature`, `sig`, phone, and other sensitive params defensively.

- Meta CAPI worker helpers accept both `META_CAPI_ACCESS_TOKEN` and legacy `FACEBOOK_CONVERSION_API_TOKEN`, matching the public queue route configuration check.


## GA4 Measurement Protocol Purchase Queue

- Added server-side GA4 Measurement Protocol Purchase sender for COD phone-confirmed and online verified-paid flows.
- Added `ga4_purchase` BullMQ job type processed by the existing Meta CAPI worker.
- COD GA4 purchase is queued only after Telegram/phone confirmation and uses `phoneConfirmedAt` as `timestamp_micros`.
- Online GA4 purchase is queued only after verified paid webhook/payment route and re-checks verified `Payment` row with signature, amount, and currency match.
- GA4 purchase uses `transaction_id = orderId`, `currency = BDT`, actual order total, shipping, tax, coupon, and item array.
- Added `gaPurchaseProcessingAt` DB field and migration for race-safe idempotency together with `gaPurchaseSent` / `gaPurchaseSentAt`.
- Requires `GA4_API_SECRET` plus `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (or `GA4_MEASUREMENT_ID`).

## Meta/GA4 catalog content ID consistency

- Added `lib/tracking/meta-content-id.ts` as the single canonical content-id helper.
- Browser Pixel ecommerce events, Meta CAPI Purchase, online Browser Purchase payload, and GA4 Measurement Protocol Purchase now use the same priority:
  1. `variantId` for shade/size variants
  2. `productId` for non-variant products
  3. `sku` as legacy/catalog fallback
  4. order/cart item `id` as final fallback
- This keeps `content_ids` / `contents[].id` / GA4 `item_id` aligned across ViewContent, AddToCart, InitiateCheckout, Purchase, and GA4 purchase.

## Sensitive URL Sanitization Fix

- Added shared `lib/tracking/sanitize-url.ts` helper to remove sensitive query parameters before storing or sending tracking URLs.
- Excluded `/checkout/payment-bridge` from proxy tracking cookie capture so temporary `bpt` URLs cannot become first landing URLs.
- Sanitized `mb_first_landing_path`, `mb_first_landing_url`, and `mb_referrer` before saving cookies.
- Sanitized decoded attribution cookies again at order create time so older raw cookies cannot be saved to orders.
- Sanitized COD and online Meta Purchase `event_source_url` before sending CAPI payloads.

Sensitive params removed include: `bpt`, `token`, `access_token`, `signature`, `sig`, `email`, `phone`, `mobile`, `msisdn`, `password`, `key`, `secret`, `auth`, and `authorization`.

## Purchase CAPI event_source_url hardening

- Added `getSafePurchaseEventSourceUrl()` in `lib/tracking/meta-capi-cod-purchase.ts`.
- COD and online Purchase CAPI now pass `event_source_url` through the shared sensitive URL sanitizer and normalize relative URLs to absolute site URLs.
- Sensitive params such as `bpt`, `token`, `access_token`, `signature`, `email`, `phone`, etc. are removed before Meta receives Purchase CAPI `event_source_url`.

## Browser Purchase claim semantics fix

- Renamed the Browser Pixel Purchase DB guard from `metaBrowserPurchaseSentAt` to `metaBrowserPurchaseClaimedAt`.
- The field now accurately means: a signed/verified browser purchase flow was authorized and claimed exactly once across browsers/devices.
- It no longer implies the browser Pixel request was guaranteed delivered to Meta, because server code cannot prove ad-blocker/browser/network delivery.
- Added migration `20260629030000_rename_meta_browser_purchase_sent_to_claimed` to rename the existing column/index safely when present.
- Updated `/api/tracking/meta/online-purchase` atomic claim logic to use `metaBrowserPurchaseClaimedAt`.

## bKash/Nagad sandbox callback verification hardening

- Added `lib/payments/provider-callback-utils.ts` to parse callback data from query string, JSON body, form body, or raw URL-encoded body.
- Hardened bKash callback status mapping for sandbox/live aliases (`success`, `completed`, `paid`, `cancelled`, `failed`, etc.).
- bKash callback now tries `executePaymentRaw()` first and falls back to `queryPayment()` when execute fails or returns a non-paid response.
- Hardened Nagad callback status mapping for sandbox/live aliases and status codes (`000`, `0000`, `00`).
- Both providers now send paid status to `/api/payments/verified?redirect=1` only after provider-paid verification, so Meta/GA4 Purchase remains gated by verified amount/currency/signature logic.
- Failed/cancelled callbacks safely redirect to order-confirmed with no Purchase.


## GTM / GA4 Purchase duplicate prevention

- GA4 Purchase remains server-side only via Measurement Protocol (`ga4_purchase` queue).
- Client-side `trackingManager.track('Purchase')` no longer sends GA4 `purchase`; it logs a warning and pushes only a safe `mb_ga4_purchase_blocked` diagnostic event.
- Google Analytics `gtag()` wrapper now suppresses any frontend `gtag('event', 'purchase', ...)` call.
- Google Tag Manager and GA4 loader install a `dataLayer` guard before loading GTM/gtag scripts. The guard blocks `purchase`, `ga4_purchase`, and ecommerce purchase-like dataLayer pushes from app code.
- A `mb_tracking_policy` dataLayer flag is pushed so GTM containers can explicitly check that GA4 purchase source is `server_measurement_protocol`.

Manual GTM dashboard check is still required: remove or condition any GA4 Purchase tag inside GTM that fires from PageView/URL triggers. Code can block app dataLayer purchase pushes, but it cannot rewrite tags already configured inside the GTM container UI.

## Final strict audit blocker fixes

- Removed `paymentBridgeURL` / raw `bpt` token-bearing URL from `/api/payments/verified` JSON responses. Redirect mode still uses the bridge URL via HTTP 303 for customer-browser returns.
- Core Meta CAPI requests now always include `custom_data` (`{}` for PageView/no custom fields) to satisfy strict CAPI payload requirements.

## Admin tracking diagnostics endpoint

- Added `GET /api/admin/tracking/order/[orderId]` for safe manual Meta Pixel/CAPI/GA4 verification.
- Endpoint uses existing admin authentication (`getVerifiedAdmin`).
- Response includes purchase tracking status, payment status, verification booleans, saved attribution presence booleans, GA4 status, and safe failure summaries.
- Endpoint intentionally does **not** return raw email, raw phone, `_fbp`, `_fbc`, customer IP, customer user-agent, access tokens, browser purchase tokens, raw gateway payloads, or full unsafe CAPI payloads.
- Supports lookup by DB order `id` or `orderNumber` for admin convenience.
