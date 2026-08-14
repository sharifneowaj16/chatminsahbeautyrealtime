export {
  META_SOCIAL_JOB_ENVIRONMENTS,
  META_SOCIAL_JOB_PLATFORMS,
  META_SOCIAL_JOB_REFERENCE_CONTRACT,
  META_SOCIAL_JOB_SCHEMA_VERSION,
  META_SOCIAL_JOB_TYPES,
  META_SOCIAL_PAYLOAD_REFERENCE_KINDS,
  META_SOCIAL_PAYLOAD_SCOPE_KEYS,
  META_SOCIAL_RECEIPT_REQUIRED_JOB_TYPES,
  metaSocialJobDedupePrefix,
} from './social-job-types.ts';
export type {
  CreateMetaSocialJobEnvelopeInput,
  MetaSocialJobEnvelope,
  MetaSocialJobEnvironment,
  MetaSocialJobObservability,
  MetaSocialJobPlatform,
  MetaSocialJobType,
  MetaSocialPayloadReference,
  MetaSocialPayloadReferenceKind,
  MetaSocialPayloadScopeKey,
} from './social-job-types.ts';
export {
  createMetaSocialJobEnvelope,
  isMetaSocialJobEnvelope,
  META_SOCIAL_JOB_ENVELOPE_MAX_BYTES,
  META_SOCIAL_JOB_MAX_ATTEMPT_NUMBER,
  MetaSocialJobEnvelopeError,
  validateMetaSocialJobEnvelope,
} from './social-job-envelope.ts';
export type {
  MetaSocialJobEnvelopeValidationIssue,
  MetaSocialJobEnvelopeValidationResult,
} from './social-job-envelope.ts';
export {
  ackMetaSocialQueueJob,
  createMetaSocialQueueClaim,
  META_SOCIAL_QUEUE_FAILURE_CLASSES,
  nackMetaSocialQueueJob,
} from './social-queue-adapter.ts';
export type {
  MetaSocialQueueAck,
  MetaSocialQueueAdapter,
  MetaSocialQueueEnqueueResult,
  MetaSocialQueueFailureClass,
  MetaSocialQueueHandler,
  MetaSocialQueueHandlerResult,
  MetaSocialQueueNack,
  MetaSocialQueueTransportClaim,
} from './social-queue-adapter.ts';
export {
  claimBullMqSocialJob,
  createBullMqSocialQueueAdapter,
  isMetaSocialQueueUnavailableError,
  mapMetaSocialEnvelopeToBullMq,
  META_SOCIAL_BULLMQ_ROUTES,
} from './bullmq-social-adapter.ts';
export type {
  MetaSocialBullMqEnqueuer,
  MetaSocialBullMqEnqueueResponse,
  MetaSocialBullMqRoute,
} from './bullmq-social-adapter.ts';

export {
  buildMetaLeadProcessingDedupeKey,
  classifyMetaLeadJobFailure,
  createMetaLeadProcessingJobEnvelope,
  enqueueMetaLeadProcessingJob,
  executeMetaLeadProcessingJob,
} from './lead-processing-job.ts';
export type {
  MetaLeadJobFailureDecision,
  MetaLeadProcessingJobExecutionResult,
  MetaLeadReceiptProcessor,
  MetaLeadReceiptProcessorInput,
} from './lead-processing-job.ts';

export {
  buildMetaInstagramInboundDedupeKey,
  classifyMetaInstagramInboundFailure,
  createMetaInstagramInboundJobEnvelope,
  enqueueMetaInstagramInboundJob,
  executeMetaInstagramInboundJob,
} from './instagram-inbound-job.ts';
export type {
  MetaInstagramInboundFailureDecision,
  MetaInstagramInboundJobExecutionResult,
  MetaInstagramInboundProcessor,
  MetaInstagramInboundProcessorInput,
} from './instagram-inbound-job.ts';

export {
  buildMetaSocialAttachmentValidationDedupeKey,
  createMetaSocialAttachmentValidationJobEnvelope,
  enqueueMetaSocialAttachmentValidationJob,
  classifyMetaSocialAttachmentValidationFailure,
  executeMetaSocialAttachmentValidationJob,
} from './social-attachment-validation-job.ts';
export type {
  MetaSocialAttachmentValidationExecutionResult,
  MetaSocialAttachmentValidationFailureDecision,
  MetaSocialAttachmentValidationProcessor,
} from './social-attachment-validation-job.ts';
export { buildMetaSocialPrivateStorageKey, runMetaSocialAttachmentValidationPipeline } from './social-attachment-validation-pipeline.ts';

export { createMetaInstagramInboundRealtimeEvent } from './instagram-inbound-event.ts';
export type { MetaInstagramInboundRealtimeEvent } from './instagram-inbound-event.ts';

export {
  createMetaInstagramOutboundRealtimeEvent,
  META_INSTAGRAM_OUTBOUND_REALTIME_STATES,
} from './instagram-outbound-event.ts';
export type {
  MetaInstagramOutboundRealtimeEvent,
  MetaInstagramOutboundRealtimeState,
} from './instagram-outbound-event.ts';

export * from './instagram-outbound-job';

export {
  createMetaSocialRetryError,
  decideMetaSocialJobFailure,
  getMetaSocialRetryDelayMs,
  META_SOCIAL_JOB_MAX_ATTEMPTS,
  META_SOCIAL_RETRY_BASE_DELAY_MS,
  META_SOCIAL_RETRY_JITTER_RATIO,
  META_SOCIAL_RETRY_MAX_DELAY_MS,
  projectMetaJobFailureForAdmin,
  sanitizeMetaSocialJobReasonCode,
} from './social-job-reliability.ts';
export type {
  MetaSocialJobFailureAction,
  MetaSocialJobFailureDecision,
} from './social-job-reliability.ts';

export {
  buildMetaSocialReplayRequestDedupeKey,
  createMetaSocialReplayJobEnvelope,
  executeMetaSocialReplayJob,
} from './social-replay-job.ts';
export type {
  MetaSocialReplayDependencies,
  MetaSocialReplayExecutionResult,
} from './social-replay-job.ts';
