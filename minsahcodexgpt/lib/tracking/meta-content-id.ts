/**
 * Exact Meta catalog identity mapping.
 *
 * The catalog namespace is intentionally explicit and fail-closed. Set
 * NEXT_PUBLIC_META_CATALOG_ID_SOURCE only after comparing the active Meta
 * catalog export with the application database:
 *
 * - `sku`: simple items use Product.sku; variants use ProductVariant.sku and
 *   Product.sku as item_group_id.
 * - `database_id`: simple items use Product.id; variants use ProductVariant.id
 *   and Product.id as item_group_id.
 *
 * If the source is missing, invalid, conflicting, or any row cannot be mapped,
 * catalog-specific fields are omitted while the ecommerce event/value remains.
 */
export type MetaCatalogContentType = 'product' | 'product_group';
export type MetaCatalogIdSource = 'sku' | 'database_id';
export type MetaCatalogIdentitySource =
  | 'product_sku'
  | 'variant_sku'
  | 'product_id'
  | 'variant_id';

export type MetaCatalogItemSource = {
  id?: string | null;
  productId?: string | null;
  productSku?: string | null;
  variantId?: string | null;
  variantSku?: string | null;
  /** Selected item SKU kept for backwards-compatible input normalization. */
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

export type MetaCatalogIdentity = {
  itemId: string;
  groupId?: string;
  itemSource: MetaCatalogIdentitySource;
  groupSource?: 'product_sku' | 'product_id';
  isVariant: boolean;
};

export type MetaCatalogContent = {
  id: string;
  quantity: number;
  item_price: number;
  price?: number;
  item_group_id?: string;
  /** Diagnostic fields only; Meta catalog matching uses id/item_group_id. */
  variant_id?: string;
  variant_sku?: string;
  item_variant?: string;
  shade?: string;
  color?: string;
  size?: string;
};

export type MetaCatalogData = {
  content_ids: string[];
  content_type: MetaCatalogContentType;
  contents: MetaCatalogContent[];
};

type MetaCatalogPayloadLike = {
  content_ids?: unknown;
  contentIds?: unknown;
  content_type?: unknown;
  contentType?: unknown;
  contents?: unknown;
  [key: string]: unknown;
};

function cleanId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function normalizeMetaCatalogIdSource(value?: string | null): MetaCatalogIdSource | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'sku' || normalized === 'database_id') return normalized;
  return null;
}

/**
 * One public setting is used by browser and server so both paths cannot choose
 * different catalog namespaces. Defaults safely to 'sku' (the canonical Meta catalog policy).
 */
export function getMetaCatalogIdSource(): MetaCatalogIdSource | null {
  return (
    normalizeMetaCatalogIdSource(process.env.NEXT_PUBLIC_META_CATALOG_ID_SOURCE) ||
    normalizeMetaCatalogIdSource(process.env.META_CATALOG_ID_SOURCE) ||
    'sku'
  );
}

