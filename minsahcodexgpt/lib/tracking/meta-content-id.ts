/**
 * Canonical Meta catalog content ID helper.
 *
 * Keep this mapping identical across Browser Pixel, Meta CAPI, and GA4 item IDs
 * so ViewContent/AddToCart/InitiateCheckout/Purchase can be matched to the same
 * product or variant/shade in ads/catalog reporting.
 *
 * Priority:
 * 1. variantId  - tracks shade/size variant when one exists
 * 2. productId  - parent product when no variant exists
 * 3. sku        - fallback for legacy/custom catalog rows
 * 4. id         - final fallback for cart/order item id
 */
export type MetaContentIdSource = {
  id?: string | null;
  productId?: string | null;
  variantId?: string | null;
  sku?: string | null;
};

function cleanId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function getMetaContentId(item: MetaContentIdSource) {
  return (
    cleanId(item.variantId) ??
    cleanId(item.productId) ??
    cleanId(item.sku) ??
    cleanId(item.id) ??
    ''
  );
}

export function getUniqueMetaContentIds(items: MetaContentIdSource[]) {
  return Array.from(new Set(items.map(getMetaContentId).filter(Boolean)));
}
