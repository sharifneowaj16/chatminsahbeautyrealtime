import 'server-only';

import { DEFAULT_META_GRAPH_API_VERSION } from '../../versioning/registry';

const DEFAULT_REQUIRED_PERMISSIONS = [
  'ads_management', 'ads_read', 'business_management', 'catalog_management',
  'pages_manage_metadata', 'pages_read_engagement', 'leads_retrieval',
  'instagram_basic', 'instagram_manage_messages',
] as const;

function clean(value?: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function first(...values: Array<string | undefined>) {
  return values.find(Boolean);
}

export function getMetaPlatformConnectionConfig(env: NodeJS.ProcessEnv = process.env) {
  const configuredPermissions = clean(env.META_REQUIRED_PERMISSIONS);
  const requiredPermissions = configuredPermissions
    ? [...new Set(configuredPermissions.split(',').map((item) => item.trim()).filter(Boolean))].sort()
    : [...DEFAULT_REQUIRED_PERMISSIONS];
  return Object.freeze({
    connectionName: clean(env.META_CONNECTION_NAME) ?? 'primary',
    appId: first(clean(env.META_APP_ID), clean(env.FACEBOOK_CLIENT_ID)),
    businessId: clean(env.META_BUSINESS_ID),
    catalogId: clean(env.META_CATALOG_ID),
    datasetId: first(clean(env.META_DATASET_ID), clean(env.META_PIXEL_ID), clean(env.NEXT_PUBLIC_META_PIXEL_ID), clean(env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID), clean(env.NEXT_PUBLIC_FB_PIXEL_ID)),
    pixelId: first(clean(env.META_PIXEL_ID), clean(env.NEXT_PUBLIC_META_PIXEL_ID), clean(env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID), clean(env.NEXT_PUBLIC_FB_PIXEL_ID)),
    adAccountId: clean(env.META_AD_ACCOUNT_ID),
    pageId: clean(env.META_PAGE_ID),
    instagramAccountId: first(clean(env.META_INSTAGRAM_ACCOUNT_ID), clean(env.META_INSTAGRAM_ACTOR_ID)),
    graphApiVersion: clean(env.META_GRAPH_API_VERSION) ?? DEFAULT_META_GRAPH_API_VERSION,
    requiredPermissions: Object.freeze(requiredPermissions),
  });
}

export type MetaPlatformConnectionConfig = ReturnType<typeof getMetaPlatformConnectionConfig>;
