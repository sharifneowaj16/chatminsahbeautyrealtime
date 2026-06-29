import { Worker, type Job } from 'bullmq';
import { bullRedis } from '@/lib/queue/productQueue';
import {
  META_CAPI_PURCHASE_MAX_ATTEMPTS,
  META_CAPI_PURCHASE_QUEUE_NAME,
  type MetaCapiJobData,
} from '@/lib/queue/metaCapiQueue';
import {
  sendCodPurchaseToMeta,
  sendOnlinePaidPurchaseToMeta,
} from '@/lib/tracking/meta-capi-cod-purchase';
import { sendCoreCapiEventToMeta } from '@/lib/tracking/meta-capi-core-event';
import { sendGa4Purchase } from '@/lib/tracking/ga4-measurement-protocol';

async function handleMetaCapiPurchase(job: Job<MetaCapiJobData>) {
  const retryCount = job.attemptsMade;
  const attempts =
    typeof job.opts.attempts === 'number'
      ? job.opts.attempts
      : META_CAPI_PURCHASE_MAX_ATTEMPTS;
  const finalAttempt = retryCount + 1 >= attempts;


  if (job.data.type === 'core_event') {
    return sendCoreCapiEventToMeta({
      jobData: job.data,
      retryCount,
      finalAttempt,
    });
  }

  if (job.data.type === 'cod_purchase') {
    return sendCodPurchaseToMeta({
      orderId: job.data.orderId,
      retryCount,
      finalAttempt,
    });
  }

  if (job.data.type === 'online_paid_purchase') {
    return sendOnlinePaidPurchaseToMeta({
      orderId: job.data.orderId,
      retryCount,
      finalAttempt,
    });
  }

  if (job.data.type === 'ga4_purchase') {
    return sendGa4Purchase({
      orderId: job.data.orderId,
      source: job.data.source,
      retryCount,
      finalAttempt,
    });
  }

  console.warn(`[MetaCapiWorker] Unknown job type: ${(job.data as { type: string }).type}`);
  return { ok: true, skipped: true, reason: 'UNKNOWN_JOB_TYPE' };
}

export function startMetaCapiWorker(): Worker<MetaCapiJobData> {
  const worker = new Worker<MetaCapiJobData>(
    META_CAPI_PURCHASE_QUEUE_NAME,
    handleMetaCapiPurchase,
    {
      connection: bullRedis,
      concurrency: 2,
      limiter: {
        max: 20,
        duration: 1_000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[MetaCapiWorker] Job ${job.id} (${job.data.type}) completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[MetaCapiWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[MetaCapiWorker] Worker error:', err);
  });

  console.log('[MetaCapiWorker] Meta CAPI worker started');
  return worker;
}

const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].includes('metaCapiWorker');

if (isDirectRun) {
  startMetaCapiWorker();
}
