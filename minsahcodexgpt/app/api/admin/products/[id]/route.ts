import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PlainObject = Record<string, unknown>;

type ProductVariantPayload = PlainObject & {
  id?: unknown;
  sku?: unknown;
  name?: unknown;
  size?: unknown;
  color?: unknown;
  shade?: unknown;
  price?: unknown;
  stock?: unknown;
  quantity?: unknown;
  image?: unknown;
  attributes?: unknown;
};

type ProductImagePayload = PlainObject & {
  url?: unknown;
  alt?: unknown;
  title?: unknown;
  sortOrder?: unknown;
};

class ProductRouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ProductRouteError';
    this.status = status;
  }
}

const productDetailInclude = {
  images: { orderBy: { sortOrder: 'asc' } },
  category: true,
  brand: true,
  variants: { orderBy: { id: 'asc' } },
} satisfies Prisma.ProductInclude;

type ProductDetail = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(object: unknown, key: string): boolean {
  return isPlainObject(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function compact<T extends PlainObject>(object: T): T {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  ) as T;
}

function getString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function nullableString(value: unknown): string | null {
  const text = getString(value);
  return text ? text : null;
}

function stringByKeys(payload: PlainObject, keys: string[]): string | null | undefined {
  for (const key of keys) {
    if (hasOwn(payload, key)) {
      return nullableString(payload[key]);
    }
  }

  return undefined;
}

function toSlug(value: string): string {
  const cleaned = value
    .replace(/^https?:\/\/[^/]+\/products\//i, '')
    .replace(/^\/?products\//i, '')
    .split('?')[0]
    .split('#')[0];

  const slug = cleaned
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || `product-${Date.now().toString(36)}`;
}

function decimalString(value: unknown, label: string): string | undefined {
  const text = getString(value).replace(/,/g, '');
  if (!text) return undefined;

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    throw new ProductRouteError(`${label} must be a valid number`);
  }

  return text;
}

function decimalNullable(value: unknown, label: string): string | null {
  const parsed = decimalString(value, label);
  return parsed === undefined ? null : parsed;
}

function nonNegativeDecimal(value: unknown, label: string): string | undefined {
  const parsed = decimalString(value, label);
  if (parsed === undefined) return undefined;

  if (Number(parsed) < 0) {
    throw new ProductRouteError(`${label} cannot be negative`);
  }

  return parsed;
}

function intValue(value: unknown, label: string, fallback?: number): number | undefined {
  const text = getString(value);
  if (!text) return fallback;

  const parsed = Number.parseInt(text, 10);
  if (!Number.isFinite(parsed)) {
    throw new ProductRouteError(`${label} must be a valid integer`);
  }

  return parsed;
}

function nonNegativeInt(value: unknown, label: string, fallback?: number): number | undefined {
  const parsed = intValue(value, label, fallback);
  if (parsed === undefined) return undefined;

  if (parsed < 0) {
    throw new ProductRouteError(`${label} cannot be negative`);
  }

  return Math.trunc(parsed);
}

function booleanValue(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'active'].includes(normalized)) return true;
    if (['false', '0', 'no', 'inactive'].includes(normalized)) return false;
  }

  return fallback;
}

function dateNullable(value: unknown, label: string): Date | null {
  const text = getString(value);
  if (!text) return null;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new ProductRouteError(`${label} must be a valid date`);
  }

  return date;
}

function stringArray(value: unknown): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return [
    ...new Set(
      rawValues
        .map((entry) => getString(entry))
        .filter(Boolean)
    ),
  ];
}

function jsonValue(
  value: unknown,
  label: string
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return Prisma.JsonNull;

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return Prisma.JsonNull;

    try {
      return JSON.parse(text) as Prisma.InputJsonValue;
    } catch {
      throw new ProductRouteError(`${label} must be valid JSON`);
    }
  }

  return value as Prisma.InputJsonValue;
}

function getPayloadImages(payload: PlainObject): ProductImagePayload[] {
  return Array.isArray(payload.images)
    ? payload.images.filter((image): image is ProductImagePayload => isPlainObject(image))
    : [];
}

function getPayloadVariants(payload: PlainObject): ProductVariantPayload[] {
  return Array.isArray(payload.variants)
    ? payload.variants.filter((variant): variant is ProductVariantPayload => isPlainObject(variant))
    : [];
}

function getPayloadImageAltTexts(payload: PlainObject): string[] {
  return stringArray(payload.imageAltTexts);
}

