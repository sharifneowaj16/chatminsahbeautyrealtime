import crypto from 'node:crypto';
import {
  mapMetaLeadProviderPayload,
  maskMetaLeadEmail,
  maskMetaLeadPhone,
  normalizeMetaLeadEmail,
  normalizeMetaLeadPhone,
  toLegacyMetaLeadFields,
  toLegacyNormalizedMetaLead,
} from '@/lib/meta-platform/domains/leads';
import type { MetaLeadField, MetaLeadGraphPayload, NormalizedMetaLead } from './types';

export { normalizeMetaLeadPhone, normalizeMetaLeadEmail, maskMetaLeadPhone, maskMetaLeadEmail };

export function hashMetaLeadIdentity(value?: string) {
  return value ? crypto.createHash('sha256').update(value).digest('hex') : undefined;
}

export function normalizeMetaLeadFields(payload: MetaLeadGraphPayload): { fields: MetaLeadField[]; normalized: NormalizedMetaLead } {
  const record = mapMetaLeadProviderPayload(payload);
  return {
    fields: toLegacyMetaLeadFields(record).map((field) => ({ name: field.name, values: [...field.values] })),
    normalized: toLegacyNormalizedMetaLead(record, hashMetaLeadIdentity),
  };
}
