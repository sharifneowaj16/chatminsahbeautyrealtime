import { NextRequest, NextResponse } from 'next/server';
import { esClient, PRODUCT_INDEX } from '@/lib/elasticsearch';
import { sanitizeQuery, validateNumericParam, validateSearchParams } from '@/lib/elasticsearch/utils';
import { searchMetrics } from '@/lib/elasticsearch/metrics';
import { BehaviorTracker } from '@/lib/tracking/behavior';
import { buildActiveProductESFilters } from '@/lib/search/activeProductFilter';
import { trackSearchQuery, trackZeroResultQuery } from '@/lib/elasticsearch/trending';
import { trackFailedQuery, trackQueryImpression } from '@/lib/elasticsearch/searchAnalytics';
import { executeDatabaseSearchFallback } from '@/lib/search/db-fallback';
import { normalizeShopSearchParams } from '@/lib/shopUtils';
import { SHOP_LISTING_CACHE_CONTROL, SHOP_SEARCH_SOURCE_FIELDS, getShopPayloadHeaders } from '@/lib/shopPerformance';
// ✅ CTR + Discount boost (Amazon A9 + Daraz style)
import {
  getQueryCTRData,
  buildCTRBoostFunctions,
  buildDiscountBoostFunctions,
} from '@/lib/elasticsearch/ctrBoost';

// ✅ Type definitions for search
interface ProductSource {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  category?: string;
  categorySlug?: string;
  categoryName?: string;
  subcategory?: string;
  subcategorySlug?: string;
  subcategoryName?: string;
  brand?: string;
  brandSlug?: string;
  images?: string[];
  inStock: boolean;
  stock?: number;
  quantity?: number;
  totalStock?: number;
  availableQuantity?: number;
  isActive?: boolean;
  deletedAt?: string | null;
  status?: string;
  visibility?: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  codAvailable?: boolean;
  isCODAvailable?: boolean;
  freeShippingEligible?: boolean;
  returnEligible?: boolean;
  authenticityBadge?: boolean;
  deliveryBadge?: string | null;
  badges?: string[];
  viewCount?: number;
  salesCount?: number;
  orderCount?: number;
  confirmedOrderCount?: number;
  deliveredOrderCount?: number;
  isFeatured?: boolean;
  isFlashSale?: boolean;
  isNewArrival?: boolean;
}

interface SearchHit {
  _id: string;
  _score: number;
  _source: ProductSource;
  highlight?: {
    name?: string[];
    description?: string[];
  };
}

interface AggregationBucket {
  key: string;
  doc_count: number;
  category_label?: { buckets: Array<{ key: string; doc_count: number }> };
  brand_label?: { buckets: Array<{ key: string; doc_count: number }> };
}

interface SpellSuggestion {
  text: string;
  offset: number;
  length: number;
  options: Array<{
    text: string;
    score: number;
    freq: number;
  }>;
}

interface ElasticsearchSearchResponse {
  hits: {
    total: number | { value: number; relation: string };
    hits: SearchHit[];
  };
  aggregations?: {
    categories?: { buckets: AggregationBucket[] };
    brands?: { buckets: AggregationBucket[] };
    price_ranges?: { buckets: AggregationBucket[] };
    availability?: { buckets: Record<string, { doc_count: number }> };
    ratings?: { buckets: Record<string, { doc_count: number }> };
    avg_price?: { value?: number };
    min_price?: { value?: number };
    max_price?: { value?: number };
  };
  suggest?: {
    spell_correction?: SpellSuggestion[];
  };
}

