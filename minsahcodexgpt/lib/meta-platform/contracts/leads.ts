import crypto from 'node:crypto';
import {
  createMetaProviderIdentity,
  isMetaProviderIdentity,
  type CreateMetaProviderIdentityInput,
} from './social';
import type { MetaPageIdentity } from './pages';

export const META_LEAD_PAYLOAD_SCHEMA_VERSION = 1 as const;
export const META_LEAD_FIELD_LIMIT = 100;
export const META_LEAD_FIELD_VALUE_LIMIT = 20;
export const META_LEAD_VALUE_MAX_LENGTH = 2_000;

export const META_LEAD_SOURCE_CHANNELS = ['FACEBOOK', 'INSTAGRAM', 'UNKNOWN'] as const;
export type MetaLeadSourceChannel = (typeof META_LEAD_SOURCE_CHANNELS)[number];

export interface MetaLeadProviderFieldInput {
  readonly name?: unknown;
  readonly values?: unknown;
}

/** Raw provider response accepted only at the Meta transport/domain adapter boundary. */
export interface MetaLeadProviderPayload {
  readonly id?: unknown;
  readonly created_time?: unknown;
  readonly ad_id?: unknown;
  readonly ad_name?: unknown;
  readonly adset_id?: unknown;
  readonly adset_name?: unknown;
  readonly campaign_id?: unknown;
  readonly campaign_name?: unknown;
  readonly form_id?: unknown;
  readonly field_data?: unknown;
  readonly is_organic?: unknown;
  readonly platform?: unknown;
  readonly partner_name?: unknown;
  readonly retailer_item_id?: unknown;
}

export interface MetaNormalizedLeadField {
  readonly name: string;
  readonly values: readonly string[];
}

export interface MetaNormalizedLeadContact {
  readonly phoneCountryCode: string;
  readonly fullName: string | null;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly phone: string | null;
  readonly phoneHash: string | null;
  readonly phoneMasked: string | null;
  readonly email: string | null;
  readonly emailHash: string | null;
  readonly emailMasked: string | null;
  readonly city: string | null;
  readonly area: string | null;
  readonly country: string | null;
}

export interface MetaLeadAttribution {
  readonly formId: string;
  readonly adId: string | null;
  readonly adName: string | null;
  readonly adSetId: string | null;
  readonly adSetName: string | null;
  readonly campaignId: string | null;
  readonly campaignName: string | null;
  readonly isOrganic: boolean | null;
  readonly sourceChannel: MetaLeadSourceChannel;
  readonly providerPlatform: string | null;
  readonly partnerName: string | null;
  readonly retailerItemId: string | null;
}

export interface MetaNormalizedLeadPayload {
  readonly schemaVersion: typeof META_LEAD_PAYLOAD_SCHEMA_VERSION;
  readonly provider: 'META';
  readonly leadKey: string;
  readonly leadId: string;
  readonly page: MetaPageIdentity;
  readonly createdAt: string | null;
  readonly attribution: MetaLeadAttribution;
  readonly fields: readonly MetaNormalizedLeadField[];
  readonly contact: MetaNormalizedLeadContact;
  readonly productInterest: string | null;
  readonly customFields: Readonly<Record<string, readonly string[]>>;
}

export interface CreateMetaLeadPayloadInput {
  readonly page: CreateMetaProviderIdentityInput & { readonly assetType: 'PAGE' };
  readonly providerPayload: MetaLeadProviderPayload;
  readonly fallbackFormId?: string | null;
  readonly defaultCountryCode?: string;
}

const KNOWN_LEAD_FIELDS = new Set([
  'first_name', 'firstname', 'last_name', 'lastname', 'full_name', 'fullname', 'name',
  'phone_number', 'phone', 'mobile_number', 'mobile', 'email', 'email_address',
  'city', 'town', 'area', 'district', 'state', 'country', 'product_interest', 'product',
  'interested_product', 'which_product_are_you_interested_in',
]);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown, code: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new TypeError(code);
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(code);
  return normalized;
}

function requiredString(value: unknown, code: string, maxLength = 255): string {
  const normalized = cleanString(value, code, maxLength);
  if (!normalized) throw new TypeError(code);
  return normalized;
}

function fieldName(value: unknown): string | null {
  const normalized = cleanString(value, 'META_LEAD_FIELD_NAME_INVALID', 120);
  if (!normalized) return null;
  const key = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return key || null;
}

function normalizeCreatedAt(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    date = new Date(value < 1_000_000_000_000 ? value * 1_000 : value);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = /^\d{10,13}$/.test(trimmed) ? Number(trimmed) : null;
    date = numeric === null
      ? new Date(trimmed)
      : new Date(numeric < 1_000_000_000_000 ? numeric * 1_000 : numeric);
  } else {
    throw new TypeError('META_LEAD_CREATED_AT_INVALID');
  }
  if (Number.isNaN(date.getTime())) throw new TypeError('META_LEAD_CREATED_AT_INVALID');
  return date.toISOString();
}

