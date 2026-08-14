# Phase 3 — Exact Meta Catalog Identity Mapping

## Objective

Meta Browser Pixel, public CAPI, COD/online Purchase CAPI and the signed browser Purchase bridge must use the exact same catalog namespace. GA4 and TikTok retain separate identity helpers so a Meta catalog change cannot silently alter their reporting.

## Required deployment decision

Export the active Meta catalog and compare its `id` and `item_group_id` fields with database values. Then set exactly one value:

```env
# Catalog id = Product.sku / ProductVariant.sku
NEXT_PUBLIC_META_CATALOG_ID_SOURCE=sku

# OR catalog id = Product.id / ProductVariant.id
NEXT_PUBLIC_META_CATALOG_ID_SOURCE=database_id
```

Do not configure this from assumption. Blank or invalid configuration intentionally omits catalog-specific event fields while preserving the event, value, currency, item count and deduplication ID.

## Final event identity rules

### Simple item

```text
content_ids = [exact simple catalog row id]
content_type = product
contents[].id = exact simple catalog row id
```

### Selected variant

```text
content_ids = [exact variant child row id]
content_type = product
contents[].id = exact variant child row id
contents[].item_group_id = exact parent group id
```

### Mixed cart/order

All simple and variant rows use item-level catalog IDs, therefore:

```text
content_type = product
```

A mixed Purchase remains one Purchase event with one value and one shared browser/server event ID.

### Variant-capable ViewContent before selection

A parent group ID may be sent with `content_type=product_group`. After a visitor selects a child variant, a new ViewContent uses the exact child item ID with `content_type=product`.

## Fail-closed behavior

`lib/tracking/meta-content-id.ts` resolves identities atomically. If the namespace is unconfigured or any row is missing its required parent/child identity, the entire catalog field set is omitted. The implementation never falls back across CUID, SKU, product ID and variant ID namespaces.

## Explicit data flow

Storefront/cart rows preserve:

```text
productId
productSku
variantId
variantSku
```

Server order rows resolve the same values from `item.product` and `item.variant` relations.

## Platform separation

- Meta: `lib/tracking/meta-content-id.ts`
- GA4: `lib/tracking/ga4-item-id.ts`
- TikTok: `lib/tracking/tiktok-content-id.ts`
- Shared non-Meta compatibility internals: `lib/tracking/analytics-item-identity.ts`

GA4 and TikTok no longer import the Meta catalog helper.

## Verification before enabling catalog QA flags

1. Export active catalog rows.
2. Compare five simple products and at least ten variant child rows.
3. Confirm selected namespace matches every sampled `id` exactly, including case and prefixes.
4. Confirm every variant's resolved parent value matches catalog `item_group_id` exactly.
5. Verify simple, variant and mixed payloads in Meta Test Events.
6. Confirm browser `eventID` equals CAPI `event_id`.
7. Only then set `META_CATALOG_QA_VERIFIED=true`.
