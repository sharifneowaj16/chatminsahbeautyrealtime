import {
  maskMetaLeadEmail,
  maskMetaLeadPhone,
  normalizeMetaLeadEmail,
  normalizeMetaLeadPhone,
  normalizeMetaLeadProviderFields,
  projectMetaLeadCustomFields,
} from './normalize-lead.ts';
import type { MetaLeadDomainRecord, MetaLeadProviderPayload } from './types.ts';

const KNOWN_FIELD_NAMES = new Set([
  'first_name', 'firstname', 'last_name', 'lastname', 'full_name', 'fullname', 'name',
  'phone_number', 'phone', 'mobile_number', 'mobile', 'whatsapp',
  'email', 'email_address', 'city', 'town', 'district', 'area', 'state', 'country',
  'product_interest', 'product', 'interested_product', 'which_product_are_you_interested_in',
]);

function requiredProviderId(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('META_LEAD_PROVIDER_ID_REQUIRED');
  const clean = value.trim();
  if (!clean || clean.length > 255) throw new TypeError('META_LEAD_PROVIDER_ID_INVALID');
  return clean;
}

function optionalText(value: unknown, max = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, max) : undefined;
}

export function mapMetaLeadProviderPayload(payload: MetaLeadProviderPayload): MetaLeadDomainRecord {
  const providerLeadId = requiredProviderId(payload.id);
  const fields = normalizeMetaLeadProviderFields(payload.field_data);
  const fieldMap = new Map(fields.map((field) => [field.name, field.values] as const));
  const first = (...keys: string[]): string | undefined => keys.flatMap((key) => fieldMap.get(key) ?? []).find(Boolean);
  const firstName = first('first_name', 'firstname');
  const lastName = first('last_name', 'lastname');
  const fullName = first('full_name', 'fullname', 'name') ?? ([firstName, lastName].filter(Boolean).join(' ') || undefined);
  const phone = normalizeMetaLeadPhone(first('phone_number', 'phone', 'mobile_number', 'mobile', 'whatsapp'));
  const email = normalizeMetaLeadEmail(first('email', 'email_address'));
  const phoneMasked = phone ? maskMetaLeadPhone(phone) : undefined;
  const emailMasked = email ? maskMetaLeadEmail(email) : undefined;
  const sourceCreatedAt = optionalText(payload.created_time, 100);
  const formId = optionalText(payload.form_id, 255);
  const adId = optionalText(payload.ad_id, 255);
  const adName = optionalText(payload.ad_name, 500);
  const adsetId = optionalText(payload.adset_id, 255);
  const adsetName = optionalText(payload.adset_name, 500);
  const campaignId = optionalText(payload.campaign_id, 255);
  const campaignName = optionalText(payload.campaign_name, 500);
  const platform = optionalText(payload.platform, 100);
  const partnerName = optionalText(payload.partner_name, 255);
  const retailerItemId = optionalText(payload.retailer_item_id, 255);
  const city = first('city', 'town', 'district');
  const area = first('area', 'state');
  const country = first('country');
  const productInterest = first('product_interest', 'product', 'interested_product', 'which_product_are_you_interested_in');

  return Object.freeze({
    providerLeadId,
    ...(sourceCreatedAt ? { sourceCreatedAt } : {}),
    isTestLead: typeof payload.is_test_lead === 'boolean' ? payload.is_test_lead : null,
    attribution: Object.freeze({
      ...(formId ? { formId } : {}),
      ...(adId ? { adId } : {}),
      ...(adName ? { adName } : {}),
      ...(adsetId ? { adsetId } : {}),
      ...(adsetName ? { adsetName } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...(campaignName ? { campaignName } : {}),
      ...(typeof payload.is_organic === 'boolean' ? { isOrganic: payload.is_organic } : {}),
      ...(platform ? { platform } : {}),
      ...(partnerName ? { partnerName } : {}),
      ...(retailerItemId ? { retailerItemId } : {}),
    }),
    contact: Object.freeze({
      ...(fullName ? { fullName } : {}),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
    }),
    safeContact: Object.freeze({
      ...(fullName ? { displayName: fullName.slice(0, 200) } : {}),
      ...(phoneMasked ? { phoneMasked } : {}),
      ...(emailMasked ? { emailMasked } : {}),
      hasPhone: Boolean(phone),
      hasEmail: Boolean(email),
    }),
    location: Object.freeze({
      ...(city ? { city } : {}),
      ...(area ? { area } : {}),
      ...(country ? { country } : {}),
    }),
    ...(productInterest ? { productInterest } : {}),
    customFields: projectMetaLeadCustomFields(fields, KNOWN_FIELD_NAMES),
    sensitiveProviderFields: fields,
  });
}
