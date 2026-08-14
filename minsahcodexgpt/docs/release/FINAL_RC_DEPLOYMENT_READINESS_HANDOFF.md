# Final RC — Deployment Readiness & Production Handoff

**Project:** Minsah Beauty checkout/payment release candidate  
**Prepared:** 2026-07-08  
**Source baseline:** Phase 11 checkout release gate package  
**Verdict:** Conditional GO for staging/production deployment after dependency-installed runtime gates pass.

## What this release candidate contains

This release candidate includes the checkout/payment hardening chain delivered across Phase 1–11:

- Payment create ownership/security guard for bKash and Nagad.
- Server-side order validation for quantity, variant ownership, coupon calculation, phone, address, and Pathao availability.
- Single-page cart + checkout model with `/cart` redirecting to `/checkout`.
- Order-first online payment handoff for bKash/Nagad.
- Checkout idempotency to prevent duplicate orders, duplicate stock movement, and duplicate notifications.
- Delivery address fields: Full name, Phone, City, Zone, Area, Street address.
- Pathao unavailable-area guard on client and server.
- Online payment lifecycle with `PENDING_PAYMENT`, 15-minute reservation window, stock reservation/finalization/release, and unpaid-order cron.
- Server-side payment summary for bKash/Nagad pages.
- Checkout/payment inline UX errors and loading states.
- Single-page tracking alignment for `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, and server-controlled purchase.
- Final checkout release gate documentation and QA checklists.

## Automated gates already passed in artifact environment

The following static/repository gates passed from the RC artifact:

```bash
npm run qa:checkout-release-gate
node scripts/security-audit.mjs
node scripts/phase4-delivery-regression-audit.mjs
node scripts/shop-production-readiness-audit.mjs
```

Latest observed result summary:

- Phase 11 checkout release gate: 73/73 checks passed.
- Security audit: ok, 893 files scanned.
- Phase 4 delivery regression audit: 63/63 checks passed.
- Shop production readiness audit: 25/25 checks passed.

## Runtime gates still required before production traffic

These require a dependency-installed staging/production-like environment. They were not fully provable inside the extracted artifact because local `node_modules` is not present and Prisma config loading requires installed dependencies such as `dotenv/config`.

Run these before final production release:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run build
npm run qa:checkout-release-gate
npm run qa:final-rc
```

If tracking environment variables are configured for production, also run:

```bash
npm run qa:tracking-deploy-gate
```

## Required database migration attention

This release candidate includes checkout/payment database migrations that must be deployed before starting the new application version:

- `20260708000000_add_checkout_order_idempotency`
- `20260708010000_phase7_online_payment_lifecycle_stock_reservation`

The second migration adds online payment lifecycle/reservation fields including reserved stock columns and order payment lifecycle timestamps.

## Required cron/job setup

Configure the unpaid online order release endpoint so abandoned bKash/Nagad payment attempts do not keep stock reserved forever:

```text
/api/cron/release-unpaid-orders
```

Recommended cadence: every 5 minutes.

If `CRON_SECRET` is configured, call the endpoint with the expected authorization/header contract used by the deployment platform.

## Final smoke-test checklist

Before opening production traffic, run at minimum:

1. COD order: create order, confirm success, stock finalizes immediately, admin notification works.
2. bKash order: checkout creates `PENDING_PAYMENT`, payment page shows server amount/order number, verified payment confirms order and finalizes stock.
3. Nagad order: same as bKash.
4. Duplicate checkout submit: same idempotency key does not create duplicate order or duplicate stock movement.
5. Fake coupon/discount payload: server ignores client `couponDiscount` and recomputes discount.
6. Invalid quantity payload: zero, negative, decimal, and absurd quantity are rejected.
7. Mismatched variant/product payload: rejected.
8. Unauthorized payment create: non-owner order payment create is blocked.
9. Pathao unavailable area: blocked in checkout and blocked server-side if crafted request is sent.
10. Tracking: `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, and purchase lifecycle fire in the intended places without duplicates.

## Release decision rule

Conditional GO becomes GO only when all are true:

- `npm ci` succeeds.
- `npx prisma migrate deploy` succeeds against the target database.
- `npm run typecheck` succeeds.
- `npm run build` succeeds.
- `npm run qa:checkout-release-gate` succeeds.
- COD, bKash, and Nagad manual smoke tests pass on staging.
- Rollback plan is confirmed before production traffic shift.

Any failure in those gates is a NO-GO until fixed.
