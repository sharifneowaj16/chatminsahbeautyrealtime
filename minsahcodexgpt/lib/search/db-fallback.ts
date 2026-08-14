import prisma from '@/lib/prisma';
import { sanitizeQuery, validateNumericParam } from '@/lib/elasticsearch/utils';
import { ACTIVE_PRODUCT_PRISMA_WHERE } from '@/lib/search/activeProductFilter';
import { resolveProductTrustBadges } from '@/lib/shopTrust';

type SearchParamsLike = URLSearchParams;
type MoneyLike = number | string | bigint | null | undefined | { toString(): string };

type FallbackProductImage = { url: string; alt?: string | null; sortOrder?: number | null };
type FallbackCategory = {
  name: string;
  slug: string;
  parent?: (FallbackCategory & { parent?: FallbackCategory | null }) | null;
} | null;

type FallbackProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: MoneyLike;
  compareAtPrice?: MoneyLike;
  quantity?: number | null;
  sku?: string | null;
  isActive?: boolean | null;
  deletedAt?: Date | string | null;
  isFeatured?: boolean | null;
  isNew?: boolean | null;
  flashSaleEligible?: boolean | null;
  codAvailable?: boolean | null;
  returnEligible?: boolean | null;
  isFragile?: boolean | null;
  deliveryOfferEnabled?: boolean | null;
  deliveryOfferType?: 'DEFAULT' | 'FREE' | 'FIXED' | string | null;
  deliveryOfferAmount?: MoneyLike;
  deliveryOfferStartDate?: Date | string | null;
  deliveryOfferEndDate?: Date | string | null;
  deliveryOfferBadgeText?: string | null;
  averageRating?: MoneyLike;
  reviewCount?: number | null;
  viewCount?: number | null;
  orderCount?: number | null;
  deliveredOrderCount?: number | null;
  metaKeywords?: string | null;
  searchTags?: string[] | null;
  secondaryKeywords?: string[] | null;
  synonyms?: string[] | null;
  banglaSearchTerms?: string[] | null;
  buyingIntentKeywords?: string[] | null;
  reviewKeywords?: string[] | null;
  entities?: string[] | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  images?: FallbackProductImage[];
  category?: FallbackCategory;
  brand?: { name: string; slug: string } | null;
};

export type DatabaseSearchFallbackResponse = {
  success: true;
  source: 'database_fallback';
  query: string;
  spellSuggestion: null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    compareAtPrice: number | null;
    discount: number;
    category: string;
    subcategory: string;
    brand: string;
    images: string[];
    image: string;
    inStock: boolean;
    isActive: true;
    deletedAt: null;
    status: 'active';
    visibility: 'public';
    rating: number;
    reviewCount: number;
    tags: string[];
    codAvailable: boolean;
    isCODAvailable: boolean;
    freeShippingEligible: boolean;
    returnEligible: boolean;
    authenticityBadge: boolean;
    deliveryBadge: string | null;
    badges: string[];
    isFeatured: boolean;
    isFlashSale: boolean;
    isNewArrival: boolean;
    score: null;
  }>;
  fallback: {
    strategy: 'database_fallback';
    message: string;
    applied: true;
    reason: string;
  };
  facets: {
    categories: Array<{ label: string; value: string; count: number }>;
    brands: Array<{ label: string; value: string; count: number }>;
    priceRanges: Array<{ label: string; value: string; min?: number | null; max?: number | null; count: number }>;
    skinTypes: Array<{ label: string; value: string; count: number }>;
    concerns: Array<{ label: string; value: string; count: number }>;
    availability: Array<{ label: string; value: string; count: number }>;
    ratings: Array<{ label: string; value: string; min: number; count: number }>;
  };
  priceStats: { avg: number; min: number; max: number };
  meta: {
    duration: number;
    sort: string;
    filters: string[];
    personalized: false;
    preferredCategories: string[];
    ctrBoostsApplied: 0;
    degraded: true;
    fallbackReason: string;
  };
};

