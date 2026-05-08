import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

export class AdminProductError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AdminProductError';
    this.status = status;
  }
}

type ProductPayload = Record<string, unknown> & {
  dimensions?: {
    length?: unknown;
    width?: unknown;
    height?: unknown;
  };
  images?: ProductImagePayload[];
  variants?: ProductVariantPayload[];
};

type ProductImagePayload = {
  url?: unknown;
  alt?: unknown;
  title?: unknown;
  sortOrder?: unknown;
};

type ProductVariantPayload = {
  id?: unknown;
  sku?: unknown;
  name?: unknown;
  size?: unknown;
  color?: unknown;
  price?: unknown;
  stock?: unknown;
  quantity?: unknown;
  image?: unknown;
};

export const adminProductListInclude = {
  images: { orderBy: { sortOrder: 'asc' }, take: 3 },
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  variants: {
    select: {
      id: true,
      sku: true,
      price: true,
      quantity: true,
      attributes: true,
      image: true,
    },
    take: 10,
  },
} satisfies Prisma.ProductInclude;

export const adminProductDetailInclude = {
  images: { orderBy: { sortOrder: 'asc' } },
  category: true,
  brand: true,
  variants: { orderBy: { id: 'asc' } },
} satisfies Prisma.ProductInclude;

export type AdminProductListProduct = Prisma.ProductGetPayload<{
  include: typeof adminProductListInclude;
}>;

export type AdminProductDetailProduct = Prisma.ProductGetPayload<{
  include: typeof adminProductDetailInclude;
}>;

const allowedSkinTypes = new Map(
  [
    'Oily',
    'Dry',
    'Combination',
    'Sensitive',
    'Normal',
    'All Skin Types',
  ].map((value) => [value.toLowerCase(), value])
);

function asPayload(value: unknown): ProductPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as ProductPayload;
}

function hasOwn(payload: ProductPayload, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function getPayloadString(payload: ProductPayload, key: string): string | undefined {
  return getString(payload[key]);
}

function getBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }

  return fallback;
}

function toOptionalNumber(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateOptionalNumber(value: unknown, label: string): string | null {
  if (value == null || value === '') {
    return null;
  }

  return toOptionalNumber(value) == null ? `${label} must be a valid number` : null;
}

function parseDate(value: unknown, label: string): Date | null {
  if (value == null || value === '') {
    return null;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new AdminProductError(`${label} must be a valid date`);
  }

  return date;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getVariantSku(variant: ProductVariantPayload): string {
  return getString(variant.sku) || '';
}

function getVariantId(variant: ProductVariantPayload): string {
  return getString(variant.id) || '';
}

function getPayloadVariants(payload: ProductPayload): ProductVariantPayload[] {
  return Array.isArray(payload.variants)
    ? payload.variants.filter((variant): variant is ProductVariantPayload =>
        Boolean(variant && typeof variant === 'object' && !Array.isArray(variant))
      )
    : [];
}

function getPayloadImages(payload: ProductPayload): ProductImagePayload[] {
  return Array.isArray(payload.images)
    ? payload.images.filter((image): image is ProductImagePayload =>
        Boolean(image && typeof image === 'object' && !Array.isArray(image))
      )
    : [];
}

function resolveBasePrice(payload: ProductPayload, fallback = 0): number {
  const directPrice = toOptionalNumber(payload.price);
  if (directPrice != null) {
    return directPrice;
  }

  const firstVariantPrice = toOptionalNumber(getPayloadVariants(payload)[0]?.price);
  return firstVariantPrice != null ? firstVariantPrice : fallback;
}

function resolveCompareAtPrice(payload: ProductPayload): number | null {
  if (hasOwn(payload, 'originalPrice')) {
    return toOptionalNumber(payload.originalPrice);
  }

  if (hasOwn(payload, 'compareAtPrice')) {
    return toOptionalNumber(payload.compareAtPrice);
  }

  return null;
}

function normalizeSkinTypes(value: unknown, fallback: string[]): string[] {
  if (value === undefined) {
    return fallback;
  }

  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const normalized = rawValues.map((rawValue) => {
    const normalizedValue = String(rawValue).trim().toLowerCase();
    return allowedSkinTypes.get(normalizedValue);
  });

  const invalid = normalized.findIndex((skinType) => !skinType);
  if (invalid !== -1) {
    throw new AdminProductError('Skin type contains an unsupported value');
  }

  return [...new Set(normalized.filter((skinType): skinType is string => Boolean(skinType)))];
}

function normalizeRelatedProducts(value: unknown, fallback: string | null): string | null {
  if (value === undefined) {
    return fallback;
  }

  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value.map((entry) => String(entry).trim()).filter(Boolean));
  }

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  return JSON.stringify(value);
}

