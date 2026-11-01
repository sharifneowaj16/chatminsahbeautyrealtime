import type { CartItem, ProductVariantItem } from '@/contexts/CartContext';

export interface AttributeExtractionResult {
  size: string | null;
  color: string | null;
  shade: string | null;
  volume: string | null;
  label: string | null;
}

/**
 * Extracts size, color, shade, volume, and a formatted label from variant attributes.
 */
export function extractVariantAttributes(
  attributes?: Record<string, any> | null,
  fallbackVariantName?: string | null
): AttributeExtractionResult {
  if (!attributes || typeof attributes !== 'object') {
    return {
      size: null,
      color: null,
      shade: null,
      volume: null,
      label: fallbackVariantName || null,
    };
  }

  const findAttr = (keys: string[]): string | null => {
    for (const key of keys) {
      if (attributes[key] !== undefined && attributes[key] !== null) {
        const val = String(attributes[key]).trim();
        if (val) return val;
      }
    }
    // Case-insensitive fallback
    const lowerKeys = keys.map((k) => k.toLowerCase());
    for (const [k, v] of Object.entries(attributes)) {
      if (lowerKeys.includes(k.toLowerCase()) && v !== undefined && v !== null) {
        const val = String(v).trim();
        if (val) return val;
      }
    }
    return null;
  };

  const size = findAttr(['size', 'packSize', 'size/weight']);
  const volume = findAttr(['volume', 'capacity']);
  const color = findAttr(['color', 'colour']);
  const shade = findAttr(['shade', 'shadeName', 'tint']) || color;

  const sizeOrVolume = size || volume;
  const parts = [sizeOrVolume, shade].filter(Boolean);
  const label = parts.length > 0 ? parts.join(' / ') : fallbackVariantName || null;

  return {
    size: sizeOrVolume,
    color,
    shade,
    volume,
    label,
  };
}

/**
 * Standardized Cart Item ID Generator:
 * - Single item with variant: variantId
 * - Single item without variant: productId
 * - Bundle item: bundle-${bundleId}-${variantId || productId}
 */
export function generateCartItemId(
  productId: string,
  variantId?: string | null,
  bundleId?: string | null
): string {
  const baseKey = variantId || productId;
  if (bundleId) {
    return `bundle-${bundleId}-${baseKey}`;
  }
  return baseKey;
}

/**
 * Unifies bundle group ID generation across storefront cards and custom drawers.
 * Sorts by "productId:variantId" so selection order never alters the bundle key.
 */
export function generateBundleGroupId(
  items: Array<{ productId: string; variantId?: string | null }>
): string {
  return items
    .map((i) => `${i.productId}:${i.variantId || 'base'}`)
    .sort()
    .join('|');
}

/**
 * Deterministic Canonical Server-Derived Cart Line Identity Formula:
 * JSON.stringify([pricingSource, campaignRef ?? null, bundleId ?? null, bundleGroupId ?? null, bundleInstanceId ?? null, productId, variantId ?? null])
 */
export function generateCanonicalLineKey({
  pricingSource = 'REGULAR',
  campaignRef = null,
  bundleId = null,
  bundleGroupId = null,
  bundleInstanceId = null,
  productId,
  variantId = null,
  id = null,
}: {
  pricingSource?: string | null;
  campaignRef?: string | null;
  bundleId?: string | null;
  bundleGroupId?: string | null;
  bundleInstanceId?: string | null;
  productId: string;
  variantId?: string | null;
  id?: string | null;
}): string {
  const source = pricingSource || 'REGULAR';
  if (source === 'LEGACY_UNATTRIBUTED') {
    return JSON.stringify([
      'LEGACY_UNATTRIBUTED',
      null,
      null,
      null,
      null,
      productId,
      variantId ?? null,
      id ?? null,
    ]);
  }
  return JSON.stringify([
    source,
    campaignRef ?? null,
    bundleId ?? null,
    bundleGroupId ?? null,
    bundleInstanceId ?? null,
    productId,
    variantId ?? null,
  ]);
}

