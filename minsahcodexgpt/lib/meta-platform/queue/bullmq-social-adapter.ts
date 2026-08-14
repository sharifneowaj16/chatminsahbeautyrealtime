import {
  META_JOB_NAMES,
  META_JOB_SCHEMA_VERSION,
  META_QUEUE_NAMES,
  validateMetaJobPayload,
  type MetaJobName,
  type MetaJobPayload,
  type MetaQueueName,
} from '../../jobs/job-types.ts';
import { validateMetaSocialJobEnvelope } from './social-job-envelope.ts';
import type { MetaSocialJobEnvelope, MetaSocialJobType } from './social-job-types.ts';
import {
  createMetaSocialQueueClaim,
  type MetaSocialQueueAdapter,
  type MetaSocialQueueEnqueueResult,
  type MetaSocialQueueTransportClaim,
} from './social-queue-adapter.ts';

type WithoutAuditId<T> = T extends unknown ? Omit<T, 'auditId'> : never;
export type MetaJobEnqueuePayload = WithoutAuditId<MetaJobPayload>;

export type MetaSocialBullMqEnqueueResponse = Readonly<{
  accepted: boolean;
  deduplicated: boolean;
  auditId: string;
  jobId?: string;
  idempotencyKey: string;
  status: string;
}>;

export type MetaSocialBullMqEnqueuer = (input: {
  queueName: MetaQueueName;
  jobName: MetaJobName;
  payload: MetaJobEnqueuePayload;
  sourceId?: string;
  options?: Readonly<{ delay?: number }>;
}) => Promise<MetaSocialBullMqEnqueueResponse>;

export type MetaSocialBullMqRoute = Readonly<{
  queueName: MetaQueueName;
  jobName: MetaJobName;
  payloadType: MetaJobPayload['type'];
  compatibility: 'EXISTING' | 'ADDITIVE';
}>;

export const META_SOCIAL_BULLMQ_ROUTES = Object.freeze({
  PROCESS_META_LEAD: Object.freeze({
    queueName: META_QUEUE_NAMES.LEADS,
    jobName: META_JOB_NAMES.LEAD_FETCH,
    payloadType: 'lead_fetch',
    compatibility: 'EXISTING',
  }),
  PROCESS_INSTAGRAM_INBOUND: Object.freeze({
    queueName: META_QUEUE_NAMES.INSTAGRAM,
    jobName: META_JOB_NAMES.INSTAGRAM_MESSAGE,
    payloadType: 'instagram_message',
    compatibility: 'EXISTING',
  }),
  SEND_INSTAGRAM_REPLY: Object.freeze({
    queueName: META_QUEUE_NAMES.INSTAGRAM,
    jobName: META_JOB_NAMES.INSTAGRAM_REPLY,
    payloadType: 'instagram_reply',
    compatibility: 'ADDITIVE',
  }),
  SEND_INSTAGRAM_PRIVATE_REPLY: Object.freeze({
    queueName: META_QUEUE_NAMES.INSTAGRAM,
    jobName: META_JOB_NAMES.INSTAGRAM_PRIVATE_REPLY,
    payloadType: 'instagram_private_reply',
    compatibility: 'ADDITIVE',
  }),
  VALIDATE_SOCIAL_ATTACHMENT: Object.freeze({
    queueName: META_QUEUE_NAMES.SOCIAL,
    jobName: META_JOB_NAMES.SOCIAL_ATTACHMENT_VALIDATION,
    payloadType: 'social_attachment_validation',
    compatibility: 'ADDITIVE',
  }),
  REPLAY_SOCIAL_EVENT: Object.freeze({
    queueName: META_QUEUE_NAMES.SOCIAL,
    jobName: META_JOB_NAMES.SOCIAL_EVENT_REPLAY,
    payloadType: 'social_event_replay',
    compatibility: 'ADDITIVE',
  }),
  SYNC_FACEBOOK_PAGE_INBOX: Object.freeze({
    queueName: META_QUEUE_NAMES.SOCIAL,
    jobName: META_JOB_NAMES.FACEBOOK_PAGE_INBOX_SYNC,
    payloadType: 'facebook_page_inbox_sync',
    compatibility: 'ADDITIVE',
  }),
  REFRESH_META_PERMISSION_HEALTH: Object.freeze({
    queueName: META_QUEUE_NAMES.CONNECTION_HEALTH,
    jobName: META_JOB_NAMES.CONNECTION_HEALTH,
    payloadType: 'connection_health',
    compatibility: 'EXISTING',
  }),
} satisfies Readonly<Record<MetaSocialJobType, MetaSocialBullMqRoute>>);