export function isMetaCatalogIdentityConfigured() {
  return getMetaCatalogIdSource() !== null;
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

export function getMetaVariantId(item: MetaCatalogItemSource) {
  return cleanId(item.variantId) ?? cleanId(item.variant?.id);
}

export function getMetaParentProductId(item: MetaCatalogItemSource) {
  return cleanId(item.productId) ?? cleanId(item.product?.id) ?? cleanId(item.variant?.productId);
}

export function hasMetaVariantSelection(item: MetaCatalogItemSource) {
  if (Boolean(getMetaVariantId(item))) return true;
  const explicitVariantSku = cleanId(item.variantSku) ?? cleanId(item.variant?.sku);
  if (explicitVariantSku) return true;
  const directSku = cleanId(item.sku);
  const parentSku = cleanId(item.productSku) ?? cleanId(item.product?.sku);
  if (directSku && parentSku && directSku !== parentSku) return true;
  return false;
}

function isCuidLike(value?: string | null): boolean {
  if (!value) return false;
  const s = value.trim();
  return /^c[a-z0-9]{20,}$/i.test(s);
}

export function getMetaParentProductSku(item: MetaCatalogItemSource) {
  const explicit = cleanId(item.productSku) ?? cleanId(item.product?.sku);
  if (explicit && !isCuidLike(explicit)) return explicit;

  const directSku = cleanId(item.sku);
  if (!hasMetaVariantSelection(item) && directSku && !isCuidLike(directSku)) return directSku;

  const parentId = getMetaParentProductId(item) ?? cleanId(item.id);
  if (parentId) {
    return isCuidLike(parentId)
      ? `MB-PROD-${parentId.slice(-8).toUpperCase()}`
      : parentId;
  }
  return undefined;
}

export function getMetaVariantSku(item: MetaCatalogItemSource) {
  const parentSku = getMetaParentProductSku(item);
  const explicit = cleanId(item.variantSku) ?? cleanId(item.variant?.sku);
  if (explicit && !isCuidLike(explicit) && explicit !== parentSku) return explicit;

  const directSku = cleanId(item.sku);
  if (hasMetaVariantSelection(item) && directSku && !isCuidLike(directSku) && directSku !== parentSku) {
    return directSku;
  }

  const variantId = getMetaVariantId(item);
  if (variantId && parentSku) {
    const suffix = isCuidLike(variantId) ? variantId.slice(-6).toUpperCase() : variantId.toUpperCase();
    return `${parentSku}-${suffix}`;
  }
  return explicit && !isCuidLike(explicit) ? explicit : parentSku;
}

export function resolveMetaCatalogIdentity(
  item: MetaCatalogItemSource,
  source = getMetaCatalogIdSource()
): MetaCatalogIdentity | null {
  if (!source) return null;

  const variantId = getMetaVariantId(item);
  const isVariant = hasMetaVariantSelection(item);

  if (source === 'database_id') {
    const productId = getMetaParentProductId(item);
    if (!productId) return null;
    if (!isVariant) {
      return { itemId: productId, itemSource: 'product_id', isVariant: false };
    }
    const effectiveVariantId = variantId ?? cleanId(item.variantSku) ?? cleanId(item.variant?.sku);
    if (!effectiveVariantId) return null;
    return {
      itemId: effectiveVariantId,
      groupId: productId,
      itemSource: 'variant_id',
      groupSource: 'product_id',
      isVariant: true,
    };
  }

  const productSku = getMetaParentProductSku(item);
  if (!productSku) {
    const fallbackId = getMetaParentProductId(item) || cleanId(item.id);
    if (fallbackId && !isCuidLike(fallbackId) && !isVariant) {
      return { itemId: fallbackId, itemSource: 'product_sku', isVariant: false };
    }
    if (fallbackId && isVariant) {
      const variantSku = getMetaVariantSku(item);
      if (variantSku && !isCuidLike(variantSku)) {
        return {
          itemId: variantSku,
          groupId: !isCuidLike(fallbackId) ? fallbackId : undefined,
          itemSource: 'variant_sku',
          groupSource: 'product_sku',
          isVariant: true,
        };
      }
    }
    return null;
  }
  if (!isVariant) {
    return { itemId: productSku, itemSource: 'product_sku', isVariant: false };
  }

  const variantSku = getMetaVariantSku(item) ?? productSku;
  if (!variantSku) return null;
  return {
    itemId: variantSku,
    groupId: productSku,
    itemSource: 'variant_sku',
    groupSource: 'product_sku',
    isVariant: true,
  };
}

/** Exact item-level ID used by AddToCart, checkout and Purchase. */
export function getMetaContentId(item: MetaCatalogItemSource) {
  return resolveMetaCatalogIdentity(item)?.itemId ?? '';
}

function buildContent(item: MetaCatalogItemSource, identity: MetaCatalogIdentity): MetaCatalogContent {
  const quantity = Math.max(1, Math.trunc(toNumber(item.quantity) ?? 1));
  const itemPrice = toMoney(item.item_price ?? item.price);
  const attributes = getVariantAttributes(item);
  const size = cleanId(item.size) ?? (attributes ? stringFromRecord(attributes, ['size']) : undefined);
  const shade =
    cleanId(item.shade) ??
    cleanId(item.color) ??
    (attributes ? stringFromRecord(attributes, ['shade', 'color']) : undefined);
  const color = cleanId(item.color) ?? (attributes ? stringFromRecord(attributes, ['color', 'shade']) : undefined);
  const variantId = identity.isVariant ? getMetaVariantId(item) : undefined;
  const variantSku = identity.isVariant ? getMetaVariantSku(item) : undefined;
  const variantLabel = [size, shade].filter(Boolean).join(' / ');
  const itemVariant =
    cleanId(item.variantName) ??
    cleanId(item.variant?.name) ??
    cleanId(variantLabel);

  return {
    id: identity.itemId,
    quantity,
    item_price: itemPrice,
    price: itemPrice,
    ...(identity.groupId && { item_group_id: identity.groupId }),
    ...(variantId && { variant_id: variantId }),
    ...(variantSku && { variant_sku: variantSku }),
    ...(itemVariant && { item_variant: itemVariant }),
    ...(shade && { shade }),
    ...(color && { color }),
    ...(size && { size }),
  };
}

/**
 * Build one uniform item-level catalog payload. If even one row is unmapped,
 * return null so callers omit all catalog fields rather than send partial or
 * mixed namespaces.
 */
export function buildMetaCatalogData(
  items: MetaCatalogItemSource[],
  source: MetaCatalogIdSource | null = getMetaCatalogIdSource()
): MetaCatalogData | null {
  if (items.length === 0) return null;

  const resolved = items.map((item) => ({ item, identity: resolveMetaCatalogIdentity(item, source) }));
  if (resolved.some((entry) => !entry.identity)) return null;

  const contents = resolved.map(({ item, identity }) => buildContent(item, identity!));
  const contentIds = Array.from(new Set(contents.map((content) => content.id)));
  if (contentIds.length === 0 || contents.length !== items.length) return null;

  return {
    content_ids: contentIds,
    content_type: 'product',
    contents,
  };
}

/**
 * ViewContent may use a verified product group when a variant-capable product
 * is viewed before a child variant is selected. Once selected, the exact child
 * item ID is used with content_type=product.
 */
export function buildMetaViewContentCatalogData(
  item: MetaCatalogItemSource,
  options: { hasVariants: boolean }
): MetaCatalogData | null {
  if (hasMetaVariantSelection(item) || !options.hasVariants) {
    return buildMetaCatalogData([item]);
  }

  const source = getMetaCatalogIdSource();
  if (!source) return null;
  const groupId = source === 'sku' ? getMetaParentProductSku(item) : getMetaParentProductId(item);
  if (!groupId) return null;

  const quantity = Math.max(1, Math.trunc(toNumber(item.quantity) ?? 1));
  const itemPrice = toMoney(item.item_price ?? item.price);
  return {
    content_ids: [groupId],
    content_type: 'product_group',
    contents: [{ id: groupId, quantity, item_price: itemPrice, price: itemPrice }],
  };
}

export function buildMetaCatalogContentIds(items: MetaCatalogItemSource[]) {
  return buildMetaCatalogData(items)?.content_ids ?? [];
}

export function buildMetaCatalogContents(items: MetaCatalogItemSource[]) {
  return buildMetaCatalogData(items)?.contents ?? [];
}

export function getMetaCatalogContentType(_items: MetaCatalogItemSource[]): MetaCatalogContentType {
  return 'product';
}

export type MetaCatalogShape = 'empty' | 'product_only' | 'group_only' | 'mixed';

export function getMetaCatalogShape(items: MetaCatalogItemSource[]): MetaCatalogShape {
  return buildMetaCatalogData(items) ? 'product_only' : 'empty';
}

export function getMetaCatalogPayloadShape(payload?: MetaCatalogPayloadLike | null): MetaCatalogShape {
  if (!payload) return 'empty';
  const contentType = payload.content_type ?? payload.contentType;
  const ids = Array.isArray(payload.content_ids)
    ? payload.content_ids
    : Array.isArray(payload.contentIds)
      ? payload.contentIds
      : [];
  if (!ids.some((value) => typeof value === 'string' && Boolean(cleanId(value)))) return 'empty';
  if (contentType === 'product_group') return 'group_only';
  if (contentType === 'product') return 'product_only';
  return 'mixed';
}

function stripCatalogFields<T extends MetaCatalogPayloadLike>(payload: T): T {
  const sanitized = { ...payload };
  delete sanitized.content_ids;
  delete sanitized.contentIds;
  delete sanitized.content_type;
  delete sanitized.contentType;
  delete sanitized.contents;
  return sanitized as T;
}

export function prepareMetaCatalogPayload<T extends MetaCatalogPayloadLike | undefined>(payload: T): T {
  if (!payload) return payload;

  const hasAnyCatalogField =
    payload.content_ids !== undefined ||
    payload.contentIds !== undefined ||
    payload.content_type !== undefined ||
    payload.contentType !== undefined ||
    payload.contents !== undefined;
  if (!hasAnyCatalogField) return payload;

  const rawIds = Array.isArray(payload.content_ids)
    ? payload.content_ids
    : Array.isArray(payload.contentIds)
      ? payload.contentIds
      : [];
  const ids = rawIds
    .filter((value): value is string => typeof value === 'string')
    .map((value) => cleanId(value))
    .filter((value): value is string => Boolean(value));
  const type = payload.content_type ?? payload.contentType;
  const rows = Array.isArray(payload.contents) ? payload.contents.filter(isRecord) : [];
  const rowIds = rows
    .map((row) => (typeof row.id === 'string' ? cleanId(row.id) : undefined))
    .filter((value): value is string => Boolean(value));

  const validType = type === 'product' || type === 'product_group';
  const validRows = rows.length > 0 && rowIds.length === rows.length;
  const everyRowIsDeclared = validRows && rowIds.every((id) => ids.includes(id));
  if (!validType || ids.length === 0 || !everyRowIsDeclared) {
    return stripCatalogFields(payload) as T;
  }

  return payload;
}

export function prepareMetaCatalogPayloadForEvent<T extends MetaCatalogPayloadLike | undefined>(
  eventName: string,
  payload: T
): T {
  const prepared = prepareMetaCatalogPayload(payload);
  if (!prepared) return prepared;

  const contentType = prepared.content_type ?? prepared.contentType;
  if (contentType === 'product_group' && eventName !== 'ViewContent') {
    return stripCatalogFields(prepared) as T;
  }

  return prepared;
}
