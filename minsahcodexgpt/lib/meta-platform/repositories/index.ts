export {
  META_PLATFORM_ENVIRONMENTS,
  META_SOCIAL_WEBHOOK_PLATFORMS,
  META_SOCIAL_WEBHOOK_RECEIPT_SELECT_COLUMNS,
  META_SOCIAL_WEBHOOK_RECEIPT_STATES,
  META_SOCIAL_WEBHOOK_SAFE_METADATA_KEYS,
  InMemoryMetaSocialWebhookReceiptStore,
  createMetaSocialWebhookReceiptRepository,
  resolveMetaPlatformEnvironment,
  resolveMetaSocialConnectionKey,
  sanitizeMetaSocialWebhookMetadata,
  type CreateMetaSocialWebhookReceiptInput,
  type CreateMetaSocialWebhookReceiptResult,
  type MetaPlatformEnvironment,
  type MetaSocialWebhookPlatform,
  type MetaSocialWebhookReceiptQueryExecutor,
  type MetaSocialWebhookReceiptRow,
  type MetaSocialWebhookReceiptState,
  type MetaSocialWebhookSafeMetadata,
} from './webhook-receipts';

export {
  META_SOCIAL_WEBHOOK_RECEIPT_TERMINAL_STATES,
  META_SOCIAL_WEBHOOK_RECEIPT_TRANSITIONS,
  MetaSocialWebhookReceiptLifecycleError,
  assertMetaSocialWebhookReceiptTransition,
  canTransitionMetaSocialWebhookReceipt,
  isTerminalMetaSocialWebhookReceiptState,
  type MetaSocialWebhookReceiptTransitionCode,
} from './webhook-receipt-transitions';

export {
  META_SOCIAL_WEBHOOK_DEFAULT_LEASE_MS,
  META_SOCIAL_WEBHOOK_MAX_LEASE_MS,
  META_SOCIAL_WEBHOOK_MIN_LEASE_MS,
  createMetaSocialWebhookLeaseToken,
  normalizeMetaSocialWebhookLeaseMs,
  normalizeMetaSocialWebhookLifecycleActor,
  resolveMetaSocialWebhookLeaseWindow,
  type MetaSocialWebhookReceiptClaimInput,
  type MetaSocialWebhookReceiptClaimMetadata,
} from './webhook-receipt-claims';

export { createMetaSocialWebhookReceiptLifecycleRepository } from './webhook-receipt-lifecycle';

export {
  claimMetaSocialWebhookReceipt,
  createMetaSocialWebhookReceiptReplay,
  createOrGetMetaSocialWebhookReceipt,
  findMetaSocialWebhookReceiptByLegacyReceipt,
  getMetaSocialWebhookReceipt,
  linkMetaSocialWebhookLegacyReceipt,
  markMetaSocialWebhookReceiptBlocked,
  markMetaSocialWebhookReceiptDeadLettered,
  markMetaSocialWebhookReceiptFailed,
  markMetaSocialWebhookReceiptProcessed,
  markMetaSocialWebhookReceiptQueued,
  renewMetaSocialWebhookReceiptLease,
  requeueFailedMetaSocialWebhookReceipt,
} from './prisma-webhook-receipts';


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
  type MetaProviderIdentityAssetType,
  type MetaProviderIdentityLookup,
  type MetaProviderIdentityRecord,
  type MetaProviderIdentityRepository,
  type MetaProviderIdentitySource,
  type MetaProviderIdentityStatus,
  type MetaProviderPermissionHealth,
  type RegisterMetaProviderIdentityInput,
} from './provider-identities';

export {
  META_PROVIDER_IDENTITY_RELATIONSHIP_STATUSES,
  META_PROVIDER_IDENTITY_RELATIONSHIP_TYPES,
  InMemoryMetaProviderIdentityRelationshipRepository,
  assertMetaProviderIdentityRelationship,
  type MetaProviderIdentityRelationshipRecord,
  type MetaProviderIdentityRelationshipRepository,
  type MetaProviderIdentityRelationshipStatus,
  type MetaProviderIdentityRelationshipType,
} from './provider-identity-relationships';

export { buildMetaProviderIdentityBackfillPlan } from './provider-identity-backfill';
export type { MetaProviderIdentityBackfillPlan, MetaProviderIdentityBackfillRelationPlan } from './provider-identity-backfill';

export { resolveMetaPageIdentity, getMetaBusinessForPage } from './page-identities';
export { resolveMetaInstagramIdentity, verifyMetaPageInstagramBinding } from './instagram-identities';
export { resolveMetaLeadFormIdentity, verifyMetaPageLeadFormBinding } from './lead-form-identities';

export {
  META_LEAD_FINGERPRINT_VERSION,
  META_LEAD_HANDOFF_DESTINATIONS,
  InMemoryMetaLeadStorageRepository,
  MetaLeadStorageError,
  buildMetaLeadHandoffIdempotencyKey,
  fingerprintMetaLeadIdentity,
  sanitizeMetaLeadAttribution,
  sanitizeMetaLeadFailure,
  type MetaLeadAttemptRecord,
  type MetaLeadDuplicateReason,
  type MetaLeadHandoffDestination,
  type MetaLeadHandoffRecord,
  type MetaLeadRetrievalStatus,
  type MetaLeadStorageRecord,
} from './leads';

export {
  beginMetaLeadProcessingAttempt,
  blockMetaLeadHandoff,
  claimMetaLeadHandoff,
  cleanupMetaTestLeadsStorage,
  completeMetaLeadHandoff,
  createOrGetMetaLeadHandoff,
  failMetaLeadHandoff,
  ensureMetaLeadStorageIdentities,
  markMetaLeadProcessingAttemptFailed,
  markMetaLeadProcessingAttemptFetching,
  persistNormalizedMetaLeadStorage,
  type MetaLeadHandoffExecutionRow,
  type MetaLeadIdentityContext,
  type PersistNormalizedMetaLeadStorageResult,
} from './prisma-leads';

export {
  InMemoryInstagramPersistenceRepository,
  MetaInstagramPersistenceError,
  buildInstagramLocalMessageKey,
  compareInstagramActivity,
  type InstagramAttachmentDecision,
  type InstagramConversationKind,
  type InstagramConversationRecord,
  type InstagramMessageRecord,
  type InstagramParticipantRecord,
  type InstagramPrivateReplyStatus,
  type InstagramProviderDeliveryStatus,
  type MetaInstagramScope,
} from './instagram-messages';
export {
  InMemoryInstagramOutboundRepository,
  hashInstagramOutboundPayload,
  isInstagramWriteOutcomeUnknown,
  type InstagramOutboundAttempt,
  type InstagramReconciliationStatus,
} from './instagram-outbound';
export { InMemoryInstagramPrivateReplyRepository, type InstagramPrivateReplyReservation } from './instagram-private-replies';
export { digestInstagramAttachmentUrl, sanitizeInstagramAttachmentMetadata } from './instagram-attachments';
export {
  createOrGetInstagramReplyAttemptStorage,
  markInstagramReplyFailedStorage,
  markInstagramReplySendingStorage,
  markInstagramReplySentStorage,
  markInstagramReplyUnknownOutcomeStorage,
  persistInstagramAttachmentPolicyStorage,
  persistInstagramInboundMessageStorage,
  reserveInstagramPrivateReplyStorage,
} from './prisma-instagram-persistence';
