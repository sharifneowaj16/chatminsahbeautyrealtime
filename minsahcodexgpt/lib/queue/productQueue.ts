/**
 * lib/queue/productQueue.ts
 *
 * BullMQ queue for async DB → Elasticsearch sync.
 * bullmq@^5.69.3 + ioredis@^5.9.3
 *
 * With package.json "overrides" forcing BullMQ to use the project's ioredis,
 * there is NO type conflict — we can pass ioredis directly as connection.
 *
 * Job types:
 *   index   – create/update an ES document for one product
 *   delete  – remove a product from the ES index
 *   reindex – full rebuild of the products index
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';

// ─── Redis connection for BullMQ ───────────────────────────────────────

function createBullRedis(): Redis {
  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn('[productQueue] REDIS_URL not set – using redis://localhost:6379');
    return new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null, // Required by BullMQ
      lazyConnect: true,
    });
  }

  return new Redis(url, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
  });
}

export const bullRedis: Redis = createBullRedis();

// ─── Job payload types ─────────────────────────────────────────────────

export interface IndexJobData {
  type: 'index';
  productId: string;
}

export interface DeleteJobData {
  type: 'delete';
  productId: string;
}

export interface ReindexJobData {
  type: 'reindex';
  requestedAt: string;
}

export type ProductJobData = IndexJobData | DeleteJobData | ReindexJobData;

// ─── Queue singleton ───────────────────────────────────────────────────

const globalForQueue = globalThis as unknown as {
  productQueue?: Queue<ProductJobData>;
};

function createQueue(): Queue<ProductJobData> {
  return new Queue<ProductJobData>('product-sync', {
    connection: bullRedis,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1_000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });
}

export const productQueue: Queue<ProductJobData> =
  globalForQueue.productQueue ?? createQueue();

if (process.env.NODE_ENV !== 'production') {
  globalForQueue.productQueue = productQueue;
}

// ─── Helper ────────────────────────────────────────────────────────────

export function getProductQueue(): Queue<ProductJobData> {
  return globalForQueue.productQueue ?? createQueue();
}


function makeJobId(action: 'index' | 'delete' | 'reindex', productIdOrStamp: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${action}:${productIdOrStamp}:${Date.now()}:${random}`;
}

/**
 * Queue a product reindex after an admin create/update/stock/price mutation.
 *
 * This intentionally reads the latest product state inside the worker rather than
 * trusting request payloads. Phase 20 visibility rules then decide whether the
 * product should be indexed or removed from Elasticsearch.
 */
export async function enqueueProductIndex(
  productId: string,
  reason = 'product mutation'
): Promise<boolean> {
  try {
    await productQueue.add(
      'index',
      { type: 'index', productId },
      { jobId: makeJobId('index', productId) }
    );
    console.log(`[productQueue] queued index for product ${productId} (${reason})`);
    return true;
  } catch (error) {
    console.error(`[productQueue] failed to queue index for product ${productId}:`, error);
    return false;
  }
}

/** Queue product removal from Elasticsearch after hard/soft delete. */
export async function enqueueProductDelete(
  productId: string,
  reason = 'product delete'
): Promise<boolean> {
  try {
    await productQueue.add(
      'delete',
      { type: 'delete', productId },
      { jobId: makeJobId('delete', productId) }
    );
    console.log(`[productQueue] queued delete for product ${productId} (${reason})`);
    return true;
  } catch (error) {
    console.error(`[productQueue] failed to queue delete for product ${productId}:`, error);
    return false;
  }
}

/** Queue a full product search reindex. */
export async function enqueueProductReindex(reason = 'manual reindex'): Promise<boolean> {
  const requestedAt = new Date().toISOString();

  try {
    await productQueue.add(
      'reindex',
      { type: 'reindex', requestedAt },
      { jobId: makeJobId('reindex', requestedAt) }
    );
    console.log(`[productQueue] queued full reindex (${reason})`);
    return true;
  } catch (error) {
    console.error('[productQueue] failed to queue full reindex:', error);
    return false;
  }
}
