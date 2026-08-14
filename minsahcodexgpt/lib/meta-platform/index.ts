export { MetaPlatform } from './platform';
export type { MetaPlatformOptions } from './platform';
export {
  isMetaNormalizedWebhookEvent,
  META_NORMALIZED_WEBHOOK_SCHEMA_VERSION,
  META_WEBHOOK_EVENT_GROUPS,
  META_WEBHOOK_EVENT_KINDS,
  META_WEBHOOK_ROUTING_TARGETS,
} from './contracts/webhook';
export type {
  MetaNormalizedWebhookEvent,
  MetaNormalizedWebhookPayload,
  MetaWebhookEventGroup,
  MetaWebhookEventKind,
  MetaWebhookRoutingTarget,
} from './contracts/webhook';
export {
  createMetaProviderIdentity,
  isMetaProviderIdentity,
  isSameMetaProviderIdentity,
  META_PROVIDER_IDENTITY_SCHEMA_VERSION,
  META_PROVIDER_IDENTITY_TYPES,
} from './contracts/social';
export type {
  CreateMetaProviderIdentityInput,
  MetaProviderIdentity,
  MetaProviderIdentityType,
} from './contracts/social';
export {
  createMetaLeadPayload,
  isMetaNormalizedLeadPayload,
  META_LEAD_FIELD_LIMIT,
  META_LEAD_FIELD_VALUE_LIMIT,
  META_LEAD_PAYLOAD_SCHEMA_VERSION,
  META_LEAD_SOURCE_CHANNELS,
  META_LEAD_VALUE_MAX_LENGTH,
} from './contracts/leads';
export type {
  CreateMetaLeadPayloadInput,
  MetaLeadAttribution,
  MetaLeadProviderFieldInput,
  MetaLeadProviderPayload,
  MetaLeadSourceChannel,
  MetaNormalizedLeadContact,
  MetaNormalizedLeadField,
  MetaNormalizedLeadPayload,
} from './contracts/leads';
export {
  createMetaInstagramConversation,
  createMetaInstagramMessage,
  isMetaNormalizedInstagramConversation,
  isMetaNormalizedInstagramMessage,
  META_INSTAGRAM_ATTACHMENT_FILE_NAME_MAX_LENGTH,
  META_INSTAGRAM_ATTACHMENT_LIMIT,
  META_INSTAGRAM_ATTACHMENT_TYPES,
  META_INSTAGRAM_ATTACHMENT_URL_MAX_LENGTH,
  META_INSTAGRAM_CONVERSATION_SCHEMA_VERSION,
  META_INSTAGRAM_CONVERSATION_STATUSES,
  META_INSTAGRAM_EVENT_TYPES,
  META_INSTAGRAM_MESSAGE_DIRECTIONS,
  META_INSTAGRAM_MESSAGE_SCHEMA_VERSION,
  META_INSTAGRAM_MESSAGE_TYPES,
  META_INSTAGRAM_TEXT_MAX_LENGTH,
} from './contracts/instagram';
export type {
  CreateMetaInstagramConversationInput,
  CreateMetaInstagramMessageInput,
  MetaInstagramAttachmentInput,
  MetaInstagramAttachmentType,
  MetaInstagramConversationStatus,
  MetaInstagramEventType,
  MetaInstagramMessageDirection,
  MetaInstagramMessageType,
  MetaInstagramParticipant,
  MetaInstagramParticipantInput,
  MetaNormalizedInstagramAttachment,
  MetaNormalizedInstagramConversation,
  MetaNormalizedInstagramMessage,
} from './contracts/instagram';


export {
  createMetaInstagramSendRequest,
  isMetaNormalizedInstagramSendRequest,
  META_INSTAGRAM_SEND_ACTOR_TYPES,
  META_INSTAGRAM_SEND_CORRELATION_ID_MAX_LENGTH,
  META_INSTAGRAM_SEND_IDEMPOTENCY_KEY_MAX_LENGTH,
  META_INSTAGRAM_SEND_MODES,
  META_INSTAGRAM_SEND_REQUEST_SCHEMA_VERSION,
  META_INSTAGRAM_SEND_SOURCE_KEY_MAX_LENGTH,
  META_INSTAGRAM_SEND_TEXT_MAX_LENGTH,
} from './contracts/instagram-send';
export type {
  CreateMetaInstagramSendRequestInput,
  MetaInstagramSendActorType,
  MetaInstagramSendMode,
  MetaNormalizedInstagramSendRequest,
} from './contracts/instagram-send';

