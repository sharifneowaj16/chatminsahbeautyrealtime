export const META_JOB_SCHEMA_VERSION = 1 as const;
export const META_JOB_MAX_PAYLOAD_BYTES = 32 * 1024;

export const META_QUEUE_NAMES = {
  CAPI_EVENTS: 'meta-capi-events',
  CATALOG_SYNC: 'meta-catalog-sync',
  CATALOG_STATUS: 'meta-catalog-status',
  LEADS: 'meta-leads',
  DIAGNOSTICS: 'meta-diagnostics',
  CONNECTION_HEALTH: 'meta-connection-health',
  PRODUCT_SETS: 'meta-product-sets',
  ADS_INSIGHTS: 'meta-ads-insights',
  INSTAGRAM: 'meta-instagram',
  SOCIAL: 'meta-social',
} as const;
export type MetaQueueName = (typeof META_QUEUE_NAMES)[keyof typeof META_QUEUE_NAMES];

export const META_JOB_NAMES = {
  CAPI_OUTBOX: 'meta-capi-outbox',
  CATALOG_SYNC: 'catalog-sync',
  CATALOG_STATUS: 'catalog-status',
  LEAD_FETCH: 'lead-fetch',
  LEAD_FORM_SYNC: 'lead-form-sync',
  LEAD_ASSIGN: 'lead-assign',
  LEAD_RECEIPT_RECOVERY: 'lead-receipt-recovery',
  LEAD_SLA_ALERT: 'lead-sla-alert',
  LEAD_RETENTION: 'lead-retention',
  CATALOG_DIAGNOSTICS: 'catalog-diagnostics',
  CONNECTION_HEALTH: 'connection-health',
  PRODUCT_SET_RECONCILE: 'product-set-reconcile',
  ADS_INSIGHTS_SYNC: 'ads-insights-sync',
  INSTAGRAM_MESSAGE: 'instagram-message',
  INSTAGRAM_RECEIPT_RECOVERY: 'instagram-receipt-recovery',
  INSTAGRAM_RETENTION: 'instagram-retention',
  INSTAGRAM_REPLY: 'instagram-reply',
  INSTAGRAM_PRIVATE_REPLY: 'instagram-private-reply',
  SOCIAL_ATTACHMENT_VALIDATION: 'social-attachment-validation',
  SOCIAL_EVENT_REPLAY: 'social-event-replay',
  FACEBOOK_PAGE_INBOX_SYNC: 'facebook-page-inbox-sync',
} as const;
export type MetaJobName = (typeof META_JOB_NAMES)[keyof typeof META_JOB_NAMES];

export type MetaJobBase = {
  schemaVersion: typeof META_JOB_SCHEMA_VERSION;
  idempotencyKey: string;
  requestedAt: string;
  correlationId?: string;
  sourceId?: string;
  auditId?: string;
};