function buildImageRows(payload: PlainObject, productId: string, productName: string) {
  const imageAltTexts = getPayloadImageAltTexts(payload);

  return getPayloadImages(payload)
    .map((image, index) => {
      const url = getString(image.url);
      if (!url) return null;

      const sortOrder = nonNegativeInt(image.sortOrder, 'Image sort order', index) ?? index;
      const alt = getString(image.alt) || imageAltTexts[index] || productName;

      return {
        productId,
        url,
        alt,
        title: getString(image.title) || alt,
        sortOrder,
        isDefault: index === 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

function getVariantId(variant: ProductVariantPayload): string {
  return getString(variant.id);
}

function getVariantSku(variant: ProductVariantPayload): string {
  return getString(variant.sku);
}

function getVariantStock(variant: ProductVariantPayload): number {
  return nonNegativeInt(variant.stock ?? variant.quantity, `Variant ${getVariantSku(variant) || 'stock'}`, 0) ?? 0;
}

function getVariantColorOrShade(variant: ProductVariantPayload): string {
  return getString(variant.color) || getString(variant.shade);
}

function getVariantAttributes(variant: ProductVariantPayload): Prisma.InputJsonValue {
  const suppliedAttributes = isPlainObject(variant.attributes) ? variant.attributes : {};
  const size = getString(variant.size) || getString(suppliedAttributes.size);
  const color = getVariantColorOrShade(variant) || getString(suppliedAttributes.color);
  const shade = getString(variant.shade) || getString(suppliedAttributes.shade) || color;

  return {
    ...suppliedAttributes,
    size,
    color,
    shade,
  } as Prisma.InputJsonValue;
}

function buildVariantDisplayName(variant: ProductVariantPayload, productName: string): string {
  const explicitName = getString(variant.name);
  if (explicitName) return explicitName;

  const attributes = [getString(variant.size), getVariantColorOrShade(variant)]
    .filter(Boolean)
    .join(' / ');

  return attributes || productName;
}

function splitStoredSubcategory(value: string | null): { subcategory: string; item: string } {
  if (!value) return { subcategory: '', item: '' };

  const [subcategory, ...itemParts] = value.split(' > ');
  return {
    subcategory: subcategory?.trim() || '',
    item: itemParts.join(' > ').trim(),
  };
}

function buildStoredSubcategory(subcategory: unknown, item: unknown): string | null {
  const normalizedSubcategory = getString(subcategory);
  const normalizedItem = getString(item);

  if (!normalizedSubcategory) return null;
  return normalizedItem ? `${normalizedSubcategory} > ${normalizedItem}` : normalizedSubcategory;
}

function normalizeRelatedProducts(value: unknown): string | null {
  if (value == null || value === '') return null;

  if (Array.isArray(value)) {
    return JSON.stringify(value.map((entry) => getString(entry)).filter(Boolean));
  }

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  return JSON.stringify(value);
}

function statusFromPayload(value: unknown): 'active' | 'inactive' | 'out_of_stock' | undefined {
  const status = getString(value).toLowerCase();
  if (!status) return undefined;

  if (!['active', 'inactive', 'out_of_stock'].includes(status)) {
    throw new ProductRouteError('Status must be active, inactive, or out_of_stock');
  }

  return status as 'active' | 'inactive' | 'out_of_stock';
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  return value ? value.toNumber() : null;
}

function decimalToString(value: Prisma.Decimal | null | undefined): string {
  return value ? value.toNumber().toString() : '';
}

function jsonOrArray(value: Prisma.JsonValue | null | undefined): Prisma.JsonValue | unknown[] {
  return value ?? [];
}

function jsonOrObject(value: Prisma.JsonValue | null | undefined): Prisma.JsonValue | PlainObject {
  return value ?? {};
}

function formatProductDetail(product: ProductDetail) {
  const { subcategory, item } = splitStoredSubcategory(product.subcategory);
  const mainImage = product.images.find((image) => image.isDefault) || product.images[0];

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    shortDescription: product.shortDescription || '',
    price: product.price.toNumber(),
    originalPrice: decimalToNumber(product.compareAtPrice),
    compareAtPrice: decimalToNumber(product.compareAtPrice),
    costPrice: decimalToNumber(product.costPrice),

    image: mainImage?.url || '',
    stock: product.quantity,
    quantity: product.quantity,
    lowStockThreshold: product.lowStockThreshold,
    trackInventory: product.trackInventory,
    allowBackorder: product.allowBackorder,
    weight: decimalToNumber(product.weight),
    dimensions: {
      length: decimalToString(product.length),
      width: decimalToString(product.width),
      height: decimalToString(product.height),
    },

    isActive: product.isActive,
    isFeatured: product.isFeatured,
    featured: product.isFeatured,
    isNew: product.isNew,
    status: !product.isActive ? 'inactive' : product.quantity === 0 ? 'out_of_stock' : 'active',

    category: product.category?.name || '',
    categoryId: product.categoryId || '',
    categorySlug: product.category?.slug || '',
    brand: product.brand?.name || '',
    brandId: product.brandId || '',
    brandSlug: product.brand?.slug || '',
    subcategory,
    item,

    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt || '',
      title: image.title || '',
      sortOrder: image.sortOrder,
      isDefault: image.isDefault,
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      price: variant.price ? variant.price.toNumber() : product.price.toNumber(),
      stock: variant.quantity,
      quantity: variant.quantity,
      attributes: variant.attributes || {},
      image: variant.image || '',
      imageAlt: '',
    })),

    metaTitle: product.metaTitle || '',
    metaDescription: product.metaDescription || '',
    tags: product.metaKeywords || '',
    metaKeywords: product.metaKeywords || '',
    bengaliName: product.bengaliName || '',
    bengaliDescription: product.bengaliDescription || '',
    focusKeyword: product.focusKeyword || '',
    secondaryKeywords: product.secondaryKeywords || [],
    bengaliFocusKeyword: product.bengaliFocusKeyword || '',
    bengaliSecondaryKeywords: product.bengaliSecondaryKeywords || [],
    ogTitle: product.ogTitle || '',
    ogDescription: product.ogDescription || '',
    ogImageUrl: product.ogImageUrl || '',
    canonicalUrl: product.canonicalUrl || '',

    pageH1: product.pageH1 || '',
    seoIntro: product.seoIntro || '',
    faqSchemaNote: product.faqSchemaNote || '',
    authenticityNote: product.authenticityNote || '',
    ingredientVerificationStatus: product.ingredientVerificationStatus || '',
    seoValidationChecklist: product.seoValidationChecklist || [],

    structuredDataJsonLd: jsonOrObject(product.structuredDataJsonLd),
    productGroupJsonLd: jsonOrObject(product.productGroupJsonLd),
    merchantListingJsonLd: jsonOrObject(product.merchantListingJsonLd),
    breadcrumbJsonLd: jsonOrObject(product.breadcrumbJsonLd),
    sitemapIndexing: jsonOrObject(product.sitemapIndexing),
    variantUrlStrategy: jsonOrObject(product.variantUrlStrategy),

    searchIntent: product.searchIntent || '',
    targetAudience: product.targetAudience || '',
    primaryConcern: product.primaryConcern || '',
    keyBenefits: product.keyBenefits || [],
    buyingIntentKeywords: product.buyingIntentKeywords || [],
    searchTags: product.searchTags || [],
    synonyms: product.synonyms || [],
    banglaSearchTerms: product.banglaSearchTerms || [],
    reviewKeywords: product.reviewKeywords || [],
    entities: product.entities || [],

    descriptionSections: jsonOrArray(product.descriptionSections),
    productSpecs: jsonOrObject(product.productSpecs),
    productAttributes: jsonOrObject(product.productAttributes),
    shadeOptions: jsonOrArray(product.shadeOptions),
    variantPriceTable: jsonOrArray(product.variantPriceTable),
    variantComparisonTable: jsonOrArray(product.variantComparisonTable),
    internalLinks: jsonOrArray(product.internalLinks),
    usageInstructions: product.usageInstructions || [],
    imageAltTexts: product.imageAltTexts || [],
    faqSchemaReady: product.faqSchemaReady || false,
    gender: product.gender || '',

    skinType: product.skinType || [],
    ingredients: product.ingredients || '',
    shelfLife: product.shelfLife || '',
    expiryDate: product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '',
    originCountry: product.originCountry || 'Bangladesh (Local)',

    shippingWeight: product.shippingWeight || '',
    isFragile: product.isFragile || false,

    discountPercentage: decimalToString(product.discountPercentage),
    salePrice: decimalToString(product.salePrice),
    offerStartDate: product.offerStartDate ? product.offerStartDate.toISOString().slice(0, 16) : '',
    offerEndDate: product.offerEndDate ? product.offerEndDate.toISOString().slice(0, 16) : '',
    flashSaleEligible: product.flashSaleEligible || false,

    returnEligible: product.returnEligible !== false,
    codAvailable: product.codAvailable !== false,
    preOrderOption: product.preOrderOption || false,
    barcode: product.barcode || '',
    relatedProducts: product.relatedProducts || '',

    condition: product.condition || 'NEW',
    gtin: product.gtin || '',
    averageRating: decimalToNumber(product.averageRating) || 0,
    reviewCount: product.reviewCount || 0,
    faqs: Array.isArray(product.faqs) ? product.faqs : [],

    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function resolveProduct(idOrSlug: string) {
  return prisma.product.findFirst({
    where: { AND: [{ OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, { deletedAt: null }] },
    include: productDetailInclude,
  });
}

async function resolveUniqueSlug(rawSlug: string, name: string, excludeProductId: string): Promise<string> {
  const baseSlug = toSlug(rawSlug || name);
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const conflict = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!conflict || conflict.id === excludeProductId) return slug;

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function getOrCreateCategoryId(categoryName: string): Promise<string | null> {
  if (!categoryName) return null;

  const slug = toSlug(categoryName);
  const category = await prisma.category.upsert({
    where: { slug },
    update: { name: categoryName },
    create: { name: categoryName, slug },
    select: { id: true },
  });

  return category.id;
}

async function getOrCreateBrandId(brandName: string): Promise<string | null> {
  if (!brandName) return null;

  const slug = toSlug(brandName);
  const brand = await prisma.brand.upsert({
    where: { slug },
    update: { name: brandName },
    create: { name: brandName, slug },
    select: { id: true },
  });

  return brand.id;
}

async function assertProductSkuAvailable(sku: string, productId: string) {
  const conflict = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
  if (conflict && conflict.id !== productId) {
    throw new ProductRouteError(`Product SKU already exists: ${sku}`, 409);
  }
}

async function assertVariantSkusAvailable(
  variants: ProductVariantPayload[],
  existingVariantIds: Set<string>
) {
  const seen = new Set<string>();

  for (const variant of variants) {
    const sku = getVariantSku(variant);
    if (!sku) continue;

    if (seen.has(sku)) {
      throw new ProductRouteError(`Duplicate variant SKU: ${sku}`);
    }
    seen.add(sku);

    const conflict = await prisma.productVariant.findUnique({ where: { sku }, select: { id: true } });
    const submittedVariantId = getVariantId(variant);
    if (conflict && !(existingVariantIds.has(submittedVariantId) && conflict.id === submittedVariantId)) {
      throw new ProductRouteError(`Variant SKU already exists: ${sku}`, 409);
    }
  }
}

function resolveBasePrice(payload: PlainObject, variants: ProductVariantPayload[], fallback: Prisma.Decimal): string | undefined {
  if (hasOwn(payload, 'price')) {
    return nonNegativeDecimal(payload.price, 'Price');
  }

  const firstVariantPrice = variants[0] ? nonNegativeDecimal(variants[0].price, 'Variant price') : undefined;
  return firstVariantPrice ?? fallback.toString();
}

function validatePrices(payload: PlainObject, basePrice: string | undefined) {
  if (!basePrice) return;

  const compareAtPrice = hasOwn(payload, 'originalPrice')
    ? decimalNullable(payload.originalPrice, 'Original price')
    : hasOwn(payload, 'compareAtPrice')
      ? decimalNullable(payload.compareAtPrice, 'Compare at price')
      : undefined;

  if (compareAtPrice !== undefined && compareAtPrice !== null && Number(compareAtPrice) < Number(basePrice)) {
    throw new ProductRouteError('Compare at/original price must be greater than or equal to price');
  }

  const discountPercentage = hasOwn(payload, 'discountPercentage')
    ? decimalNullable(payload.discountPercentage, 'Discount percentage')
    : undefined;
  if (discountPercentage !== undefined && discountPercentage !== null) {
    const parsed = Number(discountPercentage);
    if (parsed < 0 || parsed > 100) {
      throw new ProductRouteError('Discount percentage must be between 0 and 100');
    }
  }
}

function dimensionsData(payload: PlainObject) {
  const dimensions = isPlainObject(payload.dimensions) ? payload.dimensions : {};

  return {
    length: hasOwn(dimensions, 'length')
      ? decimalNullable(dimensions.length, 'Length')
      : hasOwn(payload, 'length')
        ? decimalNullable(payload.length, 'Length')
        : undefined,
    width: hasOwn(dimensions, 'width')
      ? decimalNullable(dimensions.width, 'Width')
      : hasOwn(payload, 'width')
        ? decimalNullable(payload.width, 'Width')
        : undefined,
    height: hasOwn(dimensions, 'height')
      ? decimalNullable(dimensions.height, 'Height')
      : hasOwn(payload, 'height')
        ? decimalNullable(payload.height, 'Height')
        : undefined,
  };
}

function firstImageUrl(payload: PlainObject): string | undefined {
  return getPayloadImages(payload).map((image) => getString(image.url)).find(Boolean);
}

async function updateProduct(idOrSlug: string, payload: PlainObject) {
  const existing = await resolveProduct(idOrSlug);
  if (!existing) {
    throw new ProductRouteError('Product not found', 404);
  }

  const variants = getPayloadVariants(payload);
  const existingVariantIds = new Set(existing.variants.map((variant) => variant.id));
  const status = statusFromPayload(payload.status);
  const forceOutOfStock = status === 'out_of_stock';
  const basePrice = resolveBasePrice(payload, variants, existing.price);
  validatePrices(payload, basePrice);

  for (const variant of variants) {
    nonNegativeDecimal(variant.price, `Variant ${getVariantSku(variant) || 'price'}`);
    getVariantStock(variant);
  }

  if (hasOwn(payload, 'variants')) {
    await assertVariantSkusAvailable(variants, existingVariantIds);
  }

  const submittedSku = getString(payload.sku);
  if (submittedSku && submittedSku !== existing.sku) {
    await assertProductSkuAvailable(submittedSku, existing.id);
  }

  const submittedSlug = getString(payload.slug) || getString(payload.urlSlug);
  const slug = submittedSlug && submittedSlug !== existing.slug
    ? await resolveUniqueSlug(submittedSlug, getString(payload.name) || existing.name, existing.id)
    : undefined;

  const categoryId = hasOwn(payload, 'category')
    ? await getOrCreateCategoryId(getString(payload.category))
    : undefined;
  const brandId = hasOwn(payload, 'brand')
    ? await getOrCreateBrandId(getString(payload.brand))
    : undefined;

  const compareAtPrice = hasOwn(payload, 'originalPrice')
    ? decimalNullable(payload.originalPrice, 'Original price')
    : hasOwn(payload, 'compareAtPrice')
      ? decimalNullable(payload.compareAtPrice, 'Compare at price')
      : undefined;

  const offerStartDate = hasOwn(payload, 'offerStartDate')
    ? dateNullable(payload.offerStartDate, 'Offer start date')
    : undefined;
  const offerEndDate = hasOwn(payload, 'offerEndDate')
    ? dateNullable(payload.offerEndDate, 'Offer end date')
    : undefined;
  if (offerStartDate && offerEndDate && offerStartDate > offerEndDate) {
    throw new ProductRouteError('Offer start date must be before offer end date');
  }

  const submittedQuantity = hasOwn(payload, 'quantity')
    ? nonNegativeInt(payload.quantity, 'Quantity')
    : hasOwn(payload, 'stock')
      ? nonNegativeInt(payload.stock, 'Stock')
      : undefined;
  const variantStockTotal = hasOwn(payload, 'variants')
    ? variants.reduce((sum, variant) => sum + getVariantStock(variant), 0)
    : undefined;
  const quantity = forceOutOfStock ? 0 : variantStockTotal ?? submittedQuantity;

  const subcategory = hasOwn(payload, 'subcategory') || hasOwn(payload, 'item')
    ? buildStoredSubcategory(payload.subcategory, payload.item)
    : undefined;
  const dims = dimensionsData(payload);
  const fallbackOgImageUrl = !existing.ogImageUrl && hasOwn(payload, 'images') ? firstImageUrl(payload) : undefined;

  const updateData = compact({
    sku: submittedSku || undefined,
    name: hasOwn(payload, 'name') ? nullableString(payload.name) || existing.name : undefined,
    slug,
    description: hasOwn(payload, 'description') ? nullableString(payload.description) : undefined,
    shortDescription: hasOwn(payload, 'shortDescription') ? nullableString(payload.shortDescription) : undefined,
    categoryId,
    brandId,
    price: basePrice,
    compareAtPrice,
    costPrice: hasOwn(payload, 'costPrice') ? decimalNullable(payload.costPrice, 'Cost price') : undefined,

    quantity,
    lowStockThreshold: hasOwn(payload, 'lowStockThreshold')
      ? nonNegativeInt(payload.lowStockThreshold, 'Low stock threshold', existing.lowStockThreshold)
      : undefined,
    trackInventory: hasOwn(payload, 'trackInventory')
      ? booleanValue(payload.trackInventory, existing.trackInventory)
      : undefined,
    allowBackorder: hasOwn(payload, 'allowBackorder')
      ? booleanValue(payload.allowBackorder, existing.allowBackorder)
      : undefined,

    weight: hasOwn(payload, 'weight') ? decimalNullable(payload.weight, 'Weight') : undefined,
    length: dims.length,
    width: dims.width,
    height: dims.height,

    isActive: status
      ? status !== 'inactive'
      : hasOwn(payload, 'isActive')
        ? booleanValue(payload.isActive, existing.isActive)
        : undefined,
    isFeatured: hasOwn(payload, 'featured')
      ? booleanValue(payload.featured, existing.isFeatured)
      : hasOwn(payload, 'isFeatured')
        ? booleanValue(payload.isFeatured, existing.isFeatured)
        : undefined,
    isNew: hasOwn(payload, 'isNew')
      ? booleanValue(payload.isNew, existing.isNew)
      : hasOwn(payload, 'new')
        ? booleanValue(payload.new, existing.isNew)
        : undefined,

    metaTitle: hasOwn(payload, 'metaTitle') ? nullableString(payload.metaTitle) : undefined,
    metaDescription: hasOwn(payload, 'metaDescription') ? nullableString(payload.metaDescription) : undefined,
    metaKeywords: hasOwn(payload, 'tags')
      ? nullableString(payload.tags)
      : hasOwn(payload, 'metaKeywords')
        ? nullableString(payload.metaKeywords)
        : undefined,
    bengaliName: stringByKeys(payload, ['bengaliName', 'bengaliProductName']),
    bengaliDescription: stringByKeys(payload, ['bengaliDescription', 'bengaliMetaDescription']),
    focusKeyword: hasOwn(payload, 'focusKeyword') ? nullableString(payload.focusKeyword) : undefined,
    secondaryKeywords: hasOwn(payload, 'secondaryKeywords') ? stringArray(payload.secondaryKeywords) : undefined,
    bengaliFocusKeyword: hasOwn(payload, 'bengaliFocusKeyword') ? nullableString(payload.bengaliFocusKeyword) : undefined,
    bengaliSecondaryKeywords: hasOwn(payload, 'bengaliSecondaryKeywords') ? stringArray(payload.bengaliSecondaryKeywords) : undefined,
    ogTitle: hasOwn(payload, 'ogTitle') ? nullableString(payload.ogTitle) : undefined,
    ogDescription: hasOwn(payload, 'ogDescription') ? nullableString(payload.ogDescription) : undefined,
    ogImageUrl: hasOwn(payload, 'ogImageUrl') ? nullableString(payload.ogImageUrl) : fallbackOgImageUrl,
    canonicalUrl: hasOwn(payload, 'canonicalUrl') ? nullableString(payload.canonicalUrl) : undefined,

    pageH1: hasOwn(payload, 'pageH1') ? nullableString(payload.pageH1) : undefined,
    seoIntro: hasOwn(payload, 'seoIntro') ? nullableString(payload.seoIntro) : undefined,
    faqSchemaNote: hasOwn(payload, 'faqSchemaNote') ? nullableString(payload.faqSchemaNote) : undefined,
    authenticityNote: hasOwn(payload, 'authenticityNote') ? nullableString(payload.authenticityNote) : undefined,
    ingredientVerificationStatus: hasOwn(payload, 'ingredientVerificationStatus')
      ? nullableString(payload.ingredientVerificationStatus)
      : undefined,
    seoValidationChecklist: hasOwn(payload, 'seoValidationChecklist')
      ? stringArray(payload.seoValidationChecklist)
      : undefined,

    structuredDataJsonLd: hasOwn(payload, 'structuredDataJsonLd')
      ? jsonValue(payload.structuredDataJsonLd, 'Structured data JSON-LD')
      : undefined,
    productGroupJsonLd: hasOwn(payload, 'productGroupJsonLd')
      ? jsonValue(payload.productGroupJsonLd, 'Product group JSON-LD')
      : undefined,
    merchantListingJsonLd: hasOwn(payload, 'merchantListingJsonLd')
      ? jsonValue(payload.merchantListingJsonLd, 'Merchant listing JSON-LD')
      : undefined,
    breadcrumbJsonLd: hasOwn(payload, 'breadcrumbJsonLd')
      ? jsonValue(payload.breadcrumbJsonLd, 'Breadcrumb JSON-LD')
      : undefined,
    sitemapIndexing: hasOwn(payload, 'sitemapIndexing')
      ? jsonValue(payload.sitemapIndexing, 'Sitemap indexing JSON')
      : undefined,
    variantUrlStrategy: hasOwn(payload, 'variantUrlStrategy')
      ? jsonValue(payload.variantUrlStrategy, 'Variant URL strategy JSON')
      : undefined,

    searchIntent: hasOwn(payload, 'searchIntent') ? nullableString(payload.searchIntent) : undefined,
    targetAudience: hasOwn(payload, 'targetAudience') ? nullableString(payload.targetAudience) : undefined,
    primaryConcern: hasOwn(payload, 'primaryConcern') ? nullableString(payload.primaryConcern) : undefined,
    keyBenefits: hasOwn(payload, 'keyBenefits') ? stringArray(payload.keyBenefits) : undefined,
    buyingIntentKeywords: hasOwn(payload, 'buyingIntentKeywords') ? stringArray(payload.buyingIntentKeywords) : undefined,
    searchTags: hasOwn(payload, 'searchTags') ? stringArray(payload.searchTags) : undefined,
    synonyms: hasOwn(payload, 'synonyms') ? stringArray(payload.synonyms) : undefined,
    banglaSearchTerms: hasOwn(payload, 'banglaSearchTerms') ? stringArray(payload.banglaSearchTerms) : undefined,
    reviewKeywords: hasOwn(payload, 'reviewKeywords') ? stringArray(payload.reviewKeywords) : undefined,
    entities: hasOwn(payload, 'entities') ? stringArray(payload.entities) : undefined,

    descriptionSections: hasOwn(payload, 'descriptionSections')
      ? jsonValue(payload.descriptionSections, 'Description sections JSON')
      : undefined,
    productSpecs: hasOwn(payload, 'productSpecs')
      ? jsonValue(payload.productSpecs, 'Product specs JSON')
      : hasOwn(payload, 'product_specs')
        ? jsonValue(payload.product_specs, 'Product specs JSON')
        : undefined,
    productAttributes: hasOwn(payload, 'productAttributes')
      ? jsonValue(payload.productAttributes, 'Product attributes JSON')
      : hasOwn(payload, 'attributes')
        ? jsonValue(payload.attributes, 'Product attributes JSON')
        : undefined,
    shadeOptions: hasOwn(payload, 'shadeOptions') ? jsonValue(payload.shadeOptions, 'Shade options JSON') : undefined,
    variantPriceTable: hasOwn(payload, 'variantPriceTable')
      ? jsonValue(payload.variantPriceTable, 'Variant price table JSON')
      : undefined,
    variantComparisonTable: hasOwn(payload, 'variantComparisonTable')
      ? jsonValue(payload.variantComparisonTable, 'Variant comparison table JSON')
      : undefined,
    internalLinks: hasOwn(payload, 'internalLinks') ? jsonValue(payload.internalLinks, 'Internal links JSON') : undefined,
    usageInstructions: hasOwn(payload, 'usageInstructions') ? stringArray(payload.usageInstructions) : undefined,
    imageAltTexts: hasOwn(payload, 'imageAltTexts') ? stringArray(payload.imageAltTexts) : undefined,
    faqSchemaReady: hasOwn(payload, 'faqSchemaReady')
      ? booleanValue(payload.faqSchemaReady, existing.faqSchemaReady)
      : undefined,
    gender: hasOwn(payload, 'gender') ? nullableString(payload.gender) : undefined,

    subcategory,
    skinType: hasOwn(payload, 'skinType') ? stringArray(payload.skinType) : undefined,
    ingredients: hasOwn(payload, 'ingredients') ? nullableString(payload.ingredients) : undefined,
    shelfLife: hasOwn(payload, 'shelfLife') ? nullableString(payload.shelfLife) : undefined,
    expiryDate: hasOwn(payload, 'expiryDate') ? dateNullable(payload.expiryDate, 'Expiry date') : undefined,
    originCountry: hasOwn(payload, 'originCountry') ? nullableString(payload.originCountry) : undefined,

    shippingWeight: hasOwn(payload, 'shippingWeight') ? nullableString(payload.shippingWeight) : undefined,
    isFragile: hasOwn(payload, 'isFragile') ? booleanValue(payload.isFragile, existing.isFragile) : undefined,

    discountPercentage: hasOwn(payload, 'discountPercentage')
      ? decimalNullable(payload.discountPercentage, 'Discount percentage')
      : undefined,
    salePrice: hasOwn(payload, 'salePrice') ? decimalNullable(payload.salePrice, 'Sale price') : undefined,
    offerStartDate,
    offerEndDate,
    flashSaleEligible: hasOwn(payload, 'flashSaleEligible')
      ? booleanValue(payload.flashSaleEligible, existing.flashSaleEligible)
      : undefined,

    returnEligible: hasOwn(payload, 'returnEligible')
      ? booleanValue(payload.returnEligible, existing.returnEligible)
      : undefined,
    codAvailable: hasOwn(payload, 'codAvailable')
      ? booleanValue(payload.codAvailable, existing.codAvailable)
      : undefined,
    preOrderOption: hasOwn(payload, 'preOrderOption')
      ? booleanValue(payload.preOrderOption, existing.preOrderOption)
      : undefined,
    barcode: hasOwn(payload, 'barcode') ? nullableString(payload.barcode) : undefined,
    relatedProducts: hasOwn(payload, 'relatedProducts') ? normalizeRelatedProducts(payload.relatedProducts) : undefined,

    condition: hasOwn(payload, 'condition') ? nullableString(payload.condition) || 'NEW' : undefined,
    gtin: hasOwn(payload, 'gtin') ? nullableString(payload.gtin) : undefined,
    averageRating: hasOwn(payload, 'averageRating') ? decimalNullable(payload.averageRating, 'Average rating') : undefined,
    reviewCount: hasOwn(payload, 'reviewCount') ? nonNegativeInt(payload.reviewCount, 'Review count', 0) : undefined,
    faqs: hasOwn(payload, 'faqs') ? jsonValue(payload.faqs, 'FAQs JSON') : undefined,
  });

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: updateData as Prisma.ProductUncheckedUpdateInput,
    include: productDetailInclude,
  });

  if (hasOwn(payload, 'images')) {
    const imageRows = buildImageRows(payload, existing.id, updated.name);
    await prisma.productImage.deleteMany({ where: { productId: existing.id } });
    if (imageRows.length > 0) {
      await prisma.productImage.createMany({ data: imageRows });
    }
  }

  if (hasOwn(payload, 'variants')) {
    const submittedExistingVariantIds = new Set(
      variants
        .map(getVariantId)
        .filter((variantId) => existingVariantIds.has(variantId))
    );
    const removedVariantIds = existing.variants
      .map((variant) => variant.id)
      .filter((variantId) => !submittedExistingVariantIds.has(variantId));

    if (removedVariantIds.length > 0) {
      const orderedVariant = await prisma.orderItem.findFirst({
        where: { variantId: { in: removedVariantIds } },
        select: { variantId: true },
      });

      if (orderedVariant) {
        throw new ProductRouteError(
          'Cannot remove a variant that exists in order history. Set its stock to 0 instead.'
        );
      }

      await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { variantId: { in: removedVariantIds } } }),
        prisma.productVariant.deleteMany({ where: { id: { in: removedVariantIds } } }),
      ]);
    }

    for (const [index, variant] of variants.entries()) {
      const variantId = getVariantId(variant);
      const sku = getVariantSku(variant) || `${updated.sku}-V${index + 1}-${Date.now().toString(36)}`;
      const variantStock = forceOutOfStock ? 0 : getVariantStock(variant);
      const variantPrice = nonNegativeDecimal(variant.price, `Variant ${sku} price`) ?? updated.price.toString();
      const variantData = {
        productId: existing.id,
        sku,
        name: buildVariantDisplayName(variant, updated.name),
        price: variantPrice,
        quantity: variantStock,
        attributes: getVariantAttributes(variant),
        image: getString(variant.image) || null,
      };

      if (existingVariantIds.has(variantId)) {
        await prisma.productVariant.update({
          where: { id: variantId },
          data: variantData satisfies Prisma.ProductVariantUncheckedUpdateInput,
        });
      } else {
        await prisma.productVariant.create({
          data: variantData satisfies Prisma.ProductVariantUncheckedCreateInput,
        });
      }
    }

    await prisma.product.update({
      where: { id: existing.id },
      data: {
        quantity: forceOutOfStock ? 0 : variants.reduce((sum, variant) => sum + getVariantStock(variant), 0),
      },
    });
  }

  return resolveProduct(existing.id);
}