export {
  createMetaSocialFailureResult,
  createMetaSocialSuccessResult,
  isMetaSocialPlatformResult,
  META_SOCIAL_PLATFORM_RESULT_SCHEMA_VERSION,
  META_SOCIAL_PLATFORM_RESULT_STATUSES,
} from './contracts/social-result';
export type {
  CreateMetaSocialSuccessResultInput,
  MetaSocialPlatformFailure,
  MetaSocialPlatformResult,
  MetaSocialPlatformResultBase,
  MetaSocialPlatformResultStatus,
  MetaSocialPlatformSuccess,
} from './contracts/social-result';

export {
  evaluateMetaInstagramReplyWindow,
  isMetaSocialReplyWindowDecision,
  META_INSTAGRAM_PRIVATE_REPLY_SURFACES,
  META_INSTAGRAM_PRIVATE_REPLY_WINDOW_MS,
  META_INSTAGRAM_STANDARD_REPLY_WINDOW_MS,
  META_SOCIAL_REPLY_WINDOW_DECISIONS,
  META_SOCIAL_REPLY_WINDOW_POLICY_IDS,
  META_SOCIAL_REPLY_WINDOW_POLICY_SCHEMA_VERSION,
  META_SOCIAL_REPLY_WINDOW_REASONS,
} from './policies/reply-window';
export type {
  EvaluateMetaInstagramReplyWindowInput,
  MetaInstagramPrivateReplySurface,
  MetaSocialReplyWindowDecision,
  MetaSocialReplyWindowDecisionStatus,
  MetaSocialReplyWindowPolicyId,
  MetaSocialReplyWindowReason,
} from './policies/reply-window';

export {
  evaluateMetaSocialAttachmentPolicy,
  isMetaSocialAttachmentPolicyDecision,
  META_SOCIAL_ATTACHMENT_DECISIONS,
  META_SOCIAL_ATTACHMENT_MAX_BYTES,
  META_SOCIAL_ATTACHMENT_POLICY_ID,
  META_SOCIAL_ATTACHMENT_POLICY_SCHEMA_VERSION,
  META_SOCIAL_ATTACHMENT_REASONS,
  META_SOCIAL_ATTACHMENT_SCAN_RESULTS,
  META_SOCIAL_ATTACHMENT_STAGES,
} from './policies/attachments';
export type {
  EvaluateMetaSocialAttachmentPolicyInput,
  MetaSocialAttachmentDecisionStatus,
  MetaSocialAttachmentPolicyDecision,
  MetaSocialAttachmentReason,
  MetaSocialAttachmentScanResult,
  MetaSocialAttachmentStage,
} from './policies/attachments';

