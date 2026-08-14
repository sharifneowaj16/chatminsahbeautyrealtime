import { Queue, type JobsOptions } from 'bullmq';
import { bullRedis } from './productQueue';

/**
 * Legacy Meta direct-delivery queue. New Meta CAPI events use the database outbox
 * and the provider-isolated `meta-capi-events` queue. GA4 and TikTok are explicitly
 * separated so their backlog/rate limits cannot block Meta delivery.
 */
export const META_CAPI_PURCHASE_QUEUE_NAME = 'meta-capi-legacy';
export const GA4_EVENTS_QUEUE_NAME = 'analytics-ga4-events';
export const TIKTOK_EVENTS_QUEUE_NAME = 'tiktok-events';
export const META_CAPI_PURCHASE_MAX_ATTEMPTS = 5;
export const META_CAPI_PURCHASE_BACKOFF_DELAY_MS = 60_000;

export type MetaCapiCoreJobData = {
  type: 'core_event';
  eventName: string;
  eventId: string;
  orderId?: string;
  queuedAt: string;
  sdkPayload?: Record<string, unknown>;
  capiPayload?: Record<string, unknown>;
  safePayload: {
    event_name: string;
    event_id: string;
    order_id?: string;
    event_time?: number;
    value?: number;
    currency?: string;
    schema_version?: string;
    graph_api_version?: string;
    custom_data_keys?: string[];
    content_id_count?: number;
    contents_count?: number;
    has_fbp: boolean;
    has_fbc: boolean;
    has_external_id: boolean;
    has_email_hash: boolean;
    has_phone_hash: boolean;
    has_ip: boolean;
    has_ua: boolean;
  };
};

export type MetaCapiPurchaseJobData = {
  type: 'cod_purchase' | 'online_paid_purchase';
  orderId: string;
  queuedAt: string;
};

export type Ga4PurchaseJobData = {
  type: 'ga4_purchase';
  orderId: string;
  source: 'cod_phone_confirmed' | 'online_paid';
  queuedAt: string;
};

export type Ga4RefundJobData = {
  type: 'ga4_refund';
  orderId: string;
  source: 'admin_refund' | 'return_completed' | 'manual_retry';
  queuedAt: string;
};

export type TikTokPurchaseJobData = {
  type: 'tiktok_cod_purchase' | 'tiktok_online_paid_purchase';
  orderId: string;
  queuedAt: string;
};

export type MetaCapiJobData = MetaCapiPurchaseJobData | MetaCapiCoreJobData;
export type Ga4JobData = Ga4PurchaseJobData | Ga4RefundJobData;
export type TikTokJobData = TikTokPurchaseJobData;

const globalQueues = globalThis as unknown as {
  metaCapiLegacyQueue?: Queue<MetaCapiJobData>;
  ga4EventsQueue?: Queue<Ga4JobData>;
  tiktokEventsQueue?: Queue<TikTokJobData>;
};

function defaults(): JobsOptions {
  return {
    attempts: META_CAPI_PURCHASE_MAX_ATTEMPTS,
    backoff: { type: 'fixed', delay: META_CAPI_PURCHASE_BACKOFF_DELAY_MS },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  };
}

export const metaCapiPurchaseQueue = globalQueues.metaCapiLegacyQueue ?? new Queue<MetaCapiJobData>(META_CAPI_PURCHASE_QUEUE_NAME, {
  connection: bullRedis,
  defaultJobOptions: defaults(),
});
export const ga4EventsQueue = globalQueues.ga4EventsQueue ?? new Queue<Ga4JobData>(GA4_EVENTS_QUEUE_NAME, {
  connection: bullRedis,
  defaultJobOptions: defaults(),
});
export const tiktokEventsQueue = globalQueues.tiktokEventsQueue ?? new Queue<TikTokJobData>(TIKTOK_EVENTS_QUEUE_NAME, {
  connection: bullRedis,
  defaultJobOptions: defaults(),
});

if (process.env.NODE_ENV !== 'production') {
  globalQueues.metaCapiLegacyQueue = metaCapiPurchaseQueue;
  globalQueues.ga4EventsQueue = ga4EventsQueue;
  globalQueues.tiktokEventsQueue = tiktokEventsQueue;
}

function sanitizeBullJobId(jobId: string) {
  return jobId.replace(/:/g, '-');
}
function options(defaultJobId: string, input?: JobsOptions): JobsOptions {
  return { ...input, jobId: sanitizeBullJobId(String(input?.jobId ?? defaultJobId)) };
}

export function enqueueMetaCapiPurchase(input: Omit<MetaCapiPurchaseJobData, 'queuedAt'>, jobOptions?: JobsOptions) {
  return metaCapiPurchaseQueue.add(input.type, { ...input, queuedAt: new Date().toISOString() }, options(`${input.type}-${input.orderId}`, jobOptions));
}
export function enqueueMetaCapiCoreEvent(input: Omit<MetaCapiCoreJobData, 'queuedAt' | 'type'>, jobOptions?: JobsOptions) {
  return metaCapiPurchaseQueue.add('core_event', { type: 'core_event', ...input, queuedAt: new Date().toISOString() }, options(`core_event-${input.eventId}`, jobOptions));
}
export function enqueueGa4Purchase(input: Omit<Ga4PurchaseJobData, 'queuedAt' | 'type'>, jobOptions?: JobsOptions) {
  return ga4EventsQueue.add('ga4_purchase', { type: 'ga4_purchase', ...input, queuedAt: new Date().toISOString() }, options(`ga4_purchase-${input.orderId}`, jobOptions));
}
export function enqueueGa4Refund(input: Omit<Ga4RefundJobData, 'queuedAt' | 'type'>, jobOptions?: JobsOptions) {
  return ga4EventsQueue.add('ga4_refund', { type: 'ga4_refund', ...input, queuedAt: new Date().toISOString() }, options(`ga4_refund-${input.orderId}`, jobOptions));
}
export function enqueueTikTokPurchase(input: Omit<TikTokPurchaseJobData, 'queuedAt'>, jobOptions?: JobsOptions) {
  return tiktokEventsQueue.add(input.type, { ...input, queuedAt: new Date().toISOString() }, options(`${input.type}-${input.orderId}`, jobOptions));
}
