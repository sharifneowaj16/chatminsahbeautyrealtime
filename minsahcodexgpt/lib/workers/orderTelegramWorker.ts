import { Worker, type Job } from 'bullmq';
import { bullRedis } from '@/lib/queue/productQueue';
import {
  ORDER_TELEGRAM_QUEUE_NAME,
  type OrderTelegramJobData,
} from '@/lib/queue/orderTelegramQueue';
import { processOrderTelegramJobData } from '@/lib/telegram/order-notify-processor';

const globalForOrderTelegramWorker = globalThis as unknown as {
  orderTelegramWorker?: Worker<OrderTelegramJobData>;
};

export function startOrderTelegramWorker(): Worker<OrderTelegramJobData> {
  if (globalForOrderTelegramWorker.orderTelegramWorker) {
    return globalForOrderTelegramWorker.orderTelegramWorker;
  }

  const worker = new Worker<OrderTelegramJobData>(
    ORDER_TELEGRAM_QUEUE_NAME,
    async (job: Job<OrderTelegramJobData>) => {
      const orderRef =
        job.data.type === 'standard_order'
          ? job.data.order.orderNumber
          : job.data.orderNumber;
      const result = await processOrderTelegramJobData(job.data);
      if (result.skipped) {
        console.log(`[OrderTelegramWorker] Skipped #${orderRef}: ${result.reason}`);
      } else {
        console.log(`[OrderTelegramWorker] Sent Telegram alert for #${orderRef}`);
      }
      return result;
    },
    {
      connection: bullRedis,
      concurrency: 4,
      lockDuration: 30_000,
    }
  );

  worker.on('failed', (job, err) => {
    const orderRef =
      job?.data.type === 'standard_order'
        ? job.data.order.orderNumber
        : job?.data.orderNumber;
    console.error(
      `[OrderTelegramWorker] Job failed for #${orderRef || job?.id}:`,
      err?.message || err
    );
  });

  worker.on('error', (err) => {
    console.error('[OrderTelegramWorker] Worker error:', err.message);
  });

  globalForOrderTelegramWorker.orderTelegramWorker = worker;
  return worker;
}

const isDirectCliRun =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes('orderTelegramWorker'));

if (isDirectCliRun) {
  startOrderTelegramWorker();
  console.log('[OrderTelegramWorker] Standalone worker started');
}
