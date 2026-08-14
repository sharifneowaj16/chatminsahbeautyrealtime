# Checkout Release Gate Evidence Pack

**Project:** Minsah Beauty  
**Scope:** cart + checkout + payment lifecycle release gate  
**Prepared:** 2026-07-08  
**Verdict:** Static release gate passed in artifact environment; production **GO** remains conditional on dependency-installed typecheck/build and manual runtime QA.

## Automated Gate Command

Run this after dependency install:

```bash
npm run qa:checkout-release-gate
```

This command chains the checkout release audits for:

1. Phase 3 cart/checkout unification
2. Phase 4 order-first payment handoff
3. Phase 5 address + Pathao availability
4. Phase 6 checkout idempotency
5. Phase 7 online payment lifecycle + stock reservation
6. Phase 8 server order payment summary
7. Phase 9 checkout/payment UX polish
8. Phase 10 checkout tracking alignment
9. Phase 11 final release gate audit

## Additional Required Production Commands

The artifact environment does not include local `node_modules`, so final production confidence requires a dependency-installed environment:

```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run typecheck
npm run build
npm run qa:checkout-release-gate
```

## Current Automated Evidence

Static audits included in the release gate verify:

- Only `/checkout` creates storefront orders.
- `/cart` redirects to `/checkout`.
- Address fields are Full name, Phone, City, Zone, Area, Street address.
- Pathao unavailable areas are blocked on client and server.
- Server ignores client `couponDiscount` and recomputes coupon discount.
- Quantity, variant ownership, phone, and address are server validated.
- Payment create routes are owner-bound and state guarded.
- Online gateway orders are created before payment handoff.
- Payment pages use server order summary, not cart/local totals.
- Checkout idempotency blocks duplicate order creation and duplicate stock/notification side effects.
- Online orders use `PENDING_PAYMENT`, reserved stock, expiry window, and verified-payment finalization.
- Expired unpaid orders can be released by cron.
- Checkout analytics are single-page action based and one-time guarded.

## Go / No-Go Rule

**GO** when all of the following are true:

- `npm run typecheck` passes.
- `npm run build` passes.
- `npm run qa:checkout-release-gate` passes.
- Manual QA checklist passes for COD, bKash, Nagad, duplicate submit, security payloads, stock lifecycle, expiry, and tracking.
- Required production environment variables are configured.

**NO-GO** if any of these fail:

- Unauthorized/non-owner payment create can be initiated.
- Fake coupon/client discount changes payable amount.
- Variant mismatch is accepted.
- Duplicate order can be created by double-click/retry.
- bKash/Nagad order skips order-first flow.
- Payment page shows cart/local amount instead of server order amount.
- Online unpaid order permanently decrements stock.
- `purchase` fires before confirmed COD or verified online payment.

## Runtime Evidence To Archive After Staging

Archive screenshots/logs for:

- COD successful order confirmation.
- bKash order `PENDING_PAYMENT` before payment and `CONFIRMED` after verification.
- Nagad order `PENDING_PAYMENT` before payment and `CONFIRMED` after verification.
- DB order row showing `checkoutIdempotencyKey`, `paymentExpiresAt`, and lifecycle timestamps.
- Product/variant stock and reserved stock before/after online verification.
- Pathao unavailable area blocked state.
- Tracking console/network evidence for `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, and `purchase`.
- Cron release result for expired unpaid order.
