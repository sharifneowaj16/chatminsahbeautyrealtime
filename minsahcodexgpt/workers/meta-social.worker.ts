import { UnrecoverableError } from 'bullmq';
import {
  META_JOB_NAMES,
  META_QUEUE_NAMES,
  type MetaSocialAttachmentValidationJobPayload,
  type MetaSocialEventReplayJobPayload,
  type MetaFacebookPageInboxSyncJobPayload,
} from '@/lib/jobs/job-types';
import { getMetaJobAuditById, incrementMetaJobReplayCount } from '@/lib/jobs/audit-repository';
import { enqueueMetaJob } from '@/lib/jobs/queues';
import { startMetaJobWorker } from '@/lib/jobs/worker';
import {
  claimBullMqSocialJob,
  createMetaSocialRetryError,
  decideMetaSocialJobFailure,
  executeMetaSocialAttachmentValidationJob,
  executeMetaSocialReplayJob,
} from '@/lib/meta-platform/queue';
import { processMetaSocialAttachmentValidation } from '@/lib/meta-platform/queue/social-attachment-validation-processor';
import { markInstagramAttachmentValidationFailedStorage } from '@/lib/meta-platform/repositories/prisma-instagram-persistence';
import { executeFacebookInboxSyncProduction } from '@/lib/meta-platform/domains/facebook/legacy-bridge';

function terminalError(decision: ReturnType<typeof decideMetaSocialJobFailure>) {
  const error = new UnrecoverableError(`${decision.classification}:${decision.safeReasonCode}`);
  Object.assign(error, decision);
  return error;
}

export function startMetaSocialWorker() {
  return startMetaJobWorker(META_QUEUE_NAMES.SOCIAL, async (job) => {
    if (job.name === META_JOB_NAMES.SOCIAL_ATTACHMENT_VALIDATION) {
      const data = job.data as MetaSocialAttachmentValidationJobPayload;
      const attempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
      const claim = claimBullMqSocialJob({
        queueName: META_QUEUE_NAMES.SOCIAL,
        jobName: META_JOB_NAMES.SOCIAL_ATTACHMENT_VALIDATION,
        jobId: String(job.id ?? data.idempotencyKey),
        attemptsMade: job.attemptsMade,
        data,
      });
      const execution = await executeMetaSocialAttachmentValidationJob({
        claim,
        processAttachment: processMetaSocialAttachmentValidation,
      });
      if (execution.outcome === 'ACK') return { auditStatus: 'SUCCEEDED' as const, result: execution.value };
      const decision = decideMetaSocialJobFailure({
        nack: execution.queueResult,
        dedupeKey: data.socialEnvelope.dedupeKey,
        attempt: job.attemptsMade + 1,
        maxAttempts: attempts,
      });
      if (decision.action === 'DEAD_LETTER') {
        if (decision.safeReasonCode === 'META_SOCIAL_RETRY_EXHAUSTED') {
          await markInstagramAttachmentValidationFailedStorage({
            attachmentId: data.socialEnvelope.payloadRef.id,
            validationJobReference: data.socialEnvelope.dedupeKey,
            reasonCode: 'META_MEDIA_VALIDATION_RETRY_EXHAUSTED',
            validatorVersion: 'phase31-layer4.7-v1',
          }).catch(() => undefined);
        }
        throw terminalError(decision);
      }
      if (decision.action === 'RECONCILE') throw terminalError(decision);
      throw createMetaSocialRetryError({ decision, dedupeKey: data.socialEnvelope.dedupeKey });
    }

    if (job.name === META_JOB_NAMES.FACEBOOK_PAGE_INBOX_SYNC) {
      const data = job.data as MetaFacebookPageInboxSyncJobPayload;
      const pageId = data.socialEnvelope.payloadRef.scope?.pageId;
      if (!pageId) throw new UnrecoverableError('META_FACEBOOK_PAGE_ID_REQUIRED');
      try {
        const result = await executeFacebookInboxSyncProduction({ pageId });
        return { auditStatus: 'SUCCEEDED' as const, result };
      } catch (error) {
        const candidate = error as { code?: unknown; retryable?: unknown; message?: unknown };
        if (candidate.retryable === false || String(candidate.code ?? '').includes('PERMISSION') || String(candidate.code ?? '').includes('TOKEN_')) {
          const terminal = new UnrecoverableError(typeof candidate.code === 'string' ? candidate.code : 'META_FACEBOOK_INBOX_SYNC_BLOCKED');
          Object.assign(terminal, { safeReasonCode: typeof candidate.code === 'string' ? candidate.code : 'META_FACEBOOK_INBOX_SYNC_BLOCKED' });
          throw terminal;
        }
        throw error;
      }
    }

    if (job.name === META_JOB_NAMES.SOCIAL_EVENT_REPLAY) {
      const data = job.data as MetaSocialEventReplayJobPayload;
      const attempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
      const claim = claimBullMqSocialJob({
        queueName: META_QUEUE_NAMES.SOCIAL,
        jobName: META_JOB_NAMES.SOCIAL_EVENT_REPLAY,
        jobId: String(job.id ?? data.idempotencyKey),
        attemptsMade: job.attemptsMade,
        data,
      });
      const requestAudit = claim.auditId ? await getMetaJobAuditById(claim.auditId) : null;
      const execution = await executeMetaSocialReplayJob({
        claim,
        requestedBy: requestAudit?.requestedBy ?? undefined,
        dependencies: {
          getAudit: getMetaJobAuditById,
          enqueue: enqueueMetaJob,
          incrementReplayCount: incrementMetaJobReplayCount,
        },
      });
      if (execution.outcome === 'ACK') return { auditStatus: 'SUCCEEDED' as const, result: execution.value };
      const decision = decideMetaSocialJobFailure({
        nack: execution.queueResult,
        dedupeKey: data.socialEnvelope.dedupeKey,
        attempt: job.attemptsMade + 1,
        maxAttempts: attempts,
      });
      if (decision.action !== 'RETRY') throw terminalError(decision);
      throw createMetaSocialRetryError({ decision, dedupeKey: data.socialEnvelope.dedupeKey });
    }

    throw new UnrecoverableError(`META_SOCIAL_JOB_UNSUPPORTED:${job.name}`);
  });
}

if (process.argv[1]?.includes('meta-social.worker')) startMetaSocialWorker();
