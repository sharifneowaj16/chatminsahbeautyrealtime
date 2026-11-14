import { NextRequest, NextResponse } from 'next/server';
import { esClient, PRODUCT_INDEX } from '@/lib/elasticsearch';
import prisma from '@/lib/prisma';
import { searchSuggestL1Cache } from '@/lib/cache/lru';
import { cacheGet, cacheSet } from '@/lib/cache/redis';
import {
  getMatchingTrendingQueries,
  getTrendingProductIds,
  getTrendingQueries,
  getZeroResultQueries,
} from '@/lib/elasticsearch/trending';
import { buildActiveProductESFilters, isActiveSearchHit } from '@/lib/search/activeProductFilter';
import { executeDatabaseSearchFallback } from '@/lib/search/db-fallback';
import type { ProductSuggestionVariant } from '@/lib/search/types';

export const dynamic = 'force-dynamic';

interface ProductSuggestSource {
  id: string;
  name: string;
  slug: string;
  price: number;
  images?: string[];
  image?: string;
  isActive?: boolean;
  deletedAt?: string | null;
  status?: string;
  visibility?: string;
  isFeatured?: boolean;
  isFlashSale?: boolean;
  isNewArrival?: boolean;
  hasVariants?: boolean;
  inStock?: boolean;
  quantity?: number;
  stock?: number;
  rating?: number;
  reviewCount?: number;
  variants?: ProductSuggestionVariant[];
}

interface SuggestionOption {
  text: string;
  _score: number;
  _source?: ProductSuggestSource;
}


type ProductSearchResponse = {
  hits?: {
    hits?: Array<{
      _source?: ProductSuggestSource;
    }>;
  };
};

interface ElasticsearchSuggestResponse {
  product_suggest?: Array<{
    text: string;
    offset: number;
    length: number;
    options: SuggestionOption[];
  }>;
}

type ApiSuggestion =
  | {
    type: 'product';
    text: string;
    productId: string;
    productName: string;
    slug: string;
    price: number;
    image?: string;
    score?: number | null;
    badges?: string[];
    source: 'elasticsearch_autocomplete' | 'trending_product' | 'database_autocomplete_fallback';
    hasVariants?: boolean;
    inStock?: boolean;
    stock?: number;
    rating?: number;
    reviewCount?: number;
    variants?: ProductSuggestionVariant[];
  }
  | {
    type: 'trending';
    text: string;
    count: number;
    icon: string;
    source: 'popular_query' | 'matching_trending_query' | 'zero_result_fallback';
  }
  | {
    type: 'completion';
    text: string;
    icon: string;
    source: 'synonym_expansion';
  };


function jsonCached(payload: unknown, init?: ResponseInit, isError = false) {
  const response = NextResponse.json(payload, init);
  if (isError) {
    response.headers.set('Cache-Control', 'no-store, max-age=0');
  } else {
    // Vercel Edge CDN Cache: 60s edge cache with 300s background stale-while-revalidate
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  }
  return response;
}


const SYNONYM_EXPANSIONS: Record<string, string[]> = {
  spf: ['sunscreen', 'sunblock', 'sun protection'],
  sunscreen: ['spf', 'sunblock', 'sun cream'],
  sunblock: ['sunscreen', 'spf'],
  moisturizer: ['lotion', 'face cream', 'hydrating cream'],
  lotion: ['moisturizer', 'body lotion', 'face cream'],
  serum: ['essence', 'ampoule', 'booster'],
  cleanser: ['face wash', 'facial wash', 'cleansing foam'],
  'face wash': ['cleanser', 'facial wash', 'cleansing gel'],
  toner: ['face toner', 'balancing toner'],
  lipstick: ['lip color', 'lip tint', 'lip gloss'],
  kajal: ['kohl', 'eyeliner', 'kajol'],
  kajol: ['kajal', 'kohl', 'eyeliner'],
  perfume: ['fragrance', 'edp', 'edt', 'body mist'],
  fragrance: ['perfume', 'body mist', 'cologne'],
  shampoo: ['hair wash', 'hair cleanser'],
  conditioner: ['hair conditioner', 'deep conditioner'],
  acne: ['pimple', 'breakout', 'blemish'],
  pimple: ['acne', 'breakout', 'spot'],
  'dark spot': ['pigmentation', 'hyperpigmentation', 'melasma'],
  makeup: ['mekhap', 'base makeup', 'foundation'],
  mekhap: ['makeup', 'foundation', 'lipstick'],

  // Bangladesh/Banglish and common typo recovery
  syampu: ['shampoo', 'hair wash'],
  sampu: ['shampoo', 'hair cleanser'],
  sanskrin: ['sunscreen', 'spf'],
  sunscrean: ['sunscreen', 'spf'],
  suncreen: ['sunscreen', 'sunblock'],
  lipstik: ['lipstick', 'lip tint'],
  lipistik: ['lipstick', 'lip color'],
  facewash: ['face wash', 'cleanser'],
  feshwash: ['face wash', 'cleanser'],
  moist: ['moisturizer', 'hydrating cream'],
  moisturiser: ['moisturizer', 'face cream'],
  crosx: ['cosrx'],
  cosrex: ['cosrx'],
  ordinary: ['the ordinary'],
  ceravi: ['cerave'],
};