function buildStoredSubcategory(subcategory: unknown, item: unknown): string | null {
  const normalizedSubcategory = getString(subcategory) || '';
  const normalizedItem = getString(item) || '';

  if (!normalizedSubcategory) {
    return null;
  }

  return normalizedItem
    ? `${normalizedSubcategory} > ${normalizedItem}`
    : normalizedSubcategory;
}

export function splitStoredSubcategory(value: string | null): { subcategory: string; item: string } {
  if (!value) {
    return { subcategory: '', item: '' };
  }

  const [subcategory, ...itemParts] = value.split(' > ');
  return {
    subcategory: subcategory?.trim() || '',
    item: itemParts.join(' > ').trim(),
  };
}

function validateProductPayload(payload: ProductPayload, fallbackPrice = 0): void {
  const numericValidationError =
    validateOptionalNumber(payload.weight, 'Weight') ||
    validateOptionalNumber(payload.dimensions?.length, 'Length') ||
    validateOptionalNumber(payload.dimensions?.width, 'Width') ||
    validateOptionalNumber(payload.dimensions?.height, 'Height') ||
    validateOptionalNumber(payload.originalPrice, 'Original price') ||
    validateOptionalNumber(payload.compareAtPrice, 'Compare at price') ||
    validateOptionalNumber(payload.salePrice, 'Sale price') ||
    validateOptionalNumber(payload.discountPercentage, 'Discount percentage');

  if (numericValidationError) {
    throw new AdminProductError(numericValidationError);
  }

  const basePrice = resolveBasePrice(payload, fallbackPrice);
  if (basePrice < 0) {
    throw new AdminProductError('Price must be 0 or greater');
  }

  const stock = toOptionalNumber(payload.stock ?? payload.quantity);
  if (stock != null && stock < 0) {
    throw new AdminProductError('Stock cannot be negative');
  }

  const dimensionValues = [
    ['Length', payload.dimensions?.length],
    ['Width', payload.dimensions?.width],
    ['Height', payload.dimensions?.height],
    ['Weight', payload.weight],
  ] as const;
  const negativeDimension = dimensionValues.find(([, value]) => {
    const parsed = toOptionalNumber(value);
    return parsed != null && parsed < 0;
  });
  if (negativeDimension) {
    throw new AdminProductError(`${negativeDimension[0]} cannot be negative`);
  }

  const compareAtPrice = resolveCompareAtPrice(payload);
  if (compareAtPrice != null && compareAtPrice < basePrice) {
    throw new AdminProductError('Compare at/original price must be greater than or equal to price');
  }

  const offerStartDate = parseDate(payload.offerStartDate, 'Offer start date');
  const offerEndDate = parseDate(payload.offerEndDate, 'Offer end date');
  if (offerStartDate && offerEndDate && offerStartDate > offerEndDate) {
    throw new AdminProductError('Offer start date must be before offer end date');
  }

  normalizeSkinTypes(payload.skinType, []);

  const discountPercentage = toOptionalNumber(payload.discountPercentage);
  if (discountPercentage != null && (discountPercentage < 0 || discountPercentage > 100)) {
    throw new AdminProductError('Discount percentage must be between 0 and 100');
  }
}

function getStatus(payload: ProductPayload): string | null {
  const status = getPayloadString(payload, 'status');
  if (!status) {
    return null;
  }

  if (!['active', 'inactive', 'out_of_stock'].includes(status)) {
    throw new AdminProductError('Status must be active, inactive, or out_of_stock');
  }

  return status;
}

function getTotalStock(payload: ProductPayload, fallback = 0): number {
  const variants = getPayloadVariants(payload);
  if (variants.length > 0) {
    return variants.reduce((sum, variant) => {
      const stock = toOptionalNumber(variant.stock ?? variant.quantity) ?? 0;
      return sum + Math.trunc(stock);
    }, 0);
  }

  const stock = toOptionalNumber(payload.stock ?? payload.quantity);
  return stock != null ? Math.trunc(stock) : fallback;
}

function validateVariantValues(variants: ProductVariantPayload[]): void {
  for (const variant of variants) {
    const sku = getVariantSku(variant);
    const price = toOptionalNumber(variant.price);
    const stock = toOptionalNumber(variant.stock ?? variant.quantity);

    if (price == null || price < 0) {
      throw new AdminProductError(`Variant ${sku || 'unnamed'} must have a valid price`);
    }

    if (stock == null || stock < 0) {
      throw new AdminProductError(`Variant ${sku || 'unnamed'} must have a valid stock value`);
    }
  }
}

