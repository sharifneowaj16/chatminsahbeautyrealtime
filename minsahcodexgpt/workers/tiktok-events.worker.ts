import { Worker, type Job } from 'bullmq';
import { bullRedis } from '@/lib/queue/productQueue';
import { TIKTOK_EVENTS_QUEUE_NAME, type TikTokJobData } from '@/lib/queue/metaCapiQueue';
import { sendCodPurchaseToTikTok, sendOnlinePaidPurchaseToTikTok } from '@/lib/tracking/tiktok-events-api-purchase';

async function processTikTok(job: Job<TikTokJobData>) {
  const attempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 5;
  const finalAttempt = job.attemptsMade + 1 >= attempts;
  return job.data.type === 'tiktok_cod_purchase'
    ? sendCodPurchaseToTikTok({ orderId: job.data.orderId, retryCount: job.attemptsMade, finalAttempt })
    : sendOnlinePaidPurchaseToTikTok({ orderId: job.data.orderId, retryCount: job.attemptsMade, finalAttempt });
}
export function startTikTokEventsWorker() {
  return new Worker<TikTokJobData>(TIKTOK_EVENTS_QUEUE_NAME, processTikTok, { connection: bullRedis, concurrency: 2, maxStalledCount: 2 });
}
if (process.argv[1]?.includes('tiktok-events.worker')) startTikTokEventsWorker();