function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim();
}

function dedupeSuggestions(suggestions: ApiSuggestion[], limit: number): ApiSuggestion[] {
  const seen = new Set<string>();
  const deduped: ApiSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = suggestion.type === 'product'
      ? `product:${suggestion.productId || suggestion.slug}`
      : `${suggestion.type}:${suggestion.text.toLowerCase()}`;

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(suggestion);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

function getSynonymSuggestions(query: string, limit: number): ApiSuggestion[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const matches = new Set<string>();

  for (const [term, expansions] of Object.entries(SYNONYM_EXPANSIONS)) {
    if (term.startsWith(normalized) || term.includes(normalized) || normalized.includes(term)) {
      expansions.forEach((item) => matches.add(item));
    }
  }

  return [...matches]
    .filter((text) => text !== normalized)
    .slice(0, limit)
    .map((text) => ({
      type: 'completion' as const,
      text,
      icon: '✨',
      source: 'synonym_expansion' as const,
    }));
}

function toTrendingSuggestion(
  item: { query: string; count?: number; score?: number },
  source: 'popular_query' | 'matching_trending_query' | 'zero_result_fallback'
): ApiSuggestion {
  return {
    type: 'trending',
    text: item.query,
    count: item.count ?? item.score ?? 0,
    icon: source === 'zero_result_fallback' ? '💡' : '🔥',
    source,
  };
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q') || '';
    const limit = Math.max(1, Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '5', 10), 12));
    const trending = request.nextUrl.searchParams.get('trending') === 'true';
    const trendingLimit = Math.max(1, Math.min(parseInt(request.nextUrl.searchParams.get('trendingLimit') || '8', 10), 12));
    const normalizedQuery = normalizeQuery(query);

    if (trending || !normalizedQuery) {
      const trendingL1Key = `trending:${trendingLimit}:${limit}`;
      const trendingL2Key = `cache:suggest:trending:${trendingLimit}:${limit}`;

      // Tier 1: In-Memory L1 Cache (0.01ms)
      const trendingL1Hit = searchSuggestL1Cache.get(trendingL1Key);
      if (trendingL1Hit) {
        const response = jsonCached({
          ...trendingL1Hit,
          source: 'l1_memory_cache',
        });
        response.headers.set('X-Search-Cache', 'HIT-L1');
        return response;
      }

      // Tier 2: Redis L2 Cache (1-2ms)
      const trendingL2Hit = await cacheGet<any>(trendingL2Key);
      if (trendingL2Hit) {
        searchSuggestL1Cache.set(trendingL1Key, trendingL2Hit, 120_000);
        const response = jsonCached({
          ...trendingL2Hit,
          source: 'l2_redis_cache',
        });
        response.headers.set('X-Search-Cache', 'HIT-L2');
        return response;
      }

      const [popularQueries, trendingProducts] = await Promise.all([
        getTrendingQueries(trendingLimit),
        fetchTrendingProductSuggestions(Math.max(1, Math.min(limit, 4))),
      ]);

      const suggestions = dedupeSuggestions([
        ...popularQueries.map((item) => toTrendingSuggestion(item, 'popular_query')),
        ...trendingProducts,
      ], Math.max(trendingLimit, limit));

      const payload = {
        success: true,
        source: 'redis_persistent_trending',
        count: suggestions.length,
        suggestions,
      };

      // Populate L1 (2m) and L2 Redis (15m)
      searchSuggestL1Cache.set(trendingL1Key, payload, 120_000);
      await cacheSet(trendingL2Key, payload, 900);

      const response = jsonCached(payload);
      response.headers.set('X-Search-Cache', 'MISS-ES');
      return response;
    }

    // ── Tier 1: Node.js In-Memory L1 Cache (0.01ms response) ───────────
    const l1Key = `${normalizedQuery}:${limit}`;
    const l2Key = `cache:suggest:${normalizedQuery}:${limit}`;

    const l1Hit = searchSuggestL1Cache.get(l1Key);
    if (l1Hit) {
      const response = jsonCached({
        ...l1Hit,
        source: 'l1_memory_cache',
      });
      response.headers.set('X-Search-Cache', 'HIT-L1');
      return response;
    }

    // ── Tier 2: Redis L2 Cache (1-2ms response) ────────────────────────
    const l2Hit = await cacheGet<any>(l2Key);
    if (l2Hit) {
      searchSuggestL1Cache.set(l1Key, l2Hit, 120_000);
      const response = jsonCached({
        ...l2Hit,
        source: 'l2_redis_cache',
      });
      response.headers.set('X-Search-Cache', 'HIT-L2');
      return response;
    }

    const [productSuggestions, matchingTrending, synonymSuggestions, trendingProducts] = await Promise.all([
      fetchProductSuggestions(normalizedQuery, limit),
      getMatchingTrendingQueries(normalizedQuery, 3),
      Promise.resolve(getSynonymSuggestions(normalizedQuery, 3)),
      fetchTrendingProductSuggestions(2),
    ]);

    let activeProductSuggestions = productSuggestions;
    if (activeProductSuggestions.length === 0 && normalizedQuery.length >= 2) {
      try {
        const dbFallback = await executeDatabaseSearchFallback(
          new URLSearchParams({ q: normalizedQuery, limit: String(limit) }),
          Date.now()
        );
        if (dbFallback.products && dbFallback.products.length > 0) {
          activeProductSuggestions = dbFallback.products.map((p) => ({
            type: 'product',
            text: p.name,
            productId: p.id,
            productName: p.name,
            slug: p.slug,
            price: p.price,
            image: p.image || p.images?.[0],
            rating: p.rating,
            reviewCount: p.reviewCount,
            hasVariants: p.hasVariants,
            variants: p.variants?.map((v) => ({
              id: v.id,
              sku: v.sku || '',
              name: v.name,
              price: v.price,
              stock: v.stock,
              image: v.image,
              attributes: v.attributes,
            })),
            inStock: p.inStock,
            badges: p.badges,
            source: 'database_autocomplete_fallback',
          }));
        }
      } catch (err) {
        console.warn('Database suggestions fallback failed:', err);
      }
    }

    let fallback: { strategy: string; applied: boolean; message: string } | null = null;
    let zeroResultFallbackSuggestions: ApiSuggestion[] = [];

    if (activeProductSuggestions.length === 0) {
      const zeroResultQueries = await getZeroResultQueries(5);
      zeroResultFallbackSuggestions = zeroResultQueries
        .filter((item) => item.query !== normalizedQuery)
        .slice(0, 2)
        .map((item) => toTrendingSuggestion(item, 'zero_result_fallback'));

      fallback = {
        strategy: 'synonym_trending_zero_result_recovery',
        applied: true,
        message: 'No direct product completion matched. Showing synonym, popular query, and trending product fallbacks.',
      };
    }

    const suggestions = dedupeSuggestions([
      ...activeProductSuggestions,
      ...matchingTrending.map((item) => toTrendingSuggestion(item, 'matching_trending_query')),
      ...synonymSuggestions,
      ...(activeProductSuggestions.length === 0 ? zeroResultFallbackSuggestions : []),
      ...(activeProductSuggestions.length === 0 ? trendingProducts : []),
    ], limit);

    const hydratedSuggestions = await hydrateVariantsIfMissing(suggestions);

    const payload = {
      success: true,
      source: 'elasticsearch_plus_redis_persistent_trending',
      count: hydratedSuggestions.length,
      suggestions: hydratedSuggestions,
      ...(fallback && { fallback }),
    };

    // Populate L1 (2 mins) and L2 Redis (15 mins = 900 seconds)
    searchSuggestL1Cache.set(l1Key, payload, 120_000);
    await cacheSet(l2Key, payload, 900);

    const response = jsonCached(payload);
    response.headers.set('X-Search-Cache', 'MISS-ES');
    return response;
  } catch (error) {
    console.error('❌ Suggestions error:', error);
    return jsonCached(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
      true
    );
  }
}

