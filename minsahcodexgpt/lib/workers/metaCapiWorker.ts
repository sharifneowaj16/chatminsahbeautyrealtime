import { Worker, type Job } from 'bullmq';
import { bullRedis } from '@/lib/queue/productQueue';
import {
  META_CAPI_PURCHASE_MAX_ATTEMPTS,
  META_CAPI_PURCHASE_QUEUE_NAME,
  type MetaCapiJobData,
} from '@/lib/queue/metaCapiQueue';
import { sendCodPurchaseToMeta, sendOnlinePaidPurchaseToMeta } from '@/lib/tracking/meta-capi-cod-purchase';
import { sendCoreCapiEventToMeta } from '@/lib/tracking/meta-capi-core-event';

const globalRuntime = globalThis as unknown as {
  metaLegacyWorkerRuntime?: {
    started: boolean;
    startedAt: string | null;
    lastHeartbeatAt: string | null;
    completedJobs: number;
    failedJobs: number;
    lastError: string | null;
  };
};
function runtime() {
  return globalRuntime.metaLegacyWorkerRuntime ??= {
    started: false,
    startedAt: null,
    lastHeartbeatAt: null,
    completedJobs: 0,
    failedJobs: 0,
    lastError: null,
  };
}
export function getMetaCapiWorkerRuntimeState() { return { ...runtime() }; }
function touch() { runtime().lastHeartbeatAt = new Date().toISOString(); }

async function handleMetaCapiPurchase(job: Job<MetaCapiJobData>) {
  const retryCount = job.attemptsMade;
  const attempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : META_CAPI_PURCHASE_MAX_ATTEMPTS;
  const finalAttempt = retryCount + 1 >= attempts;
  if (job.data.type === 'core_event') return sendCoreCapiEventToMeta({ jobData: job.data, retryCount, finalAttempt });
  if (job.data.type === 'cod_purchase') return sendCodPurchaseToMeta({ orderId: job.data.orderId, retryCount, finalAttempt });
  return sendOnlinePaidPurchaseToMeta({ orderId: job.data.orderId, retryCount, finalAttempt });
}

export function startMetaCapiWorker() {
  const state = runtime();
  state.started = true;
  state.startedAt ??= new Date().toISOString();
  touch();
  const worker = new Worker<MetaCapiJobData>(META_CAPI_PURCHASE_QUEUE_NAME, handleMetaCapiPurchase, {
    connection: bullRedis,
    concurrency: 2,
    limiter: { max: 20, duration: 1_000 },
    maxStalledCount: 2,
  });
  worker.on('completed', () => { runtime().completedJobs += 1; touch(); });
  worker.on('failed', (_job, error) => { runtime().failedJobs += 1; runtime().lastError = error.message; touch(); });
  worker.on('error', (error) => { runtime().lastError = error.message; touch(); });
  return worker;
}

if (process.argv[1]?.includes('metaCapiWorker')) startMetaCapiWorker();
