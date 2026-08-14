# Checkout Release Gate Manual Checklist

**Project:** Minsah Beauty  
**Scope:** unified cart + checkout, COD, bKash, Nagad, order creation, stock lifecycle, tracking  
**Prepared:** 2026-07-08  
**Status:** Manual runtime checklist for staging/production deploy gate

## Go / No-Go Rule

- **GO** only if automated release gate passes, dependency-installed `typecheck` + `build` pass, and every P0 manual scenario below passes.
- **NO-GO** if any P0 checkout, payment, stock, security, or tracking scenario fails.

## Required Environment

- Fresh dependency install: `npm ci`
- DB migrated: `npx prisma migrate deploy`
- Prisma generated: `npx prisma generate`
- Build verified: `npm run typecheck && npm run build`
- Required payment gateway env values present for bKash/Nagad staging or production.
- Cron secret configured if `CRON_SECRET` is used for `/api/cron/release-unpaid-orders`.

## P0 Manual Scenarios

### Unified Checkout Page

- [ ] `/cart` redirects to `/checkout`.
- [ ] `/checkout` shows cart item review, quantity update, remove item, address, payment, and summary on one page.
- [ ] Checkout address fields are exactly: Full name, Phone, City, Zone, Area, Street address.
- [ ] Full name missing shows inline error.
- [ ] Phone invalid shows inline error: `Phone number ta 11 digit-er valid BD number din.`
- [ ] City missing shows inline error.
- [ ] Zone missing shows inline error.
- [ ] Area missing shows inline error.
- [ ] Street address missing shows inline error.
- [ ] Pathao unavailable area is disabled or blocked.
- [ ] Pathao unavailable area submit attempt returns/keeps friendly blocked state.

### COD order

- [ ] Valid COD order creates exactly one order.
- [ ] COD order status becomes `CONFIRMED`.
- [ ] COD payment status stays appropriate for COD/unpaid cash collection.
- [ ] COD stock is decremented immediately.
- [ ] COD admin Telegram notification is sent once.
- [ ] COD success/confirmation route works.

### bKash order

- [ ] Selecting bKash and placing order creates order first.
- [ ] bKash order status becomes `PENDING_PAYMENT`.
- [ ] bKash payment status remains `PENDING` before payment.
- [ ] bKash order gets `paymentExpiresAt` around 15 minutes ahead.
- [ ] bKash stock is reserved, not finally decremented.
- [ ] bKash payment page loads server summary: order number, amount, status, expiry.
- [ ] bKash payment page does not use cart/local total.
- [ ] bKash phone invalid state disables pay button.
- [ ] bKash verified payment changes order to `CONFIRMED`.
- [ ] bKash verified payment finalizes stock and releases reservation.
- [ ] bKash admin Telegram notification sends only after verified payment.

### Nagad order

- [ ] Selecting Nagad and placing order creates order first.
- [ ] Nagad order status becomes `PENDING_PAYMENT`.
- [ ] Nagad payment status remains `PENDING` before payment.
- [ ] Nagad order gets `paymentExpiresAt` around 15 minutes ahead.
- [ ] Nagad stock is reserved, not finally decremented.
- [ ] Nagad payment page loads server summary: order number, amount, status, expiry.
- [ ] Nagad payment page does not use cart/local total.
- [ ] Nagad phone invalid state disables pay button.
- [ ] Nagad verified payment changes order to `CONFIRMED`.
- [ ] Nagad verified payment finalizes stock and releases reservation.
- [ ] Nagad admin Telegram notification sends only after verified payment.

### Duplicate order protection

- [ ] Double-click Place Order creates one order only.
- [ ] Network retry with same `Idempotency-Key` and same payload returns existing order.
- [ ] Same `Idempotency-Key` with changed payload returns `409 IDEMPOTENCY_PAYLOAD_MISMATCH`.
- [ ] Duplicate retry does not decrement stock twice.
- [ ] Duplicate retry does not send Telegram twice.

### Security payload tests

- [ ] Fake coupon / client `couponDiscount` is ignored or recomputed server-side.
- [ ] Invalid coupon does not reduce total.
- [ ] Quantity `0` is rejected.
- [ ] Negative quantity is rejected.
- [ ] Decimal quantity is rejected.
- [ ] Very large quantity above max cap is rejected.
- [ ] Variant mismatch is rejected: variant must belong to selected product.
- [ ] Unauthorized payment create returns 401.
- [ ] Authenticated non-owner payment create returns 404/403.
- [ ] Wrong gateway for order payment method returns error.
- [ ] Already-paid order cannot create another payment attempt.
- [ ] Recently processing payment cannot be duplicated.
- [ ] Payment attempt rate limit works.

### Expiry / stock release / expired payment

- [ ] Expired bKash/Nagad order disables pay button.
- [ ] Expired order payment summary returns disabled reason.
- [ ] `/api/cron/release-unpaid-orders` marks expired online orders `PAYMENT_EXPIRED`.
- [ ] Expired online order releases reserved stock.
- [ ] Late failed/cancelled payment releases reservation.

### Tracking

- [ ] `view_cart` fires once when checkout page loads with items.
- [ ] `begin_checkout` fires once on first address/checkout interaction, not auto page load.
- [ ] `add_shipping_info` fires once after valid delivery quote/address completion.
- [ ] `add_payment_info` fires once when payment method is selected.
- [ ] `purchase` fires only after COD confirmed or online payment verified.
- [ ] Duplicate tracking events are not emitted during quantity edits, payment retry, or page re-render.

## P1 Manual Scenarios

- [ ] Mobile checkout scroll is smooth.
- [ ] Delivery quote loading state is visible.
- [ ] `Preparing bKash...` and `Preparing Nagad...` loading text appears for online handoff.
- [ ] Payment pages show `Redirecting to bKash...` / `Redirecting to Nagad...` during create call.
- [ ] Saved address flow still validates phone, street address, and Pathao area availability.
- [ ] Browser back from payment page does not create another order automatically.

## Rollback Checklist

- [ ] Previous deployment artifact identified.
- [ ] Database migration rollback/forward-fix plan documented for idempotency and stock reservation fields.
- [ ] Payment gateway credentials remain unchanged during rollback.
- [ ] Cron route can be disabled by removing/rotating `CRON_SECRET` if needed.
- [ ] Admin can manually release reservation for affected `PENDING_PAYMENT` orders if emergency rollback is required.
