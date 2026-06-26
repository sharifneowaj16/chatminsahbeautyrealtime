/**
 * lib/cache/redis.ts
 *
 * Redis client singleton + cache helpers.
 * ioredis@^5.9.3
 */

import Redis from 'ioredis';

// ─── Singleton ─────────────────────────────────────────────────────────

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

function createRedisClient(): Redis | null {
  // ✅ Build time এ Redis skip করুন
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('⚠️  Skipping Redis connection during build phase');
    return null;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('⚠️  REDIS_URL not set. Redis features disabled.');
    return null;
  }

  try {
    return new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      // ✅ FIX: কখনো permanently হাল ছাড়বে না (আগে times > 3 হলে null
      // রিটার্ন করতো, যেটা connection-কে স্থায়ীভাবে মেরে দিতো)।
      // capped exponential backoff — সবসময় retry চালিয়ে যাবে।
      retryStrategy: (times) => Math.min(times * 200, 5_000),
      lazyConnect: true,
      // ✅ Connection timeout
      connectTimeout: 10_000,
      // ✅ FIX: TCP keepalive চালু — idle connection নেটওয়ার্কে silently
      // drop হয়ে গেলে সেটা তাড়াতাড়ি ধরা পড়বে এবং reconnect হবে,
      // আগে keepalive বন্ধ থাকায় drop হওয়া connection অনেকক্ষণ
      // "looks alive but isn't" অবস্থায় থাকতো।
      keepAlive: 10_000,
      // ✅ FIX: brief reconnect window-এ command queue হবে এবং reconnect
      // হওয়ার পর সেটা flush হবে — আগে enableOfflineQueue: false থাকায়
      // এই কয়েক সেকেন্ডের window-এ আসা যেকোনো command (যেমন health
      // check) সাথে সাথে "Stream isn't writeable" error ছুঁড়ে দিতো,
      // যেটাই Uptime Kuma-তে repeated short downtime হিসেবে দেখাচ্ছিল।
      enableOfflineQueue: true,
    });
  } catch (error) {
    console.error('❌ Failed to create Redis client:', error);
    return null;
  }
}

export const redis: Redis | null = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// ─── Cache helpers (null-safe) ─────────────────────────────────────────

const DEFAULT_TTL = 3600;

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) {
    console.warn('Redis not available for GET:', key);
    return null;
  }

  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL
): Promise<boolean> {
  if (!redis) {
    console.warn('Redis not available for SET:', key);
    return false;
  }

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  if (!redis) {
    console.warn('Redis not available for DELETE:', key);
    return false;
  }

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
}

export async function cacheDeletePattern(pattern: string): Promise<number> {
  if (!redis) {
    console.warn('Redis not available for DELETE pattern:', pattern);
    return 0;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return await redis.del(...keys);
  } catch (error) {
    console.error('Redis DEL pattern error:', error);
    return 0;
  }
}

export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL
): Promise<T> {
  // ✅ Redis না থাকলে সরাসরি fetch করুন
  if (!redis) {
    console.warn('Redis not available, fetching directly:', key);
    return await fetchFn();
  }

  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const value = await fetchFn();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

export async function cacheIncrement(
  key: string,
  ttlSeconds?: number
): Promise<number> {
  if (!redis) {
    console.warn('Redis not available for INCREMENT:', key);
    return 0;
  }

  try {
    const result = await redis.incr(key);
    if (ttlSeconds && result === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return result;
  } catch (error) {
    console.error('Redis INCR error:', error);
    return 0;
  }
}

// ✅ Health check helper
export async function isRedisConnected(): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis ping failed:', error);
    return false;
  }
}

// ─── Rate Limiting ─────────────────────────────────────────────────────────

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  if (!redis) {
    console.warn('Redis not available for rate limiting:', key);
    return { allowed: true, remaining: maxAttempts, resetIn: 0 };
  }

  try {
    const count = await redis.incr(key);

    // Set TTL only on the first request
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);
    const resetIn = ttl > 0 ? ttl : windowSeconds;
    const remaining = Math.max(0, maxAttempts - count);
    const allowed = count <= maxAttempts;

    return { allowed, remaining, resetIn };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // On error, allow the request to proceed
    return { allowed: true, remaining: maxAttempts, resetIn: 0 };
  }
}

// ✅ Graceful shutdown
export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis:', error);
    }
  }
}
