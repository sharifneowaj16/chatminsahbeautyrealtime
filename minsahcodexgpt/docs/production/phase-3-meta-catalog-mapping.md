# Phase 3 — Variant/Shade Meta Catalog Mapping

## Goal

Meta Browser Pixel, public CAPI, COD/online Purchase CAPI, signed browser Purchase, and GA4 item IDs must use one canonical catalog mapping strategy.

## Production Rule

- Simple product:
  - `content_ids = [Product.id]`
  - `content_type = "product"`
- Variant/shade product:
  - `content_ids = [parent Product.id]`
  - `content_type = "product_group"`
  - `contents[].id = parent Product.id`
  - `contents[].item_group_id = parent Product.id`
  - `contents[].variant_id`, `variant_sku`, `item_variant`, `shade`, `color`, `size` are included when available for diagnostics.

## Why

Meta Dynamic Product Ads and Advantage+ catalog matching require the event product IDs to match the product/group IDs in the catalog feed. If ViewContent/AddToCart/Purchase send variant IDs while the feed uses parent product IDs, Meta can receive the event but fail product-level catalog matching.

## Source of Truth

`lib/tracking/meta-content-id.ts`

All tracking code must use this helper instead of building `content_ids` manually.

## Enforced Consumers

- `lib/tracking/ecommerce.ts`
- `app/api/facebook-capi/route.ts`
- `lib/tracking/meta-capi-cod-purchase.ts`
- `app/api/tracking/meta/online-purchase/route.ts`
- `lib/tracking/ga4-measurement-protocol.ts`
- `contexts/CartContext.tsx`
- `app/api/cart/route.ts`

## Regression Lock

`npm run audit:security` now fails if:

- canonical catalog helper is missing,
- tracking payloads hardcode `content_type: 'product'`,
- tracking code derives `content_ids` from `contents.map(...)`,
- public CAPI drops variant metadata,
- cart context does not preserve product/variant SKU metadata.

## Manual QA

1. Open a simple product.
   - Expected: `ViewContent.content_type = product`
   - Expected: `content_ids = [Product.id]`
2. Open a variant/shade product.
   - Expected: `ViewContent.content_type = product_group`
   - Expected: `content_ids = [parent Product.id]`
3. Add a selected shade to cart.
   - Expected: `AddToCart.content_type = product_group`
   - Expected: `content_ids = [parent Product.id]`
   - Expected: `contents[0].variant_id` has selected variant ID.
4. Begin checkout with variant items.
   - Expected: `InitiateCheckout.content_type = product_group`
   - Expected: content IDs use parent product IDs only.
5. Complete an online paid order through verified flow.
   - Expected: Browser Purchase and CAPI Purchase use same parent product IDs.
6. Confirm a COD order by phone.
   - Expected: Server CAPI Purchase uses same parent product IDs.
7. Check Meta Events Manager diagnostics.
   - Expected: product/catalog match warnings decrease or stay clean.
