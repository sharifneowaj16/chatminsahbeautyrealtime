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
import { sendGa4Purchase, sendGa4Refund } from '@/lib/tracking/ga4-measurement-protocol';

const globalForMetaCapiWorker = globalThis as unknown as {
  minsahMetaCapiWorkerRuntime?: {
    started: boolean;
    startedAt: string | null;
    lastHeartbeatAt: string | null;
    completedJobs: number;
    failedJobs: number;
    lastError: string | null;
  };
};

function getWorkerRuntime() {
  if (!globalForMetaCapiWorker.minsahMetaCapiWorkerRuntime) {
    globalForMetaCapiWorker.minsahMetaCapiWorkerRuntime = {
      started: false,
      startedAt: null,
      lastHeartbeatAt: null,
      completedJobs: 0,
      failedJobs: 0,
      lastError: null,
    };
  }
  return globalForMetaCapiWorker.minsahMetaCapiWorkerRuntime;
}

export function getMetaCapiWorkerRuntimeState() {
  return { ...getWorkerRuntime() };
}

function touchWorkerHeartbeat() {
  getWorkerRuntime().lastHeartbeatAt = new Date().toISOString();
}

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

  if (job.data.type === 'ga4_refund') {
    return sendGa4Refund({
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
  const runtime = getWorkerRuntime();
  runtime.started = true;
  runtime.startedAt = runtime.startedAt ?? new Date().toISOString();
  touchWorkerHeartbeat();
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
    const state = getWorkerRuntime();
    state.completedJobs += 1;
    touchWorkerHeartbeat();
    console.log(`[MetaCapiWorker] Job ${job.id} (${job.data.type}) completed`);
  });

  worker.on('failed', (job, err) => {
    const state = getWorkerRuntime();
    state.failedJobs += 1;
    state.lastError = err.message;
    touchWorkerHeartbeat();
    console.error(`[MetaCapiWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    const state = getWorkerRuntime();
    state.lastError = err.message;
    touchWorkerHeartbeat();
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
