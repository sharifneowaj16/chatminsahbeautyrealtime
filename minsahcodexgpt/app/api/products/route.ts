import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';
import { AdminProductError, createAdminProduct } from '@/lib/admin-products';
import { normalizeShopSearchParams } from '@/lib/shopUtils';
import { resolveProductTrustBadges } from '@/lib/shopTrust';
import { SHOP_LISTING_CACHE_CONTROL, getShopPayloadHeaders } from '@/lib/shopPerformance';

export const dynamic = 'force-dynamic';

function parseRelatedProducts(value: string | null): unknown {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
    return trimmed;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function getNumericFilter(value: string | null): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCsvFilterValues(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}




type ShopFacetOption = {
  label: string;
  value: string;
  count: number;
  min?: number | null;
  max?: number | null;
};

type ShopFacets = {
  categories: ShopFacetOption[];
  brands: ShopFacetOption[];
  priceRanges: ShopFacetOption[];
  skinTypes: ShopFacetOption[];
  concerns: ShopFacetOption[];
  availability: ShopFacetOption[];
  ratings: ShopFacetOption[];
};

type BasicFacetRecord = { id: string; name: string; slug: string };

const SHOP_PRICE_RANGES: Array<{ label: string; value: string; min?: number; max?: number }> = [
  { label: 'Under ৳500', value: 'under-500', max: 500 },
  { label: '৳500–৳1000', value: '500-1000', min: 500, max: 1000 },
  { label: '৳1000–৳2000', value: '1000-2000', min: 1000, max: 2000 },
  { label: 'Above ৳2000', value: 'over-2000', min: 2000 },
];

const SHOP_RATING_RANGES: Array<{ label: string; value: string; min: number }> = [
  { label: '4★ & up', value: '4-up', min: 4 },
  { label: '3★ & up', value: '3-up', min: 3 },
];

function mergePriceFilter(
  where: Prisma.ProductWhereInput,
  min?: number,
  max?: number
): Prisma.ProductWhereInput {
  const currentPrice =
    where.price && typeof where.price === 'object' && !Array.isArray(where.price)
      ? (where.price as Record<string, unknown>)
      : {};

  return {
    ...where,
    price: {
      ...currentPrice,
      ...(min != null ? { gte: min } : {}),
      ...(max != null ? { lte: max } : {}),
    },
  };
}

async function buildProductFacets(where: Prisma.ProductWhereInput): Promise<ShopFacets> {
  const [categoryGroups, brandGroups, priceCounts, inStockCount, outOfStockCount, ratingCounts] = await Promise.all([
    prisma.product.groupBy({
      by: ['categoryId'],
      where,
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ['brandId'],
      where,
      _count: { _all: true },
    }),
    Promise.all(
      SHOP_PRICE_RANGES.map((range) =>
        prisma.product.count({ where: mergePriceFilter(where, range.min, range.max) })
      )
    ),
    prisma.product.count({ where: { ...where, quantity: { gt: 0 } } }),
    prisma.product.count({ where: { ...where, quantity: { lte: 0 } } }),
    Promise.all(
      SHOP_RATING_RANGES.map((range) =>
        prisma.product.count({
          where: {
            ...where,
            averageRating: { gte: range.min },
          },
        })
      )
    ),
  ]);

  const categoryIds = categoryGroups
    .map((group) => group.categoryId)
    .filter((id): id is string => Boolean(id));
  const brandIds = brandGroups
    .map((group) => group.brandId)
    .filter((id): id is string => Boolean(id));

  const [categories, brands] = await Promise.all([
    categoryIds.length
      ? prisma.category.findMany({
          where: { id: { in: categoryIds }, isActive: true },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([] as BasicFacetRecord[]),
    brandIds.length
      ? prisma.brand.findMany({
          where: { id: { in: brandIds }, isActive: true },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([] as BasicFacetRecord[]),
  ]) as [BasicFacetRecord[], BasicFacetRecord[]];

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const brandById = new Map(brands.map((brand) => [brand.id, brand]));

  const categoryFacets = categoryGroups
    .map((group) => {
      const category = group.categoryId ? categoryById.get(group.categoryId) : null;
      if (!category) return null;
      return { label: category.name, value: category.slug, count: group._count._all };
    })
    .filter((facet): facet is ShopFacetOption => Boolean(facet))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const brandFacets = brandGroups
    .map((group) => {
      const brand = group.brandId ? brandById.get(group.brandId) : null;
      if (!brand) return null;
      return { label: brand.name, value: brand.slug, count: group._count._all };
    })
    .filter((facet): facet is ShopFacetOption => Boolean(facet))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    categories: categoryFacets,
    brands: brandFacets,
    priceRanges: SHOP_PRICE_RANGES.map((range, index) => ({
      label: range.label,
      value: range.value,
      min: range.min ?? null,
      max: range.max ?? null,
      count: priceCounts[index] ?? 0,
    })).filter((facet) => facet.count > 0),
    skinTypes: [],
    concerns: [],
    availability: [
      { label: 'In Stock', value: 'in_stock', count: inStockCount },
      { label: 'Out of Stock', value: 'out_of_stock', count: outOfStockCount },
    ].filter((facet) => facet.count > 0),
    ratings: SHOP_RATING_RANGES.map((range, index) => ({
      label: range.label,
      value: range.value,
      min: range.min,
      count: ratingCounts[index] ?? 0,
    })).filter((facet) => facet.count > 0),
  };
}

function resolveProductSort(searchParams: URLSearchParams): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const shopSort = searchParams.get('sort') || 'featured';

  switch (shopSort) {
    case 'price-low-high':
      return { sortBy: 'price', sortOrder: 'asc' };
    case 'price-high-low':
      return { sortBy: 'price', sortOrder: 'desc' };
    case 'newest':
      return { sortBy: 'createdAt', sortOrder: 'desc' };
    case 'highest-rated':
      return { sortBy: 'rating', sortOrder: 'desc' };
    case 'best-selling':
      return { sortBy: 'deliveredOrderCount', sortOrder: 'desc' };
    case 'biggest-discount':
      return { sortBy: 'discountPercentage', sortOrder: 'desc' };
    case 'a-z':
      return { sortBy: 'name', sortOrder: 'asc' };
    case 'z-a':
      return { sortBy: 'name', sortOrder: 'desc' };
    case 'featured':
    default:
      return { sortBy: 'featured', sortOrder: 'desc' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams: rawSearchParams } = new URL(request.url);
    const searchParams = normalizeShopSearchParams(rawSearchParams);
    const search = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';
    const brand = searchParams.get('brand')?.trim() || '';
    const featured = searchParams.get('featured') || '';
    const isNew = searchParams.get('new') || '';
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const listingView = searchParams.get('view') === 'listing';
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const maxLimit = listingView ? 60 : 500;
    const limit = Math.min(maxLimit, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 20));
    const skip = (page - 1) * limit;
    const { sortBy, sortOrder } = resolveProductSort(searchParams);
    const slugParam = searchParams.get('slug')?.trim() || '';
    const minPrice = getNumericFilter(searchParams.get('minPrice'));
    const maxPrice = getNumericFilter(searchParams.get('maxPrice'));
    const inStock = searchParams.get('inStock') === 'true';

    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (activeOnly) where.isActive = true;
    if (featured === 'true') where.isFeatured = true;
    if (isNew === 'true') where.isNew = true;
    if (slugParam) where.slug = slugParam;

    if (category) {
      const categoryValues = getCsvFilterValues(category);
      where.category = {
        OR: categoryValues.flatMap((value) => [
          { name: { contains: value, mode: 'insensitive' as const } },
          { slug: { equals: value, mode: 'insensitive' as const } },
        ]),
      };
    }

    if (brand) {
      const brandValues = getCsvFilterValues(brand);
      where.brand = {
        OR: brandValues.flatMap((value) => [
          { name: { contains: value, mode: 'insensitive' as const } },
          { slug: { equals: value, mode: 'insensitive' as const } },
        ]),
      };
    }

    if (minPrice != null || maxPrice != null) {
      where.price = {
        ...(minPrice != null ? { gte: minPrice } : {}),
        ...(maxPrice != null ? { lte: maxPrice } : {}),
      };
    }

    if (inStock) {
      where.quantity = { gt: 0 };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { metaTitle: { contains: search, mode: 'insensitive' } },
        { metaDescription: { contains: search, mode: 'insensitive' } },
        { metaKeywords: { contains: search, mode: 'insensitive' } },
        { focusKeyword: { contains: search, mode: 'insensitive' } },
        { searchTags: { has: search } },
        { synonyms: { has: search } },
        { banglaSearchTerms: { has: search } },
        { brand: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const allowedSortFields: Record<string, Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[]> = {
      featured: [
        { isFeatured: 'desc' },
        { flashSaleEligible: 'desc' },
        { deliveredOrderCount: 'desc' },
        { averageRating: 'desc' },
        { createdAt: 'desc' },
      ],
      createdAt: { createdAt: sortOrder },
      price: { price: sortOrder },
      name: { name: sortOrder },
      rating: [{ averageRating: sortOrder }, { reviewCount: 'desc' }, { createdAt: 'desc' }],
      reviewCount: { reviewCount: sortOrder },
      deliveredOrderCount: [{ deliveredOrderCount: sortOrder }, { orderCount: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
      confirmedOrderCount: { confirmedOrderCount: sortOrder },
      orderCount: { orderCount: sortOrder },
      viewCount: { viewCount: sortOrder },
      discountPercentage: [{ discountPercentage: sortOrder }, { averageRating: 'desc' }, { createdAt: 'desc' }],
    };
    const orderBy = allowedSortFields[sortBy] || allowedSortFields.featured;

    const listingProductQueryArgs = {
      where,
      orderBy,
      skip,
      take: limit,
      select: {
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
        createdAt: true,
        updatedAt: true,
        images: {
          orderBy: { sortOrder: 'asc' as const },
          take: 2,
          select: { url: true, alt: true, isDefault: true },
        },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            quantity: true,
            attributes: true,
            image: true,
          },
          take: 8,
        },
      },
    } satisfies Prisma.ProductFindManyArgs;

    const fullProductQueryArgs = {
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        images: { orderBy: { sortOrder: 'asc' as const }, take: 10 },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            quantity: true,
            attributes: true,
            image: true,
          },
          take: 20,
        },
      },
    } satisfies Prisma.ProductFindManyArgs;

    type ListingProduct = Prisma.ProductGetPayload<{
      select: typeof listingProductQueryArgs.select;
    }>;
    type FullProduct = Prisma.ProductGetPayload<{
      include: typeof fullProductQueryArgs.include;
    }>;

    const [products, totalCount, facets] = await Promise.all([
      listingView
        ? prisma.product.findMany(listingProductQueryArgs)
        : prisma.product.findMany(fullProductQueryArgs),
      prisma.product.count({ where }),
      buildProductFacets(where),
    ]);

    const formatted = products.map((rawProduct) => {
      if (listingView) {
        const product = rawProduct as ListingProduct;
        const mainImage = product.images.find((image) => image.isDefault) || product.images[0];
        const price = product.price.toNumber();
        const compareAtPrice = product.compareAtPrice ? product.compareAtPrice.toNumber() : null;
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
          categoryId: product.categoryId || '',
          categorySlug: product.category?.slug || '',
          brand: product.brand?.name || '',
          brandId: product.brandId || '',
          brandSlug: product.brand?.slug || '',
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          isNew: product.isNew,
          featured: product.isFeatured,
          rating: product.averageRating?.toNumber() || 0,
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
          deliveryOfferEnabled: product.deliveryOfferEnabled,
          deliveryOfferType: product.deliveryOfferType,
          deliveryOfferAmount: product.deliveryOfferAmount ? product.deliveryOfferAmount.toNumber() : null,
          deliveryOfferStartDate: product.deliveryOfferStartDate?.toISOString() || null,
          deliveryOfferEndDate: product.deliveryOfferEndDate?.toISOString() || null,
          deliveryOfferBadgeText: product.deliveryOfferBadgeText || '',
          deliveryBadge: trustBadges.deliveryBadge,
          badges: trustBadges.badges,
          freeShippingEligible: trustBadges.freeShippingEligible,
          tags: product.metaKeywords || '',
          hasVariants: product.variants.length > 0,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            name: variant.name,
            price: variant.price?.toNumber() ?? price,
            stock: variant.quantity,
            quantity: variant.quantity,
            attributes: variant.attributes || {},
            image: variant.image || null,
          })),
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
        };
      }

      const product = rawProduct as FullProduct;
      const mainImage = product.images.find((image) => image.isDefault) || product.images[0];
      const price = product.price.toNumber();
      const compareAtPrice = product.compareAtPrice ? product.compareAtPrice.toNumber() : null;
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
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        price,
        originalPrice: compareAtPrice,
        compareAtPrice,
        salePrice: product.salePrice ? product.salePrice.toNumber() : null,
        costPrice: product.costPrice ? product.costPrice.toNumber() : null,
        discountPercentage: product.discountPercentage?.toNumber() || 0,
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
        inStock: product.quantity > 0,
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
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        isNew: product.isNew,
        status: !product.isActive ? 'inactive' : product.quantity === 0 ? 'out_of_stock' : 'active',
        featured: product.isFeatured,
        rating: product.averageRating?.toNumber() || 0,
        reviews: product.reviewCount || 0,
        reviewCount: product.reviewCount || 0,
        averageRating: product.averageRating?.toNumber() || 0,
        viewCount: product.viewCount || 0,
        uniqueViewCount: product.uniqueViewCount || 0,
        orderCount: product.orderCount || 0,
        confirmedOrderCount: product.confirmedOrderCount || 0,
        deliveredOrderCount: product.deliveredOrderCount || 0,
        salesCount: product.deliveredOrderCount || product.confirmedOrderCount || product.orderCount || 0,
        codAvailable: trustBadges.isCODAvailable,
        isCODAvailable: trustBadges.isCODAvailable,
        returnEligible: trustBadges.returnEligible,
        authenticityBadge: trustBadges.authenticityBadge,
        preOrderOption: product.preOrderOption,
        deliveryOfferEnabled: product.deliveryOfferEnabled,
        deliveryOfferType: product.deliveryOfferType,
        deliveryOfferAmount: product.deliveryOfferAmount ? product.deliveryOfferAmount.toNumber() : null,
        deliveryOfferStartDate: product.deliveryOfferStartDate?.toISOString() || null,
        deliveryOfferEndDate: product.deliveryOfferEndDate?.toISOString() || null,
        deliveryOfferBadgeText: product.deliveryOfferBadgeText || '',
        deliveryBadge: trustBadges.deliveryBadge,
        badges: trustBadges.badges,
        freeShippingEligible: trustBadges.freeShippingEligible,
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
        metaKeywords: product.metaKeywords || '',
        tags: product.metaKeywords || '',
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
        imageAltTexts: product.imageAltTexts || [],
        skinType: product.skinType || [],
        ingredients: product.ingredients || '',
        shelfLife: product.shelfLife || '',
        expiryDate: product.expiryDate?.toISOString() || null,
        originCountry: product.originCountry || 'Bangladesh (Local)',
        weight: product.weight ? product.weight.toNumber() : null,
        length: product.length ? product.length.toNumber() : null,
        width: product.width ? product.width.toNumber() : null,
        height: product.height ? product.height.toNumber() : null,
        dimensions: {
          length: product.length ? product.length.toNumber().toString() : '',
          width: product.width ? product.width.toNumber().toString() : '',
          height: product.height ? product.height.toNumber().toString() : '',
        },
        shippingWeight: product.shippingWeight || '',
        isFragile: product.isFragile || false,
        flashSaleEligible: product.flashSaleEligible || false,
        offerStartDate: product.offerStartDate?.toISOString() || null,
        offerEndDate: product.offerEndDate?.toISOString() || null,
        barcode: product.barcode || '',
        condition: product.condition || 'NEW',
        gtin: product.gtin || '',
        relatedProducts: parseRelatedProducts(product.relatedProducts),
        hasVariants: product.variants.length > 0,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          name: variant.name,
          price: variant.price?.toNumber() ?? price,
          stock: variant.quantity,
          quantity: variant.quantity,
          attributes: variant.attributes || {},
          image: variant.image || null,
        })),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      };
    });

    const responsePayload = {
      products: formatted,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      facets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      meta: {
        listingView,
        payloadPolicy: listingView ? 'listing-lightweight' : 'full-product',
      },
    };

    return NextResponse.json(responsePayload, {
      headers: getShopPayloadHeaders(responsePayload, {
        'Cache-Control': listingView ? SHOP_LISTING_CACHE_CONTROL : 'no-store',
        'X-Shop-Listing-View': listingView ? 'true' : 'false',
      }),
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
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

    const product = await createAdminProduct(await request.json());

    return NextResponse.json(
      { success: true, product: { id: product.id, slug: product.slug, name: product.name } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AdminProductError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