function toNumber(value: unknown): number {
  if (value == null) return 0;
  const parsed = Number(typeof value === 'object' && 'toString' in value ? value.toString() : value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getFallbackReason(error: unknown): string {
  if (!error) return 'Elasticsearch unavailable';
  const name = typeof error === 'object' && error && 'name' in error ? String((error as { name?: unknown }).name) : '';
  const message = error instanceof Error ? error.message : String(error);
  return [name, message].filter(Boolean).join(': ').slice(0, 240) || 'Elasticsearch unavailable';
}

function getCsvFilterValues(value: string | null): string[] {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeShopSort(sort: string): string {
  switch (sort) {
    case 'featured':
      return 'relevance';
    case 'price-low-high':
      return 'price_asc';
    case 'price-high-low':
      return 'price_desc';
    case 'highest-rated':
      return 'rating';
    case 'best-selling':
      return 'popularity';
    case 'a-z':
      return 'name_asc';
    case 'z-a':
      return 'name_desc';
    case 'biggest-discount':
    case 'discount_desc':
      return 'discount_desc';
    case 'relevance':
    case 'price_asc':
    case 'price_desc':
    case 'newest':
    case 'rating':
    case 'popularity':
    case 'name_asc':
    case 'name_desc':
      return sort;
    default:
      return 'relevance';
  }
}

function buildCategoryHierarchy(category: FallbackCategory): string[] {
  if (!category) return [];
  const hierarchy = [category.name];
  if (category.parent) {
    hierarchy.unshift(category.parent.name);
    if (category.parent.parent) hierarchy.unshift(category.parent.parent.name);
  }
  return hierarchy;
}

function collectTags(product: FallbackProduct): string[] {
  const values = [
    ...(product.metaKeywords ? product.metaKeywords.split(',') : []),
    ...(product.searchTags ?? []),
    ...(product.secondaryKeywords ?? []),
    ...(product.synonyms ?? []),
    ...(product.banglaSearchTerms ?? []),
    ...(product.buyingIntentKeywords ?? []),
    ...(product.reviewKeywords ?? []),
    ...(product.entities ?? []),
  ];

  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function transformFallbackProduct(product: FallbackProduct): DatabaseSearchFallbackResponse['products'][number] {
  const price = toNumber(product.price);
  const compareAtPrice = product.compareAtPrice == null ? null : toNumber(product.compareAtPrice);
  const discount = compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;
  const hierarchy = buildCategoryHierarchy(product.category ?? null);
  const images = (product.images ?? []).map((image) => image.url).filter(Boolean);
  const stock = product.quantity ?? 0;
  const trustBadges = resolveProductTrustBadges({
    ...product,
    price,
    stock,
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? '',
    price,
    compareAtPrice,
    discount,
    category: hierarchy[0] ?? '',
    subcategory: hierarchy[1] ?? hierarchy[0] ?? '',
    brand: product.brand?.name ?? '',
    images,
    image: images[0] ?? '',
    inStock: stock > 0,
    isActive: true,
    deletedAt: null,
    status: 'active',
    visibility: 'public',
    rating: toNumber(product.averageRating),
    reviewCount: product.reviewCount ?? 0,
    tags: collectTags(product),
    codAvailable: trustBadges.isCODAvailable,
    isCODAvailable: trustBadges.isCODAvailable,
    freeShippingEligible: trustBadges.freeShippingEligible,
    returnEligible: trustBadges.returnEligible,
    authenticityBadge: trustBadges.authenticityBadge,
    deliveryBadge: trustBadges.deliveryBadge,
    badges: trustBadges.badges,
    isFeatured: product.isFeatured === true,
    isFlashSale: product.flashSaleEligible === true,
    isNewArrival: product.isNew === true,
    score: null,
  };
}

function getFilterSummary(params: SearchParamsLike, sort: string): string[] {
  const filters = [
    params.get('category') && 'category',
    params.get('subcategory') && 'subcategory',
    params.get('brand') && 'brand',
    (params.get('minPrice') || params.get('maxPrice')) && 'price',
    params.get('inStock') === 'true' && 'inStock',
    params.get('rating') && 'rating',
    params.get('tags') && 'tags',
    sort && sort !== 'relevance' && `sort:${sort}`,
  ];

  return filters.filter(Boolean) as string[];
}

function buildPriceRanges(products: DatabaseSearchFallbackResponse['products']): DatabaseSearchFallbackResponse['facets']['priceRanges'] {
  const ranges = [
    { label: 'Under ৳500', value: 'under-500', max: 500, test: (price: number) => price < 500 },
    { label: '৳500–৳1000', value: '500-1000', min: 500, max: 1000, test: (price: number) => price >= 500 && price < 1000 },
    { label: '৳1000–৳2000', value: '1000-2000', min: 1000, max: 2000, test: (price: number) => price >= 1000 && price < 2000 },
    { label: 'Above ৳2000', value: 'over-2000', min: 2000, test: (price: number) => price >= 2000 },
  ];

  return ranges
    .map((range) => ({
      label: range.label,
      value: range.value,
      min: range.min ?? null,
      max: range.max ?? null,
      count: products.filter((product) => range.test(product.price)).length,
    }))
    .filter((facet) => facet.count > 0);
}

function countFacet(values: string[]): Array<{ label: string; value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([value, count]) => ({ label: value, value, count }));
}

function buildWhere(params: SearchParamsLike): Record<string, unknown> {
  const query = sanitizeQuery(params.get('q') || '');
  const category = params.get('category');
  const subcategory = params.get('subcategory');
  const brand = params.get('brand');
  const minPrice = params.get('minPrice');
  const maxPrice = params.get('maxPrice');
  const inStock = params.get('inStock') === 'true';
  const rating = params.get('rating');
  const tags = params.get('tags')?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [];

  const andFilters: Record<string, unknown>[] = [];

  if (query.trim()) {
    andFilters.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { shortDescription: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { metaKeywords: { contains: query, mode: 'insensitive' } },
        { focusKeyword: { contains: query, mode: 'insensitive' } },
        { bengaliName: { contains: query, mode: 'insensitive' } },
        { bengaliDescription: { contains: query, mode: 'insensitive' } },
        { searchTags: { has: query } },
        { synonyms: { has: query } },
        { banglaSearchTerms: { has: query } },
        { buyingIntentKeywords: { has: query } },
        { reviewKeywords: { has: query } },
        { entities: { has: query } },
        { brand: { is: { name: { contains: query, mode: 'insensitive' } } } },
        { category: { is: { name: { contains: query, mode: 'insensitive' } } } },
        { category: { is: { parent: { is: { name: { contains: query, mode: 'insensitive' } } } } } },
      ],
    });
  }

  if (category) {
    const categoryValues = getCsvFilterValues(category);
    andFilters.push({
      category: {
        is: {
          OR: categoryValues.flatMap((value) => [
            { name: { equals: value, mode: 'insensitive' } },
            { slug: { equals: value, mode: 'insensitive' } },
            { parent: { is: { name: { equals: value, mode: 'insensitive' } } } },
            { parent: { is: { slug: { equals: value, mode: 'insensitive' } } } },
          ]),
        },
      },
    });
  }

  if (subcategory) {
    andFilters.push({
      category: {
        is: {
          OR: [
            { name: { equals: subcategory, mode: 'insensitive' } },
            { slug: { equals: subcategory, mode: 'insensitive' } },
          ],
        },
      },
    });
  }

  if (brand) {
    const brandValues = getCsvFilterValues(brand);
    andFilters.push({
      brand: {
        is: {
          OR: brandValues.flatMap((value) => [
            { name: { equals: value, mode: 'insensitive' } },
            { slug: { equals: value, mode: 'insensitive' } },
          ]),
        },
      },
    });
  }

  if (minPrice || maxPrice) {
    const range: Record<string, number> = {};
    if (minPrice) range.gte = Number(minPrice);
    if (maxPrice) range.lte = Number(maxPrice);
    andFilters.push({ price: range });
  }

  if (inStock) {
    andFilters.push({ quantity: { gt: 0 } });
  }

  if (rating) {
    andFilters.push({ averageRating: { gte: Number(rating) } });
  }

  if (tags.length > 0) {
    andFilters.push({
      OR: tags.flatMap((tag) => [
        { metaKeywords: { contains: tag, mode: 'insensitive' } },
        { searchTags: { has: tag } },
        { secondaryKeywords: { has: tag } },
        { synonyms: { has: tag } },
        { banglaSearchTerms: { has: tag } },
        { buyingIntentKeywords: { has: tag } },
        { reviewKeywords: { has: tag } },
        { entities: { has: tag } },
      ]),
    });
  }

  return {
    ...ACTIVE_PRODUCT_PRISMA_WHERE,
    ...(andFilters.length > 0 ? { AND: andFilters } : {}),
  };
}

function buildOrderBy(sort: string): Record<string, unknown>[] {
  switch (sort) {
    case 'price_asc':
      return [{ price: 'asc' }, { createdAt: 'desc' }];
    case 'price_desc':
      return [{ price: 'desc' }, { createdAt: 'desc' }];
    case 'newest':
      return [{ createdAt: 'desc' }];
    case 'rating':
      return [{ averageRating: 'desc' }, { reviewCount: 'desc' }, { createdAt: 'desc' }];
    case 'popularity':
      return [
        { deliveredOrderCount: 'desc' },
        { orderCount: 'desc' },
        { viewCount: 'desc' },
        { reviewCount: 'desc' },
        { averageRating: 'desc' },
        { createdAt: 'desc' },
      ];
    case 'discount_desc':
      return [
        { discountPercentage: 'desc' },
        { averageRating: 'desc' },
        { createdAt: 'desc' },
      ];
    case 'name_asc':
      return [{ name: 'asc' }];
    case 'name_desc':
      return [{ name: 'desc' }];
    case 'relevance':
    default:
      return [
        { isFeatured: 'desc' },
        { flashSaleEligible: 'desc' },
        { orderCount: 'desc' },
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ];
  }
}

const productInclude = {
  brand: true,
  category: {
    include: {
      parent: {
        include: {
          parent: true,
        },
      },
    },
  },
  images: {
    orderBy: { sortOrder: 'asc' as const },
  },
};

export async function executeDatabaseSearchFallback(
  params: SearchParamsLike,
  startTime: number,
  error?: unknown
): Promise<DatabaseSearchFallbackResponse> {
  const query = sanitizeQuery(params.get('q') || '');
  const page = validateNumericParam(params.get('page'), 1, 1, 1000);
  const limit = validateNumericParam(params.get('limit'), 20, 1, 100);
  const sort = normalizeShopSort(params.get('sort') || 'relevance');
  const where = buildWhere(params);
  const skip = (page - 1) * limit;
  const reason = getFallbackReason(error);

  const [total, rows, facetRows] = await Promise.all([
    prisma.product.count({ where } as any),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: buildOrderBy(sort) as any,
      skip,
      take: limit,
    } as any),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: buildOrderBy(sort) as any,
      take: 500,
    } as any),
  ]);

  const products = (rows as FallbackProduct[]).map(transformFallbackProduct);
  const facetProducts = (facetRows as FallbackProduct[]).map(transformFallbackProduct);
  const prices = facetProducts.map((product) => product.price).filter((price) => Number.isFinite(price));
  const duration = Date.now() - startTime;
  const filters = getFilterSummary(params, sort);

  return {
    success: true,
    source: 'database_fallback',
    query,
    spellSuggestion: null,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    products,
    fallback: {
      strategy: 'database_fallback',
      message: 'Search is temporarily using the database fallback because Elasticsearch is unavailable.',
      applied: true,
      reason,
    },
    facets: {
      categories: countFacet(facetProducts.map((product) => product.category)),
      brands: countFacet(facetProducts.map((product) => product.brand)),
      priceRanges: buildPriceRanges(facetProducts),
      skinTypes: [],
      concerns: [],
      availability: [
        { label: 'In Stock', value: 'in_stock', count: facetProducts.filter((product) => product.inStock).length },
        { label: 'Out of Stock', value: 'out_of_stock', count: facetProducts.filter((product) => !product.inStock).length },
      ].filter((facet) => facet.count > 0),
      ratings: [
        { label: '4★ & up', value: '4-up', min: 4, count: facetProducts.filter((product) => product.rating >= 4).length },
        { label: '3★ & up', value: '3-up', min: 3, count: facetProducts.filter((product) => product.rating >= 3).length },
      ].filter((facet) => facet.count > 0),
    },
    priceStats: {
      avg: prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0,
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
    meta: {
      duration,
      sort,
      filters,
      personalized: false,
      preferredCategories: [],
      ctrBoostsApplied: 0,
      degraded: true,
      fallbackReason: reason,
    },
  };
}

export async function getDatabaseFallbackHealth() {
  const startedAt = Date.now();

  try {
    const activeProductCount = await prisma.product.count({
      where: ACTIVE_PRODUCT_PRISMA_WHERE,
    } as any);

    return {
      ok: true,
      reachable: true,
      activeProductCount,
      responseTime: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      reachable: false,
      activeProductCount: 0,
      responseTime: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown database fallback error',
    };
  }
}
