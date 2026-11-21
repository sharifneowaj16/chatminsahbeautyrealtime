const fs = require('fs');
const path = require('path');
const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const BOOT_FALLBACK_ID = 'boot-' + Date.now().toString(36);

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
  return process.env.NEXT_BUILD_ID || BOOT_FALLBACK_ID;
}

function isNonCacheableKey(key) {
  if (typeof key !== 'string') return false;
  const k = key.toLowerCase();
  return (
    k === '/checkout' ||
    k.startsWith('/checkout/') ||
    k.startsWith('checkout') ||
    k.startsWith('/admin') ||
    k.startsWith('/account') ||
    k.startsWith('/api')
  );
}

let client = null;
let connectPromise = null;

async function getRedisClient() {
  if (!client) {
    client = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) return false;
          return Math.min(retries * 100, 1000);
        },
        connectTimeout: 2000,
      },
    });
    client.on('error', () => {
      // Silently handle Redis connection errors to prevent crashes
    });
  }

  if (!client.isOpen) {
    if (!connectPromise) {
      connectPromise = client.connect().catch(() => {
        connectPromise = null;
      });
    }
    await connectPromise;
  }

  return client && client.isOpen ? client : null;
}

class RedisCacheHandler {
  constructor(options) {
    this.options = options;
    this.keyPrefix = 'nextjs:cache:' + resolveBuildId(options) + ':';
  }

  async get(key) {
    if (isNonCacheableKey(key)) return null;
    try {
      const redis = await getRedisClient();
      if (!redis) return null;
      const raw = await redis.get(this.keyPrefix + key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async set(key, data, ctx) {
    if (isNonCacheableKey(key)) return;
    try {
      const redis = await getRedisClient();
      if (!redis) return;
      const entry = {
        value: data,
        lastModified: Date.now(),
        tags: ctx?.tags || [],
      };
      // Store for 24 hours scoped strictly to the active Next.js BUILD_ID
      await redis.set(this.keyPrefix + key, JSON.stringify(entry), { EX: 86400 });
    } catch {
      // Ignore cache write errors
    }
  }

  async revalidateTag(tags) {
    try {
      const redis = await getRedisClient();
      if (!redis) return;
      const tagList = Array.isArray(tags) ? tags : [tags];
      for (const tag of tagList) {
        if (!tag) continue;
        const keys = await redis.keys(this.keyPrefix + '*');
        for (const k of keys) {
          const raw = await redis.get(k);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.tags) && parsed.tags.includes(tag)) {
              await redis.del(k);
            }
          } catch {}
        }
      }
    } catch {
      // Ignore revalidation errors
    }
  }
}

module.exports = RedisCacheHandler;
