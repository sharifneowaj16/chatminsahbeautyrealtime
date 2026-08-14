import 'server-only';
import { Queue, type JobsOptions } from 'bullmq';
import { getMetaJobsRedis } from '@/lib/jobs/connection';

export const PRIVACY_QUEUE_NAME = 'privacy-governance';
export const PRIVACY_JOB_NAMES = {
  RETENTION_CLEANUP: 'PRIVACY_RETENTION_CLEANUP',
  DELETION_PROCESSOR: 'PRIVACY_DELETION_PROCESSOR',
  SUPPRESSION_SYNC: 'TRACKING_SUPPRESSION_SYNC',
  PII_AUDIT_SCAN: 'PII_AUDIT_SCAN',
} as const;

export type PrivacyJobName = (typeof PRIVACY_JOB_NAMES)[keyof typeof PRIVACY_JOB_NAMES];
export type PrivacyJobPayload = {
  schemaVersion: 1;
  type: PrivacyJobName;
  idempotencyKey: string;
  requestedAt: string;
  requestId?: string;
  limit?: number;
  cursor?: string;
};

const globalQueue = globalThis as unknown as { privacyGovernanceQueue?: Queue<PrivacyJobPayload> };

export function getPrivacyGovernanceQueue() {
  if (globalQueue.privacyGovernanceQueue) return globalQueue.privacyGovernanceQueue;
  const queue = new Queue<PrivacyJobPayload>(PRIVACY_QUEUE_NAME, {
    connection: getMetaJobsRedis(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: { age: 7 * 24 * 60 * 60, count: 2_000 },
      removeOnFail: { age: 30 * 24 * 60 * 60, count: 5_000 },
    },
  });
  if (process.env.NODE_ENV !== 'production') globalQueue.privacyGovernanceQueue = queue;
  return queue;
}

export function enqueuePrivacyJob(input: {
  type: PrivacyJobName;
  idempotencyKey: string;
  requestId?: string;
  limit?: number;
  cursor?: string;
  options?: JobsOptions;
}) {
  const payload: PrivacyJobPayload = {
    schemaVersion: 1,
    type: input.type,
    idempotencyKey: input.idempotencyKey,
    requestedAt: new Date().toISOString(),
    requestId: input.requestId,
    limit: input.limit,
    cursor: input.cursor,
  };
  const jobId = `privacy-${Buffer.from(input.idempotencyKey).toString('base64url').slice(0, 80)}`;
  return getPrivacyGovernanceQueue().add(input.type, payload, { ...input.options, jobId });
}
