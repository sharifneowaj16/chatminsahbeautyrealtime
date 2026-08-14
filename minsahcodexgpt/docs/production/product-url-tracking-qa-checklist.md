# Product URL + Meta CAPI + GA4 Production QA Checklist

Use this checklist before production deploy after product URL or tracking changes.

## Scope

This QA covers product detail URLs, account/customer product links, canonical redirects, public product API visibility, Meta CAPI identity, and GA4 browser ecommerce payloads.

The core rule remains:

- Public navigation URL: slug-first `/products/{slug}`
- Business/tracking identity: database `product.id`

Never convert cart, order, inventory, Meta catalog, or GA4 purchase IDs to product slug.

---

## 1. Static regression script

Run:

```bash
npm run qa:product-url-tracking
```

Expected result:

```json
{
  "ok": true
}
```

This script checks that:

- `lib/product-url.ts` exists and exports `productPath()` / `productUrlKey()`.
- Public product navigation components use `productPath()`.
- Account wishlist/review pages pass product slug to clients.
- Product page uses canonical redirect and preserves ad attribution query params.
- Public product detail API only exposes active, not-deleted products.
- GA4 browser ecommerce events build `items[]`.
- Meta CAPI catalog IDs remain database product IDs.
- Bundle AddToCart uses one combined tracking event.
- Recently viewed links use safe `productPath()` fallback.

---

## 2. URL behavior QA

| Test | Expected |
|---|---|
| Open `/products/{slug}` | 200 product page |
| Open `/products/{productId}` | redirects to `/products/{slug}` |
| Open `/products/{oldSlug}` if API resolves it | redirects to `/products/{currentSlug}` |
| Open `/products/{productId}?utm_source=facebook&fbclid=test` | redirects to slug and preserves allowed attribution params |
| Open product from home page | URL uses slug |
| Open product from flash sale | URL uses slug |
| Open product from for-you/new-arrivals/favourites/recommendations | URL uses slug |
| Open product from wishlist/reviews/order detail/return request | URL uses slug when slug is available |
| Product with missing slug | falls back to encoded product id, no broken link |

Allowed preserved query params:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `fbclid`
- `gclid`
- `gbraid`
- `wbraid`
- `msclkid`

Do not preserve arbitrary checkout/payment token query params on product redirect.

---

## 3. SEO/canonical QA

| Check | Expected |
|---|---|
| Product page canonical | canonical slug URL |
| Sitemap product URL | same canonical slug URL |
| Open Graph URL | same slug URL |
| JSON-LD product/breadcrumb URL | env-based site URL + slug path |
| Share button URL | same canonical product URL |

Production env should contain:

```env
NEXT_PUBLIC_APP_URL=https://minsahbeauty.cloud
NEXT_PUBLIC_SITE_URL=https://minsahbeauty.cloud
```

No trailing slash is preferred.

---

## 4. Public product API QA

| Test | Expected |
|---|---|
| Active product by slug | 200 |
| Active product by id | 200 |
| Soft-deleted product | 404 |
| Inactive/unpublished product | 404 |
| Related products | only active, not-deleted products |
| Frequently-bought-together products | only active, not-deleted products |

Admin product edit/preview must use admin API routes, not public `/api/products/{id}`.

---

## 5. Meta Pixel + CAPI QA

Use Meta Events Manager Test Events.

| Event | Expected |
|---|---|
| `ViewContent` product page | fires once per product page view |
| Variant select | does not inflate `ViewContent` unless intentionally changed later |
| `AddToCart` simple product | browser + CAPI same `eventID` |
| `AddToCart` variant product | `content_ids` uses parent product id, variant metadata in `contents` |
| Bundle AddToCart | one combined AddToCart event, not one event per bundle item |
| Public CAPI endpoint Purchase | blocked |
| COD Purchase | server-side only after phone confirmed |
| Online Purchase | browser + server purchase bridge uses canonical `Purchase-{orderId}` |

Important identity rule:

- `content_ids` must be product database id, not slug.
- `contents[].id` should map to Meta catalog identity strategy.
- Variant details should be metadata, not the public URL slug.

---

## 6. GA4 DebugView QA

Use GA4 DebugView or browser dev tools.

| Event | Expected GA4 payload |
|---|---|
| `view_item` | has `items[]` |
| `add_to_cart` | has `items[]`, `value`, `currency` |
| `add_to_wishlist` | has `items[]` |
| `begin_checkout` | has `items[]`, `value`, `currency` |
| `add_payment_info` | has `items[]` when items are available |
| `search` | has normalized `search_term` |
| `purchase` | server-side Measurement Protocol flow remains unchanged |

GA4 browser ecommerce payload should use:

- `item_id`
- `item_name`
- `item_category`
- `item_variant`
- `item_group_id`
- `price`
- `quantity`

---

## 7. Cart/order regression QA

| Flow | Expected |
|---|---|
| Add simple product to cart | cart item stores DB `productId` |
| Add variant product to cart | cart stores DB `productId` + `variantId` |
| Increase/decrease quantity | works normally |
| Place COD order | order items store DB product ids |
| Place online order | order items store DB product ids |
| Inventory decrement | uses DB ids, not slug |
| Old cart contains inactive product | public refresh may fail gracefully; checkout should not silently sell inactive item |

---

## 8. Release gate

Before deploy, run at minimum:

```bash
npm run qa:product-url-tracking
npm run qa:phase8-static
npm run qa:phase11
npm run typecheck
npm run build
npm run qa:production
```

If any static QA fails, do not deploy until fixed.
