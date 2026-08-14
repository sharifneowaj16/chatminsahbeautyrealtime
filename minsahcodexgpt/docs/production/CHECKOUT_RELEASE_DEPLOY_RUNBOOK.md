# Checkout Release Deploy Runbook

**Project:** Minsah Beauty  
**Scope:** checkout/payment release deployment  
**Prepared:** 2026-07-08

## 1. Pre-Deploy

```bash
npm ci
npx prisma generate
npm run qa:checkout-release-gate
npm run typecheck
npm run build
```

Confirm production/staging environment variables:

- Database connection
- NextAuth/session secrets
- bKash credentials
- Nagad credentials
- Telegram notification settings
- Tracking/Meta/GA settings
- `CRON_SECRET` for `/api/cron/release-unpaid-orders` if endpoint protection is enabled

## 2. Database Migration

```bash
npx prisma migrate deploy
```

Migration-sensitive changes in this release:

- Checkout idempotency columns/index on orders
- Reserved stock fields on product and variant
- Online payment lifecycle fields on orders
- `PENDING_PAYMENT` / `PAYMENT_EXPIRED` order statuses

## 3. Deploy

Deploy the full project artifact. After deploy:

```bash
npm run qa:checkout-release-gate
```

Then run manual smoke tests in this order:

1. COD order
2. bKash order
3. Nagad order
4. Double-click duplicate order attempt
5. Fake coupon crafted request
6. Unauthorized payment create request
7. Pathao unavailable area block
8. Expired unpaid order release via `/api/cron/release-unpaid-orders`

## 4. Post-Deploy Monitoring

Monitor for 30-60 minutes:

- Order creation errors
- Payment create errors
- Payment verification failures
- Stock/reserved stock mismatch
- Telegram notification duplicates/missing notifications
- Tracking purchase gaps
- Cron release logs

## 5. Rollback

Rollback only with DB lifecycle awareness.

1. Stop new checkout traffic if possible.
2. Identify active `PENDING_PAYMENT` orders.
3. Preserve payment gateway callbacks/webhooks.
4. If reverting code that does not understand reserved stock, manually release or finalize active reservations first.
5. Redeploy previous stable artifact.
6. Re-run COD/bKash/Nagad smoke tests.

Emergency mitigation options:

- Disable online payment methods temporarily and keep COD only.
- Keep cron release enabled to avoid long-lived reserved stock.
- Manually mark expired unpaid orders and release stock through admin/DB operation if needed.
