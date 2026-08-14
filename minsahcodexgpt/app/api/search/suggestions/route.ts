import { NextRequest, NextResponse } from 'next/server';
import { esClient, PRODUCT_INDEX } from '@/lib/elasticsearch';
import {
  getMatchingTrendingQueries,
  getTrendingProductIds,
  getTrendingQueries,
  getZeroResultQueries,
} from '@/lib/elasticsearch/trending';
import { buildActiveProductESFilters, isActiveSearchHit } from '@/lib/search/activeProductFilter';

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
      source: 'elasticsearch_autocomplete' | 'trending_product';
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


function jsonNoStore(payload: unknown, init?: ResponseInit) {
  const response = NextResponse.json(payload, init);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
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
      const [popularQueries, trendingProducts] = await Promise.all([
        getTrendingQueries(trendingLimit),
        fetchTrendingProductSuggestions(Math.max(1, Math.min(limit, 4))),
      ]);

      const suggestions = dedupeSuggestions([
        ...popularQueries.map((item) => toTrendingSuggestion(item, 'popular_query')),
        ...trendingProducts,
      ], Math.max(trendingLimit, limit));

      return jsonNoStore({
        success: true,
        source: 'redis_persistent_trending',
        count: suggestions.length,
        suggestions,
      });
    }

    const [productSuggestions, matchingTrending, synonymSuggestions, trendingProducts] = await Promise.all([
      fetchProductSuggestions(normalizedQuery, limit),
      getMatchingTrendingQueries(normalizedQuery, 3),
      Promise.resolve(getSynonymSuggestions(normalizedQuery, 3)),
      fetchTrendingProductSuggestions(2),
    ]);

    let fallback: { strategy: string; applied: boolean; message: string } | null = null;
    let zeroResultFallbackSuggestions: ApiSuggestion[] = [];

    if (productSuggestions.length === 0) {
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
      ...productSuggestions,
      ...matchingTrending.map((item) => toTrendingSuggestion(item, 'matching_trending_query')),
      ...synonymSuggestions,
      ...(productSuggestions.length === 0 ? zeroResultFallbackSuggestions : []),
      ...(productSuggestions.length === 0 ? trendingProducts : []),
    ], limit);

    return jsonNoStore({
      success: true,
      source: 'elasticsearch_plus_redis_persistent_trending',
      count: suggestions.length,
      suggestions,
      ...(fallback && { fallback }),
    });
  } catch (error) {
    console.error('❌ Suggestions error:', error);
    return jsonNoStore(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
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
      _source: ['id', 'name', 'slug', 'price', 'images', 'image', 'isActive', 'deletedAt', 'status', 'visibility', 'isFeatured', 'isFlashSale', 'isNewArrival'],
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
      _source: ['id', 'name', 'slug', 'price', 'images', 'image', 'isActive', 'deletedAt', 'status', 'visibility', 'isFeatured', 'isFlashSale', 'isNewArrival'],
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
  };
}
