# Phase 4 — Browser Pixel + CAPI `external_id` Alignment

## Goal
Browser Pixel and Server CAPI must use the same normalized, SHA-256 hashed Meta `external_id` for the same visitor/order.

## Production rule

1. `mb_vid` is the canonical first choice because Browser Pixel and checkout/server order creation can both read it.
2. If `mb_vid` is missing, fallback can be `user:<userId>`, then `order:<orderId>`.
3. Never send raw DB IDs directly to Meta.
4. Always namespace IDs before hashing: `visitor:<id>`, `user:<id>`, or `order:<id>`.
5. Always normalize before hashing:

```ts
String(value).trim().toLowerCase()
```

## Why
`event_id` handles deduplication, but `external_id` improves user matching and cross-device attribution. If Browser Pixel hashes `visitor:<mb_vid>` while CAPI hashes `user:<userId>`, Meta receives two different identity signals for the same event/customer.

## Implemented contract

- `lib/tracking/meta-external-id.ts` is the single source of truth.
- `readOrderAttribution()` persists visitor-first normalized `externalId` into the Order.
- Public CAPI normalizes payload/cookie `externalId` before SHA-256.
- Purchase CAPI normalizes persisted `order.externalId` before SHA-256.
- Browser Pixel init hashes the normalized `visitor:<mb_vid>` value.
- Legacy mixed-case/whitespace `mb_vid` cookies are normalized by the proxy and browser capture component.

## Acceptance criteria

- Same `mb_vid` produces the same hash in Browser Pixel and CAPI.
- Whitespace/case variations produce the same hash.
- Logged-in checkout with `mb_vid` still persists `visitor:<mb_vid>`, not `user:<userId>`.
- Raw internal user/order IDs are not used unless visitor ID is missing and they are namespaced + normalized.
