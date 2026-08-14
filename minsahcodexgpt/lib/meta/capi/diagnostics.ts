import type { MetaWebsiteServerEvent } from './types';

function hasArrayOrString(value: unknown) {
  return typeof value === 'string' ? value.length > 0 : Array.isArray(value) && value.length > 0;
}

export function buildMetaSafeEventDiagnostics(event: MetaWebsiteServerEvent, orderId?: string | null) {
  const customData = event.custom_data ?? {};
  return {
    event_name: event.event_name,
    event_id: event.event_id,
    order_id: orderId ?? undefined,
    event_time: event.event_time,
    action_source: event.action_source,
    event_source_origin: new URL(event.event_source_url).origin,
    value: typeof customData.value === 'number' ? customData.value : undefined,
    currency: typeof customData.currency === 'string' ? customData.currency : undefined,
    custom_data_keys: Object.keys(customData).sort(),
    content_id_count: Array.isArray(customData.content_ids) ? customData.content_ids.length : 0,
    contents_count: Array.isArray(customData.contents) ? customData.contents.length : 0,
    has_fbp: Boolean(event.user_data.fbp),
    has_fbc: Boolean(event.user_data.fbc),
    has_external_id: hasArrayOrString(event.user_data.external_id),
    has_email_hash: hasArrayOrString(event.user_data.em),
    has_phone_hash: hasArrayOrString(event.user_data.ph),
    has_ip: Boolean(event.user_data.client_ip_address),
    has_ua: Boolean(event.user_data.client_user_agent),
  };
}
