import type { TrackingDecision } from '@/lib/privacy/consent-types';
export const META_OUTBOX_PROVIDER = 'META' as const;
export const META_WEBSITE_ACTION_SOURCE = 'website' as const;
export const META_EVENT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const META_EVENT_MAX_FUTURE_SKEW_SECONDS = 60;

export type MetaEventOutboxStatus =
  | 'PENDING'
  | 'DISPATCHED'
  | 'PROCESSING'
  | 'SENT'
  | 'RETRY_SCHEDULED'
  | 'FAILED_PERMANENT'
  | 'SUPPRESSED';

export type MetaCapiUserData = {
  em?: string | string[];
  ph?: string | string[];
  fn?: string | string[];
  ln?: string | string[];
  ct?: string | string[];
  st?: string | string[];
  zp?: string | string[];
  country?: string | string[];
  external_id?: string | string[];
  fbc?: string;
  fbp?: string;
  client_ip_address?: string;
  client_user_agent?: string;
};

export type MetaWebsiteServerEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: 'website';
  event_source_url: string;
  user_data: MetaCapiUserData;
  custom_data: Record<string, unknown>;
  opt_out?: boolean;
  data_processing_options?: string[];
  data_processing_options_country?: number;
  data_processing_options_state?: number;
};

export type MetaWebsiteCapiRequest = {
  data: MetaWebsiteServerEvent[];
  test_event_code?: string;
};

export type MetaPurchaseOutboxPayload = {
  kind: 'purchase';
  purchaseType: 'cod_purchase' | 'online_paid_purchase';
  orderId: string;
};

export type MetaCoreOutboxPayload = {
  kind: 'core_event';
  request: MetaWebsiteCapiRequest;
};

export type MetaOutboxPayload = MetaPurchaseOutboxPayload | MetaCoreOutboxPayload;

export type MetaEventOutboxRecord = {
  id: string;
  correlationId: string;
  provider: string;
  eventName: string;
  eventId: string;
  sourceType: string;
  sourceId: string | null;
  orderId: string | null;
  actionSource: string;
  eventSourceUrl: string | null;
  eventTime: Date;
  payload: MetaOutboxPayload;
  safePayload: Record<string, unknown> | null;
  policyVersion: string;
  policyReason: string;
  consentState: string;
  consentVersion: string | null;
  allowAdvancedMatching: boolean;
  retentionUntil: Date;
  status: MetaEventOutboxStatus;
  attempts: number;
  nextAttemptAt: Date | null;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  dispatchedAt: Date | null;
  processingAt: Date | null;
  sentAt: Date | null;
  response: Record<string, unknown> | null;
  lastError: Record<string, unknown> | null;
  suppressReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateMetaEventOutboxInput = {
  correlationId?: string;
  provider?: typeof META_OUTBOX_PROVIDER;
  eventName: string;
  eventId: string;
  sourceType: string;
  sourceId?: string | null;
  orderId?: string | null;
  actionSource: typeof META_WEBSITE_ACTION_SOURCE;
  eventSourceUrl: string;
  eventTime: Date;
  payload: MetaOutboxPayload;
  safePayload?: Record<string, unknown> | null;
  policyDecision: TrackingDecision;
};
