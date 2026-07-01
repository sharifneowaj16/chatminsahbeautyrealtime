# Phase 2 — Canonical Payment + Purchase Contract

## Goal

Production payment completion and Purchase tracking must have exactly two valid paths:

1. **COD**: order is created through `/api/orders`, then Purchase is queued only when the order is phone-confirmed by Admin/Telegram.
2. **Online payment**: order is created through `/api/orders`, then payment is recorded as paid only by the signed `/api/payments/verified` flow after gateway verification.

No frontend success page, admin shortcut, unsupported payment method, or legacy API can mark an online order paid or fire Purchase.

## Why this phase exists

Phase 1 closed known legacy payment bypasses. Phase 2 enforces the positive contract: all remaining payment and Purchase paths must use the canonical flow. This protects Meta/GA4 revenue data from fake purchases, duplicate purchases, unverified payment callbacks, unsupported gateway flows, and missing checkout-time attribution data.

## Implemented production rules

- Checkout accepts only production-supported payment methods: `cod`, `bkash`, `nagad`.
- Unsupported methods such as Rocket/GPay/Card are not active in checkout.
- Rocket page redirects to `/checkout`; Rocket API returns `410 Gone`.
- `/api/payments/verified` rejects COD orders.
- `/api/payments/verified` rejects unsupported online payment methods.
- `/api/payments/verified` rejects gateway/payment-method mismatch.
- `/api/payments/verified` still requires HMAC signature verification.
- `/api/payments/verified` requires amount and currency match before paid status.
- `/api/payments/verified` blocks future `paidAt` timestamps.
- Online paid status queues Meta CAPI Purchase and GA4 Purchase only after payment verification.
- Browser Pixel Purchase can only be authorized from the signed payment-complete bridge.
- Admin cannot manually mark online orders as paid.
- Admin-created online orders cannot start as paid.
- COD cash collection can be recorded administratively but does not fire Purchase; COD Purchase remains phone-confirmed only.
- Security audit now fails if Phase 2 payment/Purchase guards are removed.

## Acceptance criteria

- [x] Online payment cannot become `COMPLETED` without signed `/api/payments/verified`.
- [x] COD cannot use `/api/payments/verified` to create Purchase.
- [x] Admin cannot manually mark bKash/Nagad orders paid.
- [x] Admin-created bKash/Nagad orders cannot start as paid.
- [x] Unsupported methods cannot be submitted via `/api/orders`.
- [x] Rocket route/page disabled until a real verified provider adapter exists.
- [x] Browser Pixel Purchase is allowed only from `app/checkout/payment-complete/page.tsx` after server claim.
- [x] Security audit has regression checks for the contract.

## Verification

Run:

```bash
npm run audit:security
```

Expected:

```json
{
  "ok": true
}
```