export type MetaSocialTransportEnvelope = Readonly<{
  schemaVersion: 1;
  jobType:
    | 'PROCESS_META_LEAD'
    | 'PROCESS_INSTAGRAM_INBOUND'
    | 'SEND_INSTAGRAM_REPLY'
    | 'SEND_INSTAGRAM_PRIVATE_REPLY'
    | 'VALIDATE_SOCIAL_ATTACHMENT'
    | 'REPLAY_SOCIAL_EVENT'
    | 'SYNC_FACEBOOK_PAGE_INBOX'
    | 'REFRESH_META_PERMISSION_HEALTH';
  receiptId: string | null;
  attemptNumber: number;
  correlationId: string;
  scheduledAt: string;
  dedupeKey: string;
  payloadRef: Readonly<{
    kind:
      | 'WEBHOOK_RECEIPT'
      | 'INSTAGRAM_REPLY_ATTEMPT'
      | 'INSTAGRAM_PRIVATE_REPLY_RESERVATION'
      | 'SOCIAL_ATTACHMENT'
      | 'META_JOB_AUDIT'
      | 'FACEBOOK_PAGE_SYNC_REQUEST'
      | 'META_CONNECTION';
    id: string;
    providerObjectId?: string;
    digest?: string;
    scope?: Readonly<Partial<Record<
      'pageId' | 'formId' | 'accountId' | 'connectionId' | 'conversationId' | 'messageId' | 'commentId',
      string
    >>>;
  }>;
  observability: Readonly<{
    component: string;
    operation: string;
    platform: 'LEAD_ADS' | 'INSTAGRAM' | 'FACEBOOK_PAGE' | 'META';
    environment?: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
    connectionKey?: string;
    traceId?: string;
    parentAuditId?: string;
  }>;
}>;
export type MetaCapiOutboxJobPayload = MetaJobBase & { type: 'capi_outbox'; outboxId: string; leaseToken?: string };
export type MetaCatalogSyncJobPayload = MetaJobBase & { type: 'catalog_sync'; catalogId?: string; mode: 'inventory' | 'incremental' | 'full' | 'reconcile' | 'delete'; deletePlanId?: string };
export type MetaCatalogStatusJobPayload = MetaJobBase & { type: 'catalog_status'; catalogId?: string; limit: number };
export type MetaLeadFetchJobPayload = MetaJobBase & {
  type: 'lead_fetch';
  receiptId: string;
  leadgenId: string;
  pageId?: string;
  formId?: string;
  socialEnvelope?: MetaSocialTransportEnvelope;
};
export type MetaLeadFormSyncJobPayload = MetaJobBase & { type: 'lead_form_sync'; formId: string; pageId?: string; limit: number; since?: number; until?: number };
export type MetaLeadAssignJobPayload = MetaJobBase & { type: 'lead_assign'; leadId: string };
export type MetaLeadReceiptRecoveryJobPayload = MetaJobBase & { type: 'lead_receipt_recovery'; limit: number };
export type MetaLeadSlaAlertJobPayload = MetaJobBase & { type: 'lead_sla_alert' };
export type MetaLeadRetentionJobPayload = MetaJobBase & { type: 'lead_retention' };
export type MetaCatalogDiagnosticsJobPayload = MetaJobBase & { type: 'catalog_diagnostics'; catalogId?: string };
export type MetaProductSetReconcileJobPayload = MetaJobBase & { type: 'product_set_reconcile' };
export type MetaAdsInsightsJobPayload = MetaJobBase & { type: 'ads_insights_sync'; level: 'ACCOUNT' | 'CAMPAIGN' | 'ADSET' | 'AD'; since: string; until: string };
export type MetaInstagramMessageJobPayload = MetaJobBase & { type: 'instagram_message'; receiptId: string; socialEnvelope?: MetaSocialTransportEnvelope };
export type MetaInstagramReceiptRecoveryJobPayload = MetaJobBase & { type: 'instagram_receipt_recovery'; limit: number };
export type MetaInstagramRetentionJobPayload = MetaJobBase & { type: 'instagram_retention' };
export type MetaConnectionHealthJobPayload = MetaJobBase & {
  type: 'connection_health';
  connectionId?: string;
  checks: Array<'TOKEN' | 'PERMISSIONS' | 'ASSETS' | 'VERSION'>;
  socialEnvelope?: MetaSocialTransportEnvelope;
};
export type MetaInstagramReplyJobPayload = MetaJobBase & { type: 'instagram_reply'; socialEnvelope: MetaSocialTransportEnvelope };
export type MetaInstagramPrivateReplyJobPayload = MetaJobBase & { type: 'instagram_private_reply'; socialEnvelope: MetaSocialTransportEnvelope };
export type MetaSocialAttachmentValidationJobPayload = MetaJobBase & { type: 'social_attachment_validation'; socialEnvelope: MetaSocialTransportEnvelope };
export type MetaSocialEventReplayJobPayload = MetaJobBase & { type: 'social_event_replay'; socialEnvelope: MetaSocialTransportEnvelope };
export type MetaFacebookPageInboxSyncJobPayload = MetaJobBase & { type: 'facebook_page_inbox_sync'; socialEnvelope: MetaSocialTransportEnvelope };

export type MetaJobPayload =
  | MetaCapiOutboxJobPayload
  | MetaCatalogSyncJobPayload
  | MetaCatalogStatusJobPayload
  | MetaLeadFetchJobPayload
  | MetaLeadFormSyncJobPayload
  | MetaLeadAssignJobPayload
  | MetaLeadReceiptRecoveryJobPayload
  | MetaLeadSlaAlertJobPayload
  | MetaLeadRetentionJobPayload
  | MetaCatalogDiagnosticsJobPayload
  | MetaConnectionHealthJobPayload
  | MetaProductSetReconcileJobPayload
  | MetaAdsInsightsJobPayload
  | MetaInstagramMessageJobPayload
  | MetaInstagramReceiptRecoveryJobPayload
  | MetaInstagramRetentionJobPayload
  | MetaInstagramReplyJobPayload
  | MetaInstagramPrivateReplyJobPayload
  | MetaSocialAttachmentValidationJobPayload
  | MetaSocialEventReplayJobPayload
  | MetaFacebookPageInboxSyncJobPayload;

