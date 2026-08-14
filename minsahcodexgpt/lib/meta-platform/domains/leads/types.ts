export const META_LEAD_DOMAIN_FIELD_LIMIT = 100;
export const META_LEAD_DOMAIN_VALUE_LIMIT = 2_000;

export type MetaLeadProviderField = Readonly<{
  name: string;
  values: readonly string[];
}>;

export type MetaLeadProviderPayload = Readonly<{
  id: string;
  created_time?: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  field_data?: readonly Readonly<{ name?: unknown; values?: unknown }>[];
  is_organic?: boolean;
  platform?: string;
  partner_name?: string;
  retailer_item_id?: string;
  is_test_lead?: boolean;
}>;

export type MetaLeadSensitiveContact = Readonly<{
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}>;

export type MetaLeadSafeContactProjection = Readonly<{
  displayName?: string;
  phoneMasked?: string;
  emailMasked?: string;
  hasPhone: boolean;
  hasEmail: boolean;
}>;

export type MetaLeadSafeCustomField = Readonly<{
  name: string;
  valueCount: number;
  classification: 'METADATA_ONLY' | 'SENSITIVE_NAME' | 'SENSITIVE_VALUE';
}>;

export type MetaLeadAttribution = Readonly<{
  pageId?: string;
  formId?: string;
  adId?: string;
  adName?: string;
  adsetId?: string;
  adsetName?: string;
  campaignId?: string;
  campaignName?: string;
  isOrganic?: boolean;
  platform?: string;
  partnerName?: string;
  retailerItemId?: string;
}>;

export type MetaLeadDomainRecord = Readonly<{
  providerLeadId: string;
  sourceCreatedAt?: string;
  isTestLead: boolean | null;
  attribution: MetaLeadAttribution;
  contact: MetaLeadSensitiveContact;
  safeContact: MetaLeadSafeContactProjection;
  location: Readonly<{
    city?: string;
    area?: string;
    country?: string;
  }>;
  productInterest?: string;
  customFields: readonly MetaLeadSafeCustomField[];
  sensitiveProviderFields: readonly MetaLeadProviderField[];
}>;

export type MetaLeadSafeProjection = Readonly<{
  providerLeadId: string;
  sourceCreatedAt?: string;
  isTestLead: boolean | null;
  attribution: MetaLeadAttribution;
  contact: MetaLeadSafeContactProjection;
  location: Readonly<{
    city?: string;
    area?: string;
    country?: string;
  }>;
  productInterest?: string;
  customFields: readonly MetaLeadSafeCustomField[];
}>;
