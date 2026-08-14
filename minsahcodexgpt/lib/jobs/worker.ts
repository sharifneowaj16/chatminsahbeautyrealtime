import 'server-only';
import { UnrecoverableError, Worker, type Job } from 'bullmq';
import { getMetaJobsRedis } from './connection';
import { getMetaQueue } from './queues';
import { updateMetaJobAudit } from './audit-repository';
import { META_QUEUE_NAMES, validateMetaJobPayload, type MetaJobPayload, type MetaQueueName } from './job-types';
import { getMetaProviderRetryDelayMs, metaJobBackoffStrategy } from './retry-policy';

export type MetaWorkerProcessorResult = {
  auditStatus?: 'SUCCEEDED' | 'RETRYING' | 'DEAD_LETTER';
  nextRunAt?: Date;
  result?: unknown;
};

const QUEUE_RUNTIME: Record<MetaQueueName, {
  concurrency: number;
  limiter: { max: number; duration: number };
  timeoutMs: number;
}> = {
  [META_QUEUE_NAMES.CAPI_EVENTS]: { concurrency: 4, limiter: { max: 20, duration: 1_000 }, timeoutMs: 90_000 },
  [META_QUEUE_NAMES.CATALOG_SYNC]: { concurrency: 1, limiter: { max: 2, duration: 60_000 }, timeoutMs: 10 * 60_000 },
  [META_QUEUE_NAMES.CATALOG_STATUS]: { concurrency: 2, limiter: { max: 10, duration: 60_000 }, timeoutMs: 2 * 60_000 },
  [META_QUEUE_NAMES.LEADS]: { concurrency: 4, limiter: { max: 10, duration: 1_000 }, timeoutMs: 60_000 },
  [META_QUEUE_NAMES.DIAGNOSTICS]: { concurrency: 1, limiter: { max: 5, duration: 60_000 }, timeoutMs: 2 * 60_000 },
  [META_QUEUE_NAMES.CONNECTION_HEALTH]: { concurrency: 1, limiter: { max: 5, duration: 60_000 }, timeoutMs: 60_000 },
  [META_QUEUE_NAMES.PRODUCT_SETS]: { concurrency: 1, limiter: { max: 2, duration: 60_000 }, timeoutMs: 10 * 60_000 },
  [META_QUEUE_NAMES.ADS_INSIGHTS]: { concurrency: 1, limiter: { max: 2, duration: 60_000 }, timeoutMs: 5 * 60_000 },
  [META_QUEUE_NAMES.INSTAGRAM]: { concurrency: 4, limiter: { max: 20, duration: 1_000 }, timeoutMs: 2 * 60_000 },
  [META_QUEUE_NAMES.SOCIAL]: { concurrency: 4, limiter: { max: 20, duration: 1_000 }, timeoutMs: 2 * 60_000 },
};

