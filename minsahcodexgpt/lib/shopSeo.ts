import prisma from '@/lib/prisma';
import { absoluteUrl } from '@/lib/seo';
import { normalizeShopSearchParams } from '@/lib/shopUtils';
import { buildCollectionPageJsonLd, buildProductItemListJsonLd } from '@/lib/seoStructuredData';

type RawSearchParams = { [key: string]: string | string[] | undefined };

export type ShopSeoState = {
  params: URLSearchParams;
  canonicalPath: string;
  canonicalUrl: string;
  shouldNoIndex: boolean;
  reason: string;
  indexableTarget: 'shop' | 'category' | 'brand' | 'none';
};

const DEEP_FILTER_KEYS = [
  'q',
  'subcategory',
  'minPrice',
  'maxPrice',
  'rating',
  'inStock',
  'saleOnly',
  'skinType',
  'skinConcern',
  'tags',
] as const;

const NON_CANONICAL_SORT_VALUES = new Set([
  'best-selling',
  'newest',
  'price-low-high',
  'price-high-low',
  'highest-rated',
  'biggest-discount',
]);

function getFirstParam(params: URLSearchParams, key: string): string {
  return params.get(key)?.trim() || '';
}

function hasCommaList(value: string): boolean {
  return value.split(',').map((item) => item.trim()).filter(Boolean).length > 1;
}

function getPage(params: URLSearchParams): number {
  const page = Number(params.get('page') || '1');
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function getShopSeoState(rawSearchParams: RawSearchParams): ShopSeoState {
  const params = normalizeShopSearchParams(rawSearchParams);
  const category = getFirstParam(params, 'category');
  const brand = getFirstParam(params, 'brand');
  const sort = getFirstParam(params, 'sort');
  const page = getPage(params);

  const hasDeepFilter = DEEP_FILTER_KEYS.some((key) => Boolean(getFirstParam(params, key)));
  const hasNonCanonicalSort = sort ? NON_CANONICAL_SORT_VALUES.has(sort) : false;
  const hasMultipleCategoryOrBrand = hasCommaList(category) || hasCommaList(brand);
  const hasCategoryBrandCombination = Boolean(category && brand);
  const shouldNoIndex = page > 1 || hasDeepFilter || hasNonCanonicalSort || hasMultipleCategoryOrBrand || hasCategoryBrandCombination;

  let canonicalPath = '/shop';
  let indexableTarget: ShopSeoState['indexableTarget'] = 'shop';
  let reason = 'Base shop page is canonical and indexable.';

  if (category && !hasCommaList(category)) {
    canonicalPath = `/categories/${encodeURIComponent(category)}`;
    indexableTarget = 'category';
    reason = shouldNoIndex
      ? 'Category-filtered shop URL contains deep filters or combinations; canonical points to category landing page and page is noindex.'
      : 'Clean category shop URL canonicalizes to category landing page.';
  } else if (brand && !hasCommaList(brand)) {
    canonicalPath = `/brands/${encodeURIComponent(brand)}`;
    indexableTarget = 'brand';
    reason = shouldNoIndex
      ? 'Brand-filtered shop URL contains deep filters or combinations; canonical points to brand landing page and page is noindex.'
      : 'Clean brand shop URL canonicalizes to brand landing page.';
  } else if (shouldNoIndex) {
    indexableTarget = 'none';
    reason = 'Search, sort, pagination, price, availability, or multi-filter shop URL is noindex/follow and canonicalizes to /shop.';
  }

  return {
    params,
    canonicalPath,
    canonicalUrl: absoluteUrl(canonicalPath),
    shouldNoIndex,
    reason,
    indexableTarget,
  };
}

export function getShopRobotsMetadata(shouldNoIndex: boolean) {
  return shouldNoIndex
    ? {
        index: false,
        follow: true,
        googleBot: {
          index: false,
          follow: true,
        },
      }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large' as const,
          'max-snippet': -1 as const,
        },
      };
}

export async function getShopItemListJsonLd(params: URLSearchParams) {
  const category = getFirstParam(params, 'category');
  const brand = getFirstParam(params, 'brand');
  const minPrice = Number(params.get('minPrice') || '');
  const maxPrice = Number(params.get('maxPrice') || '');
  const inStock = params.get('inStock') === 'true';

  const priceFilter = {
    ...(Number.isFinite(minPrice) && minPrice > 0 ? { gte: minPrice } : {}),
    ...(Number.isFinite(maxPrice) && maxPrice > 0 ? { lte: maxPrice } : {}),
  };

  const where = {
    isActive: true,
    deletedAt: null,
    ...(category
      ? {
          category: {
            slug: category,
            isActive: true,
          },
        }
      : {}),
    ...(brand
      ? {
          brand: {
            slug: brand,
            isActive: true,
          },
        }
      : {}),
    ...(Object.keys(priceFilter).length > 0 ? { price: priceFilter } : {}),
    ...(inStock ? { quantity: { gt: 0 } } : {}),
  };

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      slug: true,
      name: true,
      shortDescription: true,
      description: true,
      price: true,
      salePrice: true,
      compareAtPrice: true,
      quantity: true,
      averageRating: true,
      reviewCount: true,
      images: { select: { url: true, alt: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      brand: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
    },
    orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
    take: 24,
  });

  const canonicalUrl = category
    ? absoluteUrl(`/categories/${encodeURIComponent(category)}`)
    : brand
      ? absoluteUrl(`/brands/${encodeURIComponent(brand)}`)
      : absoluteUrl('/shop');

  const collectionName = category
    ? `Shop ${category} beauty products`
    : brand
      ? `Shop ${brand} products`
      : 'Shop Beauty & Skincare in Bangladesh';

  return buildProductItemListJsonLd({
    name: collectionName,
    url: canonicalUrl,
    description: 'Current server-rendered product list for Minsah Beauty shop discovery.',
    products,
  });
}

export function buildShopCollectionJsonLd(canonicalUrl: string) {
  return buildCollectionPageJsonLd({
    name: 'Shop Beauty & Skincare in Bangladesh',
    url: canonicalUrl,
    description: 'Shop authentic beauty, skincare, makeup and personal care products in Bangladesh with COD, bKash/Nagad payment and fast delivery.',
  });
}