function getCsvFilterValues(value: string | null): string[] {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSlugFilterValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSlugFilterParam(value: string | null): string | null {
  const normalized = getCsvFilterValues(value)
    .map(normalizeSlugFilterValue)
    .filter(Boolean)
    .join(',');
  return normalized || null;
}

function normalizeCsvParam(value: string | null): string | null {
  const normalized = getCsvFilterValues(value).join(',');
  return normalized || null;
}

function getAggregationLabel(
  bucket: AggregationBucket,
  labelKey: 'category_label' | 'brand_label'
): string {
  return bucket[labelKey]?.buckets?.[0]?.key || bucket.key;
}

function buildPriceRangeFacet(bucket: AggregationBucket) {
  const rangeMap: Record<string, { label: string; value: string; min: number | null; max: number | null }> = {
    'under-500': { label: 'Under ৳500', value: 'under-500', min: null, max: 500 },
    '500-1000': { label: '৳500–৳1000', value: '500-1000', min: 500, max: 1000 },
    '1000-2000': { label: '৳1000–৳2000', value: '1000-2000', min: 1000, max: 2000 },
    'over-2000': { label: 'Above ৳2000', value: 'over-2000', min: 2000, max: null },
  };
  const preset = rangeMap[bucket.key] || { label: bucket.key, value: bucket.key, min: null, max: null };
  return { ...preset, count: bucket.doc_count };
}

function buildFallbackFacetsFromProducts(products: Array<ProductSource & { score?: number | null }>) {
  const categories = new Map<string, { label: string; count: number }>();
  const brands = new Map<string, { label: string; count: number }>();
  const priceBuckets: Record<string, { label: string; min: number | null; max: number | null; count: number }> = {
    'under-500': { label: 'Under ৳500', min: null, max: 500, count: 0 },
    '500-1000': { label: '৳500–৳1000', min: 500, max: 1000, count: 0 },
    '1000-2000': { label: '৳1000–৳2000', min: 1000, max: 2000, count: 0 },
    'over-2000': { label: 'Above ৳2000', min: 2000, max: null, count: 0 },
  };

  let inStockCount = 0;
  let outOfStockCount = 0;
  let rating4Up = 0;
  let rating3Up = 0;

  for (const product of products) {
    const categoryValue = product.categorySlug || normalizeSlugFilterValue(product.categoryName || product.category || '');
    if (categoryValue) {
      const previous = categories.get(categoryValue);
      categories.set(categoryValue, {
        label: product.categoryName || product.category || categoryValue,
        count: (previous?.count || 0) + 1,
      });
    }

    const brandValue = product.brandSlug || normalizeSlugFilterValue(product.brand || '');
    if (brandValue) {
      const previous = brands.get(brandValue);
      brands.set(brandValue, {
        label: product.brand || brandValue,
        count: (previous?.count || 0) + 1,
      });
    }

    if (product.price < 500) priceBuckets['under-500'].count += 1;
    else if (product.price < 1000) priceBuckets['500-1000'].count += 1;
    else if (product.price < 2000) priceBuckets['1000-2000'].count += 1;
    else priceBuckets['over-2000'].count += 1;

    if (product.inStock) inStockCount += 1;
    else outOfStockCount += 1;

    if ((product.rating || 0) >= 4) rating4Up += 1;
    if ((product.rating || 0) >= 3) rating3Up += 1;
  }

  return {
    categories: Array.from(categories.entries()).map(([value, data]) => ({ value, label: data.label, count: data.count })),
    brands: Array.from(brands.entries()).map(([value, data]) => ({ value, label: data.label, count: data.count })),
    priceRanges: Object.entries(priceBuckets)
      .map(([value, bucket]) => ({ value, ...bucket }))
      .filter((bucket) => bucket.count > 0),
    skinTypes: [],
    concerns: [],
    availability: [
      { label: 'In Stock', value: 'in_stock', count: inStockCount },
      { label: 'Out of Stock', value: 'out_of_stock', count: outOfStockCount },
    ].filter((facet) => facet.count > 0),
    ratings: [
      { label: '4★ & up', value: '4-up', min: 4, count: rating4Up },
      { label: '3★ & up', value: '3-up', min: 3, count: rating3Up },
    ].filter((facet) => facet.count > 0),
  };
}

function normalizeTagFilterValues(value: string | null): string[] {
  return getCsvFilterValues(value);
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

function buildExactKeywordFilter(field: string, values: string[]) {
  if (values.length === 1) {
    return { term: { [field]: values[0] } };
  }

  return { terms: { [field]: values } };
}

function buildSlugOrLabelExactFilter(labelField: string, slugField: string, values: string[]) {
  if (values.length === 0) {
    return { match_none: {} };
  }

  const slugs = values.map(normalizeSlugFilterValue).filter(Boolean);

  if (values.length === 1) {
    return {
      bool: {
        should: [
          { term: { [labelField]: values[0] } },
          { term: { [slugField]: slugs[0] || values[0] } },
        ],
        minimum_should_match: 1,
      },
    };
  }

  return {
    bool: {
      should: [
        { terms: { [labelField]: values } },
        { terms: { [slugField]: slugs } },
      ],
      minimum_should_match: 1,
    },
  };
}

function buildBrandExactFilter(values: string[]) {
  if (values.length === 0) {
    return { match_none: {} };
  }

  const brandSlugs = values.map(normalizeSlugFilterValue).filter(Boolean);

  if (values.length === 1) {
    return {
      bool: {
        should: [
          { term: { 'brand.keyword': values[0] } },
          { term: { brandSlug: brandSlugs[0] || values[0] } },
        ],
        minimum_should_match: 1,
      },
    };
  }

  return {
    bool: {
      should: [
        { terms: { 'brand.keyword': values } },
        { terms: { brandSlug: brandSlugs } },
      ],
      minimum_should_match: 1,
    },
  };
}

// ✅ Zero-results fallback strategy
interface ZeroResultsFallback {
  strategy: 'relaxed_query' | 'category_browse' | 'popular_products';
  message: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let errorMessage: string | undefined;

  try {
    const searchParams = normalizeShopSearchParams(request.nextUrl.searchParams);

    // ✅ VALIDATE REQUEST PARAMETERS
    const validation = validateSearchParams(searchParams);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // ✅ SANITIZE AND VALIDATE INPUT
    const rawQuery = searchParams.get('q') || '';
    const query = sanitizeQuery(rawQuery);
    const category = normalizeSlugFilterParam(searchParams.get('category'));
    const subcategory = normalizeSlugFilterParam(searchParams.get('subcategory'));
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock') === 'true';
    const brand = normalizeCsvParam(searchParams.get('brand'));
    const rating = searchParams.get('rating');
    const tags = normalizeTagFilterValues(searchParams.get('tags'));

    const page = validateNumericParam(searchParams.get('page'), 1, 1, 1000);
    const limit = validateNumericParam(searchParams.get('limit'), 20, 1, 100);
    const sort = normalizeShopSort(searchParams.get('sort') || 'relevance');

    // ✅ Get user behavior for personalization (returns null server-side, handled below)
    const behavior = BehaviorTracker.getBehavior();
    const userCategories = behavior?.categoriesViewed || [];

    // ✅ FETCH CTR DATA in parallel (Redis cache 5min → DB fallback)
    // Only when sort=relevance — price/newest sort doesn't need CTR boost
    const ctrDataPromise = (query.trim() && sort === 'relevance')
      ? getQueryCTRData(query, 20)
      : Promise.resolve([]);

    // ========================================
    // BUILD ELASTICSEARCH QUERY
    // ========================================
    const must: any[] = [];
    const activeProductFilters = buildActiveProductESFilters();
    const filter: any[] = [...activeProductFilters];
    let userFilterCount = 0;
    const should: any[] = [];

    // ✅ MAIN SEARCH QUERY with SYNONYMS (via beauty_search analyzer on name/description)
    if (query.trim()) {
      must.push({
        multi_match: {
          query: query,
          fields: [
            'name^5',
            'brand^3',
            'brandSlug^2',
            'categoryName^2',
            'subcategoryName^2',
            'category^1.5',
            'subcategory^1.5',
            'description^1.5',
            'tags^2',
            'focusKeyword^4',
            'secondaryKeywords^3',
            'searchTags^3',
            'synonyms^3',
            'banglaSearchTerms^3',
            'buyingIntentKeywords^2.5',
            'reviewKeywords^2',
            'entities^2',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          prefix_length: 2,
        }
      });

      // Boost exact phrase matches
      should.push({
        match_phrase: {
          name: {
            query: query,
            boost: 3,
          }
        }
      });
    } else {
      must.push({ match_all: {} });
    }

    // ✅ PERSONALIZED RANKING: boost user's previously viewed categories
    if (userCategories.length > 0 && query.trim()) {
      should.push({
        terms: {
          categorySlug: userCategories.map(normalizeSlugFilterValue), // Phase 3: facet/filter slug field
          boost: 1.5,
        }
      });
    }

    // ✅ FILTERS
    if (category) {
      const categoryValues = getCsvFilterValues(category);
      // Phase 3: facets emit categorySlug values while some indexed docs also carry category labels.
      // Match both exact label and slug fields so quick-filter clicks stay reliable.
      filter.push(buildSlugOrLabelExactFilter('category', 'categorySlug', categoryValues));
      userFilterCount += 1;
    }
    if (subcategory) {
      const subcategoryValues = getCsvFilterValues(subcategory);
      filter.push(buildSlugOrLabelExactFilter('subcategory', 'subcategorySlug', subcategoryValues));
      userFilterCount += 1;
    }
    if (brand) {
      const brandValues = getCsvFilterValues(brand);
      // Brand is mapped as text + keyword; use exact keyword/slug filters only.
      filter.push(buildBrandExactFilter(brandValues));
      userFilterCount += 1;
    }
    if (minPrice || maxPrice) {
      const priceRange: any = {};
      if (minPrice) priceRange.gte = parseFloat(minPrice);
      if (maxPrice) priceRange.lte = parseFloat(maxPrice);
      filter.push({ range: { price: priceRange } });
      userFilterCount += 1;
    }
    if (inStock) {
      filter.push({ term: { inStock: true } });
      userFilterCount += 1;
    }
    if (rating) {
      filter.push({ range: { rating: { gte: parseFloat(rating) } } });
      userFilterCount += 1;
    }
    if (tags && tags.length > 0) {
      filter.push({ terms: { 'tags': tags } }); // Phase 19: direct keyword field
      userFilterCount += 1;
    }

    // ========================================
    // ✅ PROMOTIONAL BOOSTING with function_score
    // ========================================

    // ✅ Await CTR data (was fetching in parallel above)
    const ctrData = await ctrDataPromise;
    const ctrBoostFunctions = buildCTRBoostFunctions(ctrData, 3.0);
    const discountBoostFunctions = buildDiscountBoostFunctions();

    const promotionalFunctions: any[] = [
      // ── Admin / promotional signals ──
      { filter: { term: { isFeatured: true } }, weight: 2.0 },
      { filter: { term: { isFlashSale: true } }, weight: 1.8 },
      { filter: { term: { isNewArrival: true } }, weight: 1.3 },

      // ✅ CTR-based re-ranking (Amazon A9 style)
      // Dynamic per-query: products clicked most for this query rise up
      ...ctrBoostFunctions,

      // ✅ Discount boost (Daraz style)
      // ≥40% off → 1.6x | ≥20% off → 1.3x | ≥10% off → 1.15x
      ...discountBoostFunctions,

      {
        field_value_factor: {
          field: 'rating',
          factor: 0.1,
          modifier: 'sqrt',
          missing: 1,
        }
      },
      {
        field_value_factor: {
          field: 'reviewCount',
          factor: 0.01,
          modifier: 'log1p',
          missing: 1,
        }
      },
    ];

    // Add personalization boost if user has category preferences
    if (userCategories.length > 0) {
      promotionalFunctions.push({
        filter: { terms: { categorySlug: userCategories.map(normalizeSlugFilterValue) } }, // Phase 3: facet/filter slug field
        weight: 1.4,
      });
    }

    const searchQuery: any = {
      function_score: {
        query: {
          bool: {
            must,
            filter,
            should,
            minimum_should_match: should.length > 0 ? 0 : undefined,
          }
        },
        functions: promotionalFunctions,
        score_mode: 'sum',
        boost_mode: 'multiply',
      }
    };

    // ========================================
    // DETERMINE SORT ORDER
    // ========================================
    let sortOrder: any[] = [];

    switch (sort) {
      case 'price_asc':
        sortOrder = [{ price: 'asc' }, { _score: 'desc' }];
        break;
      case 'price_desc':
        sortOrder = [{ price: 'desc' }, { _score: 'desc' }];
        break;
      case 'newest':
        sortOrder = [{ createdAt: 'desc' }, { _score: 'desc' }];
        break;
      case 'rating':
        sortOrder = [{ rating: 'desc' }, { _score: 'desc' }];
        break;
      case 'popularity':
        sortOrder = [
          { popularityScore: 'desc' },
          { salesCount: 'desc' },
          { searchClickCount: 'desc' },
          { viewCount: 'desc' },
          { rating: 'desc' },
          { _score: 'desc' },
        ];
        break;
      case 'discount_desc':
        sortOrder = [
          { discount: 'desc' },
          { _score: 'desc' },
          { createdAt: 'desc' },
        ];
        break;
      case 'name_asc':
        sortOrder = [{ 'name.keyword': 'asc' }];
        break;
      case 'name_desc':
        sortOrder = [{ 'name.keyword': 'desc' }];
        break;
      case 'relevance':
      default:
        sortOrder = [{ _score: 'desc' }, { createdAt: 'desc' }];
        break;
    }

    // ========================================
    // ✅ EXECUTE SEARCH with SPELL CORRECTION
    // ========================================
    const searchBody: any = {
      _source: SHOP_SEARCH_SOURCE_FIELDS,
      query: searchQuery,
      from: (page - 1) * limit,
      size: limit,
      sort: sortOrder,
      highlight: {
        // Phase 26: encode source field values before ES injects highlight tags.
        // Frontend still parses only the allowed mark/em wrappers and never uses raw HTML injection.
        encoder: 'html',
        fields: {
          name: {},
          description: {},
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
      },
      aggs: {
        categories: {
          terms: { field: 'categorySlug', size: 50 },
          aggs: {
            category_label: { terms: { field: 'categoryName.keyword', size: 1 } },
          },
        },
        brands: {
          terms: { field: 'brandSlug', size: 50 },
          aggs: {
            brand_label: { terms: { field: 'brand.keyword', size: 1 } },
          },
        },
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { key: 'under-500', to: 500 },
              { key: '500-1000', from: 500, to: 1000 },
              { key: '1000-2000', from: 1000, to: 2000 },
              { key: 'over-2000', from: 2000 },
            ]
          }
        },
        availability: {
          filters: {
            filters: {
              in_stock: { term: { inStock: true } },
              out_of_stock: { term: { inStock: false } },
            },
          },
        },
        ratings: {
          filters: {
            filters: {
              '4-up': { range: { rating: { gte: 4 } } },
              '3-up': { range: { rating: { gte: 3 } } },
            },
          },
        },
        avg_price: { avg: { field: 'price' } },
        min_price: { min: { field: 'price' } },
        max_price: { max: { field: 'price' } },
      }
    };

    // ✅ ADD SPELL CORRECTION (phrase suggester) if query present
    if (query.trim()) {
      searchBody.suggest = {
        spell_correction: {
          text: query,
          phrase: {
            field: 'name',
            size: 1,
            gram_size: 2,
            direct_generator: [
              {
                field: 'name',
                suggest_mode: 'always',
                min_word_length: 3,
              }
            ],
            highlight: {
              pre_tag: '<em>',
              post_tag: '</em>',
            }
          }
        }
      };
    }

    const response = await esClient.search({
      index: PRODUCT_INDEX,
      ...searchBody,
    }) as unknown as ElasticsearchSearchResponse;

    // ========================================
    // PROCESS RESULTS
    // ========================================
    const totalHits = typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total.value;

    let products: Array<ProductSource & { score: number | null; highlighted?: { name?: string; description?: string } }> = response.hits.hits.map(hit => ({
      ...hit._source,
      score: hit._score,
      highlighted: {
        name: hit.highlight?.name?.[0],
        description: hit.highlight?.description?.[0],
      }
    }));

    // ========================================
    // ✅ SMART ZERO-RESULTS HANDLING
    // ========================================
    let zeroResultsFallback: ZeroResultsFallback | null = null;

    if (totalHits === 0 && query.trim()) {
      // Strategy 1: Relax filters (keep query, remove category/price/stock filters)
      if (userFilterCount > 0) {
        const relaxedQuery: any = {
          function_score: {
            query: {
              bool: {
                must,
                filter: activeProductFilters,
                should,
              }
            },
            functions: [
              { filter: { term: { isFeatured: true } }, weight: 2.0 },
              { filter: { term: { isFlashSale: true } }, weight: 1.8 },
            ],
            score_mode: 'sum',
            boost_mode: 'multiply',
          }
        };

        const relaxedResponse = await esClient.search({
          index: PRODUCT_INDEX,
          _source: SHOP_SEARCH_SOURCE_FIELDS.slice(),
          query: relaxedQuery,
          size: limit,
          sort: sortOrder,
        }) as unknown as ElasticsearchSearchResponse;

        const relaxedTotal = typeof relaxedResponse.hits.total === 'number'
          ? relaxedResponse.hits.total
          : relaxedResponse.hits.total.value;

        if (relaxedTotal > 0) {
          products = relaxedResponse.hits.hits.map(hit => ({
            ...hit._source,
            score: hit._score,
          }));
          zeroResultsFallback = {
            strategy: 'relaxed_query',
            message: 'No exact matches found. Showing similar products:',
          };
        }
      }

      // Strategy 2: Show popular products from user's preferred categories
      if (products.length === 0 && userCategories.length > 0) {
        const categoryBrowseResponse = await esClient.search({
          index: PRODUCT_INDEX,
          _source: SHOP_SEARCH_SOURCE_FIELDS.slice(),
          query: {
            bool: {
              filter: [
                ...activeProductFilters,
                { terms: { categorySlug: userCategories.slice(0, 3).map(normalizeSlugFilterValue) } }, // Phase 3: facet/filter slug field
              ],
            }
          } as any,
          sort: [{ rating: { order: 'desc' as const } }, { reviewCount: { order: 'desc' as const } }],
          size: limit,
        }) as unknown as ElasticsearchSearchResponse;

        const browseTotal = typeof categoryBrowseResponse.hits.total === 'number'
          ? categoryBrowseResponse.hits.total
          : categoryBrowseResponse.hits.total.value;

        if (browseTotal > 0) {
          products = categoryBrowseResponse.hits.hits.map(hit => ({
            ...hit._source,
            score: hit._score,
          }));
          zeroResultsFallback = {
            strategy: 'category_browse',
            message: `No results for "${query}". You might like these from ${userCategories[0]}:`,
          };
        }
      }

      // Strategy 3: Fall back to featured/popular products
      if (products.length === 0) {
        const popularResponse = await esClient.search({
          index: PRODUCT_INDEX,
          _source: SHOP_SEARCH_SOURCE_FIELDS.slice(),
          query: {
            bool: {
              filter: activeProductFilters,
              should: [
                { term: { isFeatured: { value: true, boost: 2 } } },
                { term: { isFlashSale: { value: true, boost: 1.5 } } },
              ],
              minimum_should_match: 1,
            }
          } as any,
          sort: [{ _score: { order: 'desc' as const } }, { rating: { order: 'desc' as const } }],
          size: limit,
        }) as unknown as ElasticsearchSearchResponse;

        products = popularResponse.hits.hits.map(hit => ({
          ...hit._source,
          score: hit._score,
        }));
        zeroResultsFallback = {
          strategy: 'popular_products',
          message: `No results for "${query}". Check out our popular products:`,
        };
      }
    }

    // ✅ EXTRACT SPELL CORRECTION SUGGESTION
    let spellSuggestion: string | null = null;
    if (response.suggest?.spell_correction?.[0]?.options?.length) {
      const suggestion = response.suggest.spell_correction[0].options[0];
      if (suggestion.text.toLowerCase() !== query.toLowerCase()) {
        spellSuggestion = suggestion.text;
      }
    }

    // ========================================
    // TRACK METRICS
    // ========================================
    const duration = Date.now() - startTime;
    const filtersUsed = [
      category && 'category',
      subcategory && 'subcategory',
      brand && 'brand',
      (minPrice || maxPrice) && 'price',
      inStock && 'inStock',
      rating && 'rating',
      tags && 'tags',
    ].filter(Boolean) as string[];

    searchMetrics.add({
      query: query || '[empty]',
      duration,
      resultCount: totalHits,
      filters: filtersUsed,
      timestamp: new Date(),
      success: true,
    });

    // Phase 25: persist query demand/trending metrics in Redis so they survive restarts
    // and stay consistent across multiple app instances.
    if (query.trim()) {
      await Promise.all([
        trackSearchQuery(query),
        trackQueryImpression(query),
        totalHits === 0 ? trackZeroResultQuery(query) : Promise.resolve(),
        totalHits === 0 ? trackFailedQuery(query) : Promise.resolve(),
      ]);
    }

    // ✅ Track search in behavior system (no-op on server, runs client-side only)
    if (query.trim()) {
      BehaviorTracker.trackEvent('Search', {
        query,
        resultCount: totalHits,
        filters: filtersUsed,
        hadResults: totalHits > 0,
        usedFallback: !!zeroResultsFallback,
        source: 'elasticsearch',
      });
    }

    // ========================================
    // RETURN RESPONSE
    // ========================================
    const responseFacets = zeroResultsFallback
      ? buildFallbackFacetsFromProducts(products)
      : {
          categories: response.aggregations?.categories?.buckets.map((bucket) => ({
            label: getAggregationLabel(bucket, 'category_label'),
            value: bucket.key,
            count: bucket.doc_count,
          })) || [],
          brands: response.aggregations?.brands?.buckets.map((bucket) => ({
            label: getAggregationLabel(bucket, 'brand_label'),
            value: bucket.key,
            count: bucket.doc_count,
          })) || [],
          priceRanges: response.aggregations?.price_ranges?.buckets.map(buildPriceRangeFacet) || [],
          skinTypes: [],
          concerns: [],
          availability: Object.entries(response.aggregations?.availability?.buckets || {}).map(([value, bucket]) => ({
            label: value === 'in_stock' ? 'In Stock' : 'Out of Stock',
            value,
            count: (bucket as { doc_count: number }).doc_count,
          })).filter((facet) => facet.count > 0),
          ratings: Object.entries(response.aggregations?.ratings?.buckets || {}).map(([value, bucket]) => ({
            label: value === '4-up' ? '4★ & up' : '3★ & up',
            value,
            min: value === '4-up' ? 4 : 3,
            count: (bucket as { doc_count: number }).doc_count,
          })).filter((facet) => facet.count > 0),
        };

    const displayTotal = zeroResultsFallback ? products.length : totalHits;

    const responsePayload = {
      success: true,
      source: 'elasticsearch',
      query,
      spellSuggestion,
      total: displayTotal,
      exactTotal: totalHits,
      displayTotal,
      page,
      limit,
      totalPages: Math.ceil((displayTotal || products.length) / limit),
      products,
      ...(zeroResultsFallback && {
        fallback: {
          strategy: zeroResultsFallback.strategy,
          message: zeroResultsFallback.message,
          applied: true,
        }
      }),
      facets: responseFacets,
      priceStats: {
        avg: response.aggregations?.avg_price?.value || 0,
        min: response.aggregations?.min_price?.value || 0,
        max: response.aggregations?.max_price?.value || 0,
      },
      meta: {
        duration,
        sort,
        filters: filtersUsed,
        personalized: userCategories.length > 0,
        preferredCategories: userCategories.slice(0, 3),
        ctrBoostsApplied: ctrBoostFunctions.length,
        source: 'elasticsearch',
        sourceFields: SHOP_SEARCH_SOURCE_FIELDS.length,
      }
    };

    return NextResponse.json(responsePayload, {
      headers: getShopPayloadHeaders(responsePayload, {
        'X-Search-Duration': String(duration),
        'X-Result-Count': String(totalHits),
        'X-Search-Source': 'elasticsearch',
        'Cache-Control': SHOP_LISTING_CACHE_CONTROL,
      }),
    });

  } catch (error: any) {
    errorMessage = error?.message || 'Unknown search error';
    console.error('❌ Elasticsearch search error; attempting database fallback:', error);

    try {
      const fallbackSearchParams = normalizeShopSearchParams(request.nextUrl.searchParams);
      const fallbackResponse = await executeDatabaseSearchFallback(
        fallbackSearchParams,
        startTime,
        error
      );

      searchMetrics.add({
        query: fallbackResponse.query || '[empty]',
        duration: fallbackResponse.meta.duration,
        resultCount: fallbackResponse.total,
        filters: fallbackResponse.meta.filters,
        timestamp: new Date(),
        success: true,
      });

      // Fallback mode should not fail the user request if analytics persistence is down.
      if (fallbackResponse.query.trim()) {
        Promise.allSettled([
          trackSearchQuery(fallbackResponse.query),
          trackQueryImpression(fallbackResponse.query),
          fallbackResponse.total === 0 ? trackZeroResultQuery(fallbackResponse.query) : Promise.resolve(),
          fallbackResponse.total === 0 ? trackFailedQuery(fallbackResponse.query) : Promise.resolve(),
        ]).catch(() => undefined);
      }

      return NextResponse.json(fallbackResponse, {
        status: 200,
        headers: getShopPayloadHeaders(fallbackResponse, {
          'X-Search-Duration': String(fallbackResponse.meta.duration),
          'X-Result-Count': String(fallbackResponse.total),
          'X-Search-Source': 'database_fallback',
          'X-Elasticsearch-Fallback': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }),
      });
    } catch (fallbackError: any) {
      console.error('❌ Database search fallback failed:', fallbackError);

      searchMetrics.add({
        query: sanitizeQuery(normalizeShopSearchParams(request.nextUrl.searchParams).get('q') || ''),
        duration: Date.now() - startTime,
        resultCount: 0,
        filters: [],
        timestamp: new Date(),
        success: false,
      });

      return NextResponse.json(
        {
          success: false,
          source: 'unavailable',
          error: 'Search failed',
          message: 'Elasticsearch and database fallback are both unavailable.',
          elasticsearchError: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          fallbackError: process.env.NODE_ENV === 'development'
            ? (fallbackError?.message || String(fallbackError))
            : undefined,
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
        },
        { status: 503 }
      );
    }
  }
}
