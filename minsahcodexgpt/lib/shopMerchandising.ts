import 'server-only';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { resolveProductTrustBadges } from '@/lib/shopTrust';

export const SHOP_MERCHANDISING_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=180';
export const SHOP_MERCHANDISING_SECTION_LIMIT = 8;
export const SHOP_MERCHANDISING_MAX_EXCLUDES = 40;

export type ShopMerchandisingContext = {
  q?: string;
  category?: string;
  brand?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  excludeIds?: string[];
};

export type ShopMerchandisingProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  price: number;
  originalPrice: number | null;
  discount?: number;
  discountPercentage?: number;
  image: string;
  images: Array<{ url: string; alt: string; isDefault: boolean }>;
  stock: number;
  quantity: number;
  inStock: boolean;
  category: string;
  categorySlug: string;
  brand: string;
  brandSlug: string;
  isFeatured: boolean;
  featured: boolean;
  isNew: boolean;
  rating: number;
  reviews: number;
  reviewCount: number;
  viewCount: number;
  orderCount: number;
  confirmedOrderCount: number;
  deliveredOrderCount: number;
  salesCount: number;
  codAvailable: boolean;
  isCODAvailable: boolean;
  returnEligible: boolean;
  authenticityBadge: boolean;
  freeShippingEligible: boolean;
  deliveryBadge: string | null;
  badges: string[];
  tags: string;
  createdAt: string;
  updatedAt: string;
};

export type ShopMerchandisingSection = {
  id: 'recommended-for-you' | 'popular-in-category' | 'brand-picks' | 'todays-deals' | 'trending-now' | 'new-arrivals';
  title: string;
  subtitle: string;
  href: string;
  icon: 'sparkles' | 'flame' | 'badge-percent' | 'star';
  reason: string;
  personalized: boolean;
  trackingListName: string;
  products: ShopMerchandisingProduct[];
};

export const SHOP_MERCHANDISING_PRODUCT_SELECT = {
  id: true,
  slug: true,
  sku: true,
  name: true,
  price: true,
  compareAtPrice: true,
  quantity: true,
  categoryId: true,
  brandId: true,
  isActive: true,
  isFeatured: true,
  isNew: true,
  averageRating: true,
  reviewCount: true,
  viewCount: true,
  orderCount: true,
  confirmedOrderCount: true,
  deliveredOrderCount: true,
  codAvailable: true,
  returnEligible: true,
  isFragile: true,
  deliveryOfferEnabled: true,
  deliveryOfferType: true,
  deliveryOfferAmount: true,
  deliveryOfferStartDate: true,
  deliveryOfferEndDate: true,
  deliveryOfferBadgeText: true,
  metaKeywords: true,
  discountPercentage: true,
  flashSaleEligible: true,
  createdAt: true,
  updatedAt: true,
  images: {
    orderBy: { sortOrder: 'asc' as const },
    take: 2,
    select: { url: true, alt: true, isDefault: true },
  },
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductSelect;

type MerchProductRow = Prisma.ProductGetPayload<{ select: typeof SHOP_MERCHANDISING_PRODUCT_SELECT }>;

function cleanText(value: unknown, maxLength = 120): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function cleanCsv(value: unknown, maxItems = 8): string[] {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function buildBaseWhere(context: ShopMerchandisingContext): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    isActive: true,
  };

  if (context.inStock !== false) {
    where.quantity = { gt: 0 };
  }

  const minPrice = Number(context.minPrice);
  const maxPrice = Number(context.maxPrice);
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    where.price = {
      ...(Number.isFinite(minPrice) ? { gte: minPrice } : {}),
      ...(Number.isFinite(maxPrice) ? { lte: maxPrice } : {}),
    };
  }

  return where;
}