function normalizePhone(value: unknown, defaultCountryCode: string): string | null {
  if (value === undefined || value === null) return null;
  const raw = cleanString(value, 'META_LEAD_PHONE_INVALID', 80);
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = `${defaultCountryCode}${digits.slice(1)}`;
  else if (digits.startsWith('1') && digits.length === 10 && defaultCountryCode === '880') digits = `880${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function normalizeEmail(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = cleanString(value, 'META_LEAD_EMAIL_INVALID', 320)?.toLowerCase() ?? null;
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

function digest(value: string | null): string | null {
  return value ? crypto.createHash('sha256').update(value).digest('hex') : null;
}

function maskPhone(value: string | null): string | null {
  if (!value) return null;
  const visible = value.slice(-4);
  return `${'*'.repeat(Math.max(0, value.length - visible.length))}${visible}`;
}

function maskEmail(value: string | null): string | null {
  if (!value) return null;
  const [local, domain] = value.split('@');
  if (!domain) return null;
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}${'*'.repeat(Math.max(3, local.length - prefix.length))}@${domain}`;
}

function normalizeSourceChannel(value: string | null): MetaLeadSourceChannel {
  const normalized = value?.toLowerCase() ?? '';
  if (normalized === 'facebook' || normalized === 'fb') return 'FACEBOOK';
  if (normalized === 'instagram' || normalized === 'ig') return 'INSTAGRAM';
  return 'UNKNOWN';
}