export type MetaJobStatus = 'QUEUED' | 'RUNNING' | 'RETRYING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'DEAD_LETTER';
export type MetaJobValidationIssue = { code: string; field: string; message: string };

const QUEUE_JOB_CONTRACT: Record<MetaQueueName, ReadonlySet<MetaJobName>> = {
  [META_QUEUE_NAMES.CAPI_EVENTS]: new Set([META_JOB_NAMES.CAPI_OUTBOX]),
  [META_QUEUE_NAMES.CATALOG_SYNC]: new Set([META_JOB_NAMES.CATALOG_SYNC]),
  [META_QUEUE_NAMES.CATALOG_STATUS]: new Set([META_JOB_NAMES.CATALOG_STATUS]),
  [META_QUEUE_NAMES.LEADS]: new Set([
    META_JOB_NAMES.LEAD_FETCH,
    META_JOB_NAMES.LEAD_FORM_SYNC,
    META_JOB_NAMES.LEAD_ASSIGN,
    META_JOB_NAMES.LEAD_RECEIPT_RECOVERY,
    META_JOB_NAMES.LEAD_SLA_ALERT,
    META_JOB_NAMES.LEAD_RETENTION,
  ]),
  [META_QUEUE_NAMES.DIAGNOSTICS]: new Set([META_JOB_NAMES.CATALOG_DIAGNOSTICS]),
  [META_QUEUE_NAMES.CONNECTION_HEALTH]: new Set([META_JOB_NAMES.CONNECTION_HEALTH]),
  [META_QUEUE_NAMES.PRODUCT_SETS]: new Set([META_JOB_NAMES.PRODUCT_SET_RECONCILE]),
  [META_QUEUE_NAMES.ADS_INSIGHTS]: new Set([META_JOB_NAMES.ADS_INSIGHTS_SYNC]),
  [META_QUEUE_NAMES.INSTAGRAM]: new Set([
    META_JOB_NAMES.INSTAGRAM_MESSAGE,
    META_JOB_NAMES.INSTAGRAM_RECEIPT_RECOVERY,
    META_JOB_NAMES.INSTAGRAM_RETENTION,
    META_JOB_NAMES.INSTAGRAM_REPLY,
    META_JOB_NAMES.INSTAGRAM_PRIVATE_REPLY,
  ]),
  [META_QUEUE_NAMES.SOCIAL]: new Set([
    META_JOB_NAMES.SOCIAL_ATTACHMENT_VALIDATION,
    META_JOB_NAMES.SOCIAL_EVENT_REPLAY,
    META_JOB_NAMES.FACEBOOK_PAGE_INBOX_SYNC,
  ]),
};

const TYPE_JOB_CONTRACT: Record<MetaJobPayload['type'], MetaJobName> = {
  capi_outbox: META_JOB_NAMES.CAPI_OUTBOX,
  catalog_sync: META_JOB_NAMES.CATALOG_SYNC,
  catalog_status: META_JOB_NAMES.CATALOG_STATUS,
  lead_fetch: META_JOB_NAMES.LEAD_FETCH,
  lead_form_sync: META_JOB_NAMES.LEAD_FORM_SYNC,
  lead_assign: META_JOB_NAMES.LEAD_ASSIGN,
  lead_receipt_recovery: META_JOB_NAMES.LEAD_RECEIPT_RECOVERY,
  lead_sla_alert: META_JOB_NAMES.LEAD_SLA_ALERT,
  lead_retention: META_JOB_NAMES.LEAD_RETENTION,
  catalog_diagnostics: META_JOB_NAMES.CATALOG_DIAGNOSTICS,
  connection_health: META_JOB_NAMES.CONNECTION_HEALTH,
  product_set_reconcile: META_JOB_NAMES.PRODUCT_SET_RECONCILE,
  ads_insights_sync: META_JOB_NAMES.ADS_INSIGHTS_SYNC,
  instagram_message: META_JOB_NAMES.INSTAGRAM_MESSAGE,
  instagram_receipt_recovery: META_JOB_NAMES.INSTAGRAM_RECEIPT_RECOVERY,
  instagram_retention: META_JOB_NAMES.INSTAGRAM_RETENTION,
  instagram_reply: META_JOB_NAMES.INSTAGRAM_REPLY,
  instagram_private_reply: META_JOB_NAMES.INSTAGRAM_PRIVATE_REPLY,
  social_attachment_validation: META_JOB_NAMES.SOCIAL_ATTACHMENT_VALIDATION,
  social_event_replay: META_JOB_NAMES.SOCIAL_EVENT_REPLAY,
  facebook_page_inbox_sync: META_JOB_NAMES.FACEBOOK_PAGE_INBOX_SYNC,
};

