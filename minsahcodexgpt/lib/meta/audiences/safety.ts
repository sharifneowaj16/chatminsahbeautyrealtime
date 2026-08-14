import { buildMetaAdminPayloadHash } from '@/lib/meta/admin/policy';
import { MetaAdminActionError } from '@/lib/meta/admin/errors';
import { buildMetaAudienceHashedBatchDigest, META_AUDIENCE_SCHEMA } from '@/lib/meta-platform/domains/audiences/hashing';
import type { MetaAudienceHashedBatch } from '@/lib/meta-platform/domains/audiences/types';
import type { MetaAudienceMutationApprovalPayload, MetaAudienceMutationOperation } from './types';

const ALLOWED: Record<MetaAudienceMutationOperation, ReadonlySet<string>> = {
  CREATE_CUSTOM_AUDIENCE: new Set(['name', 'description', 'customerFileSource', 'valueBased']),
  UPDATE_AUDIENCE: new Set(['name', 'description', 'retention_days', 'customer_file_source', 'rule']),
  CREATE_LOOKALIKE_AUDIENCE: new Set(['name', 'originAudienceId', 'country', 'ratio', 'description']),
  CREATE_RETARGETING_AUDIENCE: new Set(['name', 'eventName', 'retentionDays', 'description', 'rule']),
  UPDATE_RETARGETING_AUDIENCE: new Set(['name', 'description', 'retention_days', 'rule']),
  SYNC_CUSTOM_AUDIENCE: new Set(['mode', 'batch', 'batchDigest', 'segment']),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clean(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function validateHashedBatch(value: unknown): MetaAudienceHashedBatch {
  if (!isRecord(value) || !Array.isArray(value.schema) || !Array.isArray(value.rows)) {
    throw new MetaAdminActionError('A canonical hashed audience batch is required.', 400, 'META_AUDIENCE_HASHED_BATCH_REQUIRED');
  }
  const valueBased = value.valueBased === true;
  const expectedSchema = valueBased ? [...META_AUDIENCE_SCHEMA, 'LOOKALIKE_VALUE'] : [...META_AUDIENCE_SCHEMA];
  if (JSON.stringify(value.schema) !== JSON.stringify(expectedSchema)) {
    throw new MetaAdminActionError('Audience batch schema is invalid.', 400, 'META_AUDIENCE_SCHEMA_INVALID');
  }
  if (value.rows.length === 0 || value.rows.length > 10_000) {
    throw new MetaAdminActionError('Audience batch must contain 1 to 10,000 consented rows.', 400, 'META_AUDIENCE_BATCH_SIZE_INVALID');
  }
  if (Number(value.accepted) !== value.rows.length || Number(value.rejected ?? 0) !== 0) {
    throw new MetaAdminActionError('Every audience row must be consented and included in the approved batch.', 409, 'META_AUDIENCE_CONSENT_REQUIRED');
  }
  for (const row of value.rows) {
    if (!Array.isArray(row) || row.length !== expectedSchema.length) {
      throw new MetaAdminActionError('Audience rows must match the canonical schema.', 400, 'META_AUDIENCE_BATCH_INVALID');
    }
    const identifiers = row.slice(0, META_AUDIENCE_SCHEMA.length);
    if (identifiers.some((item) => typeof item !== 'string' || (item !== '' && !/^[a-f0-9]{64}$/.test(item)))) {
      throw new MetaAdminActionError('Raw audience identifiers are forbidden in approval payloads.', 400, 'META_AUDIENCE_RAW_PII_FORBIDDEN');
    }
    if (![identifiers[0], identifiers[1], identifiers[8]].some((item) => typeof item === 'string' && /^[a-f0-9]{64}$/.test(item))) {
      throw new MetaAdminActionError('Audience rows require a hashed email, phone or external ID.', 400, 'META_AUDIENCE_HASH_INVALID');
    }
    if (valueBased) {
      const amount = row[META_AUDIENCE_SCHEMA.length];
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
        throw new MetaAdminActionError('Value-based audience rows require a non-negative numeric value.', 400, 'META_AUDIENCE_VALUE_INVALID');
      }
    }
  }
  return value as unknown as MetaAudienceHashedBatch;
}

export function normalizeMetaAudienceMutation(input: {
  readonly operation: MetaAudienceMutationOperation;
  readonly resourceId?: string | null;
  readonly payload: Record<string, unknown>;
}): MetaAudienceMutationApprovalPayload {
  const unknown = Object.keys(input.payload).filter((key) => !ALLOWED[input.operation].has(key));
  if (unknown.length > 0) throw new MetaAdminActionError(`Unsupported audience mutation field(s): ${unknown.join(', ')}`, 400, 'META_AUDIENCE_FIELD_NOT_ALLOWED');
  const creating = input.operation.startsWith('CREATE_');
  const resourceId = input.resourceId?.trim() || null;
  if (!creating && !resourceId) throw new MetaAdminActionError('audienceId is required.', 400, 'META_AUDIENCE_ID_REQUIRED');
  const normalized = clean({ ...input.payload });
  if (input.operation === 'SYNC_CUSTOM_AUDIENCE') {
    const batch = validateHashedBatch(normalized.batch);
    const digest = buildMetaAudienceHashedBatchDigest(batch);
    if (normalized.batchDigest !== undefined && normalized.batchDigest !== digest) {
      throw new MetaAdminActionError('Audience batch digest does not match the executable payload.', 409, 'META_AUDIENCE_BATCH_DIGEST_MISMATCH');
    }
    normalized.batchDigest = digest;
  }
  const serialized = JSON.stringify(normalized).toLowerCase();
  if (/"(?:email|phone|firstname|lastname|postalcode)"\s*:/.test(serialized)) {
    throw new MetaAdminActionError('Raw audience PII is forbidden in canonical mutation payloads.', 400, 'META_AUDIENCE_RAW_PII_FORBIDDEN');
  }
  return Object.freeze({
    operation: input.operation,
    entityType: input.operation === 'SYNC_CUSTOM_AUDIENCE' ? 'AUDIENCE_MEMBERS' : 'AUDIENCE',
    resourceId,
    input: Object.freeze(normalized),
  });
}

export function buildMetaAudienceMutationPayloadHash(payload: MetaAudienceMutationApprovalPayload) {
  return buildMetaAdminPayloadHash(payload);
}
