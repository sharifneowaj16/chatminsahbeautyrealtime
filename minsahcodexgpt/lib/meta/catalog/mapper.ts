import { resolveCatalogAvailability } from './domain/availability';
import { catalogAttributes } from './domain/attributes';
import { cleanCatalogCategory } from './domain/category';
import { resolveCatalogIdentifiers } from './domain/identifiers';
import { absoluteCatalogUrl, uniqueCatalogImages } from './domain/images';
import { money } from './domain/pricing';
import { resolveCatalogSale } from './domain/sale-period';
import type { CanonicalCatalogItem, CatalogCondition, CatalogMappedItem } from './domain/types';
import { validateCanonicalCatalogItem } from './validator';

export type CatalogIdentity = { itemId: string; groupId?: string };
export type CatalogIdentityResolver = (input: {
  productId: string;
  productSku: string;
  variantId?: string;
  variantSku?: string;
}) => CatalogIdentity;

export type CatalogVariantSource = {
  id: string;
  sku: string;
  name: string;
  price?: unknown;
  salePrice?: unknown;
  offerStartDate?: Date | null;
  offerEndDate?: Date | null;
  quantity: number;
  reservedQuantity: number;
  allowBackorder?: boolean | null;
  isActive?: boolean;
  deletedAt?: Date | null;
  availabilityMode?: string | null;
  preorderAvailableOn?: Date | null;
  condition?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  barcode?: string | null;
  attributes?: unknown;
  image?: string | null;
};

export type CatalogProductSource = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  price: unknown;
  salePrice?: unknown;
  offerStartDate?: Date | null;
  offerEndDate?: Date | null;
  quantity: number;
  reservedQuantity: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  isActive: boolean;
  deletedAt?: Date | null;
  availabilityMode?: string | null;
  preorderAvailableOn?: Date | null;
  preOrderOption?: boolean;
  condition?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  googleProductCategory?: string | null;
  facebookProductCategory?: string | null;
  canonicalUrl?: string | null;
  ogImageUrl?: string | null;
  isNew?: boolean;
  isFeatured?: boolean;
  productAttributes?: unknown;
  images: Array<{ url: string; isDefault?: boolean; sortOrder?: number }>;
  variants: CatalogVariantSource[];
  category?: { name: string } | null;
  brand?: { name: string } | null;
};

function text(value: string | null | undefined, max = 5000) {
  return value
    ?.replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max) || '';
}

function condition(value?: string | null): CatalogCondition {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'used' || normalized === 'refurbished' ? normalized : 'new';
}

