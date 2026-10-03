import { resolveCatalogSale } from '../meta/catalog/domain/sale-period.ts';
import type { CatalogAvailability } from '../meta/catalog/domain/types.ts';
import {
  resolveProductAvailability,
  type ProductAvailabilitySnapshot,
} from './product-availability.ts';
import {
  resolveProductRating,
  type ProductRatingSnapshot,
} from './product-rating.ts';
import { resolveMetaCatalogIdentity } from '../tracking/meta-content-id.ts';

export type ProductOfferSnapshot = {
  regularPrice: number;
  salePrice: number | null;
  effectivePrice: number;
  compareAtPrice: number | null;
  currency: 'BDT';
  saleState: 'none' | 'future' | 'active' | 'expired' | 'invalid';
  saleEndsAt: string | null;
  saleError?: string;
  catalogSale?: {
    price: { amount: number; currency: string };
    effectiveDate: string;
  };
  availability: CatalogAvailability;
  schemaAvailability: string;
  availableQuantity: number;
  includeInUpdates: boolean;
  canPurchase: boolean;
  isPreorder: boolean;
  preorderAvailableOn: string | null;
  allowBackorder: boolean;
  retailerId: string;
  itemGroupId?: string;
  link: string;
  rating: ProductRatingSnapshot;
};

export type ResolvableProductSource = {
  id: string;
  sku?: string | null;
  slug?: string | null;
  canonicalUrl?: string | null;
  price: unknown;
  compareAtPrice?: unknown;
  salePrice?: unknown;
  offerStartDate?: Date | string | null;
  offerEndDate?: Date | string | null;
  isActive?: boolean | null;
  deletedAt?: Date | string | null;
  availabilityMode?: string | null;
  preorderAvailableOn?: Date | string | null;
  trackInventory?: boolean | null;
  quantity?: number | null;
  reservedQuantity?: number | null;
  allowBackorder?: boolean | null;
  rating?: number | null;
  reviews?: unknown;
  reviewCount?: number | null;
};

export type ResolvableVariantSource = {
  id: string;
  sku?: string | null;
  price?: unknown;
  compareAtPrice?: unknown;
  salePrice?: unknown;
  offerStartDate?: Date | string | null;
  offerEndDate?: Date | string | null;
  isActive?: boolean | null;
  deletedAt?: Date | string | null;
  availabilityMode?: string | null;
  preorderAvailableOn?: Date | string | null;
  quantity?: number | null;
  reservedQuantity?: number | null;
  allowBackorder?: boolean | null;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as any).toNumber === 'function') {
    const parsed = (value as any).toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toOptionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const num = toNumber(value);
  return num > 0 ? num : null;
}

export function resolveProductOffer(input: {
  product: ResolvableProductSource;
  variant?: ResolvableVariantSource | null;
  now?: Date;
  siteUrl?: string;
  catalogIdSource?: 'sku' | 'database_id';
}): ProductOfferSnapshot {
  const now = input.now ?? new Date();
  const { product, variant } = input;
  const isVariant = Boolean(variant);

  // 1. Regular Price & Compare-At Price
  const basePrice = isVariant && variant?.price != null ? toNumber(variant.price) : toNumber(product.price);
  const compareAt = isVariant && variant?.compareAtPrice != null
    ? toOptionalNumber(variant.compareAtPrice)
    : toOptionalNumber(product.compareAtPrice);

  // 2. Sale Price & State
  const usesVariantSale = isVariant && variant?.salePrice != null;
  const rawSalePrice = usesVariantSale ? variant?.salePrice : product.salePrice;
  const offerStartDate = usesVariantSale
    ? (variant?.offerStartDate ? new Date(variant.offerStartDate) : null)
    : (product.offerStartDate ? new Date(product.offerStartDate) : null);
  const offerEndDate = usesVariantSale
    ? (variant?.offerEndDate ? new Date(variant.offerEndDate) : null)
    : (product.offerEndDate ? new Date(product.offerEndDate) : null);

  const saleResolution = resolveCatalogSale({
    regularPrice: basePrice,
    salePrice: rawSalePrice,
    offerStartDate,
    offerEndDate,
    currency: 'BDT',
    now,
  });

  const isSaleActive = saleResolution.state === 'active' && saleResolution.sale != null;
  const activeSalePrice = isSaleActive ? saleResolution.sale!.price.amount : null;
  const effectivePrice = isSaleActive ? activeSalePrice! : basePrice;

  // 3. Availability
  const isActive = Boolean(product.isActive ?? true) && (variant ? Boolean(variant.isActive ?? true) : true);
  const deletedAt = variant?.deletedAt ?? product.deletedAt ?? null;
  const availabilityMode = variant?.availabilityMode ?? product.availabilityMode;
  const preorderAvailableOn = variant?.preorderAvailableOn ?? product.preorderAvailableOn;
  const trackInventory = product.trackInventory ?? true;
  const quantity = variant ? (variant.quantity ?? 0) : (product.quantity ?? 0);
  const reservedQuantity = variant ? (variant.reservedQuantity ?? 0) : (product.reservedQuantity ?? 0);
  const allowBackorder = variant?.allowBackorder ?? product.allowBackorder ?? false;

  const availabilitySnapshot: ProductAvailabilitySnapshot = resolveProductAvailability({
    isActive,
    deletedAt,
    availabilityMode,
    preorderAvailableOn,
    trackInventory,
    quantity,
    reservedQuantity,
    allowBackorder,
  });

  // 4. Rating Snapshot (product-level)
  const ratingSnapshot: ProductRatingSnapshot = resolveProductRating({
    reviews: Array.isArray(product.reviews) ? (product.reviews as any) : null,
    ratingValue: product.rating,
    reviewCount: product.reviewCount,
  });

  // 5. Retailer ID & Link
  const identity = resolveMetaCatalogIdentity(
    {
      productId: product.id,
      productSku: product.sku ?? '',
      variantId: variant?.id,
      variantSku: variant?.sku ?? '',
    },
    input.catalogIdSource
  );

  const retailerId = identity?.itemId || (variant?.sku || product.sku || variant?.id || product.id);
  const itemGroupId = isVariant ? (identity?.groupId || product.sku || product.id) : undefined;

  const baseSlug = product.slug || product.id;
  const relativeLink = variant?.id
    ? `/products/${baseSlug}?variant=${variant.id}`
    : `/products/${baseSlug}`;
  const siteUrl = (input.siteUrl ?? '').replace(/\/$/, '');
  const fullLink = siteUrl ? `${siteUrl}${relativeLink}` : relativeLink;

  return {
    regularPrice: basePrice,
    salePrice: activeSalePrice,
    effectivePrice,
    compareAtPrice: compareAt,
    currency: 'BDT',
    saleState: saleResolution.state,
    saleEndsAt: isSaleActive && offerEndDate ? offerEndDate.toISOString() : null,
    saleError: saleResolution.error,
    catalogSale: saleResolution.sale,
    availability: availabilitySnapshot.availability,
    schemaAvailability: availabilitySnapshot.schemaAvailability,
    availableQuantity: availabilitySnapshot.availableQuantity,
    includeInUpdates: availabilitySnapshot.includeInUpdates,
    canPurchase: availabilitySnapshot.canPurchase,
    isPreorder: availabilitySnapshot.isPreorder,
    preorderAvailableOn: availabilitySnapshot.preorderAvailableOn ?? null,
    allowBackorder: availabilitySnapshot.allowBackorder,
    retailerId,
    itemGroupId,
    link: fullLink,
    rating: ratingSnapshot,
  };
}
