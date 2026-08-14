export const META_SOCIAL_JOB_SCHEMA_VERSION = 1 as const;

export const META_SOCIAL_JOB_TYPES = Object.freeze([
  'PROCESS_META_LEAD',
  'PROCESS_INSTAGRAM_INBOUND',
  'SEND_INSTAGRAM_REPLY',
  'SEND_INSTAGRAM_PRIVATE_REPLY',
  'VALIDATE_SOCIAL_ATTACHMENT',
  'REPLAY_SOCIAL_EVENT',
  'SYNC_FACEBOOK_PAGE_INBOX',
  'REFRESH_META_PERMISSION_HEALTH',
] as const);

export const META_SOCIAL_PAYLOAD_REFERENCE_KINDS = Object.freeze([
  'WEBHOOK_RECEIPT',
  'INSTAGRAM_REPLY_ATTEMPT',
  'INSTAGRAM_PRIVATE_REPLY_RESERVATION',
  'SOCIAL_ATTACHMENT',
  'META_JOB_AUDIT',
  'FACEBOOK_PAGE_SYNC_REQUEST',
  'META_CONNECTION',
] as const);

export const META_SOCIAL_JOB_PLATFORMS = Object.freeze([
  'LEAD_ADS',
  'INSTAGRAM',
  'FACEBOOK_PAGE',
  'META',
] as const);

export const META_SOCIAL_JOB_ENVIRONMENTS = Object.freeze([
  'DEVELOPMENT',
  'STAGING',
  'PRODUCTION',
] as const);

export const META_SOCIAL_PAYLOAD_SCOPE_KEYS = Object.freeze([
  'pageId',
  'formId',
  'accountId',
  'connectionId',
  'conversationId',
  'messageId',
  'commentId',
] as const);

export type MetaSocialJobType = (typeof META_SOCIAL_JOB_TYPES)[number];
export type MetaSocialPayloadReferenceKind = (typeof META_SOCIAL_PAYLOAD_REFERENCE_KINDS)[number];
export type MetaSocialJobPlatform = (typeof META_SOCIAL_JOB_PLATFORMS)[number];
export type MetaSocialJobEnvironment = (typeof META_SOCIAL_JOB_ENVIRONMENTS)[number];
export type MetaSocialPayloadScopeKey = (typeof META_SOCIAL_PAYLOAD_SCOPE_KEYS)[number];

export type MetaSocialPayloadReference = Readonly<{
  kind: MetaSocialPayloadReferenceKind;
  id: string;
  providerObjectId?: string;
  digest?: string;
  scope?: Readonly<Partial<Record<MetaSocialPayloadScopeKey, string>>>;
}>;

export type MetaSocialJobObservability = Readonly<{
  component: string;
  operation: string;
  platform: MetaSocialJobPlatform;
  environment?: MetaSocialJobEnvironment;
  connectionKey?: string;
  traceId?: string;
  parentAuditId?: string;
}>;

export type MetaSocialJobEnvelope = Readonly<{
  schemaVersion: typeof META_SOCIAL_JOB_SCHEMA_VERSION;
  jobType: MetaSocialJobType;
  receiptId: string | null;
  attemptNumber: number;
  correlationId: string;
  scheduledAt: string;
  dedupeKey: string;
  payloadRef: MetaSocialPayloadReference;
  observability: MetaSocialJobObservability;
}>;

export type CreateMetaSocialJobEnvelopeInput = Readonly<{
  jobType: MetaSocialJobType;
  receiptId?: string | null;
  attemptNumber?: number;
  correlationId: string;
  scheduledAt?: Date | string;
  dedupeKey: string;
  payloadRef: MetaSocialPayloadReference;
  observability: MetaSocialJobObservability;
}>;

export const META_SOCIAL_JOB_REFERENCE_CONTRACT = Object.freeze({
  PROCESS_META_LEAD: Object.freeze(['WEBHOOK_RECEIPT'] as const),
  PROCESS_INSTAGRAM_INBOUND: Object.freeze(['WEBHOOK_RECEIPT'] as const),
  SEND_INSTAGRAM_REPLY: Object.freeze(['INSTAGRAM_REPLY_ATTEMPT'] as const),
  SEND_INSTAGRAM_PRIVATE_REPLY: Object.freeze([
    'INSTAGRAM_PRIVATE_REPLY_RESERVATION',
    'INSTAGRAM_REPLY_ATTEMPT',
  ] as const),
  VALIDATE_SOCIAL_ATTACHMENT: Object.freeze(['SOCIAL_ATTACHMENT'] as const),
  REPLAY_SOCIAL_EVENT: Object.freeze(['META_JOB_AUDIT', 'WEBHOOK_RECEIPT'] as const),
  SYNC_FACEBOOK_PAGE_INBOX: Object.freeze(['FACEBOOK_PAGE_SYNC_REQUEST'] as const),
  REFRESH_META_PERMISSION_HEALTH: Object.freeze(['META_CONNECTION'] as const),
} satisfies Readonly<Record<MetaSocialJobType, readonly MetaSocialPayloadReferenceKind[]>>);

export const META_SOCIAL_RECEIPT_REQUIRED_JOB_TYPES = Object.freeze([
  'PROCESS_META_LEAD',
  'PROCESS_INSTAGRAM_INBOUND',
] as const satisfies readonly MetaSocialJobType[]);

export function metaSocialJobDedupePrefix(jobType: MetaSocialJobType): string {
  return `social:${jobType.toLowerCase().replaceAll('_', '-')}:`;
}