function buildItem(input: {
  product: CatalogProductSource;
  variant?: CatalogVariantSource;
  identity: CatalogIdentity;
  siteUrl?: string;
  currency: string;
  now: Date;
}): CatalogMappedItem | null {
  const { product, variant } = input;
  const isVariant = Boolean(variant);
  const isActive = product.isActive && (variant?.isActive ?? true);
  const deletedAt = product.deletedAt ?? variant?.deletedAt;
  const availabilityMode = variant?.availabilityMode
    ?? product.availabilityMode
    ?? (product.preOrderOption ? 'PREORDER' : 'STANDARD');
  const preorderAvailableOn = variant?.preorderAvailableOn ?? product.preorderAvailableOn;
  const allowBackorder = variant?.allowBackorder ?? product.allowBackorder;
  const quantity = variant?.quantity ?? product.quantity;
  const reservedQuantity = variant?.reservedQuantity ?? product.reservedQuantity;
  const availability = resolveCatalogAvailability({
    isActive,
    deletedAt,
    availabilityMode,
    preorderAvailableOn,
    trackInventory: product.trackInventory,
    quantity,
    reservedQuantity,
    allowBackorder,
  });
  if (!availability.includeInUpdates) return null;

  const regularPrice = variant?.price ?? product.price;
  const usesVariantSale = variant?.salePrice != null;
  const sale = resolveCatalogSale({
    regularPrice,
    salePrice: usesVariantSale ? variant?.salePrice : product.salePrice,
    offerStartDate: usesVariantSale ? variant?.offerStartDate : product.offerStartDate,
    offerEndDate: usesVariantSale ? variant?.offerEndDate : product.offerEndDate,
    currency: input.currency,
    now: input.now,
  });

  const productImages = uniqueCatalogImages(
    [product.images.find((image) => image.isDefault)?.url, ...product.images.map((image) => image.url), product.ogImageUrl],
    input.siteUrl
  );
  const variantImage = absoluteCatalogUrl(variant?.image, input.siteUrl);
  const imageLink = variantImage ?? productImages[0] ?? '';
  const additionalImageLinks = Array.from(new Set(
    productImages.filter((url) => url !== imageLink)
  )).slice(0, 20);
  const attributes = catalogAttributes(variant?.attributes ?? product.productAttributes);
  const identifiers = resolveCatalogIdentifiers({
    variantGtin: variant?.gtin,
    productGtin: product.gtin,
    variantMpn: variant?.mpn,
    productMpn: product.mpn,
  });
  const category = cleanCatalogCategory(product.category?.name);
  const title = text(variant ? `${product.name} - ${variant.name}` : product.name, 150);
  const description = text(product.description ?? product.shortDescription ?? product.name);
  const link = absoluteCatalogUrl(product.canonicalUrl ?? `/products/${product.slug}`, input.siteUrl) ?? '';

  const item: CanonicalCatalogItem = {
    sourceType: isVariant ? 'VARIANT' : 'PRODUCT',
    sourceId: variant?.id ?? product.id,
    retailerId: input.identity.itemId,
    itemGroupId: isVariant ? input.identity.groupId : undefined,
    title,
    description,
    availability: availability.availability,
    availabilityDate: availability.availabilityDate,
    quantityToSellOnFacebook: availability.quantityToSellOnFacebook,
    condition: condition(variant?.condition ?? product.condition),
    price: money(regularPrice, input.currency),
    sale: sale.sale,
    link,
    imageLink,
    additionalImageLinks,
    brand: text(product.brand?.name ?? 'Minsah Beauty', 100),
    ...identifiers,
    productType: category,
    googleProductCategory: cleanCatalogCategory(product.googleProductCategory),
    facebookProductCategory: cleanCatalogCategory(product.facebookProductCategory),
    ...attributes,
    visibility: 'published',
    customLabels: {
      custom_label_0: product.isNew ? 'new_arrival' : 'standard',
      custom_label_1: product.isFeatured ? 'featured' : 'standard',
      ...(category ? { custom_label_2: category } : {}),
      custom_label_3: sale.state,
      custom_label_4: isVariant ? 'variant' : 'simple',
    },
  };
  const validation = validateCanonicalCatalogItem(item);
  if (sale.error) validation.errors.push(sale.error);
  return { item, validation };
}

export function mapProductToCatalogItems(input: {
  product: CatalogProductSource;
  resolveIdentity: CatalogIdentityResolver;
  siteUrl?: string;
  currency?: string;
  now?: Date;
}): CatalogMappedItem[] {
  const now = input.now ?? new Date();
  const currency = input.currency ?? 'BDT';
  if (input.product.variants.length === 0) {
    const identity = input.resolveIdentity({ productId: input.product.id, productSku: input.product.sku });
    const mapped = buildItem({ product: input.product, identity, siteUrl: input.siteUrl, currency, now });
    return mapped ? [mapped] : [];
  }
  return input.product.variants.flatMap((variant) => {
    const identity = input.resolveIdentity({
      productId: input.product.id,
      productSku: input.product.sku,
      variantId: variant.id,
      variantSku: variant.sku,
    });
    const mapped = buildItem({ product: input.product, variant, identity, siteUrl: input.siteUrl, currency, now });
    return mapped ? [mapped] : [];
  });
}