async function hydrateVariantsIfMissing(suggestions: ApiSuggestion[]): Promise<ApiSuggestion[]> {
  const missingVariantProductIds = suggestions
    .filter((s): s is Extract<ApiSuggestion, { type: 'product' }> =>
      s.type === 'product' && Boolean(s.hasVariants) && (!s.variants || s.variants.length === 0)
    )
    .map((s) => s.productId);

  if (missingVariantProductIds.length === 0) return suggestions;

  try {
    const rawVariants = await prisma.productVariant.findMany({
      where: {
        productId: { in: missingVariantProductIds },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        productId: true,
        sku: true,
        name: true,
        price: true,
        salePrice: true,
        quantity: true,
        image: true,
        attributes: true,
      },
      take: 60,
    });

    const variantsByProduct = new Map<string, ProductSuggestionVariant[]>();
    for (const v of rawVariants) {
      const list = variantsByProduct.get(v.productId) || [];
      const vPrice = v.salePrice ? Number(v.salePrice) : v.price ? Number(v.price) : 0;
      list.push({
        id: v.id,
        sku: v.sku,
        name: v.name,
        price: vPrice,
        stock: v.quantity ?? 0,
        image: v.image ?? null,
        attributes: (v.attributes as Record<string, string>) || null,
      });
      variantsByProduct.set(v.productId, list);
    }

    return suggestions.map((s) => {
      if (s.type === 'product' && s.hasVariants && (!s.variants || s.variants.length === 0)) {
        const variants = variantsByProduct.get(s.productId);
        if (variants && variants.length > 0) {
          return {
            ...s,
            variants,
          };
        }
      }
      return s;
    });
  } catch (err) {
    console.warn('Variant hydration warning:', err);
    return suggestions;
  }
}