function base(envelope: MetaSocialJobEnvelope) {
  return {
    schemaVersion: META_JOB_SCHEMA_VERSION,
    idempotencyKey: envelope.dedupeKey,
    requestedAt: new Date().toISOString(),
    correlationId: envelope.correlationId,
    sourceId: envelope.payloadRef.id,
    socialEnvelope: envelope,
  } as const;
}

export function mapMetaSocialEnvelopeToBullMq(
  input: MetaSocialJobEnvelope,
  options: Readonly<{ now?: Date }> = {},
): Readonly<{
  queueName: MetaQueueName;
  jobName: MetaJobName;
  payload: MetaJobEnqueuePayload;
  sourceId: string;
  options?: Readonly<{ delay: number }>;
}> {
  const validation = validateMetaSocialJobEnvelope(input);
  if (!validation.valid) {
    const error = new TypeError('META_SOCIAL_JOB_ENVELOPE_INVALID');
    Object.assign(error, { issues: validation.issues });
    throw error;
  }
  const envelope = validation.envelope;
  const route = META_SOCIAL_BULLMQ_ROUTES[envelope.jobType];
  const common = base(envelope);
  let payload: MetaJobEnqueuePayload;

  switch (envelope.jobType) {
    case 'PROCESS_META_LEAD':
      payload = {
        ...common,
        type: 'lead_fetch',
        receiptId: envelope.receiptId as string,
        leadgenId: envelope.payloadRef.providerObjectId as string,
        pageId: envelope.payloadRef.scope?.pageId,
        formId: envelope.payloadRef.scope?.formId,
      };
      break;
    case 'PROCESS_INSTAGRAM_INBOUND':
      payload = {
        ...common,
        type: 'instagram_message',
        receiptId: envelope.receiptId as string,
      };
      break;
    case 'REFRESH_META_PERMISSION_HEALTH':
      payload = {
        ...common,
        type: 'connection_health',
        connectionId: envelope.payloadRef.id,
        checks: ['TOKEN', 'PERMISSIONS', 'ASSETS', 'VERSION'],
      };
      break;
    case 'SEND_INSTAGRAM_REPLY':
      payload = { ...common, type: 'instagram_reply' };
      break;
    case 'SEND_INSTAGRAM_PRIVATE_REPLY':
      payload = { ...common, type: 'instagram_private_reply' };
      break;
    case 'VALIDATE_SOCIAL_ATTACHMENT':
      payload = { ...common, type: 'social_attachment_validation' };
      break;
    case 'REPLAY_SOCIAL_EVENT':
      payload = { ...common, type: 'social_event_replay' };
      break;
    case 'SYNC_FACEBOOK_PAGE_INBOX':
      payload = { ...common, type: 'facebook_page_inbox_sync' };
      break;
  }

  const jobValidation = validateMetaJobPayload({
    queueName: route.queueName,
    jobName: route.jobName,
    payload,
  });
  if (!jobValidation.valid) {
    const error = new TypeError('META_SOCIAL_BULLMQ_PAYLOAD_INVALID');
    Object.assign(error, { issues: jobValidation.issues });
    throw error;
  }
  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new TypeError('META_SOCIAL_BULLMQ_MAPPING_TIME_INVALID');
  const delay = Math.max(0, new Date(envelope.scheduledAt).getTime() - now.getTime());
  return Object.freeze({
    queueName: route.queueName,
    jobName: route.jobName,
    payload: jobValidation.payload as MetaJobEnqueuePayload,
    sourceId: envelope.payloadRef.id,
    ...(delay > 0 ? { options: Object.freeze({ delay }) } : {}),
  });
}

