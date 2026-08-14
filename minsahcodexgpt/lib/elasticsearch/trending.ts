/**
 * lib/elasticsearch/trending.ts
 *
 * Persistent trending search and product intelligence.
 *
 * Phase 25 goals:
 * - store trending queries/products in Redis so data survives app restarts;
 * - keep the API multi-instance safe via Redis sorted sets;
 * - track searches, zero-result searches, product views, and search clicks;
 * - provide helpers used by suggestions and trending APIs.
 */

import { redis } from '@/lib/cache/redis';

const TRENDING_QUERIES_KEY = 'search:trending:queries';
const TRENDING_PRODUCTS_KEY = 'search:trending:products';
const TRENDING_QUERY_CLICKS_KEY = 'search:trending:query_clicks';
const TRENDING_ZERO_RESULT_KEY = 'search:trending:zero_result_queries';
const TRENDING_QUERIES_HOURLY_PREFIX = 'search:trending:queries:hourly';
const TRENDING_PRODUCTS_HOURLY_PREFIX = 'search:trending:products:hourly';
const TRENDING_QUERY_PRODUCT_PREFIX = 'search:trending:query_products';

const TTL_HOURS = 24;
const QUERY_MAX_LENGTH = 120;
const PRODUCT_ID_MAX_LENGTH = 128;

export type TrendingQuery = { query: string; score: number; count: number };
export type TrendingProduct = { productId: string; score: number; count: number };

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, QUERY_MAX_LENGTH);
}

function normalizeProductId(productId: string): string {
  return productId.trim().slice(0, PRODUCT_ID_MAX_LENGTH);
}

function currentHourlyKey(prefix: string): string {
  const now = new Date();
  const hour = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
  return `${prefix}:${hour}`;
}

function parseSortedSetWithScores(
  results: string[],
  keyName: 'query' | 'productId'
): Array<Record<'score' | 'count', number> & Record<typeof keyName, string>> {
  const items: Array<Record<'score' | 'count', number> & Record<typeof keyName, string>> = [];
  for (let i = 0; i < results.length; i += 2) {
    const value = results[i];
    const score = Number(results[i + 1] ?? 0);
    if (!value) continue;
    items.push({
      [keyName]: value,
      score,
      count: score,
    } as Record<'score' | 'count', number> & Record<typeof keyName, string>);
  }
  return items;
}

/**
 * Record a search query for persistent trending tracking.
 */
export async function trackSearchQuery(query: string): Promise<void> {
  const normalized = normalizeQuery(query);
  if (!redis || !normalized) return;

  const hourKey = currentHourlyKey(TRENDING_QUERIES_HOURLY_PREFIX);

  try {
    await Promise.all([
      redis.zincrby(TRENDING_QUERIES_KEY, 1, normalized),
      redis.zincrby(hourKey, 1, normalized),
      redis.expire(hourKey, TTL_HOURS * 3600),
    ]);
  } catch (error) {
    console.error('Failed to track trending query:', error);
  }
}

/**
 * Record a zero-result query so suggestions can recover demand gaps.
 */
export async function trackZeroResultQuery(query: string): Promise<void> {
  const normalized = normalizeQuery(query);
  if (!redis || !normalized) return;

  try {
    await redis.zincrby(TRENDING_ZERO_RESULT_KEY, 1, normalized);
  } catch (error) {
    console.error('Failed to track zero-result query:', error);
  }
}

/**
 * Record a product view/click for trending products.
 */
export async function trackProductView(productId: string): Promise<void> {
  const normalizedProductId = normalizeProductId(productId);
  if (!redis || !normalizedProductId) return;

  const hourKey = currentHourlyKey(TRENDING_PRODUCTS_HOURLY_PREFIX);

  try {
    await Promise.all([
      redis.zincrby(TRENDING_PRODUCTS_KEY, 1, normalizedProductId),
      redis.zincrby(hourKey, 1, normalizedProductId),
      redis.expire(hourKey, TTL_HOURS * 3600),
    ]);
  } catch (error) {
    console.error('Failed to track product view:', error);
  }
}

/**
 * Record a validated search result click.
 * This powers both query CTR intelligence and trending product suggestions.
 */