function buildContextWhere(context: ShopMerchandisingContext): Prisma.ProductWhereInput {
  const where = buildBaseWhere(context);
  const categoryValues = cleanCsv(context.category, 6);
  const brandValues = cleanCsv(context.brand, 6);
  const q = cleanText(context.q, 80);

  if (categoryValues.length > 0) {
    where.category = {
      OR: categoryValues.flatMap((value) => [
        { slug: { equals: value, mode: 'insensitive' as const } },
        { name: { contains: value, mode: 'insensitive' as const } },
      ]),
    };
  }

  if (brandValues.length > 0) {
    where.brand = {
      OR: brandValues.flatMap((value) => [
        { slug: { equals: value, mode: 'insensitive' as const } },
        { name: { contains: value, mode: 'insensitive' as const } },
      ]),
    };
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' as const } },
      { shortDescription: { contains: q, mode: 'insensitive' as const } },
      { metaKeywords: { contains: q, mode: 'insensitive' as const } },
      { focusKeyword: { contains: q, mode: 'insensitive' as const } },
      { searchTags: { has: q } },
      { synonyms: { has: q } },
      { brand: { name: { contains: q, mode: 'insensitive' as const } } },
      { category: { name: { contains: q, mode: 'insensitive' as const } } },
    ];
  }

  return where;
}

function buildShopHref(context: ShopMerchandisingContext): string {
  const params = new URLSearchParams();
  if (context.q) params.set('q', context.q);
  if (context.category) params.set('category', context.category);
  if (context.brand) params.set('brand', context.brand);
  if (context.minPrice) params.set('minPrice', context.minPrice);
  if (context.maxPrice) params.set('maxPrice', context.maxPrice);
  if (context.inStock) params.set('inStock', 'true');
  return `/shop${params.toString() ? `?${params.toString()}` : ''}`;
}

function buildCategoryHref(context: ShopMerchandisingContext): string {
  const category = cleanCsv(context.category, 1)[0];
  return category ? `/categories/${category}` : '/shop';
}

function buildBrandHref(context: ShopMerchandisingContext): string {
  const brand = cleanCsv(context.brand, 1)[0];
  return brand ? `/brands/${brand}` : '/shop';
}

