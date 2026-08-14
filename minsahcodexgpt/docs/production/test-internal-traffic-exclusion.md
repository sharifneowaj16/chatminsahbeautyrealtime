# Phase 14 — Test/Internal Traffic Exclusion Hardening

Goal: staff, developer, QA, and test orders must not pollute Meta Pixel/CAPI, GA4 Purchase, audiences, or ROAS optimization signals.

## Production env

Configure at least the contact lists used by your real team/testers:

```env
TRACKING_TEST_EMAILS=test@example.com,staff@example.com
TRACKING_TEST_PHONES=01700000000,01800000000
TRACKING_INTERNAL_IPS=
TRACKING_INTERNAL_DOMAINS=
INTERNAL_TRAFFIC_HEADER_SECRET=
```

Supported matching behavior:

- `TRACKING_TEST_EMAILS` uses normalized lowercase email matching.
- `TRACKING_TEST_PHONES` normalizes Bangladesh local and E.164 variants, so `017...`, `88017...`, and `+88017...` can match the same number.
- `TRACKING_INTERNAL_IPS` is checked for request-time and stored-order server tracking exclusion.
- `TRACKING_INTERNAL_DOMAINS` marks matching staff/company email domains as internal/test for tracking exclusion.
- `minsah_staff=1`, `mb_internal_traffic=1`, or trusted `x-minsah-internal-traffic: 1` can block server tracking requests.

## Checkout behavior

Storefront checkout and Buy Now checkout now build `orderTrackingExclusion` at order creation. When a configured test email/phone/internal marker matches, the order is saved as:

```txt
isTest=true
trackingFilteredReason=TEST_ORDER or INTERNAL_TRAFFIC
```

Admin-created orders also check configured test email/phone/domain, but they do **not** mark every admin request as test just because it came from an office IP. This avoids accidentally suppressing legitimate real customer orders entered by an admin.

## Send behavior

Meta and GA4 senders now re-check stored order contacts at send time, not only `isTest`. That protects older orders or manually edited orders after env lists are configured.

Skipped when matched:

- Meta CAPI COD Purchase
- Meta CAPI online paid Purchase
- Meta Browser online Purchase claim
- GA4 Measurement Protocol Purchase
- GA4 Measurement Protocol Refund
- Campaign/device tracking writes from internal filtered requests

## Verification

Run:

```bash
npm run qa:phase14
npm run qa:phase12
npm run qa:phase13
npm run qa:product-url-tracking
```

Manual production test:

1. Set one test email and phone in production env.
2. Place a COD test order using that email or phone.
3. Confirm phone from admin/Telegram.
4. Confirm order remains `isTest=true`.
5. Confirm Meta/GA4 Purchase is skipped with reason `TEST_ORDER`.
6. Place a normal customer test with a non-listed email/phone and confirm tracking remains eligible.
