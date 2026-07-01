# Phase 5 — Product Analytics Counters + 30-Minute Dedup

## Production Rule

Product analytics counters are backend-owned. Browser events may request a counter update, but the server decides whether it counts.

## Product View Counting Contract

- Same visitor + same product counts only once within 30 minutes.
- Dedup identity uses `mb_vid` when available.
- `mb_vid` is normalized before hashing: `trim().toLowerCase()`.
- Raw visitor IDs, IPs, or user agents are never stored in the dedup table.
- Redis `SET NX EX 1800` is the primary dedup layer.
- `ProductViewDedup` is the durable database fallback if Redis is unavailable.
- Product view writes increment both lifetime `Product.viewCount` and daily `ProductDailyMetric.views`.
- Duplicated views return success but do not increment counters.

## Other Product Funnel Counters

- Successful AddToCart increments `Product.addToCartCount` and `ProductDailyMetric.addToCarts`.
- Checkout start increments `Product.checkoutStartCount` and `ProductDailyMetric.checkoutStarts`.
- Created orders increment `Product.orderCount`, `Product.analyticsRevenue`, `ProductDailyMetric.orders`, and `ProductDailyMetric.revenue` inside the same order transaction.

## Traffic Safety

The counter endpoint skips obvious bot traffic and configurable internal/staff traffic.

Environment-supported internal IP lists:

```txt
ANALYTICS_INTERNAL_IPS=1.2.3.4,5.6.7.8
INTERNAL_TRAFFIC_IPS=1.2.3.4
STAFF_IPS=1.2.3.4
```

Staff-cookie/header skips are also supported:

```txt
minsah_staff=1
x-minsah-internal-traffic: 1
```

## Files

- `lib/analytics/product-metrics.ts`
- `app/api/product-analytics/route.ts`
- `lib/tracking/ecommerce.ts`
- `app/api/orders/route.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260630000000_add_product_view_dedup/migration.sql`
- `app/api/admin/analytics/products/route.ts`
- `scripts/security-audit.mjs`

## Manual QA

1. Open a product page once.
2. Refresh the same product page 5 times within 30 minutes.
3. Confirm `Product.viewCount` increased by only 1.
4. Confirm `ProductDailyMetric.views` increased by only 1 for the Dhaka business day.
5. Open a different product and confirm that product counts separately.
6. Wait 30+ minutes or expire the Redis/DB dedup key and confirm the same product can count again.
7. Add product to cart and confirm `addToCartCount` + daily `addToCarts` increase.
8. Enter checkout and confirm `checkoutStartCount` + daily `checkoutStarts` increase.
9. Place an order and confirm product order/revenue counters update inside the same order transaction.
10. Run `npm run audit:security` before deployment.

## Why This Exists

Without this phase, product popularity, view-to-cart rate, checkout rate, and product-level revenue reports can be inflated or empty. The most dangerous bug is product page refresh repeatedly increasing product views. This implementation makes product counters reliable enough for production decisions.
