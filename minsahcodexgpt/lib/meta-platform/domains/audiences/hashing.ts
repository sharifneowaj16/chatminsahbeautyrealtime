import { createHash } from 'node:crypto';
import type { MetaAudienceCustomerRecord, MetaAudienceHashedBatch } from './types';

export const META_AUDIENCE_SCHEMA = Object.freeze(['EMAIL', 'PHONE', 'FN', 'LN', 'CT', 'ST', 'ZIP', 'COUNTRY', 'EXTERN_ID']);

function normalize(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

function normalizePhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  return digits;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function hasExplicitMetaAudienceConsent(customer: MetaAudienceCustomerRecord): boolean {
  return customer.consent === true || customer.consentStatus?.trim().toUpperCase() === 'GRANTED';
}

export function hashMetaAudienceCustomers(input: {
  readonly customers: readonly MetaAudienceCustomerRecord[];
  readonly valueBased?: boolean;
  readonly requireExplicitConsent?: boolean;
}): MetaAudienceHashedBatch {
  const valueBased = input.valueBased === true;
  const rows: Array<readonly (string | number)[]> = [];
  let rejected = 0;
  for (const customer of input.customers) {
    if (input.requireExplicitConsent !== false && !hasExplicitMetaAudienceConsent(customer)) {
      rejected += 1;
      continue;
    }
    const email = normalize(customer.email);
    const phone = normalizePhone(customer.phone);
    const externalId = normalize(customer.externalId);
    if (!email && !phone && !externalId) {
      rejected += 1;
      continue;
    }
    const identifiers = [
      email, phone, normalize(customer.firstName), normalize(customer.lastName),
      normalize(customer.city), normalize(customer.state), normalize(customer.postalCode), normalize(customer.country ?? 'bd'), externalId,
    ];
    const row: Array<string | number> = identifiers.map((value) => value ? sha256(value) : '');
    if (valueBased) row.push(Number.isFinite(Number(customer.value)) ? Number(customer.value) : 0);
    rows.push(Object.freeze(row));
  }
  return Object.freeze({
    schema: Object.freeze(valueBased ? [...META_AUDIENCE_SCHEMA, 'LOOKALIKE_VALUE'] : [...META_AUDIENCE_SCHEMA]),
    rows: Object.freeze(rows),
    accepted: rows.length,
    rejected,
    valueBased,
  });
}

export function assertMetaAudienceConsentBatch(batch: MetaAudienceHashedBatch) {
  if (batch.accepted === 0) throw new Error('META_AUDIENCE_NO_CONSENTED_IDENTITIES');
  if (batch.rejected > 0) throw new Error('META_AUDIENCE_CONSENT_REQUIRED_FOR_EVERY_CUSTOMER');
}


export function buildMetaAudienceHashedBatchDigest(batch: MetaAudienceHashedBatch): string {
  const canonical = JSON.stringify({
    schema: [...batch.schema],
    rows: batch.rows.map((row) => [...row]),
    accepted: batch.accepted,
    rejected: batch.rejected,
    valueBased: batch.valueBased,
  });
  return createHash('sha256').update(canonical).digest('hex');
}