export interface StandardProductInput {
  id: string;
  name: string;
  price: number;
  image: string;
  sku?: string | null;
  stock?: number | null;
  trackInventory?: boolean | null;
  allowBackorder?: boolean | null;
  weight?: number | string | null;
  shippingWeight?: number | string | null;
}

export interface StandardVariantInput {
  id: string;
  name?: string | null;
  price?: number | null;
  image?: string | null;
  sku?: string | null;
  stock?: number | null;
  attributes?: Record<string, any> | null;
}

export interface CreateStandardCartItemParams {
  product: StandardProductInput;
  variant?: StandardVariantInput | null;
  availableVariants?: ProductVariantItem[];
  quantity?: number;
  pricingSource?: string;
  campaignRef?: string | null;
  limitType?: string | null;
  maxUnitsPerCustomer?: number | null;
}

function parseWeightNumber(val: unknown): number | null {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'string') {
    const p = parseFloat(val);
    return Number.isFinite(p) ? p : null;
  }
  return null;
}

/**
 * Factory creating a 100% compliant CartItem with full metadata.
 */
export function createStandardCartItem({
  product,
  variant,
  availableVariants,
  quantity = 1,
  pricingSource = 'REGULAR',
  campaignRef = null,
  limitType = null,
  maxUnitsPerCustomer = null,
}: CreateStandardCartItemParams): CartItem {
  const hasVariant = Boolean(variant && variant.id);
  const variantId = hasVariant ? variant!.id : null;
  const lineKey = generateCanonicalLineKey({
    pricingSource,
    campaignRef,
    bundleId: null,
    bundleGroupId: null,
    bundleInstanceId: null,
    productId: product.id,
    variantId,
  });
  const id = lineKey;

  const effectivePrice =
    hasVariant && typeof variant!.price === 'number' && variant!.price > 0
      ? variant!.price
      : product.price;

  const effectiveImage =
    (hasVariant && variant!.image) ? variant!.image : product.image;

  const attrData = hasVariant
    ? extractVariantAttributes(variant!.attributes, variant!.name)
    : { size: null, color: null, shade: null, volume: null, label: null };

  const effectiveStock = hasVariant
    ? (typeof variant!.stock === 'number' ? variant!.stock : (product.stock ?? null))
    : (product.stock ?? null);

  const maxQuantity =
    product.trackInventory && !product.allowBackorder
      ? effectiveStock
      : null;

  return {
    id,
    lineKey,
    pricingSource,
    campaignRef,
    limitType: (limitType as any) ?? null,
    maxUnitsPerCustomer: maxUnitsPerCustomer ?? null,
    productId: product.id,
    variantId: variantId || undefined,
    name: product.name,
    price: effectivePrice,
    quantity: Math.max(1, Math.trunc(quantity)),
    image: effectiveImage,
    sku: (hasVariant ? variant!.sku : product.sku) || undefined,
    productSku: product.sku || undefined,
    variantSku: (hasVariant ? variant!.sku : null) || null,
    variantName: attrData.label || (hasVariant ? variant!.name : null) || null,
    size: attrData.size,
    color: attrData.color,
    shade: attrData.shade,
    variantImage: hasVariant ? variant!.image || null : null,
    weight: parseWeightNumber(product.weight),
    shippingWeight: parseWeightNumber(product.shippingWeight),
    stock: effectiveStock,
    maxQuantity,
    isBundle: false,
    bundleId: null,
    bundleGroupId: null,
    bundleInstanceId: null,
    bundleName: null,
    bundleDiscountRatio: null,
    availableVariants: availableVariants && availableVariants.length > 0 ? availableVariants : undefined,
  };
}