const FORBIDDEN_PAYLOAD_KEYS = new Set([
  'accesstoken','access_token','pagetoken','page_access_token','appsecret','app_secret',
  'clientsecret','client_secret','password','authorization','email','phone','field_data','normalizeddata','rawpayload',
  'message','messagetext','message_text','comment','commenttext','comment_text','url','sourceurl','source_url',
  'attachmenturl','attachment_url','mediaurl','media_url','signedurl','signed_url','providerpayload','provider_payload',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function findForbiddenKey(value: unknown, prefix = ''): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenKey(value[index], `${prefix}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[-\s]/g, '_');
    const compact = normalized.replace(/_/g, '');
    if (FORBIDDEN_PAYLOAD_KEYS.has(normalized) || FORBIDDEN_PAYLOAD_KEYS.has(compact)) return prefix ? `${prefix}.${key}` : key;
    const found = findForbiddenKey(nested, prefix ? `${prefix}.${key}` : key);
    if (found) return found;
  }
  return null;
}
function nonEmptyString(value: unknown) { return typeof value === 'string' && value.trim().length > 0; }
function boundedInt(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

function validateSocialTransportEnvelope(
  envelope: unknown,
  expectedJobType: MetaSocialTransportEnvelope['jobType'],
  payload: Record<string, unknown>,
  issues: MetaJobValidationIssue[],
) {
  if (!isRecord(envelope)) {
    issues.push({ code: 'SOCIAL_ENVELOPE_REQUIRED', field: 'socialEnvelope', message: 'Canonical social envelope is required.' });
    return;
  }
  if (envelope.schemaVersion !== 1) issues.push({ code: 'SOCIAL_ENVELOPE_VERSION_INVALID', field: 'socialEnvelope.schemaVersion', message: 'Social envelope schemaVersion must be 1.' });
  if (envelope.jobType !== expectedJobType) issues.push({ code: 'SOCIAL_ENVELOPE_JOB_TYPE_MISMATCH', field: 'socialEnvelope.jobType', message: 'Canonical social job type does not match transport job.' });
  if (!boundedInt(envelope.attemptNumber, 1, 1_000)) issues.push({ code: 'SOCIAL_ENVELOPE_ATTEMPT_INVALID', field: 'socialEnvelope.attemptNumber', message: 'attemptNumber must be from 1 to 1000.' });
  if (!nonEmptyString(envelope.correlationId) || envelope.correlationId !== payload.correlationId) issues.push({ code: 'SOCIAL_ENVELOPE_CORRELATION_MISMATCH', field: 'socialEnvelope.correlationId', message: 'Social envelope correlationId must match the transport payload.' });
  if (!nonEmptyString(envelope.dedupeKey) || envelope.dedupeKey !== payload.idempotencyKey) issues.push({ code: 'SOCIAL_ENVELOPE_DEDUPE_MISMATCH', field: 'socialEnvelope.dedupeKey', message: 'Social envelope dedupeKey must match idempotencyKey.' });
  if (!nonEmptyString(envelope.scheduledAt) || Number.isNaN(Date.parse(String(envelope.scheduledAt)))) issues.push({ code: 'SOCIAL_ENVELOPE_SCHEDULE_INVALID', field: 'socialEnvelope.scheduledAt', message: 'scheduledAt must be an ISO datetime.' });
  if (!isRecord(envelope.payloadRef) || !nonEmptyString(envelope.payloadRef.kind) || !nonEmptyString(envelope.payloadRef.id)) issues.push({ code: 'SOCIAL_ENVELOPE_REFERENCE_INVALID', field: 'socialEnvelope.payloadRef', message: 'A durable safe payload reference is required.' });
  if (!isRecord(envelope.observability) || !nonEmptyString(envelope.observability.component) || !nonEmptyString(envelope.observability.operation) || !nonEmptyString(envelope.observability.platform)) issues.push({ code: 'SOCIAL_ENVELOPE_OBSERVABILITY_INVALID', field: 'socialEnvelope.observability', message: 'Safe observability metadata is required.' });
}

export function validateMetaJobPayload(input: { queueName: MetaQueueName; jobName: MetaJobName; payload: unknown }) {
  const issues: MetaJobValidationIssue[] = [];
  const payload = input.payload;
  if (!isRecord(payload)) return { valid: false as const, issues: [{ code: 'PAYLOAD_OBJECT_REQUIRED', field: 'payload', message: 'Job payload must be an object.' }] };
  const payloadBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  if (payloadBytes > META_JOB_MAX_PAYLOAD_BYTES) issues.push({ code: 'PAYLOAD_TOO_LARGE', field: 'payload', message: `Payload exceeds ${META_JOB_MAX_PAYLOAD_BYTES} bytes.` });
  if (payload.schemaVersion !== META_JOB_SCHEMA_VERSION) issues.push({ code: 'SCHEMA_VERSION_UNSUPPORTED', field: 'schemaVersion', message: 'schemaVersion must be 1.' });
  if (!nonEmptyString(payload.idempotencyKey)) issues.push({ code: 'IDEMPOTENCY_KEY_REQUIRED', field: 'idempotencyKey', message: 'idempotencyKey is required.' });
  if (!nonEmptyString(payload.requestedAt) || Number.isNaN(Date.parse(String(payload.requestedAt)))) issues.push({ code: 'REQUESTED_AT_INVALID', field: 'requestedAt', message: 'requestedAt must be an ISO datetime.' });
  if (payload.correlationId !== undefined && (!nonEmptyString(payload.correlationId) || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(String(payload.correlationId)))) issues.push({ code: 'CORRELATION_ID_INVALID', field: 'correlationId', message: 'correlationId has an invalid format.' });
  const forbidden = findForbiddenKey(payload);
  if (forbidden) issues.push({ code: 'SECRET_IN_JOB_PAYLOAD', field: forbidden, message: 'Secrets, PII and raw lead fields are forbidden in job payloads.' });
  const allowedJobs = QUEUE_JOB_CONTRACT[input.queueName];
  if (!allowedJobs?.has(input.jobName)) issues.push({ code: 'QUEUE_JOB_MISMATCH', field: 'jobName', message: 'Job type is not allowed on this queue.' });
  const type = payload.type;
  if (typeof type !== 'string' || !(type in TYPE_JOB_CONTRACT)) issues.push({ code: 'JOB_TYPE_UNKNOWN', field: 'type', message: 'Unknown Meta job payload type.' });
  else if (TYPE_JOB_CONTRACT[type as MetaJobPayload['type']] !== input.jobName) issues.push({ code: 'PAYLOAD_JOB_MISMATCH', field: 'type', message: 'Payload type does not match job name.' });

  switch (type) {
    case 'capi_outbox':
      if (!nonEmptyString(payload.outboxId)) issues.push({ code: 'OUTBOX_ID_REQUIRED', field: 'outboxId', message: 'outboxId is required.' });
      break;
    case 'catalog_sync':
      if (!['inventory','incremental','full','reconcile','delete'].includes(String(payload.mode))) issues.push({ code: 'CATALOG_MODE_INVALID', field: 'mode', message: 'Catalog mode is invalid.' });
      if (payload.mode === 'delete' && !nonEmptyString(payload.deletePlanId)) issues.push({ code: 'CATALOG_DELETE_PLAN_ID_REQUIRED', field: 'deletePlanId', message: 'deletePlanId is required for delete mode.' });
      if (payload.mode !== 'delete' && payload.deletePlanId !== undefined) issues.push({ code: 'CATALOG_DELETE_PLAN_ID_FORBIDDEN', field: 'deletePlanId', message: 'deletePlanId is only allowed for delete mode.' });
      break;
    case 'catalog_status':
      if (!boundedInt(payload.limit, 1, 100)) issues.push({ code: 'CATALOG_STATUS_LIMIT_INVALID', field: 'limit', message: 'limit must be an integer from 1 to 100.' });
      break;
    case 'lead_fetch':
      if (!nonEmptyString(payload.receiptId)) issues.push({ code: 'WEBHOOK_RECEIPT_ID_REQUIRED', field: 'receiptId', message: 'receiptId is required.' });
      if (!nonEmptyString(payload.leadgenId)) issues.push({ code: 'LEADGEN_ID_REQUIRED', field: 'leadgenId', message: 'leadgenId is required.' });
      if (payload.socialEnvelope !== undefined) validateSocialTransportEnvelope(payload.socialEnvelope, 'PROCESS_META_LEAD', payload, issues);
      break;
    case 'lead_form_sync':
      if (!nonEmptyString(payload.formId)) issues.push({ code: 'LEAD_FORM_ID_REQUIRED', field: 'formId', message: 'formId is required.' });
      if (!boundedInt(payload.limit, 1, 500)) issues.push({ code: 'LEAD_FORM_LIMIT_INVALID', field: 'limit', message: 'limit must be from 1 to 500.' });
      break;
    case 'lead_assign':
      if (!nonEmptyString(payload.leadId)) issues.push({ code: 'LEAD_ID_REQUIRED', field: 'leadId', message: 'leadId is required.' });
      break;
    case 'lead_receipt_recovery':
      if (!boundedInt(payload.limit, 1, 500)) issues.push({ code: 'LEAD_RECOVERY_LIMIT_INVALID', field: 'limit', message: 'limit must be from 1 to 500.' });
      break;
    case 'lead_sla_alert':
    case 'lead_retention':
    case 'catalog_diagnostics':
    case 'product_set_reconcile':
      break;
    case 'instagram_message':
      if (!nonEmptyString(payload.receiptId)) issues.push({ code: 'INSTAGRAM_RECEIPT_ID_REQUIRED', field: 'receiptId', message: 'receiptId is required.' });
      if (payload.socialEnvelope !== undefined) validateSocialTransportEnvelope(payload.socialEnvelope, 'PROCESS_INSTAGRAM_INBOUND', payload, issues);
      break;
    case 'instagram_receipt_recovery':
      if (!Number.isSafeInteger(payload.limit) || Number(payload.limit) < 1 || Number(payload.limit) > 500) issues.push({ code: 'INSTAGRAM_RECEIPT_RECOVERY_LIMIT_INVALID', field: 'limit', message: 'limit must be between 1 and 500.' });
      break;
    case 'instagram_retention':
      break;
    case 'instagram_reply':
      validateSocialTransportEnvelope(payload.socialEnvelope, 'SEND_INSTAGRAM_REPLY', payload, issues);
      break;
    case 'instagram_private_reply':
      validateSocialTransportEnvelope(payload.socialEnvelope, 'SEND_INSTAGRAM_PRIVATE_REPLY', payload, issues);
      break;
    case 'social_attachment_validation':
      validateSocialTransportEnvelope(payload.socialEnvelope, 'VALIDATE_SOCIAL_ATTACHMENT', payload, issues);
      break;
    case 'social_event_replay':
      validateSocialTransportEnvelope(payload.socialEnvelope, 'REPLAY_SOCIAL_EVENT', payload, issues);
      break;
    case 'facebook_page_inbox_sync':
      validateSocialTransportEnvelope(payload.socialEnvelope, 'SYNC_FACEBOOK_PAGE_INBOX', payload, issues);
      break;
    case 'ads_insights_sync':
      if (!['ACCOUNT','CAMPAIGN','ADSET','AD'].includes(String(payload.level))) issues.push({ code: 'ADS_INSIGHTS_LEVEL_INVALID', field: 'level', message: 'Ads Insights level is invalid.' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.since ?? ''))) issues.push({ code: 'ADS_INSIGHTS_SINCE_INVALID', field: 'since', message: 'since must be YYYY-MM-DD.' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.until ?? ''))) issues.push({ code: 'ADS_INSIGHTS_UNTIL_INVALID', field: 'until', message: 'until must be YYYY-MM-DD.' });
      break;
    case 'connection_health': {
      const allowed = new Set(['TOKEN','PERMISSIONS','ASSETS','VERSION']);
      const checks = Array.isArray(payload.checks) ? payload.checks : [];
      if (checks.length === 0 || checks.some((item) => typeof item !== 'string' || !allowed.has(item))) issues.push({ code: 'CONNECTION_CHECKS_INVALID', field: 'checks', message: 'checks must contain TOKEN, PERMISSIONS, ASSETS or VERSION.' });
      if (payload.socialEnvelope !== undefined) validateSocialTransportEnvelope(payload.socialEnvelope, 'REFRESH_META_PERMISSION_HEALTH', payload, issues);
      break;
    }
  }
  return issues.length === 0
    ? { valid: true as const, issues, payload: payload as MetaJobPayload, payloadBytes }
    : { valid: false as const, issues, payloadBytes };
}
