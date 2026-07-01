# Phase 1 — Payment Bypass Lock

## Production Goal

No customer, developer, bot, or direct API caller can complete or simulate a payment outside the canonical order/payment/tracking pipeline.

Canonical production flow:

```text
/api/orders
→ canonical Order row with checkout tracking fields
→ verified gateway callback/webhook or COD phone confirmation
→ /api/payments/verified for online paid payments
→ payment state update with amount/currency/signature validation
→ Meta CAPI / GA4 Purchase queue
```

## Why this phase exists

Legacy payment pages/routes created order/payment-like outcomes from client-supplied data or old gateway calls. In production that can break revenue attribution, skip `_fbp/_fbc/UTM/IP/UA` capture, create fake COD purchases, or process payment state without verified gateway evidence.

## Locked Surfaces

- `app/checkout/payment/card/page.tsx` redirects to `/checkout`.
- `app/api/payments/card/create/route.ts` returns `410 Gone` for `GET` and `POST`.
- `app/api/payments/cod/create/route.ts` returns `410 Gone` for `GET` and `POST`.
- `app/api/payments/bkash/execute/route.ts` returns `410 Gone` for `GET` and `POST`.
- `contexts/CartContext.tsx` no longer exposes Credit/Debit Card as a selectable payment method.
- `app/checkout/payment-method/page.tsx` no longer routes to `/checkout/payment/card`.
- `app/checkout/CheckoutClient.tsx` no longer simulates order/payment success.

## New Production Rules

1. Frontend must never collect raw card number, CVV, or expiry data.
2. COD order creation must use `/api/orders`; COD Purchase tracking can only happen after Phone Confirmed.
3. Online payment completion must use `/api/payments/verified` with webhook/signature/amount/currency verification.
4. No frontend source file may link to `/checkout/payment/card`.
5. No source file outside the disabled route guards may call disabled legacy routes.
6. Security audit must fail if raw-card identifiers or disabled-route references reappear in active source code.

## Verification

Run:

```bash
npm run audit:security
```

Expected result:

```json
{
  "ok": true
}
```
