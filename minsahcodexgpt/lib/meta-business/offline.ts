import 'server-only';

import crypto from 'node:crypto';
import { getMetaPlatformCapiConfig } from '@/lib/meta-platform/domains/capi/config';
import { sendMetaCapiWithPhase28Cutover } from '@/lib/meta-platform/migration/phase28-capi-facade';
import type { MetaPlatformCapiEvent } from '@/lib/meta-platform/domains/capi/types';

function normalize(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

function normalizePhone(value?: string | null) {
  const digits = value?.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  return digits;
}

function hash(value?: string) {
  return value ? crypto.createHash('sha256').update(value).digest('hex') : undefined;
}

export type OfflineConversionInput = {
  eventName: string;
  eventTime?: number;
  eventId?: string;
  actionSource?: 'physical_store' | 'phone_call' | 'chat' | 'email' | 'other';
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  externalId?: string;
  value?: number;
  currency?: string;
  orderId?: string;
  customData?: Record<string, unknown>;
};

export async function uploadOfflineConversions(events: OfflineConversionInput[]) {
  const config = getMetaPlatformCapiConfig();
  if (!config.datasetId) throw new Error('META_DATASET_ID_NOT_CONFIGURED');
  const payloadEvents: MetaPlatformCapiEvent[] = events.map((event, index) => {
    const eventTime = event.eventTime ?? Math.floor(Date.now() / 1000);
    const eventId = event.eventId ?? `offline-${event.eventName}-${eventTime}-${index}`;
    return {
      event_name: event.eventName,
      event_time: eventTime,
      event_id: eventId,
      action_source: event.actionSource ?? 'other',
      event_source_url: undefined,
      user_data: {
        em: hash(normalize(event.email)),
        ph: hash(normalizePhone(event.phone)),
        fn: hash(normalize(event.firstName)),
        ln: hash(normalize(event.lastName)),
        ct: hash(normalize(event.city)),
        st: hash(normalize(event.state)),
        zp: hash(normalize(event.postalCode)),
        country: hash(normalize(event.country ?? 'bd')),
        external_id: hash(normalize(event.externalId)),
      },
      custom_data: {
        value: event.value,
        currency: event.currency ?? 'BDT',
        order_id: event.orderId,
        ...event.customData,
      },
    };
  });

  return sendMetaCapiWithPhase28Cutover({
    pixelId: config.datasetId,
    correlationId: payloadEvents[0]?.event_id,
    payload: { data: payloadEvents },
  });
}
