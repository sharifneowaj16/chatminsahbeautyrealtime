/**
 * Canonical Meta catalog mapping helper.
 *
 * Production rule for Minsah Beauty:
 * - Simple product events use Product.id as Meta `content_ids` and `content_type: "product"`.
 * - Shade/variant events use the parent Product.id as Meta `content_ids` and
 *   `content_type: "product_group"`.
 * - Variant detail is retained in `contents` metadata for debugging/audience analysis,
 *   but the catalog-matching key remains the parent product/group ID.
 *
 * Keep this helper as the single source of truth across Browser Pixel, public CAPI,
 * COD/online Purchase CAPI, the signed browser Purchase bridge, and GA4 item IDs.
 */
export type MetaCatalogContentType = 'product' | 'product_group';

export type MetaCatalogItemSource = {
  id?: string | null;
  productId?: string | null;
  variantId?: string | null;
  sku?: string | null;
  name?: string | null;
  quantity?: number | null;
  price?: unknown;
  item_price?: unknown;
  variantName?: string | null;
  size?: string | null;
  color?: string | null;
  shade?: string | null;
  product?: {
    id?: string | null;
    sku?: string | null;
    name?: string | null;
  } | null;
  variant?: {
    id?: string | null;
    sku?: string | null;
    name?: string | null;
    productId?: string | null;
    attributes?: unknown;
  } | null;
};

export type MetaCatalogContent = {
  /** Meta catalog matching ID. For variants this is the parent Product.id. */
  id: string;
  quantity: number;
  item_price: number;
  /** Alias kept because older browser payloads already used `price`. */
  price?: number;
  /** Parent product/group ID, present for variant rows. */
  item_group_id?: string;
  /** Variant-specific diagnostics; not used as the Meta catalog match key. */
  variant_id?: string;
  variant_sku?: string;
  item_variant?: string;
  shade?: string;
  color?: string;
  size?: string;
};

function cleanId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toMoney(value: unknown) {
  const parsed = toNumber(value);
  if (parsed === undefined) return 0;
  return Math.round(parsed * 100) / 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringFromRecord(record: Record<string, unknown>, keys: string[]) {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));

  for (const [key, value] of Object.entries(record)) {
    if (!normalizedKeys.has(key.toLowerCase())) continue;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  return undefined;
}

function getVariantAttributes(item: MetaCatalogItemSource) {
  return isRecord(item.variant?.attributes) ? item.variant.attributes : undefined;
}

export function hasMetaVariantSelection(item: MetaCatalogItemSource) {
  return Boolean(cleanId(item.variantId) || cleanId(item.variant?.id));
}

export function getMetaVariantId(item: MetaCatalogItemSource) {
  return cleanId(item.variantId) ?? cleanId(item.variant?.id);
}

export function getMetaParentProductId(item: MetaCatalogItemSource) {
  return cleanId(item.productId) ?? cleanId(item.product?.id) ?? cleanId(item.variant?.productId);
}

/**
 * Meta catalog matching ID.
 *
 * This intentionally prefers parent product ID over variant ID so shade/variant
 * events match the catalog item_group/product group consistently.
 */
export function getMetaContentId(item: MetaCatalogItemSource) {
  return (
    getMetaParentProductId(item) ??
    cleanId(item.sku) ??
    cleanId(item.product?.sku) ??
    cleanId(item.id) ??
    cleanId(item.variant?.sku) ??
    getMetaVariantId(item) ??
    ''
  );
}

export function getUniqueMetaContentIds(items: MetaCatalogItemSource[]) {
  return Array.from(new Set(items.map(getMetaContentId).filter(Boolean)));
}

export function getMetaCatalogContentType(items: MetaCatalogItemSource[]): MetaCatalogContentType {
  return items.some(hasMetaVariantSelection) ? 'product_group' : 'product';
}

export function buildMetaCatalogContentIds(items: MetaCatalogItemSource[]) {
  return getUniqueMetaContentIds(items);
}

export function buildMetaCatalogContents(items: MetaCatalogItemSource[]): MetaCatalogContent[] {
  const contents: MetaCatalogContent[] = [];

  for (const item of items) {
    const id = getMetaContentId(item);
    if (!id) continue;

    const quantity = Math.max(1, Math.trunc(toNumber(item.quantity) ?? 1));
    const itemPrice = toMoney(item.item_price ?? item.price);
    const variantId = getMetaVariantId(item);
    const itemGroupId = variantId ? getMetaParentProductId(item) : undefined;
    const attributes = getVariantAttributes(item);
    const size = cleanId(item.size) ?? (attributes ? stringFromRecord(attributes, ['size']) : undefined);
    const shade =
      cleanId(item.shade) ??
      cleanId(item.color) ??
      (attributes ? stringFromRecord(attributes, ['shade', 'color']) : undefined);
    const color = cleanId(item.color) ?? (attributes ? stringFromRecord(attributes, ['color', 'shade']) : undefined);
    const variantSku = variantId ? cleanId(item.variant?.sku) ?? cleanId(item.sku) : undefined;
    const variantLabel = [size, shade].filter(Boolean).join(' / ');
    const itemVariant =
      cleanId(item.variantName) ??
      cleanId(item.variant?.name) ??
      cleanId(variantLabel);

    contents.push({
      id,
      quantity,
      item_price: itemPrice,
      price: itemPrice,
      ...(itemGroupId && { item_group_id: itemGroupId }),
      ...(variantId && { variant_id: variantId }),
      ...(variantSku && { variant_sku: variantSku }),
      ...(itemVariant && { item_variant: itemVariant }),
      ...(shade && { shade }),
      ...(color && { color }),
      ...(size && { size }),
    });
  }

  return contents;
}
