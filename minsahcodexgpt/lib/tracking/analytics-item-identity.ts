/**
 * Platform-neutral legacy analytics identity helpers.
 *
 * These preserve the existing GA4/TikTok reporting namespace while Meta moves
 * to its own explicit catalog contract. Do not import this file from Meta code.
 */
export type AnalyticsItemSource = {
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

export type AnalyticsCatalogContent = {
  id: string;
  quantity: number;
  item_price: number;
  price?: number;
  item_group_id?: string;
  variant_id?: string;
  variant_sku?: string;
  item_variant?: string;
  shade?: string;
  color?: string;
  size?: string;
};

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function numberValue(value: unknown) {
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

function money(value: unknown) {
  const parsed = numberValue(value);
  return parsed === undefined ? 0 : Math.round(parsed * 100) / 100;
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function recordString(value: Record<string, unknown>, keys: string[]) {
  const normalized = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, entry] of Object.entries(value)) {
    if (!normalized.has(key.toLowerCase())) continue;
    if (typeof entry === 'string' && entry.trim()) return entry.trim();
    if (typeof entry === 'number' && Number.isFinite(entry)) return String(entry);
  }
  return undefined;
}

export function getAnalyticsVariantId(item: AnalyticsItemSource) {
  return clean(item.variantId) ?? clean(item.variant?.id);
}

export function getAnalyticsParentProductId(item: AnalyticsItemSource) {
  return clean(item.productId) ?? clean(item.product?.id) ?? clean(item.variant?.productId);
}

/** Preserves the pre-Phase-3 GA4/TikTok item ID order exactly. */
export function getAnalyticsItemId(item: AnalyticsItemSource) {
  return (
    getAnalyticsParentProductId(item) ??
    clean(item.sku) ??
    clean(item.product?.sku) ??
    clean(item.id) ??
    clean(item.variant?.sku) ??
    getAnalyticsVariantId(item) ??
    ''
  );
}

export function buildAnalyticsCatalogContents(items: AnalyticsItemSource[]): AnalyticsCatalogContent[] {
  return items.flatMap((item) => {
    const id = getAnalyticsItemId(item);
    if (!id) return [];

    const variantId = getAnalyticsVariantId(item);
    const attributes = record(item.variant?.attributes) ? item.variant.attributes : undefined;
    const size = clean(item.size) ?? (attributes ? recordString(attributes, ['size']) : undefined);
    const shade =
      clean(item.shade) ??
      clean(item.color) ??
      (attributes ? recordString(attributes, ['shade', 'color']) : undefined);
    const color = clean(item.color) ?? (attributes ? recordString(attributes, ['color', 'shade']) : undefined);
    const variantSku = variantId ? clean(item.variant?.sku) ?? clean(item.sku) : undefined;
    const itemVariant =
      clean(item.variantName) ??
      clean(item.variant?.name) ??
      clean([size, shade].filter(Boolean).join(' / '));
    const itemPrice = money(item.item_price ?? item.price);

    return [{
      id,
      quantity: Math.max(1, Math.trunc(numberValue(item.quantity) ?? 1)),
      item_price: itemPrice,
      price: itemPrice,
      ...(variantId && getAnalyticsParentProductId(item) && { item_group_id: getAnalyticsParentProductId(item) }),
      ...(variantId && { variant_id: variantId }),
      ...(variantSku && { variant_sku: variantSku }),
      ...(itemVariant && { item_variant: itemVariant }),
      ...(shade && { shade }),
      ...(color && { color }),
      ...(size && { size }),
    }];
  });
}
