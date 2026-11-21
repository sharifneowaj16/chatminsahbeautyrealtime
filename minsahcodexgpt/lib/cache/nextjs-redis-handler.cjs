/**
 * lib/cache/nextjs-redis-handler.cjs
 *
 * Shared Next.js 16 ISR & Data Cache Handler backed by Redis (REDIS_CACHE_URL || REDIS_URL).
 * Keeps cache & revalidateTag() 100% synchronized across multiple Dokploy/Traefik replicas,
 * scoped by Next.js BUILD_ID so stale chunks from older deployments are never served.
 */

const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

const BASE_KEY_PREFIX = 'next16:cache:';
const BASE_TAG_PREFIX = 'next16:tag:';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24h fallback TTL

let sharedClient = null;
const memoryFallback = new Map();

function resolveBuildId(options) {
  const candidates = [];
  if (options && options.serverDistDir) {
    candidates.push(path.resolve(options.serverDistDir, '..', 'BUILD_ID'));
  }
  candidates.push(path.join(process.cwd(), '.next', 'BUILD_ID'));
  candidates.push(path.resolve(__dirname, '..', '..', '.next', 'BUILD_ID'));

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const id = fs.readFileSync(filePath, 'utf8').trim();
        if (id) return id;
      }
    } catch {}
  }
  return (process.env.NEXT_BUILD_ID || 'default').trim();
}

function isBypassKey(key) {
  if (typeof key !== 'string') return false;
  const k = key.toLowerCase();
  return (
    k === '/checkout' ||
    k.startsWith('/checkout/') ||
    k.startsWith('/admin') ||
    k.startsWith('/account')
  );
}

function getClient() {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null;
  if (sharedClient) return sharedClient;

  const url = (process.env.REDIS_CACHE_URL || process.env.REDIS_URL || '').trim();
  if (!url) return null;

  sharedClient = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 250, 5000),
  });
  sharedClient.on('error', () => {});
  return sharedClient;
}

module.exports = class NextRedisCacheHandler {
  constructor(options) {
    this.options = options;
    const buildId = resolveBuildId(options);
    this.keyPrefix = BASE_KEY_PREFIX + buildId + ':';
    this.tagPrefix = BASE_TAG_PREFIX + buildId + ':';
  }

  async get(key) {
    if (isBypassKey(key)) return null;

    const client = getClient();
    if (!client) return memoryFallback.get(key) ?? null;

    try {
      const raw = await client.get(this.keyPrefix + key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  }

  async set(key, data, ctx) {
    if (isBypassKey(key)) return;

    const entry = {
      value: data,
      lastModified: Date.now(),
      tags: Array.isArray(ctx?.tags) ? ctx.tags : [],
    };

    const client = getClient();
    if (!client) {
      if (memoryFallback.size > 500) memoryFallback.clear();
      memoryFallback.set(key, entry);
      return;
    }

    const ttl =
      typeof ctx?.revalidate === 'number' && ctx.revalidate > 0
        ? Math.max(60, Math.floor(ctx.revalidate))
        : DEFAULT_TTL_SECONDS;

    try {
      const pipeline = client.pipeline();
      pipeline.setex(this.keyPrefix + key, ttl, JSON.stringify(entry));
      for (const tag of entry.tags) {
        pipeline.sadd(this.tagPrefix + tag, key);
        pipeline.expire(this.tagPrefix + tag, Math.max(ttl, DEFAULT_TTL_SECONDS));
      }
      await pipeline.exec();
    } catch {
      memoryFallback.set(key, entry);
    }
  }

  async revalidateTag(tags) {
    const tagList = Array.isArray(tags) ? tags : [tags];
    const client = getClient();

    if (!client) {
      for (const [k, v] of memoryFallback.entries()) {
        if (v?.tags?.some((t) => tagList.includes(t))) memoryFallback.delete(k);
      }
      return;
    }

    try {
      for (const tag of tagList) {
        if (!tag) continue;
        const tagKey = this.tagPrefix + tag;
        const members = await client.smembers(tagKey);
        if (members.length > 0) {
          await client.unlink(...members.map((m) => this.keyPrefix + m));
        }
        await client.unlink(tagKey);
      }
    } catch {
      // Fail open on cache invalidation error
    }
  }

  resetRequestCache() {}
};
