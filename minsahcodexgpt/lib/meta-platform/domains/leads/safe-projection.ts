import type { MetaLeadDomainRecord, MetaLeadSafeProjection } from './types.ts';

export function toMetaLeadSafeProjection(record: MetaLeadDomainRecord): MetaLeadSafeProjection {
  return Object.freeze({
    providerLeadId: record.providerLeadId,
    ...(record.sourceCreatedAt ? { sourceCreatedAt: record.sourceCreatedAt } : {}),
    isTestLead: record.isTestLead,
    attribution: record.attribution,
    contact: record.safeContact,
    location: record.location,
    ...(record.productInterest ? { productInterest: record.productInterest } : {}),
    customFields: record.customFields,
  });
}

export function assertMetaLeadSafeProjection(value: unknown): asserts value is MetaLeadSafeProjection {
  const serialized = JSON.stringify(value);
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)) throw new Error('META_LEAD_SAFE_PROJECTION_EMAIL_LEAK');
  if (/(?:\+?\d[\d\s().-]{7,}\d)/.test(serialized)) throw new Error('META_LEAD_SAFE_PROJECTION_PHONE_LEAK');
  if (/EA[A-Za-z0-9_-]{15,}/.test(serialized) || /(?:token|secret|password|api[_-]?key)["']?\s*:/i.test(serialized)) {
    throw new Error('META_LEAD_SAFE_PROJECTION_SECRET_LEAK');
  }
}