export {
  createMetaPageAccountBinding,
  isMetaPageAccountBinding,
  META_PAGE_ACCOUNT_BINDING_SCHEMA_VERSION,
} from './contracts/pages';
export type {
  CreateMetaPageAccountBindingInput,
  MetaInstagramAccountIdentity,
  MetaPageAccountBinding,
  MetaPageIdentity,
} from './contracts/pages';
export {
  META_CAPABILITY_DEFINITIONS,
  getMetaCapabilityDefinition,
  isMetaCapabilityId,
  listMetaCapabilityDefinitions,
} from './capabilities/registry';
export { getMetaCapabilityPermissionRequirement } from './capabilities/permission-matrix';
export { createMetaInvocationContext, META_ACTOR_TYPES } from './core/context';
export type {
  CreateMetaInvocationContextInput,
  MetaActorType,
  MetaInvocationActor,
  MetaInvocationContext,
} from './core/context';
export {
  createMetaPlatformError,
  isMetaPlatformError,
  META_ERROR_CATEGORIES,
  normalizeMetaPlatformError,
} from './core/errors';
export type {
  CreateMetaPlatformErrorInput,
  MetaErrorCategory,
  MetaPlatformError,
} from './core/errors';
export { isMetaResult, metaFailure, metaSuccess } from './core/result';
export type { MetaFailure, MetaResult, MetaSuccess } from './core/result';
export {
  createMetaSocialProviderError,
  isMetaSocialProviderError,
  META_SOCIAL_ERROR_DISPOSITIONS,
  META_SOCIAL_ERROR_DOMAINS,
  META_SOCIAL_PROVIDER_ERROR_KINDS,
  META_SOCIAL_REQUEST_KINDS,
  normalizeMetaSocialProviderError,
} from './errors/social-errors';
export type {
  CreateMetaSocialProviderErrorInput,
  MetaSocialErrorDisposition,
  MetaSocialErrorDomain,
  MetaSocialProviderError,
  MetaSocialProviderErrorKind,
  MetaSocialRequestKind,
  NormalizeMetaSocialProviderErrorInput,
} from './errors/social-errors';
export { META_CAPABILITY_IDS } from './types';
export type {
  MetaCapabilityAdapter,
  MetaCapabilityId,
  MetaOperationMode,
  MetaPlatformCapabilityStatus,
  MetaPlatformInvoker,
  MetaPlatformRequest,
} from './types';
export {
  createMetaCanonicalResource,
  META_CANONICAL_OBJECT_TYPES,
} from './models/canonical';
export type {
  CreateMetaCanonicalResourceInput,
  MetaCanonicalAttributes,
  MetaCanonicalObjectType,
  MetaCanonicalPage,
  MetaCanonicalResource,
  MetaCanonicalScalar,
  MetaCanonicalValue,
} from './models/canonical';
export {
  normalizeMetaProviderPage,
  normalizeMetaProviderResource,
} from './models/normalization';
export type { MetaProviderResourceMapping } from './models/normalization';
export {
  assertMetaReferenceScope,
  createMetaAssetContext,
  getMetaAssetId,
  META_ASSET_TYPES,
  META_PLATFORM_ENVIRONMENTS,
  MetaAssetContextError,
} from './context/asset-context';
export type {
  CreateMetaAssetContextInput,
  MetaAssetBinding,
  MetaAssetContext,
  MetaAssetType,
  MetaPlatformEnvironment,
  MetaReferenceScope,
} from './context/asset-context';
export {
  InMemoryMetaExternalReferenceRepository,
  localReferenceKey,
  MetaExternalReferenceConflictError,
  normalizeMetaExternalReferenceInput,
  providerReferenceKey,
} from './references/repository';
export type {
  InMemoryMetaExternalReferenceRepositoryOptions,
  MetaExternalReferenceRepository,
} from './references/repository';
export { buildMetaConnectionReferenceBackfill } from './references/backfill';
export type { MetaConnectionAssetSnapshot } from './references/backfill';
export { META_EXTERNAL_REFERENCE_SOURCES } from './references/types';
export type {
  MetaExternalReferenceLocalLookup,
  MetaExternalReferenceLookup,
  MetaExternalReferenceProviderLookup,
  MetaExternalReferenceRecord,
  MetaExternalReferenceSource,
  RegisterMetaExternalReferenceInput,
} from './references/types';

export { META_CREDENTIAL_ROLES, isMetaCredentialRole } from './credentials/roles';
export type { MetaCredentialRole } from './credentials/roles';
export type { MetaCredentialMetadata, MetaCredentialLookup } from './credentials/types';
export { META_CREDENTIAL_REQUIREMENT_MODES } from './capabilities/permission-types';
export type {
  MetaCapabilityPermissionRequirement,
  MetaCredentialRequirementMode,
} from './capabilities/permission-types';
export { META_FEATURE_IDS, isMetaFeatureId } from './versioning/types';
export { DEFAULT_META_GRAPH_API_VERSION, META_BUSINESS_SDK_VERSION } from './versioning/registry';
export type {
  MetaApiVersionPolicy,
  MetaFeatureCompatibilityDefinition,
  MetaFeatureCompatibilityResult,
  MetaFeatureId,
  MetaVersionEntry,
  MetaVersionPolicyResult,
  MetaVersionRegressionStatus,
} from './versioning/types';