function safeError(error: unknown) {
  const row = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
  const safeReasonCode = typeof row.safeReasonCode === 'string' ? row.safeReasonCode : typeof row.code === 'string' ? row.code : undefined;
  return {
    code: error instanceof UnrecoverableError ? 'UNRECOVERABLE_JOB_ERROR' : 'META_JOB_PROCESSOR_ERROR',
    name: error instanceof Error ? error.name : 'UnknownError',
    ...(safeReasonCode ? { safeReasonCode } : {}),
    ...(typeof row.classification === 'string' ? { classification: row.classification } : {}),
    ...(row.reconciliationRequired === true ? { reconciliationRequired: true } : {}),
    ...(Number.isSafeInteger(row.retryAfterMs) ? { retryAfterMs: Number(row.retryAfterMs) } : {}),
    ...(Number.isSafeInteger(row.retryDelayMs) ? { retryDelayMs: Number(row.retryDelayMs) } : {}),
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`META_JOB_TIMEOUT_${timeoutMs}MS`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function startMetaJobWorker(
  queueName: MetaQueueName,
  processor: (job: Job<MetaJobPayload>) => Promise<unknown | MetaWorkerProcessorResult>
) {
  const runtime = QUEUE_RUNTIME[queueName];
  const connection = getMetaJobsRedis();
  const worker = new Worker<MetaJobPayload>(
    queueName,
    async (job) => {
      const validation = validateMetaJobPayload({
        queueName,
        jobName: job.name as never,
        payload: job.data,
      });
      if (!validation.valid) {
        if (job.data?.auditId) {
          await updateMetaJobAudit({
            auditId: job.data.auditId,
            status: 'DEAD_LETTER',
            attempts: job.attemptsMade + 1,
            error: { code: 'META_JOB_PAYLOAD_INVALID', issues: validation.issues },
          });
        }
        throw new UnrecoverableError('META_JOB_PAYLOAD_INVALID');
      }

      const auditId = validation.payload.auditId;
      if (auditId) {
        await updateMetaJobAudit({
          auditId,
          status: 'RUNNING',
          attempts: job.attemptsMade + 1,
          progress: 0,
          heartbeat: true,
        });
      }

      try {
        const rawResult = await withTimeout(Promise.resolve(processor(job)), runtime.timeoutMs);
        const result = rawResult && typeof rawResult === 'object' && 'auditStatus' in rawResult
          ? rawResult as MetaWorkerProcessorResult
          : { auditStatus: 'SUCCEEDED' as const, result: rawResult };
        if (auditId) {
          await updateMetaJobAudit({
            auditId,
            status: result.auditStatus ?? 'SUCCEEDED',
            attempts: job.attemptsMade + 1,
            progress: result.auditStatus === 'SUCCEEDED' ? 100 : undefined,
            nextRunAt: result.nextRunAt ?? null,
            heartbeat: true,
          });
        }
        return result.result ?? rawResult;
      } catch (error) {
        const attempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
        const finalAttempt = error instanceof UnrecoverableError || job.attemptsMade + 1 >= attempts;
        if (auditId) {
          await updateMetaJobAudit({
            auditId,
            status: finalAttempt ? 'DEAD_LETTER' : 'RETRYING',
            attempts: job.attemptsMade + 1,
            error: safeError(error),
            nextRunAt: finalAttempt ? null : new Date(Date.now() + getMetaProviderRetryDelayMs(job.attemptsMade + 1, error)),
            heartbeat: true,
          });
        }
        throw error;
      }
    },
    {
      connection,
      concurrency: runtime.concurrency,
      limiter: runtime.limiter,
      maximumRateLimitDelay: 60_000,
      maxStalledCount: 2,
      stalledInterval: 30_000,
      lockDuration: Math.max(60_000, runtime.timeoutMs + 30_000),
      settings: { backoffStrategy: metaJobBackoffStrategy },
    }
  );

  const heartbeatKey = `meta:v6:worker:${queueName}`;
  const heartbeat = setInterval(() => {
    void connection.set(heartbeatKey, new Date().toISOString(), 'EX', 45).catch(() => undefined);
  }, 15_000);
  heartbeat.unref?.();
  void connection.set(heartbeatKey, new Date().toISOString(), 'EX', 45).catch(() => undefined);

  worker.on('stalled', async (jobId) => {
    const job = await getMetaQueue(queueName).getJob(String(jobId)).catch(() => undefined);
    const auditId = job?.data.auditId;
    if (auditId) {
      await updateMetaJobAudit({
        auditId,
        status: 'RETRYING',
        error: { code: 'BULLMQ_JOB_STALLED', jobId: String(jobId) },
        nextRunAt: new Date(Date.now() + 60_000),
      }).catch(() => undefined);
    }
  });
  worker.on('error', (error) => {
    console.error(`[MetaJobWorker:${queueName}]`, error.message);
  });
  worker.on('closed', () => clearInterval(heartbeat));
  console.log(`[MetaJobWorker:${queueName}] started`);
  return worker;
}
