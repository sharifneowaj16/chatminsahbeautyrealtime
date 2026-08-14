# Phase 6 — Meta CAPI Mid-Funnel Events

## Goal

Close the browser-only Meta tracking gap for checkout mid-funnel events by sending browser Pixel and server CAPI copies with the same `eventID` for deduplication.

## Implemented events

The public, non-Purchase `/api/facebook-capi` endpoint now accepts these mid-funnel events:

- `ViewCart`
- `AddShippingInfo`
- `AddPaymentInfo`

These events are added on top of the existing public CAPI allowlist:

- `PageView`
- `ViewContent`
- `AddToCart`
- `AddToWishlist`
- `InitiateCheckout`
- `Search`
- `CompleteRegistration`
- `Contact`

## Purchase safety

`Purchase` is still blocked on the browser-callable public CAPI endpoint. Verified COD/online purchase tracking must continue to use the dedicated server-side Purchase flows only.

## Data sent

The mid-funnel CAPI payload keeps the same catalog/value data that the browser Pixel receives:

- `content_ids`
- `content_type`
- `contents`
- `value`
- `currency`
- `num_items`
- `_fbp`, `_fbc`, external visitor ID when available
- IP/user-agent from the request
- checkout context such as `checkout_step`, `shipping_tier`, and payment `method` when available

## Why this matters

Before this phase, `ViewCart`, `AddShippingInfo`, and `AddPaymentInfo` were browser Pixel only. That meant server-side matching and deduplication were unavailable for these checkout steps, especially for users affected by browser restrictions.

After this phase, Meta receives a server-side copy with the same event ID, improving mid-funnel measurement reliability while keeping Purchase locked to verified server-only flows.

## Verification

Run:

```bash
npm run qa:phase6-meta-capi-mid-funnel
node scripts/master-tracking-regression-audit.mjs
```
