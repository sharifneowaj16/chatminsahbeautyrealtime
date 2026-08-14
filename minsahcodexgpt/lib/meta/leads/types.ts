export const META_LEAD_FIELD_LIMIT = 100;
export const META_LEAD_VALUE_MAX_LENGTH = 2_000;
export const META_LEAD_WEBHOOK_MAX_BYTES = 256 * 1024;

export type MetaLeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONVERTED' | 'LOST';
export type MetaLeadRetrievalStatus = 'PENDING' | 'FETCHING' | 'RETRYING' | 'FETCHED' | 'NOT_FOUND' | 'TOKEN_ERROR' | 'PERMANENT_FAILURE';
export type MetaWebhookProcessingStatus = 'RECEIVED' | 'VERIFIED' | 'QUEUED' | 'PROCESSED' | 'FAILED' | 'REJECTED';
export type MetaLeadDuplicateReason = 'LEADGEN_ID' | 'PHONE' | 'EMAIL';
export type MetaLeadContactChannel = 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'MESSENGER' | 'OTHER';

export type MetaLeadField = {
  name: string;
  values: string[];
};

export type MetaLeadGraphPayload = Readonly<{
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

export type MetaLeadNotification = {
  eventKey: string;
  objectType: 'page';
  pageId: string;
  leadgenId: string;
  formId?: string;
  adId?: string;
  createdTime?: string;
  payloadDigest: string;
};

export type NormalizedMetaLead = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneHash?: string;
  phoneMasked?: string;
  email?: string;
  emailHash?: string;
  emailMasked?: string;
  city?: string;
  area?: string;
  country?: string;
  productInterest?: string;
  customFields: Record<string, string[]>;
};

export type MetaLeadAssignmentRuleView = {
  id: string;
  priority: number;
  campaignId?: string | null;
  formId?: string | null;
  city?: string | null;
  area?: string | null;
  productInterest?: string | null;
  assignedToId?: string | null;
};

export type MetaLeadAgentView = {
  adminId: string;
  maxOpenLeads: number;
  openLeads: number;
  lastAssignedAt?: Date | null;
};