function getPrismaErrorCode(error: unknown): string | undefined {
  return isPlainObject(error) && typeof error.code === 'string' ? error.code : undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_VIEW)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const product = await resolveProduct(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product: formatProductDetail(product) });
  } catch (error) {
    console.error('GET /api/admin/products/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch product', details: message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_EDIT)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    if (!isPlainObject(body)) {
      return NextResponse.json({ error: 'Invalid product payload' }, { status: 400 });
    }

    const { id } = await params;
    const product = await updateProduct(id, body);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
      },
    });
  } catch (error) {
    if (error instanceof ProductRouteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (getPrismaErrorCode(error) === 'P2002') {
      return NextResponse.json(
        { error: 'A product, variant, slug, or SKU with the same unique value already exists.' },
        { status: 409 }
      );
    }

    console.error('PUT /api/admin/products/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update product', details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_DELETE)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.product.findFirst({
      where: { AND: [{ OR: [{ id }, { slug: id }] }, { deletedAt: null }] },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const orderItemCount = await prisma.orderItem.count({ where: { productId: existing.id } });

    if (orderItemCount > 0) {
      await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { productId: existing.id } }),
        prisma.wishlistItem.deleteMany({ where: { productId: existing.id } }),
        prisma.product.update({
          where: { id: existing.id },
          data: {
            deletedAt: new Date(),
            isActive: false,
            quantity: 0,
            isFeatured: false,
          },
        }),
      ]);

      return NextResponse.json({ success: true, archived: true });
    }

    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { productId: existing.id } }),
      prisma.wishlistItem.deleteMany({ where: { productId: existing.id } }),
      prisma.product.delete({ where: { id: existing.id } }),
    ]);

    return NextResponse.json({ success: true, archived: false });
  } catch (error) {
    if (getPrismaErrorCode(error) === 'P2002') {
      return NextResponse.json(
        { error: 'A product, variant, slug, or SKU with the same unique value already exists.' },
        { status: 409 }
      );
    }

    console.error('DELETE /api/admin/products/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete product', details: message },
      { status: 500 }
    );
  }
}