export {
  META_OPERATION_EVENT_TYPES,
  META_OPERATION_STATUSES,
  META_OUTBOX_MESSAGE_STATES,
} from './operations/types';
export type {
  CreateMetaOperationInput,
  MetaCommittedOperation,
  MetaOperationDispatchPayload,
  MetaOperationEventRecord,
  MetaOperationRecord,
  MetaOperationSafeError,
  MetaOperationStatus,
  MetaOutboxMessageRecord,
  MetaVersionedPayload,
} from './operations/types';

export {
  META_CIRCUIT_STATES,
  META_OPERATION_PRIORITIES,
} from './reliability/types';
export type {
  MetaCircuitPermit,
  MetaCircuitSnapshot,
  MetaCircuitState,
  MetaOperationPriority,
  MetaProviderUsageSignal,
  MetaQueueAdmissionDecision,
  MetaQueueDepthSnapshot,
  MetaRateLimitBudget,
  MetaReadCacheEntry,
  MetaReliabilityExecutionResult,
  MetaReliabilityHealthSnapshot,
  MetaReliabilityOperationKind,
  MetaReliabilityScope,
  MetaRetryAction,
  MetaRetryDecision,
} from './reliability/types';

export {
  META_PROVIDER_JOB_PURPOSES,
  META_PROVIDER_JOB_STATUSES,
  META_RECONCILIATION_STATUSES,
  META_REPLAY_STATUSES,
  META_WORKFLOW_STATUSES,
  META_WORKFLOW_STEP_STATUSES,
} from './workflows/types';
export type {
  MetaProviderJobPurpose,
  MetaProviderJobRecord,
  MetaProviderJobStatus,
  MetaReconciliationRecord,
  MetaReconciliationStatus,
  MetaReplayRecord,
  MetaReplayStatus,
  MetaWorkflowProjection,
  MetaWorkflowRecord,
  MetaWorkflowStatus,
  MetaWorkflowStepRecord,
  MetaWorkflowStepStatus,
} from './workflows/types';
export type { MetaFencedLockLease } from './concurrency/types';

export type {
  MetaConnectionAssetHealth as MetaPlatformConnectionAssetHealth,
  MetaConnectionAssetKey as MetaPlatformConnectionAssetKey,
  MetaConnectionPermissionHealth as MetaPlatformConnectionPermissionHealth,
  MetaConnectionStatus as MetaPlatformConnectionStatus,
  MetaConnectionTokenHealth as MetaPlatformConnectionTokenHealth,
  MetaPlatformConnectionReadiness,
} from './domains/connection/types';
export type {
  MetaPlatformCapiDeliveryResult,
  MetaPlatformCapiEvent,
  MetaPlatformCapiProviderPayload,
  MetaPlatformCapiRequest,
  MetaPlatformCapiUserData,
} from './domains/capi/types';

export type {
  MetaPlatformAdsConfig,
  MetaPlatformAdsCursor,
  MetaPlatformAdsEntityType,
  MetaPlatformAdsRecord,
} from './domains/ads/types';
export type {
  MetaPlatformInsightCursor,
  MetaPlatformInsightInput,
  MetaPlatformInsightLevel,
} from './domains/insights/types';
export type {
  MetaAudienceCustomerRecord,
  MetaAudienceHashedBatch,
  MetaAudienceMemberMode,
  MetaAudienceSegment,
  MetaPlatformAudienceCursor,
} from './domains/audiences/types';


