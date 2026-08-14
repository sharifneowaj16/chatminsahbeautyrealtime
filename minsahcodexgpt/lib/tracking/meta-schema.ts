import 'server-only';

import {
  DEFAULT_META_GRAPH_API_VERSION,
  normalizeMetaGraphApiVersion,
} from '@/lib/meta-platform/versioning/registry';

export const TRACKING_SCHEMA_VERSION = 'mb_tracking_v1';
export { DEFAULT_META_GRAPH_API_VERSION, normalizeMetaGraphApiVersion };

export const META_GRAPH_API_VERSION = normalizeMetaGraphApiVersion(process.env.META_GRAPH_API_VERSION);
export const META_CAPI_TIMEOUT_MS = Number(process.env.META_CAPI_TIMEOUT_MS ?? 10_000) || 10_000;

export function getMetaPixelId() {
  return (
    process.env.META_PIXEL_ID ??
    process.env.NEXT_PUBLIC_META_PIXEL_ID ??
    process.env.NEXT_PUBLIC_FB_PIXEL_ID ??
    process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID
  );
}

export function getMetaCapiAccessToken() {
  return process.env.META_CAPI_ACCESS_TOKEN ?? process.env.FACEBOOK_CONVERSION_API_TOKEN;
}

export function getMetaTestEventCode() {
  if (process.env.NODE_ENV === 'production') return undefined;
  return process.env.META_TEST_EVENT_CODE ?? process.env.FACEBOOK_TEST_EVENT_CODE;
}

export function withMetaSchemaVersion<T extends Record<string, unknown>>(customData: T): T & {
  schema_version: typeof TRACKING_SCHEMA_VERSION;
} {
  return {
    ...customData,
    schema_version: TRACKING_SCHEMA_VERSION,
  };
}

export function withMetaSafePayloadSchema<T extends Record<string, unknown>>(safePayload: T): T & {
  schema_version: typeof TRACKING_SCHEMA_VERSION;
  graph_api_version: string;
} {
  return {
    ...safePayload,
    schema_version: TRACKING_SCHEMA_VERSION,
    graph_api_version: META_GRAPH_API_VERSION,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function withMetaCapiPayloadSchemaVersion<T extends Record<string, unknown>>(payload: T): T {
  const data = Array.isArray(payload.data)
    ? payload.data.map((event) => {
        if (!isRecord(event)) return event;
        const existingCustomData = isRecord(event.custom_data) ? event.custom_data : {};
        return {
          ...event,
          custom_data: withMetaSchemaVersion(existingCustomData),
        };
      })
    : payload.data;

  return {
    ...payload,
    data,
  } as T;
}
