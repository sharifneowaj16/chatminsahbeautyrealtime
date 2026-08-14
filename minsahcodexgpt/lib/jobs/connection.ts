import 'server-only';
import Redis from 'ioredis';

const globalForMetaJobs = globalThis as unknown as { metaJobsRedis?: Redis };

export function validateProductionRedisUrl(source: NodeJS.ProcessEnv = process.env) {
  const raw = source.REDIS_URL?.trim();
  if (!raw) {
    if (source.NODE_ENV === 'production') throw new Error('REDIS_URL is required for durable Meta jobs.');
    return 'redis://localhost:6379';
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('REDIS_URL must be a valid redis:// or rediss:// URL.');
  }
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('REDIS_URL must use redis:// or rediss://.');
  return raw;
}

function createMetaJobsRedis() {
  const url = validateProductionRedisUrl();
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
}

export function getMetaJobsRedis() {
  const redis = globalForMetaJobs.metaJobsRedis ?? createMetaJobsRedis();
  if (process.env.NODE_ENV !== 'production') globalForMetaJobs.metaJobsRedis = redis;
  return redis;
}