export async function trackSearchClick(query: string, productId: string): Promise<void> {
  const normalizedQuery = normalizeQuery(query);
  const normalizedProductId = normalizeProductId(productId);
  if (!redis || !normalizedQuery || !normalizedProductId) return;

  const queryProductsKey = `${TRENDING_QUERY_PRODUCT_PREFIX}:${normalizedQuery}`;

  try {
    await Promise.all([
      redis.zincrby(TRENDING_QUERY_CLICKS_KEY, 1, normalizedQuery),
      redis.zincrby(queryProductsKey, 1, normalizedProductId),
      redis.expire(queryProductsKey, TTL_HOURS * 3600),
      trackProductView(normalizedProductId),
    ]);
  } catch (error) {
    console.error('Failed to track search click:', error);
  }
}

/**
 * Get top trending search queries.
 */
export async function getTrendingQueries(limit: number = 10): Promise<TrendingQuery[]> {
  if (!redis) return [];
  try {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const results = await redis.zrevrange(TRENDING_QUERIES_KEY, 0, safeLimit - 1, 'WITHSCORES');
    return parseSortedSetWithScores(results, 'query') as TrendingQuery[];
  } catch (error) {
    console.error('Failed to get trending queries:', error);
    return [];
  }
}

/**
 * Get trending queries matching a prefix/substring for autocomplete.
 */
export async function getMatchingTrendingQueries(
  query: string,
  limit: number = 5
): Promise<TrendingQuery[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) return getTrendingQueries(limit);

  const candidates = await getTrendingQueries(Math.max(limit * 5, 25));
  return candidates
    .filter((item) => item.query.startsWith(normalized) || item.query.includes(normalized))
    .slice(0, limit);
}

/**
 * Get zero-result queries. Useful for admin demand-gap analysis and fallback chips.
 */
export async function getZeroResultQueries(limit: number = 10): Promise<TrendingQuery[]> {
  if (!redis) return [];
  try {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const results = await redis.zrevrange(TRENDING_ZERO_RESULT_KEY, 0, safeLimit - 1, 'WITHSCORES');
    return parseSortedSetWithScores(results, 'query') as TrendingQuery[];
  } catch (error) {
    console.error('Failed to get zero-result queries:', error);
    return [];
  }
}

/**
 * Get trending product IDs.
 */
export async function getTrendingProductIds(limit: number = 20): Promise<string[]> {
  const products = await getTrendingProducts(limit);
  return products.map((item) => item.productId);
}

/**
 * Get trending products with scores.
 */
export async function getTrendingProducts(limit: number = 20): Promise<TrendingProduct[]> {
  if (!redis) return [];
  try {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const results = await redis.zrevrange(TRENDING_PRODUCTS_KEY, 0, safeLimit - 1, 'WITHSCORES');
    return parseSortedSetWithScores(results, 'productId') as TrendingProduct[];
  } catch (error) {
    console.error('Failed to get trending products:', error);
    return [];
  }
}

/**
 * Clean up noisy or oversized trending data.
 */
export async function cleanupTrending(): Promise<void> {
  if (!redis) return;
  try {
    await Promise.all([
      redis.zremrangebyscore(TRENDING_QUERIES_KEY, '-inf', '1'),
      redis.zremrangebyscore(TRENDING_PRODUCTS_KEY, '-inf', '1'),
      redis.zremrangebyscore(TRENDING_QUERY_CLICKS_KEY, '-inf', '1'),
      redis.zremrangebyscore(TRENDING_ZERO_RESULT_KEY, '-inf', '1'),
    ]);

    const [queryCount, productCount, clickQueryCount, zeroCount] = await Promise.all([
      redis.zcard(TRENDING_QUERIES_KEY),
      redis.zcard(TRENDING_PRODUCTS_KEY),
      redis.zcard(TRENDING_QUERY_CLICKS_KEY),
      redis.zcard(TRENDING_ZERO_RESULT_KEY),
    ]);

    await Promise.all([
      queryCount > 500 ? redis.zremrangebyrank(TRENDING_QUERIES_KEY, 0, queryCount - 501) : Promise.resolve(0),
      productCount > 500 ? redis.zremrangebyrank(TRENDING_PRODUCTS_KEY, 0, productCount - 501) : Promise.resolve(0),
      clickQueryCount > 500 ? redis.zremrangebyrank(TRENDING_QUERY_CLICKS_KEY, 0, clickQueryCount - 501) : Promise.resolve(0),
      zeroCount > 500 ? redis.zremrangebyrank(TRENDING_ZERO_RESULT_KEY, 0, zeroCount - 501) : Promise.resolve(0),
    ]);
  } catch (error) {
    console.error('Failed to cleanup trending data:', error);
  }
}