async function fetchProductSuggestions(query: string, limit: number): Promise<ApiSuggestion[]> {
  try {
    const response = await esClient.search({
      index: PRODUCT_INDEX,
      suggest: {
        product_suggest: {
          prefix: query,
          completion: {
            field: 'suggest',
            // Fetch extra options because inactive/deleted products are filtered after completion suggest.
            size: Math.min(limit * 4, 40),
            skip_duplicates: true,
          },
        },
      },
      _source: ['id', 'name', 'slug', 'price', 'images', 'image', 'isActive', 'deletedAt', 'status', 'visibility', 'isFeatured', 'isFlashSale', 'isNewArrival', 'hasVariants', 'inStock', 'quantity', 'stock', 'rating', 'reviewCount', 'variants'],
    });

    const suggestData = response.suggest as ElasticsearchSuggestResponse;
    const options = (suggestData.product_suggest?.[0]?.options ?? [])
      .filter((option) => isActiveSearchHit(option._source))
      .slice(0, limit);

    return options.map((option) => mapProductSourceToSuggestion(option._source, {
      text: option.text,
      score: option._score,
      source: 'elasticsearch_autocomplete',
    })).filter((item): item is ApiSuggestion => Boolean(item));
  } catch (error) {
    console.error('❌ Product suggestions fetch error:', error);
    return [];
  }
}

async function fetchTrendingProductSuggestions(limit: number): Promise<ApiSuggestion[]> {
  const trendingProductIds = await getTrendingProductIds(Math.max(limit * 3, 6));
  if (trendingProductIds.length === 0) return [];

  try {
    const response = await esClient.search({
      index: PRODUCT_INDEX,
      query: {
        bool: {
          filter: [
            ...buildActiveProductESFilters(),
            { ids: { values: trendingProductIds } },
          ],
        },
      },
      size: trendingProductIds.length,
      _source: ['id', 'name', 'slug', 'price', 'images', 'image', 'isActive', 'deletedAt', 'status', 'visibility', 'isFeatured', 'isFlashSale', 'isNewArrival', 'hasVariants', 'inStock', 'quantity', 'stock', 'rating', 'reviewCount', 'variants'],
    }) as ProductSearchResponse;

    const byId = new Map<string, ProductSuggestSource>();
    for (const hit of response.hits?.hits ?? []) {
      const source = hit._source as ProductSuggestSource;
      if (isActiveSearchHit(source)) byId.set(source.id, source);
    }

    return trendingProductIds
      .map((id) => byId.get(id))
      .filter((source): source is ProductSuggestSource => Boolean(source))
      .slice(0, limit)
      .map((source) => mapProductSourceToSuggestion(source, {
        text: source.name,
        score: null,
        source: 'trending_product',
      }))
      .filter((item): item is ApiSuggestion => Boolean(item));
  } catch (error) {
    console.error('❌ Trending product suggestions fetch error:', error);
    return [];
  }
}

function mapProductSourceToSuggestion(
  source: ProductSuggestSource | undefined,
  options: { text: string; score: number | null; source: 'elasticsearch_autocomplete' | 'trending_product' }
): ApiSuggestion | null {
  if (!source) return null;

  const badges: string[] = [];
  if (source.isFeatured) badges.push('Featured');
  if (source.isFlashSale) badges.push('Flash Sale');
  if (source.isNewArrival) badges.push('New');

  const inStock = source.inStock !== false &&
    (source.quantity === undefined || source.quantity > 0) &&
    (source.stock === undefined || source.stock > 0);

  return {
    type: 'product',
    text: options.text,
    productId: source.id,
    productName: source.name,
    slug: source.slug,
    price: source.price ?? 0,
    image: source.images?.[0] || source.image,
    score: options.score,
    badges,
    source: options.source,
    hasVariants: Boolean(source.hasVariants),
    inStock,
    stock: source.stock ?? source.quantity,
    rating: source.rating,
    reviewCount: source.reviewCount,
    variants: source.variants,
  };
}
