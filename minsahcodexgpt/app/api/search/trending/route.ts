/**
 * app/api/search/trending/route.ts
 *
 * GET /api/search/trending
 *   - Returns Redis-backed trending search queries and active trending products.
 *   - Query params: limit (default 10)
 *
 * Phase 25: data is persistent/multi-instance safe because it comes from Redis
 * sorted sets populated by search and validated click tracking flows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrendingProducts, getTrendingQueries, getZeroResultQueries } from '@/lib/elasticsearch/trending';
import { esClient, PRODUCT_INDEX } from '@/lib/elasticsearch';
import { buildActiveProductESFilters, isActiveSearchHit } from '@/lib/search/activeProductFilter';

export async function GET(request: NextRequest) {
  try {
    const limit = Math.max(1, Math.min(parseInt(
      request.nextUrl.searchParams.get('limit') || '10',
      10
    ), 50));

    const [trendingQueries, trendingProductScores, zeroResultQueries] = await Promise.all([
      getTrendingQueries(limit),
      getTrendingProducts(limit),
      getZeroResultQueries(Math.min(limit, 10)),
    ]);

    const trendingProductIds = trendingProductScores.map((item) => item.productId);
    const scoreByProductId = new Map(trendingProductScores.map((item) => [item.productId, item]));

    let trendingProducts: any[] = [];

    if (trendingProductIds.length > 0) {
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
          _source: ['id', 'name', 'slug', 'price', 'image', 'images', 'rating', 'brand', 'discount', 'isActive', 'deletedAt', 'status', 'visibility'],
        }) as any;

        const byId = new Map<string, Record<string, unknown>>();
        for (const hit of response.hits?.hits ?? []) {
          const source = hit._source as Record<string, unknown>;
          if (typeof source.id === 'string' && isActiveSearchHit(source as any)) {
            byId.set(source.id, source);
          }
        }

        trendingProducts = trendingProductIds
          .map((id) => {
            const source = byId.get(id);
            if (!source) return null;
            const score = scoreByProductId.get(id);
            return {
              ...source,
              trendingScore: score?.score ?? 0,
              trendingCount: score?.count ?? 0,
            };
          })
          .filter(Boolean);
      } catch (error) {
        console.error('Failed to fetch trending product details:', error);
      }
    }

    return NextResponse.json({
      success: true,
      source: 'redis_persistent_trending',
      trendingQueries,
      trendingProducts,
      zeroResultQueries,
    });
  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending data' },
      { status: 500 }
    );
  }
}