export interface CreateBundleCartItemParams {
  product: StandardProductInput;
  variant?: StandardVariantInput | null;
  availableVariants?: ProductVariantItem[];
  bundleId: string;
  bundleGroupId?: string | null;
  bundleInstanceId?: string | null;
  bundleSource?: 'hero-card' | 'custom-drawer' | null;
  bundleName?: string;
  discountRatio?: number;
  quantity?: number;
}

/**
 * Factory creating a bundle CartItem with proportional pricing and anti-stacking tags.
 */
export function createBundleCartItem({
  product,
  variant,
  availableVariants,
  bundleId,
  bundleGroupId,
  bundleInstanceId,
  bundleSource,
  bundleName = 'Special Bundle',
  discountRatio = 1,
  quantity = 1,
}: CreateBundleCartItemParams): CartItem {
  const hasVariant = Boolean(variant && variant.id);
  const variantId = hasVariant ? variant!.id : null;
  const effectiveBundleInstanceId =
    bundleInstanceId ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `bnd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  const lineKey = generateCanonicalLineKey({
    pricingSource: 'BUNDLE',
    campaignRef: null,
    bundleId,
    bundleGroupId: bundleGroupId ?? bundleId,
    bundleInstanceId: effectiveBundleInstanceId,
    productId: product.id,
    variantId,
  });
  const id = lineKey;

  const originalItemPrice =
    hasVariant && typeof variant!.price === 'number' && variant!.price > 0
      ? variant!.price
      : product.price;

  const discountedPrice = Math.round(originalItemPrice * Math.max(0, Math.min(1, discountRatio)));
  const effectiveImage =
    (hasVariant && variant!.image) ? variant!.image : product.image;

  const attrData = hasVariant
    ? extractVariantAttributes(variant!.attributes, variant!.name)
    : { size: null, color: null, shade: null, volume: null, label: null };

  const effectiveStock = hasVariant
    ? (typeof variant!.stock === 'number' ? variant!.stock : (product.stock ?? null))
    : (product.stock ?? null);

  const maxQuantity =
    product.trackInventory && !product.allowBackorder
      ? effectiveStock
      : null;

  return {
    id,
    lineKey,
    pricingSource: 'BUNDLE',
    productId: product.id,
    variantId: variantId || undefined,
    name: `${product.name} [${bundleName}]`,
    price: discountedPrice,
    quantity: Math.max(1, Math.trunc(quantity)),
    image: effectiveImage,
    sku: (hasVariant ? variant!.sku : product.sku) || undefined,
    productSku: product.sku || undefined,
    variantSku: (hasVariant ? variant!.sku : null) || null,
    variantName: attrData.label || (hasVariant ? variant!.name : null) || null,
    size: attrData.size,
    color: attrData.color,
    shade: attrData.shade,
    variantImage: hasVariant ? variant!.image || null : null,
    weight: parseWeightNumber(product.weight),
    shippingWeight: parseWeightNumber(product.shippingWeight),
    stock: effectiveStock,
    maxQuantity,
    isBundle: true,
    bundleId,
    bundleGroupId: bundleGroupId ?? bundleId,
    bundleInstanceId: effectiveBundleInstanceId,
    bundleSource: bundleSource ?? null,
    bundleName,
    bundleDiscountRatio: discountRatio,
    availableVariants: availableVariants && availableVariants.length > 0 ? availableVariants : undefined,
  };
}

/**
 * Finds any standalone (non-bundle) cart items matching given product IDs.
 * Used to cleanly upgrade standalone single items to bundles without duplicate rows.
 */
export function findStandaloneCartItems(
  cartItems: CartItem[],
  productIds: (string | null | undefined)[]
): CartItem[] {
  const targetIds = new Set(productIds.filter(Boolean) as string[]);
  return cartItems.filter((item) => {
    const isBundle = Boolean(
      item.isBundle ||
      item.bundleId ||
      (typeof item.id === 'string' && item.id.startsWith('bundle-'))
    );
    if (isBundle) return false;
    const prodId = item.productId || item.id;
    return targetIds.has(prodId);
  });
}