export function isMetaSocialQueueUnavailableError(error: unknown): boolean {
  const candidate = error as { code?: unknown; name?: unknown; message?: unknown };
  const code = String(candidate?.code ?? '').toUpperCase();
  const name = String(candidate?.name ?? '').toUpperCase();
  const message = String(candidate?.message ?? '').toUpperCase();
  return [
    'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN',
    'READONLY', 'CLUSTERDOWN', 'CONNECTION_CLOSED', 'MAX_RETRIES_PER_REQUEST',
  ].some((value) => code.includes(value) || name.includes(value) || message.includes(value))
    || message.includes('REDIS')
    || message.includes('QUEUE IS CLOSED');
}

export function createBullMqSocialQueueAdapter(input: {
  enqueueMetaJob: MetaSocialBullMqEnqueuer;
  now?: () => Date;
  unavailableRetryMs?: number;
}): MetaSocialQueueAdapter {
  const unavailableRetryMs = input.unavailableRetryMs ?? 60_000;
  if (!Number.isSafeInteger(unavailableRetryMs) || unavailableRetryMs < 1_000 || unavailableRetryMs > 24 * 60 * 60 * 1_000) {
    throw new TypeError('META_SOCIAL_QUEUE_UNAVAILABLE_RETRY_INVALID');
  }
  return Object.freeze({
    async enqueue(envelope: MetaSocialJobEnvelope): Promise<MetaSocialQueueEnqueueResult> {
      const validation = validateMetaSocialJobEnvelope(envelope);
      if (!validation.valid) {
        return Object.freeze({
          outcome: 'REJECTED' as const,
          accepted: false as const,
          recoverable: false as const,
          code: 'SOCIAL_QUEUE_ENVELOPE_INVALID' as const,
          issues: validation.issues,
        });
      }
      const now = input.now?.() ?? new Date();
      const mapped = mapMetaSocialEnvelopeToBullMq(validation.envelope, { now });
      try {
        const result = await input.enqueueMetaJob(mapped);
        if (!result.accepted) throw new Error('META_SOCIAL_BULLMQ_ENQUEUE_REJECTED');
        return Object.freeze({
          outcome: result.deduplicated ? 'DEDUPLICATED' as const : 'ENQUEUED' as const,
          accepted: true as const,
          deduplicated: result.deduplicated,
          auditId: result.auditId,
          ...(result.jobId ? { jobId: result.jobId } : {}),
          status: result.status,
          envelope: validation.envelope,
        });
      } catch (error) {
        if (!isMetaSocialQueueUnavailableError(error)) throw error;
        return Object.freeze({
          outcome: 'DEFERRED' as const,
          accepted: false as const,
          recoverable: true as const,
          code: 'SOCIAL_QUEUE_UNAVAILABLE' as const,
          retryAt: new Date(now.getTime() + unavailableRetryMs).toISOString(),
          envelope: validation.envelope,
        });
      }
    },
  });
}

export function claimBullMqSocialJob(input: {
  queueName: string;
  jobName: string;
  jobId: string;
  attemptsMade: number;
  data: unknown;
  claimedAt?: Date | string;
}): MetaSocialQueueTransportClaim {
  const record = typeof input.data === 'object' && input.data !== null
    ? input.data as Record<string, unknown>
    : {};
  return createMetaSocialQueueClaim({
    queueName: input.queueName,
    jobName: input.jobName,
    jobId: input.jobId,
    auditId: typeof record.auditId === 'string' ? record.auditId : null,
    deliveryAttempt: input.attemptsMade + 1,
    claimedAt: input.claimedAt,
    envelope: record.socialEnvelope,
  });
}