export {
  META_PROVIDER_IDENTITY_ASSET_TYPES,
  META_PROVIDER_IDENTITY_OBJECT_TYPE,
  META_PROVIDER_IDENTITY_SOURCES,
  META_PROVIDER_IDENTITY_STATUSES,
  META_PROVIDER_PERMISSION_HEALTH,
  InMemoryMetaProviderIdentityRepository,
  MetaProviderIdentityError,
  isMetaProviderIdentityWritable,
  metaProviderIdentityCanonicalKey,
  metaProviderIdentityLocalId,
  normalizeMetaProviderIdentityInput,
  sanitizeMetaProviderIdentityMetadata,
  sanitizeMetaProviderPermissionMetadata,
} from './repositories/provider-identities';
export type {
  MetaProviderIdentityAssetType,
  MetaProviderIdentityLookup,
  MetaProviderIdentityRecord,
  MetaProviderIdentityRepository,
  MetaProviderIdentitySource,
  MetaProviderIdentityStatus,
  MetaProviderPermissionHealth,
  RegisterMetaProviderIdentityInput,
} from './repositories/provider-identities';
export {
  META_PROVIDER_IDENTITY_RELATIONSHIP_STATUSES,
  META_PROVIDER_IDENTITY_RELATIONSHIP_TYPES,
  InMemoryMetaProviderIdentityRelationshipRepository,
  assertMetaProviderIdentityRelationship,
} from './repositories/provider-identity-relationships';
export type {
  MetaProviderIdentityRelationshipRecord,
  MetaProviderIdentityRelationshipRepository,
  MetaProviderIdentityRelationshipStatus,
  MetaProviderIdentityRelationshipType,
} from './repositories/provider-identity-relationships';
export { buildMetaProviderIdentityBackfillPlan } from './repositories/provider-identity-backfill';
export type { MetaProviderIdentityBackfillPlan, MetaProviderIdentityBackfillRelationPlan } from './repositories/provider-identity-backfill';

export {
  ackMetaSocialQueueJob,
  buildMetaLeadProcessingDedupeKey,
  classifyMetaLeadJobFailure,
  claimBullMqSocialJob,
  createBullMqSocialQueueAdapter,
  createMetaLeadProcessingJobEnvelope,
  createMetaSocialJobEnvelope,
  createMetaSocialQueueClaim,
  enqueueMetaLeadProcessingJob,
  executeMetaLeadProcessingJob,
  isMetaSocialJobEnvelope,
  isMetaSocialQueueUnavailableError,
  mapMetaSocialEnvelopeToBullMq,
  META_SOCIAL_BULLMQ_ROUTES,
  META_SOCIAL_JOB_ENVELOPE_MAX_BYTES,
  META_SOCIAL_JOB_ENVIRONMENTS,
  META_SOCIAL_JOB_MAX_ATTEMPT_NUMBER,
  META_SOCIAL_JOB_PLATFORMS,
  META_SOCIAL_JOB_REFERENCE_CONTRACT,
  META_SOCIAL_JOB_SCHEMA_VERSION,
  META_SOCIAL_JOB_TYPES,
  META_SOCIAL_PAYLOAD_REFERENCE_KINDS,
  META_SOCIAL_PAYLOAD_SCOPE_KEYS,
  META_SOCIAL_QUEUE_FAILURE_CLASSES,
  nackMetaSocialQueueJob,
  validateMetaSocialJobEnvelope,
} from './queue';
export type {
  CreateMetaSocialJobEnvelopeInput,
  MetaLeadJobFailureDecision,
  MetaLeadProcessingJobExecutionResult,
  MetaLeadReceiptProcessor,
  MetaLeadReceiptProcessorInput,
  MetaSocialBullMqEnqueuer,
  MetaSocialBullMqEnqueueResponse,
  MetaSocialBullMqRoute,
  MetaSocialJobEnvelope,
  MetaSocialJobEnvironment,
  MetaSocialJobObservability,
  MetaSocialJobPlatform,
  MetaSocialJobType,
  MetaSocialPayloadReference,
  MetaSocialPayloadReferenceKind,
  MetaSocialPayloadScopeKey,
  MetaSocialQueueAck,
  MetaSocialQueueAdapter,
  MetaSocialQueueEnqueueResult,
  MetaSocialQueueFailureClass,
  MetaSocialQueueHandler,
  MetaSocialQueueHandlerResult,
  MetaSocialQueueNack,
  MetaSocialQueueTransportClaim,
} from './queue';
