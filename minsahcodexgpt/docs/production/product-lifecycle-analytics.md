# Product Lifecycle Analytics

Phase 15 persists order lifecycle metrics into product analytics tables.

## Lifecycle sources

| Source | Lifecycle signals |
|---|---|
| Admin order PATCH | confirmed, delivered, cancelled, refunded |
| Telegram order callback | phone confirmed, cancelled |
| Verified payment webhook | online payment confirmed |
| Pathao webhook | delivered, cancelled |
| Steadfast webhook/worker/manual sync | delivered, cancelled |
| Admin return completion | returned, refunded |

## Idempotency rule

Metrics are counted only on a false → true transition for each lifecycle signal.

A repeated status save does not increment counters again.

## Test/internal order rule

If `Order.isTest=true`, lifecycle metrics are skipped.

## Daily metric fields

`ProductDailyMetric` stores:

- order-created counters/revenue
- confirmed/delivered/cancelled/returned/refunded counters
- confirmed/delivered/cancelled/returned/refunded revenue
- estimated delivered profit
- conversion and lifecycle rates
- grade

## Manual verification

1. Create a non-test COD order.
2. Confirm by Telegram or admin `phone_confirmed`.
3. Verify `confirmedOrders` and `confirmedRevenue` increased once.
4. Re-save the confirmed status.
5. Verify counters did not increase again.
6. Mark delivered.
7. Verify `deliveredOrders`, `deliveredRevenue`, and `estimatedProfit` increased.
8. Complete a return.
9. Verify `returnedOrders`, `refundedOrders`, and refund revenue fields increased once.
