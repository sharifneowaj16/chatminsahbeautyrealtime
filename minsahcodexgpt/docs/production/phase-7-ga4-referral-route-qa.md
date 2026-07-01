# Phase 7 — GA4 Referral / Route / External Platform QA

## Goal

GA4 attribution must preserve the original ad/session source through payment redirects, and App Router navigation must send one clean `page_view` per URL change.

## Production rules

1. GA4 browser config must use `send_page_view: false`.
2. `GoogleAnalyticsRouteTracker` owns browser `page_view` events.
3. `page_view` URLs must be sanitized before sending to GA4.
4. Payment gateway referrers must not be captured as first-touch/last-touch referrer cookies.
5. Payment-return `page_view` events must include `ignore_referrer: true` when the referrer/marker indicates a gateway return.
6. Exact payment gateway hosts must be configured in GA4 unwanted referrals before scaling paid ads.
7. Server-side GA4 Purchase remains Measurement Protocol only; client-side `purchase` stays blocked by the guard.
8. `GA4_PAYMENT_REFERRAL_EXCLUSIONS_VERIFIED`, `GA4_APP_ROUTER_PAGEVIEW_VERIFIED`, and `GA4_PAYMENT_RETURN_SOURCE_VERIFIED` must be set only after live/staging QA evidence exists.

## Built-in gateway domain list

- bKash: `bkash.com`, `bka.sh`, `pay.bka.sh`
- SSLCommerz: `sslcommerz.com`, `securepay.sslcommerz.com`, `sandbox.sslcommerz.com`
- Nagad: `nagad.com.bd`, `pgw.nagad.com.bd`
- aamarPay: `aamarpay.com`, `sandbox.aamarpay.com`
- ShurjoPay: `shurjopay.com.bd`, `engine.shurjopayment.com`

Add extra exact production hosts through `GA4_EXTRA_PAYMENT_REFERRAL_DOMAINS` when DebugView/Realtime shows a new gateway host.

## QA journey

1. Open a test landing URL with UTM parameters.
2. Navigate homepage → product → cart → checkout.
3. Confirm GA4 DebugView shows exactly one `page_view` per URL change.
4. Place a verified online order through bKash/Nagad.
5. Confirm `payment-complete` and `order-confirmed` page views do not contain `bpt`, token, signature, or secret params.
6. Confirm GA4 source/medium stays as the original campaign, not payment-gateway/referral.
7. Confirm server-side GA4 `purchase` is sent once with the saved checkout-time GA client/session ID.

## Deploy gates

Set these only after evidence is captured:

```env
GA4_PAYMENT_REFERRAL_EXCLUSIONS_VERIFIED=true
GA4_APP_ROUTER_PAGEVIEW_VERIFIED=true
GA4_PAYMENT_RETURN_SOURCE_VERIFIED=true
GA4_CROSS_DOMAIN_CHECK_VERIFIED=true
```

## Verification endpoints

- `/api/admin/tracking/ga4-qa?hours=24`
- `/api/admin/production-qa?hours=24`
