import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';
import {
  adminProductListInclude,
  buildAdminProductOrderBy,
  buildAdminProductWhere,
  formatAdminProductListItem,
} from '@/lib/admin-products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PlainObject = Record<string, unknown>;

class ProductRouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function getPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '25', 10);
  const limit = Math.min(200, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 25));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function optionalString(value: unknown): string | undefined {
  const text = getString(value);
  return text ? text : undefined;
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

function decimalValue(value: unknown): string | undefined {
  const text = getString(value).replace(/,/g, '');
  if (!text) return undefined;

  const number = Number(text);
  if (!Number.isFinite(number)) return undefined;

  return text;
}

function intValue(value: unknown, fallback?: number): number | undefined {
  const text = getString(value);
  if (!text) return fallback;

  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'active'].includes(normalized)) return true;
    if (['false', '0', 'no', 'inactive'].includes(normalized)) return false;
  }
  return fallback;
}

function dateValue(value: unknown): Date | undefined {
  const text = getString(value);
  if (!text) return undefined;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => getString(entry)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function jsonValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return value;

  const text = value.trim();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function getUniqueProductSlug(rawSlug: string, name: string): Promise<string> {
  const baseSlug = toSlug(rawSlug || name);
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function getOrCreateCategoryId(categoryName: string): Promise<string | undefined> {
  if (!categoryName) return undefined;

  const slug = toSlug(categoryName);
  const category = await prisma.category.upsert({
    where: { slug },
    update: { name: categoryName },
    create: { name: categoryName, slug },
    select: { id: true },
  });

  return category.id;
}

async function getOrCreateBrandId(brandName: string): Promise<string | undefined> {
  if (!brandName) return undefined;

  const slug = toSlug(brandName);
  const brand = await prisma.brand.upsert({
    where: { slug },
    update: { name: brandName },
    create: { name: brandName, slug },
    select: { id: true },
  });

  return brand.id;
}

function getRawVariants(body: PlainObject): PlainObject[] {
  return Array.isArray(body.variants)
    ? body.variants.filter(isPlainObject)
    : [];
}

function getRawImages(body: PlainObject): PlainObject[] {
  return Array.isArray(body.images)
    ? body.images.filter(isPlainObject)
    : [];
}

function normalizeVariantSku(rawSku: string, productSku: string, index: number, usedSkus: Set<string>) {
  const baseSku = rawSku || `${productSku}-${index + 1}`;
  let sku = baseSku;
  let suffix = 2;

  while (usedSkus.has(sku)) {
    sku = `${baseSku}-${suffix}`;
    suffix += 1;
  }

  usedSkus.add(sku);
  return sku;
}

function buildVariantCreates(rawVariants: PlainObject[], productSku: string, basePrice: string) {
  const usedSkus = new Set<string>();

  return rawVariants.map((variant, index) => {
    const attributes = isPlainObject(variant.attributes)
      ? variant.attributes
      : compact({
          size: optionalString(variant.size),
          color: optionalString(variant.color),
          shade: optionalString(variant.shade),
        });

    const variantName =
      optionalString(variant.name) ||
      [optionalString(variant.size), optionalString(variant.color), optionalString(variant.shade)]
        .filter(Boolean)
        .join(' / ') ||
      `Variant ${index + 1}`;

    return compact({
      sku: normalizeVariantSku(optionalString(variant.sku) || '', productSku, index, usedSkus),
      name: variantName,
      price: decimalValue(variant.price) || basePrice,
      quantity: intValue(variant.quantity ?? variant.stock, 0),
      attributes,
      image: optionalString(variant.image),
    });
  });
}

function buildImageCreates(rawImages: PlainObject[], imageAltTexts: string[], productName: string) {
  return rawImages
    .map((image, index) => {
      const url = optionalString(image.url);
      if (!url) return undefined;

      const alt = optionalString(image.alt) || imageAltTexts[index] || productName;
      return compact({
        url,
        alt,
        title: optionalString(image.title) || alt,
        sortOrder: intValue(image.sortOrder, index),
        isDefault: image.isDefault === undefined ? index === 0 : booleanValue(image.isDefault),
      });
    })
    .filter(Boolean) as PlainObject[];
}

function sumVariantQuantity(rawVariants: PlainObject[]) {
  return rawVariants.reduce((total, variant) => {
    return total + (intValue(variant.quantity ?? variant.stock, 0) || 0);
  }, 0);
}

async function createProductFromPayload(body: PlainObject) {
  const name = optionalString(body.name);
  if (!name) {
    throw new ProductRouteError('Product name is required');
  }

  const rawVariants = getRawVariants(body);
  const rawImages = getRawImages(body);
  const firstVariant = rawVariants[0];
  const basePrice =
    decimalValue(body.price) ||
    decimalValue(firstVariant?.price) ||
    decimalValue(body.salePrice) ||
    decimalValue(body.compareAtPrice) ||
    decimalValue(body.originalPrice);

  if (!basePrice) {
    throw new ProductRouteError('Product price is required');
  }

  const slug = await getUniqueProductSlug(
    optionalString(body.slug) || optionalString(body.urlSlug) || '',
    name
  );

  const fallbackSku = `${slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${Date.now().toString(36).toUpperCase()}`;
  const productSku = optionalString(body.sku) || optionalString(firstVariant?.sku) || fallbackSku;
  const categoryId = await getOrCreateCategoryId(optionalString(body.category) || '');
  const brandId = await getOrCreateBrandId(optionalString(body.brand) || '');
  const status = getString(body.status).toLowerCase();
  const imageAltTexts = stringArray(body.imageAltTexts);
  const imageCreates = buildImageCreates(rawImages, imageAltTexts, name);
  const variantCreates = buildVariantCreates(rawVariants, productSku, basePrice);
  const explicitQuantity = intValue(body.quantity);
  const quantity = status === 'out_of_stock'
    ? 0
    : explicitQuantity ?? sumVariantQuantity(rawVariants);

  const dimensions = isPlainObject(body.dimensions) ? body.dimensions : {};
  const defaultOgImageUrl = imageCreates.find((image) => image.isDefault)?.url || imageCreates[0]?.url;

  const createData = compact({
    sku: productSku,
    name,
    slug,
    description: optionalString(body.description),
    shortDescription: optionalString(body.shortDescription),
    price: basePrice,
    compareAtPrice: decimalValue(body.compareAtPrice) || decimalValue(body.originalPrice),
    costPrice: decimalValue(body.costPrice),

    quantity,
    lowStockThreshold: intValue(body.lowStockThreshold, 10),
    trackInventory: booleanValue(body.trackInventory, true),
    allowBackorder: booleanValue(body.allowBackorder, false),

    weight: decimalValue(body.weight),
    length: decimalValue(dimensions.length) || decimalValue(body.length),
    width: decimalValue(dimensions.width) || decimalValue(body.width),
    height: decimalValue(dimensions.height) || decimalValue(body.height),

    isActive: status === 'inactive' ? false : booleanValue(body.isActive, true),
    isFeatured: booleanValue(body.featured ?? body.isFeatured, false),
    isNew: booleanValue(body.isNew, false),

    metaTitle: optionalString(body.metaTitle),
    metaDescription: optionalString(body.metaDescription),
    metaKeywords: optionalString(body.tags) || optionalString(body.metaKeywords),
    bengaliName: optionalString(body.bengaliName),
    bengaliDescription: optionalString(body.bengaliDescription),
    focusKeyword: optionalString(body.focusKeyword),
    secondaryKeywords: stringArray(body.secondaryKeywords),
    bengaliFocusKeyword: optionalString(body.bengaliFocusKeyword),
    bengaliSecondaryKeywords: stringArray(body.bengaliSecondaryKeywords),
    ogTitle: optionalString(body.ogTitle),
    ogDescription: optionalString(body.ogDescription),
    ogImageUrl: optionalString(body.ogImageUrl) || optionalString(defaultOgImageUrl),
    canonicalUrl: optionalString(body.canonicalUrl),

    pageH1: optionalString(body.pageH1),
    seoIntro: optionalString(body.seoIntro),
    faqSchemaNote: optionalString(body.faqSchemaNote),
    authenticityNote: optionalString(body.authenticityNote),
    ingredientVerificationStatus: optionalString(body.ingredientVerificationStatus),
    seoValidationChecklist: stringArray(body.seoValidationChecklist),

    structuredDataJsonLd: jsonValue(body.structuredDataJsonLd),
    productGroupJsonLd: jsonValue(body.productGroupJsonLd),
    merchantListingJsonLd: jsonValue(body.merchantListingJsonLd),
    breadcrumbJsonLd: jsonValue(body.breadcrumbJsonLd),
    sitemapIndexing: jsonValue(body.sitemapIndexing),
    variantUrlStrategy: jsonValue(body.variantUrlStrategy),

    searchIntent: optionalString(body.searchIntent),
    targetAudience: optionalString(body.targetAudience),
    primaryConcern: optionalString(body.primaryConcern),
    keyBenefits: stringArray(body.keyBenefits),
    buyingIntentKeywords: stringArray(body.buyingIntentKeywords),
    searchTags: stringArray(body.searchTags),
    synonyms: stringArray(body.synonyms),
    banglaSearchTerms: stringArray(body.banglaSearchTerms),
    reviewKeywords: stringArray(body.reviewKeywords),
    entities: stringArray(body.entities),

    descriptionSections: jsonValue(body.descriptionSections),
    productSpecs: jsonValue(body.productSpecs),
    productAttributes: jsonValue(body.productAttributes),
    shadeOptions: jsonValue(body.shadeOptions),
    variantPriceTable: jsonValue(body.variantPriceTable),
    variantComparisonTable: jsonValue(body.variantComparisonTable),
    internalLinks: jsonValue(body.internalLinks),
    usageInstructions: stringArray(body.usageInstructions),
    imageAltTexts,
    faqSchemaReady: booleanValue(body.faqSchemaReady, false),
    gender: optionalString(body.gender),

    subcategory: optionalString(body.subcategory),
    skinType: stringArray(body.skinType),
    ingredients: optionalString(body.ingredients),
    shelfLife: optionalString(body.shelfLife),
    expiryDate: dateValue(body.expiryDate),
    originCountry: optionalString(body.originCountry) || 'Bangladesh (Local)',

    shippingWeight: optionalString(body.shippingWeight),
    isFragile: booleanValue(body.isFragile, false),

    discountPercentage: decimalValue(body.discountPercentage),
    salePrice: decimalValue(body.salePrice),
    offerStartDate: dateValue(body.offerStartDate),
    offerEndDate: dateValue(body.offerEndDate),
    flashSaleEligible: booleanValue(body.flashSaleEligible, false),

    returnEligible: booleanValue(body.returnEligible, true),
    codAvailable: booleanValue(body.codAvailable, true),
    preOrderOption: booleanValue(body.preOrderOption, false),
    barcode: optionalString(body.barcode),
    relatedProducts: optionalString(body.relatedProducts),

    condition: optionalString(body.condition) || 'NEW',
    gtin: optionalString(body.gtin),
    averageRating: decimalValue(body.averageRating) || '0',
    reviewCount: intValue(body.reviewCount, 0),
    faqs: jsonValue(body.faqs),

    categoryId,
    brandId,
    images: imageCreates.length > 0 ? { create: imageCreates } : undefined,
    variants: variantCreates.length > 0 ? { create: variantCreates } : undefined,
  });

  return prisma.product.create({
    data: createData as never,
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_VIEW)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPagination(searchParams);
    const where = buildAdminProductWhere(searchParams);
    const orderBy = buildAdminProductOrderBy(searchParams);

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: adminProductListInclude,
      }),
      prisma.product.count({ where }),
    ]);

    const productIdsToCheck = products.map((product) => product.id);
    const shortlistMap = new Map<string, boolean>();

    if (productIdsToCheck.length > 0) {
      const shortlistCounts = await prisma.purchaseShortlist.groupBy({
        by: ['productId'],
        where: {
          productId: { in: productIdsToCheck },
          purchased: false,
        },
        _count: true,
      });

      shortlistCounts.forEach((shortlist) => {
        if (shortlist.productId) {
          shortlistMap.set(shortlist.productId, shortlist._count > 0);
        }
      });
    }

    const formattedProducts = products.map((product) => {
      const formatted = formatAdminProductListItem(product);
      const hasPendingShortlist = !product.isActive && (shortlistMap.get(product.id) || false);

      return {
        ...formatted,
        hasPendingShortlist,
      };
    });

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/products error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch products', details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_CREATE)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    if (!isPlainObject(body)) {
      return NextResponse.json({ error: 'Invalid product payload' }, { status: 400 });
    }

    const product = await createProductFromPayload(body);

    return NextResponse.json(
      {
        success: true,
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ProductRouteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (isPlainObject(error) && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A product, variant, slug, or SKU with the same unique value already exists.' },
        { status: 409 }
      );
    }

    console.error('POST /api/admin/products error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create product', details: message },
      { status: 500 }
    );
  }
}
