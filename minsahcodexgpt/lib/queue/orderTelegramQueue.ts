import 'server-only';

import { Queue } from 'bullmq';
import { bullRedis } from '@/lib/queue/productQueue';
import {
  processOrderTelegramJobData,
  type OrderTelegramJobData,
} from '@/lib/telegram/order-notify-processor';

export type { OrderTelegramJobData };

export const ORDER_TELEGRAM_QUEUE_NAME = 'order-telegram-notify' as const;

const globalForOrderTelegramQueue = globalThis as unknown as {
  orderTelegramQueue?: Queue<OrderTelegramJobData>;
};

function createOrderTelegramQueue(): Queue<OrderTelegramJobData> {
  return new Queue<OrderTelegramJobData>(ORDER_TELEGRAM_QUEUE_NAME, {
    connection: bullRedis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3_000,
      },
      removeOnComplete: { age: 24 * 60 * 60, count: 500 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 500 },
    },
  });
}

export const orderTelegramQueue: Queue<OrderTelegramJobData> =
  globalForOrderTelegramQueue.orderTelegramQueue ?? createOrderTelegramQueue();

if (process.env.NODE_ENV !== 'production') {
  globalForOrderTelegramQueue.orderTelegramQueue = orderTelegramQueue;
}

/**
 * Non-blocking enqueue for checkout / Buy Now / Verified Payment / Gift routes.
 * Keeps checkout response fast (<300ms). If Redis is temporarily unavailable,
 * gracefully falls back to an unawaited in-process run so notifications are never lost.
 */
export async function enqueueOrderTelegramNotification(
  data: OrderTelegramJobData
): Promise<{ queued: boolean; jobId: string; fallbackTriggered?: boolean }> {
  const orderId = data.type === 'standard_order' ? data.order.orderId : data.orderId;
  // BullMQ v5 forbids colons in custom jobIds
  const safeOrderId = String(orderId).replace(/[^A-Za-z0-9_-]/g, '_');
  const jobId = `order-notify-${safeOrderId}`;

  try {
    await Promise.race([
      orderTelegramQueue.add(data.type, data, { jobId }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('REDIS_ENQUEUE_TIMEOUT')), 1_500)
      ),
    ]);
    return { queued: true, jobId };
  } catch (err) {
    console.warn(
      '[orderTelegramQueue] Redis enqueue failed, running non-blocking in-process fallback:',
      err instanceof Error ? err.message : err
    );
    void processOrderTelegramJobData(data).catch((fallbackErr) => {
      console.error('[orderTelegramQueue] In-process fallback failed:', fallbackErr);
    });
    return { queued: false, jobId, fallbackTriggered: true };
  }
}