function normalizeFields(value: unknown): {
  readonly fields: readonly MetaNormalizedLeadField[];
  readonly valueMap: Readonly<Record<string, readonly string[]>>;
} {
  if (value === undefined || value === null) {
    return { fields: Object.freeze([]), valueMap: Object.freeze({}) };
  }
  if (!Array.isArray(value)) throw new TypeError('META_LEAD_FIELDS_INVALID');
  if (value.length > META_LEAD_FIELD_LIMIT) throw new TypeError('META_LEAD_FIELD_LIMIT_EXCEEDED');

  const map = new Map<string, string[]>();
  for (const candidate of value) {
    if (!isRecord(candidate)) throw new TypeError('META_LEAD_FIELD_INVALID');
    const name = fieldName(candidate.name);
    if (!name) continue;
    const rawValues = Array.isArray(candidate.values) ? candidate.values : [candidate.values];
    if (rawValues.length > META_LEAD_FIELD_VALUE_LIMIT) throw new TypeError('META_LEAD_FIELD_VALUE_LIMIT_EXCEEDED');
    const values = map.get(name) ?? [];
    for (const rawValue of rawValues) {
      if (rawValue === undefined || rawValue === null) continue;
      const normalized = cleanString(rawValue, 'META_LEAD_FIELD_VALUE_INVALID', META_LEAD_VALUE_MAX_LENGTH);
      if (normalized && !values.includes(normalized)) values.push(normalized);
    }
    if (values.length) map.set(name, values);
  }

  const fields = Object.freeze(Array.from(map, ([name, values]) => Object.freeze({
    name,
    values: Object.freeze([...values]),
  })));
  const valueMap = Object.freeze(Object.fromEntries(fields.map((field) => [field.name, field.values])));
  return { fields, valueMap };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function createMetaLeadPayload(input: CreateMetaLeadPayloadInput): MetaNormalizedLeadPayload {
  const page = createMetaProviderIdentity({ ...input.page, assetType: 'PAGE' }) as MetaPageIdentity;
  const payload = input.providerPayload;
  const leadId = requiredString(payload.id, 'META_LEAD_ID_REQUIRED');
  const formId = requiredString(payload.form_id ?? input.fallbackFormId, 'META_LEAD_FORM_ID_REQUIRED');
  const defaultCountryCode = requiredString(input.defaultCountryCode ?? '880', 'META_LEAD_COUNTRY_CODE_INVALID', 8);
  if (!/^\d{1,4}$/.test(defaultCountryCode)) throw new TypeError('META_LEAD_COUNTRY_CODE_INVALID');

  const { fields, valueMap } = normalizeFields(payload.field_data);
  const first = (...keys: string[]): string | null => {
    for (const key of keys) {
      const candidate = valueMap[key]?.[0];
      if (candidate) return candidate;
    }
    return null;
  };

  const firstName = first('first_name', 'firstname');
  const lastName = first('last_name', 'lastname');
  const fullName = first('full_name', 'fullname', 'name') ?? ([firstName, lastName].filter(Boolean).join(' ') || null);
  const phone = normalizePhone(first('phone_number', 'phone', 'mobile_number', 'mobile'), defaultCountryCode);
  const email = normalizeEmail(first('email', 'email_address'));
  const providerPlatform = cleanString(payload.platform, 'META_LEAD_PLATFORM_INVALID', 80);
  const isOrganic = payload.is_organic === undefined || payload.is_organic === null
    ? null
    : typeof payload.is_organic === 'boolean'
      ? payload.is_organic
      : (() => { throw new TypeError('META_LEAD_ORGANIC_FLAG_INVALID'); })();

  const contact = Object.freeze({
    phoneCountryCode: defaultCountryCode,
    fullName,
    firstName,
    lastName,
    phone,
    phoneHash: digest(phone),
    phoneMasked: maskPhone(phone),
    email,
    emailHash: digest(email),
    emailMasked: maskEmail(email),
    city: first('city', 'town', 'district'),
    area: first('area', 'state'),
    country: first('country'),
  });
  const customFields = Object.freeze(Object.fromEntries(
    Object.entries(valueMap)
      .filter(([name]) => !KNOWN_LEAD_FIELDS.has(name))
      .map(([name, values]) => [name, Object.freeze([...values])]),
  ));
  const attribution = Object.freeze({
    formId,
    adId: cleanString(payload.ad_id, 'META_LEAD_AD_ID_INVALID', 255),
    adName: cleanString(payload.ad_name, 'META_LEAD_AD_NAME_INVALID', 500),
    adSetId: cleanString(payload.adset_id, 'META_LEAD_ADSET_ID_INVALID', 255),
    adSetName: cleanString(payload.adset_name, 'META_LEAD_ADSET_NAME_INVALID', 500),
    campaignId: cleanString(payload.campaign_id, 'META_LEAD_CAMPAIGN_ID_INVALID', 255),
    campaignName: cleanString(payload.campaign_name, 'META_LEAD_CAMPAIGN_NAME_INVALID', 500),
    isOrganic,
    sourceChannel: normalizeSourceChannel(providerPlatform),
    providerPlatform,
    partnerName: cleanString(payload.partner_name, 'META_LEAD_PARTNER_NAME_INVALID', 500),
    retailerItemId: cleanString(payload.retailer_item_id, 'META_LEAD_RETAILER_ITEM_ID_INVALID', 255),
  });

  return Object.freeze({
    schemaVersion: META_LEAD_PAYLOAD_SCHEMA_VERSION,
    provider: 'META' as const,
    leadKey: `${page.identityKey}:LEAD:${leadId}`,
    leadId,
    page,
    createdAt: normalizeCreatedAt(payload.created_time),
    attribution,
    fields,
    contact,
    productInterest: first('product_interest', 'product', 'interested_product', 'which_product_are_you_interested_in'),
    customFields,
  });
}

export function isMetaNormalizedLeadPayload(value: unknown): value is MetaNormalizedLeadPayload {
  if (!isRecord(value)
    || value.schemaVersion !== META_LEAD_PAYLOAD_SCHEMA_VERSION
    || value.provider !== 'META'
    || typeof value.leadKey !== 'string'
    || typeof value.leadId !== 'string'
    || !isMetaProviderIdentity(value.page)
    || value.page.assetType !== 'PAGE'
    || (value.createdAt !== null && typeof value.createdAt !== 'string')
    || !isRecord(value.attribution)
    || !Array.isArray(value.fields)
    || !isRecord(value.contact)
    || (value.productInterest !== null && typeof value.productInterest !== 'string')
    || !isRecord(value.customFields)) {
    return false;
  }

  try {
    const attribution = value.attribution as Readonly<Record<string, unknown>>;
    const canonical = createMetaLeadPayload({
      page: value.page as MetaPageIdentity,
      fallbackFormId: typeof attribution.formId === 'string' ? attribution.formId : null,
      providerPayload: {
        id: value.leadId,
        created_time: value.createdAt,
        form_id: attribution.formId,
        ad_id: attribution.adId,
        ad_name: attribution.adName,
        adset_id: attribution.adSetId,
        adset_name: attribution.adSetName,
        campaign_id: attribution.campaignId,
        campaign_name: attribution.campaignName,
        is_organic: attribution.isOrganic,
        platform: attribution.providerPlatform,
        partner_name: attribution.partnerName,
        retailer_item_id: attribution.retailerItemId,
        field_data: value.fields,
      },
      defaultCountryCode: typeof value.contact.phoneCountryCode === 'string' ? value.contact.phoneCountryCode : undefined,
    });
    return stableStringify(canonical) === stableStringify(value);
  } catch {
    return false;
  }
}