function serializeProduct(product: MerchProductRow): ShopMerchandisingProduct {
  const mainImage = product.images.find((image) => image.isDefault) || product.images[0];
  const price = toNumber(product.price);
  const compareAtPrice = product.compareAtPrice ? toNumber(product.compareAtPrice) : null;
  const discount = product.discountPercentage
    ? Math.round(toNumber(product.discountPercentage))
    : compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : undefined;
  const trustBadges = resolveProductTrustBadges({
    ...product,
    price,
    stock: product.quantity,
  });

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    price,
    originalPrice: compareAtPrice,
    discount,
    discountPercentage: discount,
    image: mainImage?.url || '',
    images: product.images.map((image) => ({
      url: image.url,
      alt: image.alt || product.name,
      isDefault: image.isDefault,
    })),
    stock: product.quantity,
    quantity: product.quantity,
    inStock: product.quantity > 0,
    category: product.category?.name || '',
    categorySlug: product.category?.slug || '',
    brand: product.brand?.name || '',
    brandSlug: product.brand?.slug || '',
    isFeatured: product.isFeatured,
    featured: product.isFeatured,
    isNew: product.isNew,
    rating: product.averageRating ? toNumber(product.averageRating) : 0,
    reviews: product.reviewCount || 0,
    reviewCount: product.reviewCount || 0,
    viewCount: product.viewCount || 0,
    orderCount: product.orderCount || 0,
    confirmedOrderCount: product.confirmedOrderCount || 0,
    deliveredOrderCount: product.deliveredOrderCount || 0,
    salesCount: product.deliveredOrderCount || product.confirmedOrderCount || product.orderCount || 0,
    codAvailable: trustBadges.isCODAvailable,
    isCODAvailable: trustBadges.isCODAvailable,
    returnEligible: trustBadges.returnEligible,
    authenticityBadge: trustBadges.authenticityBadge,
    freeShippingEligible: trustBadges.freeShippingEligible,
    deliveryBadge: trustBadges.deliveryBadge,
    badges: trustBadges.badges,
    tags: product.metaKeywords || '',
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function findMerchProducts(args: {
  where: Prisma.ProductWhereInput;
  orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[];
  take?: number;
  excludeIds: Set<string>;
}): Promise<ShopMerchandisingProduct[]> {
  const take = args.take ?? SHOP_MERCHANDISING_SECTION_LIMIT;
  const rows = await prisma.product.findMany({
    where: {
      ...args.where,
      ...(args.excludeIds.size ? { id: { notIn: Array.from(args.excludeIds) } } : {}),
    },
    orderBy: args.orderBy,
    take,
    select: SHOP_MERCHANDISING_PRODUCT_SELECT,
  });

  // Small development catalogs can have fewer products than the visible grid. Keep a
  // deterministic fallback instead of hiding merchandising entirely, but prefer
  // non-duplicate recommendations whenever the catalog is large enough.
  if (rows.length < 3 && args.excludeIds.size > 0) {
    const fallbackRows = await prisma.product.findMany({
      where: args.where,
      orderBy: args.orderBy,
      take,
      select: SHOP_MERCHANDISING_PRODUCT_SELECT,
    });
    const byId = new Map<string, MerchProductRow>();
    [...rows, ...fallbackRows].forEach((row) => byId.set(row.id, row));
    return Array.from(byId.values()).slice(0, take).map(serializeProduct);
  }

  return rows.map(serializeProduct);
}

function acceptSection(section: ShopMerchandisingSection | null, usedIds: Set<string>): ShopMerchandisingSection | null {
  if (!section || section.products.length < 3) return null;
  section.products.forEach((product) => usedIds.add(product.id));
  return section;
}

export function sanitizeShopMerchandisingContext(input: URLSearchParams): ShopMerchandisingContext {
  const excludeIds = uniq(cleanCsv(input.get('exclude'), SHOP_MERCHANDISING_MAX_EXCLUDES));
  return {
    q: cleanText(input.get('q'), 80) || undefined,
    category: cleanCsv(input.get('category'), 6).join(',') || undefined,
    brand: cleanCsv(input.get('brand'), 6).join(',') || undefined,
    sort: cleanText(input.get('sort'), 40) || undefined,
    minPrice: cleanText(input.get('minPrice'), 20) || undefined,
    maxPrice: cleanText(input.get('maxPrice'), 20) || undefined,
    inStock: input.get('inStock') === 'true' ? true : undefined,
    excludeIds,
  };
}

export async function getShopMerchandisingSections(context: ShopMerchandisingContext): Promise<ShopMerchandisingSection[]> {
  const usedIds = new Set<string>((context.excludeIds || []).slice(0, SHOP_MERCHANDISING_MAX_EXCLUDES));
  const sections: ShopMerchandisingSection[] = [];
  const hasContext = Boolean(context.q || context.category || context.brand || context.minPrice || context.maxPrice || context.inStock);

  if (hasContext) {
    const contextProducts = await findMerchProducts({
      where: buildContextWhere(context),
      orderBy: [
        { isFeatured: 'desc' },
        { deliveredOrderCount: 'desc' },
        { averageRating: 'desc' },
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
      excludeIds: usedIds,
    });
    const accepted = acceptSection({
      id: 'recommended-for-you',
      title: 'Recommended for this search',
      subtitle: 'Matched from the full catalog using your current filters',
      href: buildShopHref(context),
      icon: 'sparkles',
      reason: 'contextual_filters',
      personalized: true,
      trackingListName: 'Shop Merchandising - Recommended For This Search',
      products: contextProducts,
    }, usedIds);
    if (accepted) sections.push(accepted);
  }

  if (context.category) {
    const products = await findMerchProducts({
      where: { ...buildBaseWhere(context), category: buildContextWhere({ category: context.category }).category },
      orderBy: [
        { deliveredOrderCount: 'desc' },
        { orderCount: 'desc' },
        { averageRating: 'desc' },
        { createdAt: 'desc' },
      ],
      excludeIds: usedIds,
    });
    const accepted = acceptSection({
      id: 'popular-in-category',
      title: 'Popular in this category',
      subtitle: 'Best-performing category picks from the full catalog',
      href: buildCategoryHref(context),
      icon: 'flame',
      reason: 'category_performance',
      personalized: true,
      trackingListName: 'Shop Merchandising - Popular In Category',
      products,
    }, usedIds);
    if (accepted) sections.push(accepted);
  }

  if (context.brand) {
    const products = await findMerchProducts({
      where: { ...buildBaseWhere(context), brand: buildContextWhere({ brand: context.brand }).brand },
      orderBy: [
        { deliveredOrderCount: 'desc' },
        { averageRating: 'desc' },
        { discountPercentage: 'desc' },
        { createdAt: 'desc' },
      ],
      excludeIds: usedIds,
    });
    const accepted = acceptSection({
      id: 'brand-picks',
      title: 'More from this brand',
      subtitle: 'Brand-matched recommendations using real product signals',
      href: buildBrandHref(context),
      icon: 'star',
      reason: 'brand_affinity',
      personalized: true,
      trackingListName: 'Shop Merchandising - Brand Picks',
      products,
    }, usedIds);
    if (accepted) sections.push(accepted);
  }

  const deals = await findMerchProducts({
    where: {
      ...buildBaseWhere(context),
      OR: [
        { discountPercentage: { gt: 0 } },
        { salePrice: { not: null } },
        { flashSaleEligible: true },
      ],
    },
    orderBy: [
      { discountPercentage: 'desc' },
      { flashSaleEligible: 'desc' },
      { deliveredOrderCount: 'desc' },
      { averageRating: 'desc' },
    ],
    excludeIds: usedIds,
  });
  const dealsSection = acceptSection({
    id: 'todays-deals',
    title: 'Today’s real deals',
    subtitle: 'Discounted in-stock products, not current-page guesses',
    href: '/shop?sort=biggest-discount',
    icon: 'badge-percent',
    reason: 'discount_and_stock',
    personalized: false,
    trackingListName: 'Shop Merchandising - Real Deals',
    products: deals,
  }, usedIds);
  if (dealsSection) sections.push(dealsSection);

  const trending = await findMerchProducts({
    where: buildBaseWhere(context),
    orderBy: [
      { isFeatured: 'desc' },
      { deliveredOrderCount: 'desc' },
      { confirmedOrderCount: 'desc' },
      { viewCount: 'desc' },
      { averageRating: 'desc' },
      { createdAt: 'desc' },
    ],
    excludeIds: usedIds,
  });
  const trendingSection = acceptSection({
    id: 'trending-now',
    title: 'Trending now',
    subtitle: 'Ranked by real catalog performance signals',
    href: '/shop?sort=best-selling',
    icon: 'flame',
    reason: 'performance_signals',
    personalized: false,
    trackingListName: 'Shop Merchandising - Trending Now',
    products: trending,
  }, usedIds);
  if (trendingSection) sections.push(trendingSection);

  const newArrivals = await findMerchProducts({
    where: buildBaseWhere(context),
    orderBy: [
      { isNew: 'desc' },
      { createdAt: 'desc' },
      { averageRating: 'desc' },
    ],
    excludeIds: usedIds,
  });
  const newSection = acceptSection({
    id: 'new-arrivals',
    title: 'Fresh arrivals',
    subtitle: 'New catalog items with stable in-stock fallback',
    href: '/shop?sort=newest',
    icon: 'sparkles',
    reason: 'newness',
    personalized: false,
    trackingListName: 'Shop Merchandising - Fresh Arrivals',
    products: newArrivals,
  }, usedIds);
  if (newSection) sections.push(newSection);

  return sections.slice(0, 4);
}
