import { toLegacyNormalizedMetaLead } from './legacy-adapter.ts';
import { mapMetaLeadProviderPayload } from './lead-mapper.ts';
import type { MetaLeadProviderPayload } from './types.ts';
import type { MetaLeadShadowComparison } from './cutover.ts';

function snapshotPlatform(payload: MetaLeadProviderPayload) {
  const record = mapMetaLeadProviderPayload(payload);
  return Object.freeze({
    providerLeadId: record.providerLeadId,
    formId: record.attribution.formId ?? null,
    isTestLead: record.isTestLead,
    hasFullName: Boolean(record.contact.fullName),
    hasPhone: Boolean(record.contact.phone),
    hasEmail: Boolean(record.contact.email),
    hasCity: Boolean(record.location.city),
    hasArea: Boolean(record.location.area),
    hasCountry: Boolean(record.location.country),
    hasProductInterest: Boolean(record.productInterest),
    providerFieldCount: record.sensitiveProviderFields.length,
  });
}

function snapshotLegacyAdapter(payload: MetaLeadProviderPayload) {
  const record = mapMetaLeadProviderPayload(payload);
  const legacy = toLegacyNormalizedMetaLead(record, (value) => value ? 'present' : undefined);
  return Object.freeze({
    providerLeadId: payload.id,
    formId: payload.form_id ?? null,
    isTestLead: typeof payload.is_test_lead === 'boolean' ? payload.is_test_lead : null,
    hasFullName: Boolean(legacy.fullName),
    hasPhone: Boolean(legacy.phone),
    hasEmail: Boolean(legacy.email),
    hasCity: Boolean(legacy.city),
    hasArea: Boolean(legacy.area),
    hasCountry: Boolean(legacy.country),
    hasProductInterest: Boolean(legacy.productInterest),
    providerFieldCount: record.sensitiveProviderFields.length,
  });
}

export function compareMetaLeadShadowNormalization(payload: MetaLeadProviderPayload): MetaLeadShadowComparison {
  const platform = snapshotPlatform(payload);
  const legacy = snapshotLegacyAdapter(payload);
  const keys = Object.keys(platform) as Array<keyof typeof platform>;
  const differenceCodes = keys
    .filter((key) => platform[key] !== legacy[key])
    .map((key) => `LEAD_SHADOW_${String(key).replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_MISMATCH`);
  return Object.freeze({
    status: differenceCodes.length === 0 ? 'MATCH' : 'MISMATCH',
    matched: differenceCodes.length === 0,
    differenceCodes: Object.freeze(differenceCodes),
    safeMetrics: Object.freeze({ comparedFieldCount: keys.length, mismatchCount: differenceCodes.length }),
  });
}

export const META_LEAD_SHADOW_NOT_OBSERVED: MetaLeadShadowComparison = Object.freeze({
  status: 'NOT_OBSERVED', matched: null, differenceCodes: Object.freeze([]),
  safeMetrics: Object.freeze({ comparedFieldCount: 0, mismatchCount: 0 }),
});
