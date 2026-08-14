import 'server-only';

import { DEFAULT_META_GRAPH_API_VERSION } from '../../versioning/registry';

function clean(value?: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function positiveInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export function getMetaPlatformCapiConfig(env: NodeJS.ProcessEnv = process.env) {
  return Object.freeze({
    connectionKey: clean(env.META_CONNECTION_NAME) ?? 'primary',
    pixelId: clean(env.META_PIXEL_ID) ?? clean(env.NEXT_PUBLIC_META_PIXEL_ID) ?? clean(env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID) ?? clean(env.NEXT_PUBLIC_FB_PIXEL_ID),
    datasetId: clean(env.META_DATASET_ID) ?? clean(env.META_PIXEL_ID) ?? clean(env.NEXT_PUBLIC_META_PIXEL_ID) ?? clean(env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID) ?? clean(env.NEXT_PUBLIC_FB_PIXEL_ID),
    graphApiVersion: clean(env.META_GRAPH_API_VERSION) ?? DEFAULT_META_GRAPH_API_VERSION,
    timeoutMs: positiveInt(env.META_CAPI_TIMEOUT_MS, 15_000, 1_000, 120_000),
    partnerAgent: clean(env.META_CAPI_PARTNER_AGENT) ?? 'minsahbeauty-meta-platform',
  });
}

export type MetaPlatformCapiConfig = ReturnType<typeof getMetaPlatformCapiConfig>;
