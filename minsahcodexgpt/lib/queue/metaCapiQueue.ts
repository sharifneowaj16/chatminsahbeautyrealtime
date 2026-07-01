import { Queue, type JobsOptions } from 'bullmq';
import { bullRedis } from './productQueue';

export const META_CAPI_PURCHASE_QUEUE_NAME = 'meta-capi-purchase';
export const META_CAPI_PURCHASE_MAX_ATTEMPTS = 5;

export type MetaCapiCoreJobData = {
  type: 'core_event';
  eventName: string;
  eventId: string;
  orderId?: string;
  queuedAt: string;
  capiPayload: Record<string, unknown>;
  safePayload: {
    event_name: string;
    event_id: string;
    order_id?: string;
    event_time?: number;
    value?: number;
    currency?: string;
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

export type MetaCapiJobData = MetaCapiPurchaseJobData | MetaCapiCoreJobData | Ga4PurchaseJobData | Ga4RefundJobData;

const globalForMetaCapiQueue = globalThis as unknown as {
  metaCapiPurchaseQueue?: Queue<MetaCapiJobData>;
};

function createMetaCapiPurchaseQueue(): Queue<MetaCapiJobData> {
  return new Queue<MetaCapiJobData>(META_CAPI_PURCHASE_QUEUE_NAME, {
    connection: bullRedis,
    defaultJobOptions: {
      attempts: META_CAPI_PURCHASE_MAX_ATTEMPTS,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
    },
  });
}

export const metaCapiPurchaseQueue: Queue<MetaCapiJobData> =
  globalForMetaCapiQueue.metaCapiPurchaseQueue ?? createMetaCapiPurchaseQueue();

if (process.env.NODE_ENV !== 'production') {
  globalForMetaCapiQueue.metaCapiPurchaseQueue = metaCapiPurchaseQueue;
}

export function enqueueMetaCapiPurchase(
  input: Omit<MetaCapiPurchaseJobData, 'queuedAt'>,
  options?: JobsOptions
) {
  const queuedAt = new Date().toISOString();

  return metaCapiPurchaseQueue.add(
    input.type,
    { ...input, queuedAt },
    {
      jobId: `${input.type}:${input.orderId}`,
      ...options,
    }
  );
}


export function enqueueMetaCapiCoreEvent(
  input: Omit<MetaCapiCoreJobData, 'queuedAt' | 'type'>,
  options?: JobsOptions
) {
  const queuedAt = new Date().toISOString();

  return metaCapiPurchaseQueue.add(
    'core_event',
    { type: 'core_event', ...input, queuedAt },
    {
      jobId: `core_event:${input.eventId}`,
      ...options,
    }
  );
}


export function enqueueGa4Purchase(
  input: Omit<Ga4PurchaseJobData, 'queuedAt' | 'type'>,
  options?: JobsOptions
) {
  const queuedAt = new Date().toISOString();

  return metaCapiPurchaseQueue.add(
    'ga4_purchase',
    { type: 'ga4_purchase', ...input, queuedAt },
    {
      jobId: `ga4_purchase:${input.orderId}`,
      ...options,
    }
  );
}


export function enqueueGa4Refund(
  input: Omit<Ga4RefundJobData, 'queuedAt' | 'type'>,
  options?: JobsOptions
) {
  const queuedAt = new Date().toISOString();

  return metaCapiPurchaseQueue.add(
    'ga4_refund',
    { type: 'ga4_refund', ...input, queuedAt },
    {
      jobId: `ga4_refund:${input.orderId}`,
      ...options,
    }
  );
}
