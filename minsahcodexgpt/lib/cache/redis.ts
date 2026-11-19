/**
 * lib/cache/redis.ts
 *
 * Production-hardened Redis cache client + distributed helpers.
 * Prefers REDIS_CACHE_URL (allkeys-lru) and gracefully falls back to REDIS_URL.
 */

import Redis from 'ioredis';
import crypto from 'crypto';

const globalForRedis = globalThis as unknown as { cacheRedis?: Redis | null };

function createCacheRedisClient(): Redis | null {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  const redisUrl = process.env.REDIS_CACHE_URL?.trim() || process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    console.warn('[redis-cache] Neither REDIS_CACHE_URL nor REDIS_URL is set. Cache disabled.');
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => Math.min(times * 200, 5_000),
      lazyConnect: true,
      connectTimeout: 5_000,
      keepAlive: 10_000,
      enableOfflineQueue: false,
    });
    client.on('error', (err: Error) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[redis-cache] error:', err.message);
      }
    });
    return client;
  } catch (error) {
    console.error('[redis-cache] Failed to create client:', error);
    return null;
  }
}

export const redis: Redis | null = globalForRedis.cacheRedis ?? createCacheRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.cacheRedis = redis;
}

const DEFAULT_TTL = 3600;

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('[redis-cache] GET error:', error);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL
): Promise<boolean> {
  if (!redis) return false;
  try {
    const safeTtl = Math.max(1, Math.floor(ttlSeconds));
    await redis.setex(key, safeTtl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('[redis-cache] SET error:', error);
    return false;
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.unlink(key);
    return true;
  } catch (error) {
    console.error('[redis-cache] UNLINK error:', error);
    return false;
  }
}

/**
 * Non-blocking pattern invalidation using SCAN + UNLINK (never blocks Redis like KEYS).
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  if (!redis) return 0;
  let cursor = '0';
  let totalDeleted = 0;

  try {
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        totalDeleted += await redis.unlink(...keys);
      }
    } while (cursor !== '0');
    return totalDeleted;
  } catch (error) {
    console.error('[redis-cache] SCAN/UNLINK pattern error:', error);
    return totalDeleted;
  }
}

/**
 * Cache-Aside with lightweight Stampede Protection for high-concurrency traffic.
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL
): Promise<T> {
  if (!redis) return await fetchFn();

  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const lockKey = `lock:cache:${key}`;
  const lockToken = crypto.randomUUID();
  let acquired = false;

  try {
    const res = await redis.set(lockKey, lockToken, 'PX', 5_000, 'NX');
    acquired = res === 'OK';
  } catch {
    acquired = false;
  }

  if (!acquired) {
    // Another replica is populating this key; wait briefly and retry cache
    await new Promise((r) => setTimeout(r, 120));
    const retryCached = await cacheGet<T>(key);
    if (retryCached !== null) return retryCached;
    return await fetchFn();
  }

  try {
    const value = await fetchFn();
    await cacheSet(key, value, ttlSeconds);
    return value;
  } finally {
    const releaseLua = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(releaseLua, 1, lockKey, lockToken).catch(() => {});
  }
}

/**
 * Distributed Lock helper for checkout, flash-sale stock reservation, and idempotency.
 */
export async function withRedisLock<T>(
  lockName: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<{ acquired: true; value: T } | { acquired: false }> {
  if (!redis) {
    return { acquired: true, value: await fn() };
  }

  const lockKey = `lock:${lockName}`;
  const token = crypto.randomUUID();
  const acquired = (await redis.set(lockKey, token, 'PX', Math.max(500, ttlMs), 'NX')) === 'OK';

  if (!acquired) return { acquired: false };

  try {
    const value = await fn();
    return { acquired: true, value };
  } finally {
    const releaseLua = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(releaseLua, 1, lockKey, token).catch(() => {});
  }
}

export async function cacheIncrement(key: string, ttlSeconds?: number): Promise<number> {
  if (!redis) return 0;
  try {
    if (ttlSeconds && ttlSeconds > 0) {
      const lua = `
        local current = redis.call("INCR", KEYS[1])
        if current == 1 then
          redis.call("EXPIRE", KEYS[1], ARGV[1])
        end
        return current
      `;
      return Number(await redis.eval(lua, 1, key, Math.floor(ttlSeconds)));
    }
    return await redis.incr(key);
  } catch (error) {
    console.error('[redis-cache] INCR error:', error);
    return 0;
  }
}

export async function isRedisConnected(): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

const RATE_LIMIT_LUA = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
if ttl < 0 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`;

/**
 * Atomic 1-round-trip distributed rate limiter safe across multiple replicas.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  if (!redis) {
    return { allowed: true, remaining: maxAttempts, resetIn: 0 };
  }

  try {
    const timeoutPromise = new Promise<[number, number]>((_, reject) =>
      setTimeout(() => reject(new Error('Redis rate-limit timeout')), 1500)
    );

    const [count, ttl] = (await Promise.race([
      redis.eval(RATE_LIMIT_LUA, 1, key, Math.max(1, Math.floor(windowSeconds))) as Promise<[number, number]>,
      timeoutPromise,
    ])) as [number, number];

    const resetIn = ttl > 0 ? ttl : windowSeconds;
    const remaining = Math.max(0, maxAttempts - count);
    const allowed = count <= maxAttempts;

    return { allowed, remaining, resetIn };
  } catch (error) {
    console.warn('[redis-cache] Rate limit bypassed due to error/timeout:', error);
    return { allowed: true, remaining: maxAttempts, resetIn: 0 };
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch (error) {
      console.error('[redis-cache] Error closing Redis:', error);
    }
  }
}
