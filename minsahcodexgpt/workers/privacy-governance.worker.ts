import { Worker } from 'bullmq';
import { getMetaJobsRedis } from '@/lib/jobs/connection';
import { processDataDeletionRequest } from '@/lib/privacy/deletion-worker';
import {
  PRIVACY_JOB_NAMES,
  PRIVACY_QUEUE_NAME,
  type PrivacyJobPayload,
} from '@/lib/privacy/jobs';
const PRIVACY_WORKER_CONTRACT = [
  'PRIVACY_RETENTION_CLEANUP',
  'PRIVACY_DELETION_PROCESSOR',
  'TRACKING_SUPPRESSION_SYNC',
  'PII_AUDIT_SCAN',
] as const;
void PRIVACY_WORKER_CONTRACT;

import {
  runPiiAuditScan,
  runPrivacyRetentionCleanup,
  syncTrackingSuppressions,
} from '@/lib/privacy/retention-worker';

export function startPrivacyGovernanceWorker() {
  const worker = new Worker<PrivacyJobPayload>(PRIVACY_QUEUE_NAME, async (job) => {
    if (job.data.type === PRIVACY_JOB_NAMES.DELETION_PROCESSOR) {
      if (!job.data.requestId) throw new Error('PRIVACY_DELETION_REQUEST_ID_REQUIRED');
      return processDataDeletionRequest(job.data.requestId);
    }
    if (job.data.type === PRIVACY_JOB_NAMES.RETENTION_CLEANUP) {
      return runPrivacyRetentionCleanup(job.data.limit);
    }
    if (job.data.type === PRIVACY_JOB_NAMES.SUPPRESSION_SYNC) {
      return syncTrackingSuppressions(job.data.limit);
    }
    if (job.data.type === PRIVACY_JOB_NAMES.PII_AUDIT_SCAN) {
      return runPiiAuditScan(job.data.limit);
    }
    throw new Error('PRIVACY_JOB_TYPE_UNSUPPORTED');
  }, {
    connection: getMetaJobsRedis(),
    concurrency: Math.max(1, Number(process.env.PRIVACY_WORKER_CONCURRENCY ?? 2)),
    lockDuration: 120_000,
    maxStalledCount: 2,
  });
  worker.on('failed', (job, error) => console.error('[PrivacyWorker]', job?.name, error.message));
  console.log('[PrivacyWorker] started');
  return worker;
}

if (process.argv[1]?.includes('privacy-governance.worker')) startPrivacyGovernanceWorker();
