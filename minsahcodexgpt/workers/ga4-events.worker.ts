import { Worker, type Job } from 'bullmq';
import { bullRedis } from '@/lib/queue/productQueue';
import { GA4_EVENTS_QUEUE_NAME, type Ga4JobData } from '@/lib/queue/metaCapiQueue';
import { sendGa4Purchase, sendGa4Refund } from '@/lib/tracking/ga4-measurement-protocol';

async function processGa4(job: Job<Ga4JobData>) {
  const attempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 5;
  const finalAttempt = job.attemptsMade + 1 >= attempts;
  return job.data.type === 'ga4_purchase'
    ? sendGa4Purchase({ orderId: job.data.orderId, source: job.data.source, retryCount: job.attemptsMade, finalAttempt })
    : sendGa4Refund({ orderId: job.data.orderId, source: job.data.source, retryCount: job.attemptsMade, finalAttempt });
}
export function startGa4EventsWorker() {
  return new Worker<Ga4JobData>(GA4_EVENTS_QUEUE_NAME, processGa4, { connection: bullRedis, concurrency: 2, maxStalledCount: 2 });
}
if (process.argv[1]?.includes('ga4-events.worker')) startGa4EventsWorker();