async function validateVariantSkuConflicts(
  variants: ProductVariantPayload[],
  existingVariantIds = new Set<string>()
): Promise<void> {
  const seen = new Set<string>();

  for (const variant of variants) {
    const sku = getVariantSku(variant);
    const id = getVariantId(variant);
    if (!sku) {
      continue;
    }

    if (seen.has(sku)) {
      throw new AdminProductError(`Duplicate variant SKU: ${sku}`);
    }
    seen.add(sku);

    const conflict = await prisma.productVariant.findUnique({
      where: { sku },
      select: { id: true },
    });

    if (conflict && !(existingVariantIds.has(id) && conflict.id === id)) {
      throw new AdminProductError(`Variant SKU already exists: ${sku}`);
    }
  }
}

async function resolveCategoryId(value: unknown, fallback: string | null): Promise<string | null> {
  const category = getString(value);
  if (!category) {
    return fallback;
  }

  const categorySlug = slugify(category);
  const found = await prisma.category.findFirst({
    where: {
      OR: [
        { name: { equals: category, mode: 'insensitive' } },
        { slug: category },
        { slug: categorySlug },
      ],
    },
    select: { id: true },
  });

  return found?.id ?? fallback;
}

async function resolveBrandId(value: unknown, fallback: string | null): Promise<string | null> {
  const brandName = getString(value);
  if (!brandName) {
    return fallback;
  }

  const brandSlug = slugify(brandName);
  const existing = await prisma.brand.findFirst({
    where: {
      OR: [
        { name: { equals: brandName, mode: 'insensitive' } },
        { slug: brandName },
        { slug: brandSlug },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.brand.create({
    data: {
      name: brandName,
      slug: brandSlug || `brand-${Date.now()}`,
      isActive: true,
    },
    select: { id: true },
  });

  return created.id;
}

async function resolveUniqueSlug(baseSlug: string, excludeProductId?: string): Promise<string> {
  const normalizedBase = slugify(baseSlug) || `product-${Date.now()}`;
  let slug = normalizedBase;
  let suffix = 1;

  while (true) {
    const conflict = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!conflict || conflict.id === excludeProductId) {
      return slug;
    }

    slug = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }
}

async function assertProductSkuAvailable(sku: string, excludeProductId?: string): Promise<void> {
  const conflict = await prisma.product.findUnique({
    where: { sku },
    select: { id: true },
  });

  if (conflict && conflict.id !== excludeProductId) {
    throw new AdminProductError(`Product SKU already exists: ${sku}`);
  }
}

function buildVariantAttributes(variant: ProductVariantPayload): Prisma.InputJsonValue {
  return {
    size: getString(variant.size) || '',
    color: getString(variant.color) || '',
  };
}

function buildImageRows(payload: ProductPayload, productId: string, productName: string) {
  return getPayloadImages(payload)
    .map((image, index) => {
      const url = getString(image.url);
      if (!url) {
        return null;
      }

      const sortOrder = toOptionalNumber(image.sortOrder);
      const alt = getString(image.alt) || productName;

      return {
        productId,
        url,
        alt,
        title: getString(image.title) || alt,
        sortOrder: sortOrder != null ? Math.trunc(sortOrder) : index,
        isDefault: index === 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

function getIsNew(payload: ProductPayload, fallback: boolean): boolean {
  if (hasOwn(payload, 'isNew')) {
    return getBoolean(payload.isNew, fallback);
  }

  if (hasOwn(payload, 'new')) {
    return getBoolean(payload.new, fallback);
  }

  return fallback;
}

export function buildAdminProductWhere(searchParams: URLSearchParams): Prisma.ProductWhereInput {
  const search = searchParams.get('search')?.trim() || '';
  const category = searchParams.get('category')?.trim() || '';
  const status = searchParams.get('status')?.trim() || '';
  const includeDeleted = searchParams.get('includeDeleted') === 'true';

  const where: Prisma.ProductWhereInput = includeDeleted ? {} : { deletedAt: null };

  if (category && category !== 'All Categories') {
    const categorySlug = slugify(category);
    where.category = {
      OR: [
        { name: { contains: category, mode: 'insensitive' } },
        { slug: category },
        { slug: categorySlug },
      ],
    };
  }

  if (status) {
    if (status === 'active') {
      where.isActive = true;
      where.quantity = { gt: 0 };
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'out_of_stock') {
      where.isActive = true;
      where.quantity = 0;
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { shortDescription: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { category: { name: { contains: search, mode: 'insensitive' } } },
      { brand: { name: { contains: search, mode: 'insensitive' } } },
      { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  return where;
}

export function buildAdminProductOrderBy(searchParams: URLSearchParams): Prisma.ProductOrderByWithRelationInput {
  const sortBy = searchParams.get('sortBy') || 'created';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  if (sortBy === 'name') return { name: sortOrder };
  if (sortBy === 'price' || sortBy === 'price_low') return { price: 'asc' };
  if (sortBy === 'price_high') return { price: 'desc' };
  if (sortBy === 'stock') return { quantity: sortOrder };
  if (sortBy === 'rating') return { averageRating: sortOrder };
  if (sortBy === 'updated') return { updatedAt: sortOrder };

  return { createdAt: sortOrder };
}

export function formatAdminProductListItem(product: AdminProductListProduct) {
  const mainImage = product.images.find((image) => image.isDefault) || product.images[0];

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    description: product.description || '',
    shortDescription: product.shortDescription || '',
    price: product.price.toNumber(),
    originalPrice: product.compareAtPrice ? product.compareAtPrice.toNumber() : null,
    compareAtPrice: product.compareAtPrice ? product.compareAtPrice.toNumber() : null,
    salePrice: product.salePrice ? product.salePrice.toNumber() : null,
    costPrice: product.costPrice ? product.costPrice.toNumber() : null,
    discountPercentage: product.discountPercentage ? product.discountPercentage.toNumber() : null,
    image: mainImage?.url || '',
    images: product.images.map((image) => ({
      url: image.url,
      alt: image.alt || product.name,
      title: image.title || product.name,
      sortOrder: image.sortOrder,
      isDefault: image.isDefault,
    })),
    stock: product.quantity,
    quantity: product.quantity,
    lowStockThreshold: product.lowStockThreshold,
    trackInventory: product.trackInventory,
    allowBackorder: product.allowBackorder,
    category: product.category?.name || '',
    categoryId: product.categoryId || '',
    categorySlug: product.category?.slug || '',
    brand: product.brand?.name || '',
    brandId: product.brandId || '',
    brandSlug: product.brand?.slug || '',
    subcategory: product.subcategory || '',
    rating: product.averageRating?.toNumber() || 0,
    reviews: product.reviewCount || 0,
    reviewCount: product.reviewCount || 0,
    averageRating: product.averageRating?.toNumber() || 0,
    inStock: product.quantity > 0,
    isNew: product.isNew,
    isFeatured: product.isFeatured,
    featured: product.isFeatured,
    status: !product.isActive ? 'inactive' : product.quantity === 0 ? 'out_of_stock' : 'active',
    codAvailable: product.codAvailable,
    returnEligible: product.returnEligible,
    preOrderOption: product.preOrderOption,
    barcode: product.barcode || '',
    condition: product.condition || 'NEW',
    gtin: product.gtin || '',
    flashSaleEligible: product.flashSaleEligible,
    offerStartDate: product.offerStartDate ? product.offerStartDate.toISOString() : null,
    offerEndDate: product.offerEndDate ? product.offerEndDate.toISOString() : null,
    originCountry: product.originCountry || 'Bangladesh (Local)',
    shippingWeight: product.shippingWeight || '',
    isFragile: product.isFragile,
    relatedProducts: product.relatedProducts || '',
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      price: variant.price?.toNumber() ?? product.price.toNumber(),
      stock: variant.quantity,
      quantity: variant.quantity,
      attributes: variant.attributes || {},
      image: variant.image || '',
    })),
  };
}

export function formatAdminProductDetail(product: AdminProductDetailProduct) {
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
    originalPrice: product.compareAtPrice ? product.compareAtPrice.toNumber() : null,
    compareAtPrice: product.compareAtPrice ? product.compareAtPrice.toNumber() : null,
    costPrice: product.costPrice ? product.costPrice.toNumber() : null,
    image: mainImage?.url || '',
    stock: product.quantity,
    quantity: product.quantity,
    lowStockThreshold: product.lowStockThreshold,
    trackInventory: product.trackInventory,
    allowBackorder: product.allowBackorder,
    weight: product.weight ? product.weight.toNumber() : null,
    dimensions: {
      length: product.length ? product.length.toNumber().toString() : '',
      width: product.width ? product.width.toNumber().toString() : '',
      height: product.height ? product.height.toNumber().toString() : '',
    },
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    status: !product.isActive ? 'inactive' : product.quantity === 0 ? 'out_of_stock' : 'active',
    featured: product.isFeatured,
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
    ogTitle: product.ogTitle || '',
    ogImageUrl: product.ogImageUrl || '',
    canonicalUrl: product.canonicalUrl || '',
    condition: product.condition || 'NEW',
    gtin: product.gtin || '',
    averageRating: product.averageRating ? product.averageRating.toNumber() : 0,
    reviewCount: product.reviewCount || 0,
    skinType: product.skinType || [],
    ingredients: product.ingredients || '',
    shelfLife: product.shelfLife || '',
    expiryDate: product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '',
    originCountry: product.originCountry || 'Bangladesh (Local)',
    shippingWeight: product.shippingWeight || '',
    isFragile: product.isFragile || false,
    discountPercentage: product.discountPercentage ? product.discountPercentage.toNumber().toString() : '',
    salePrice: product.salePrice ? product.salePrice.toNumber().toString() : '',
    offerStartDate: product.offerStartDate ? product.offerStartDate.toISOString().slice(0, 16) : '',
    offerEndDate: product.offerEndDate ? product.offerEndDate.toISOString().slice(0, 16) : '',
    flashSaleEligible: product.flashSaleEligible || false,
    returnEligible: product.returnEligible !== false,
    codAvailable: product.codAvailable !== false,
    preOrderOption: product.preOrderOption || false,
    barcode: product.barcode || '',
    relatedProducts: product.relatedProducts || '',
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function createAdminProduct(input: unknown) {
  const payload = asPayload(input);
  const name = getPayloadString(payload, 'name');

  if (!name) {
    throw new AdminProductError('Product name is required');
  }

  validateProductPayload(payload);

  const variants = getPayloadVariants(payload);
  validateVariantValues(variants);
  await validateVariantSkuConflicts(variants);

  const [categoryId, brandId] = await Promise.all([
    resolveCategoryId(payload.category, null),
    resolveBrandId(payload.brand, null),
  ]);

  const slug = await resolveUniqueSlug(getPayloadString(payload, 'urlSlug') || getPayloadString(payload, 'slug') || name);
  const requestedStatus = getStatus(payload);
  const forceOutOfStock = requestedStatus === 'out_of_stock';
  const basePrice = resolveBasePrice(payload);
  const compareAtPrice = resolveCompareAtPrice(payload);
  const productSku = getPayloadString(payload, 'sku') || getVariantSku(variants[0]) || `MB-${Date.now()}`;

  await assertProductSkuAvailable(productSku);

  const totalStock = forceOutOfStock ? 0 : getTotalStock(payload);
  const storedSubcategory = buildStoredSubcategory(payload.subcategory, payload.item);

  const product = await prisma.product.create({
    data: {
      sku: productSku,
      name,
      slug,
      description: getPayloadString(payload, 'description') || null,
      shortDescription: getPayloadString(payload, 'shortDescription') || null,
      price: basePrice,
      compareAtPrice,
      costPrice: toOptionalNumber(payload.costPrice),
      quantity: totalStock,
      lowStockThreshold: toOptionalNumber(payload.lowStockThreshold) ?? 5,
      trackInventory: getBoolean(payload.trackInventory, true),
      allowBackorder: getBoolean(payload.allowBackorder, false),
      weight: toOptionalNumber(payload.weight),
      length: toOptionalNumber(payload.dimensions?.length),
      width: toOptionalNumber(payload.dimensions?.width),
      height: toOptionalNumber(payload.dimensions?.height),
      isActive: requestedStatus !== 'inactive',
      isFeatured: getBoolean(payload.featured ?? payload.isFeatured, false),
      isNew: getIsNew(payload, false),
      categoryId,
      brandId,
      metaTitle: getPayloadString(payload, 'metaTitle') || null,
      metaDescription: getPayloadString(payload, 'metaDescription') || null,
      metaKeywords: getPayloadString(payload, 'tags') || getPayloadString(payload, 'metaKeywords') || null,
      bengaliName: getPayloadString(payload, 'bengaliName') || null,
      bengaliDescription: getPayloadString(payload, 'bengaliDescription') || null,
      focusKeyword: getPayloadString(payload, 'focusKeyword') || null,
      ogTitle: getPayloadString(payload, 'ogTitle') || null,
      ogImageUrl: getPayloadString(payload, 'ogImageUrl') || null,
      canonicalUrl: getPayloadString(payload, 'canonicalUrl') || null,
      subcategory: storedSubcategory,
      skinType: normalizeSkinTypes(payload.skinType, []),
      ingredients: getPayloadString(payload, 'ingredients') || null,
      shelfLife: getPayloadString(payload, 'shelfLife') || null,
      expiryDate: parseDate(payload.expiryDate, 'Expiry date'),
      originCountry: getPayloadString(payload, 'originCountry') || 'Bangladesh (Local)',
      shippingWeight: getPayloadString(payload, 'shippingWeight') || null,
      isFragile: getBoolean(payload.isFragile, false),
      discountPercentage: toOptionalNumber(payload.discountPercentage),
      salePrice: toOptionalNumber(payload.salePrice),
      offerStartDate: parseDate(payload.offerStartDate, 'Offer start date'),
      offerEndDate: parseDate(payload.offerEndDate, 'Offer end date'),
      flashSaleEligible: getBoolean(payload.flashSaleEligible, false),
      returnEligible: getBoolean(payload.returnEligible, true),
      codAvailable: getBoolean(payload.codAvailable, true),
      preOrderOption: getBoolean(payload.preOrderOption, false),
      barcode: getPayloadString(payload, 'barcode') || null,
      relatedProducts: normalizeRelatedProducts(payload.relatedProducts, null),
      condition: getPayloadString(payload, 'condition') || 'NEW',
      gtin: getPayloadString(payload, 'gtin') || null,
      averageRating: toOptionalNumber(payload.averageRating),
      reviewCount: Math.max(0, Math.trunc(toOptionalNumber(payload.reviewCount) ?? 0)),
    } satisfies Prisma.ProductUncheckedCreateInput,
  });

  const imageRows = buildImageRows(payload, product.id, product.name);
  if (imageRows.length > 0) {
    await prisma.productImage.createMany({ data: imageRows });
  }

  if (variants.length > 0) {
    await prisma.productVariant.createMany({
      data: variants.map((variant, index) => {
        const sku = getVariantSku(variant) || `${product.sku}-V${index + 1}-${Date.now()}`;
        const price = toOptionalNumber(variant.price) ?? basePrice;
        const stock = forceOutOfStock
          ? 0
          : Math.max(0, Math.trunc(toOptionalNumber(variant.stock ?? variant.quantity) ?? 0));

        return {
          productId: product.id,
          sku,
          name: getString(variant.name) || getString(variant.size) || getString(variant.color) || name,
          price,
          quantity: stock,
          attributes: buildVariantAttributes(variant),
          image: getString(variant.image) || null,
        };
      }),
    });
  }

  return product;
}

export async function updateAdminProduct(idOrSlug: string, input: unknown) {
  const payload = asPayload(input);
  const existing = await prisma.product.findFirst({
    where: { AND: [{ OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, { deletedAt: null }] },
    include: { variants: true, images: true },
  });

  if (!existing) {
    throw new AdminProductError('Product not found', 404);
  }

  validateProductPayload(payload, existing.price.toNumber());

  const requestedStatus = getStatus(payload);
  const forceOutOfStock = requestedStatus === 'out_of_stock';
  const variants = getPayloadVariants(payload);
  const existingVariantIds = new Set(existing.variants.map((variant) => variant.id));

  if (hasOwn(payload, 'variants')) {
    validateVariantValues(variants);
    await validateVariantSkuConflicts(variants, existingVariantIds);
  }

  let sku = existing.sku;
  const submittedSku = getPayloadString(payload, 'sku');
  if (submittedSku && submittedSku !== existing.sku) {
    await assertProductSkuAvailable(submittedSku, existing.id);
    sku = submittedSku;
  }

  let slug = existing.slug;
  const submittedSlug = getPayloadString(payload, 'slug') || getPayloadString(payload, 'urlSlug');
  if (submittedSlug && submittedSlug !== existing.slug) {
    slug = await resolveUniqueSlug(submittedSlug, existing.id);
  }

  const [categoryId, brandId] = await Promise.all([
    hasOwn(payload, 'category') ? resolveCategoryId(payload.category, existing.categoryId) : Promise.resolve(existing.categoryId),
    hasOwn(payload, 'brand') ? resolveBrandId(payload.brand, existing.brandId) : Promise.resolve(existing.brandId),
  ]);

  const basePrice = resolveBasePrice(payload, existing.price.toNumber());
  const compareAtPrice = hasOwn(payload, 'originalPrice') || hasOwn(payload, 'compareAtPrice')
    ? resolveCompareAtPrice(payload)
    : existing.compareAtPrice;
  const quantity = forceOutOfStock ? 0 : getTotalStock(payload, existing.quantity);
  const storedSubcategory = hasOwn(payload, 'subcategory') || hasOwn(payload, 'item')
    ? buildStoredSubcategory(payload.subcategory, payload.item)
    : existing.subcategory;

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: {
      sku,
      name: getPayloadString(payload, 'name') || existing.name,
      slug,
      description: hasOwn(payload, 'description') ? getPayloadString(payload, 'description') || null : existing.description,
      shortDescription: hasOwn(payload, 'shortDescription') ? getPayloadString(payload, 'shortDescription') || null : existing.shortDescription,
      categoryId,
      brandId,
      price: basePrice,
      compareAtPrice,
      costPrice: hasOwn(payload, 'costPrice') ? toOptionalNumber(payload.costPrice) : existing.costPrice,
      trackInventory: hasOwn(payload, 'trackInventory')
        ? getBoolean(payload.trackInventory, existing.trackInventory)
        : existing.trackInventory,
      allowBackorder: hasOwn(payload, 'allowBackorder')
        ? getBoolean(payload.allowBackorder, existing.allowBackorder)
        : existing.allowBackorder,
      lowStockThreshold: hasOwn(payload, 'lowStockThreshold')
        ? Math.max(0, Math.trunc(toOptionalNumber(payload.lowStockThreshold) ?? existing.lowStockThreshold))
        : existing.lowStockThreshold,
      weight: hasOwn(payload, 'weight') ? toOptionalNumber(payload.weight) : existing.weight,
      length: hasOwn(payload.dimensions || {}, 'length') ? toOptionalNumber(payload.dimensions?.length) : existing.length,
      width: hasOwn(payload.dimensions || {}, 'width') ? toOptionalNumber(payload.dimensions?.width) : existing.width,
      height: hasOwn(payload.dimensions || {}, 'height') ? toOptionalNumber(payload.dimensions?.height) : existing.height,
      quantity,
      isActive: requestedStatus ? requestedStatus !== 'inactive' : existing.isActive,
      isFeatured: hasOwn(payload, 'featured') || hasOwn(payload, 'isFeatured')
        ? getBoolean(payload.featured ?? payload.isFeatured, existing.isFeatured)
        : existing.isFeatured,
      isNew: getIsNew(payload, existing.isNew),
      metaTitle: hasOwn(payload, 'metaTitle') ? getPayloadString(payload, 'metaTitle') || null : existing.metaTitle,
      metaDescription: hasOwn(payload, 'metaDescription') ? getPayloadString(payload, 'metaDescription') || null : existing.metaDescription,
      metaKeywords: hasOwn(payload, 'tags') || hasOwn(payload, 'metaKeywords')
        ? getPayloadString(payload, 'tags') || getPayloadString(payload, 'metaKeywords') || null
        : existing.metaKeywords,
      bengaliName: hasOwn(payload, 'bengaliName') ? getPayloadString(payload, 'bengaliName') || null : existing.bengaliName,
      bengaliDescription: hasOwn(payload, 'bengaliDescription') ? getPayloadString(payload, 'bengaliDescription') || null : existing.bengaliDescription,
      focusKeyword: hasOwn(payload, 'focusKeyword') ? getPayloadString(payload, 'focusKeyword') || null : existing.focusKeyword,
      ogTitle: hasOwn(payload, 'ogTitle') ? getPayloadString(payload, 'ogTitle') || null : existing.ogTitle,
      ogImageUrl: hasOwn(payload, 'ogImageUrl') ? getPayloadString(payload, 'ogImageUrl') || null : existing.ogImageUrl,
      canonicalUrl: hasOwn(payload, 'canonicalUrl') ? getPayloadString(payload, 'canonicalUrl') || null : existing.canonicalUrl,
      subcategory: storedSubcategory,
      skinType: hasOwn(payload, 'skinType') ? normalizeSkinTypes(payload.skinType, existing.skinType) : existing.skinType,
      ingredients: hasOwn(payload, 'ingredients') ? getPayloadString(payload, 'ingredients') || null : existing.ingredients,
      shelfLife: hasOwn(payload, 'shelfLife') ? getPayloadString(payload, 'shelfLife') || null : existing.shelfLife,
      expiryDate: hasOwn(payload, 'expiryDate') ? parseDate(payload.expiryDate, 'Expiry date') : existing.expiryDate,
      originCountry: hasOwn(payload, 'originCountry') ? getPayloadString(payload, 'originCountry') || null : existing.originCountry,
      shippingWeight: hasOwn(payload, 'shippingWeight') ? getPayloadString(payload, 'shippingWeight') || null : existing.shippingWeight,
      isFragile: hasOwn(payload, 'isFragile') ? getBoolean(payload.isFragile, existing.isFragile) : existing.isFragile,
      discountPercentage: hasOwn(payload, 'discountPercentage') ? toOptionalNumber(payload.discountPercentage) : existing.discountPercentage,
      salePrice: hasOwn(payload, 'salePrice') ? toOptionalNumber(payload.salePrice) : existing.salePrice,
      offerStartDate: hasOwn(payload, 'offerStartDate') ? parseDate(payload.offerStartDate, 'Offer start date') : existing.offerStartDate,
      offerEndDate: hasOwn(payload, 'offerEndDate') ? parseDate(payload.offerEndDate, 'Offer end date') : existing.offerEndDate,
      flashSaleEligible: hasOwn(payload, 'flashSaleEligible')
        ? getBoolean(payload.flashSaleEligible, existing.flashSaleEligible)
        : existing.flashSaleEligible,
      returnEligible: hasOwn(payload, 'returnEligible') ? getBoolean(payload.returnEligible, existing.returnEligible) : existing.returnEligible,
      codAvailable: hasOwn(payload, 'codAvailable') ? getBoolean(payload.codAvailable, existing.codAvailable) : existing.codAvailable,
      preOrderOption: hasOwn(payload, 'preOrderOption') ? getBoolean(payload.preOrderOption, existing.preOrderOption) : existing.preOrderOption,
      barcode: hasOwn(payload, 'barcode') ? getPayloadString(payload, 'barcode') || null : existing.barcode,
      relatedProducts: normalizeRelatedProducts(payload.relatedProducts, existing.relatedProducts),
      condition: hasOwn(payload, 'condition') ? getPayloadString(payload, 'condition') || 'NEW' : existing.condition,
      gtin: hasOwn(payload, 'gtin') ? getPayloadString(payload, 'gtin') || null : existing.gtin,
      averageRating: hasOwn(payload, 'averageRating') ? toOptionalNumber(payload.averageRating) : existing.averageRating,
      reviewCount: hasOwn(payload, 'reviewCount')
        ? Math.max(0, Math.trunc(toOptionalNumber(payload.reviewCount) ?? 0))
        : existing.reviewCount,
    } satisfies Prisma.ProductUncheckedUpdateInput,
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
        throw new AdminProductError(
          'Cannot remove a variant that exists in order history. Set its stock to 0 instead.'
        );
      }

      await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { variantId: { in: removedVariantIds } } }),
        prisma.productVariant.deleteMany({ where: { id: { in: removedVariantIds } } }),
      ]);
    }

    for (const variant of variants) {
      const variantId = getVariantId(variant);
      const variantSku = getVariantSku(variant) || `${updated.sku}-V${Date.now()}`;
      const variantStock = forceOutOfStock
        ? 0
        : Math.max(0, Math.trunc(toOptionalNumber(variant.stock ?? variant.quantity) ?? 0));
      const variantData = {
        productId: existing.id,
        name: getString(variant.name) || getString(variant.size) || getString(variant.color) || updated.name,
        sku: variantSku,
        price: toOptionalNumber(variant.price) ?? updated.price,
        quantity: variantStock,
        attributes: buildVariantAttributes(variant),
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

    const totalStock = forceOutOfStock
      ? 0
      : variants.reduce((sum, variant) => {
          return sum + Math.max(0, Math.trunc(toOptionalNumber(variant.stock ?? variant.quantity) ?? 0));
        }, 0);

    await prisma.product.update({
      where: { id: existing.id },
      data: { quantity: totalStock },
    });
  }

  return updated;
}

export async function deleteAdminProduct(idOrSlug: string): Promise<{ archived: boolean }> {
  const existing = await prisma.product.findFirst({
    where: { AND: [{ OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, { deletedAt: null }] },
  });

  if (!existing) {
    throw new AdminProductError('Product not found', 404);
  }

  const orderItemCount = await prisma.orderItem.count({ where: { productId: existing.id } });

  if (orderItemCount > 0) {
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { productId: existing.id } }),
      prisma.wishlistItem.deleteMany({ where: { productId: existing.id } }),
      prisma.product.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), isActive: false, quantity: 0, isFeatured: false },
      }),
    ]);

    return { archived: true };
  }

  await prisma.product.delete({ where: { id: existing.id } });
  return { archived: false };
}
