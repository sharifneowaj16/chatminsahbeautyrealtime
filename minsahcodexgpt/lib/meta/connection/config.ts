import 'server-only';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';

const DEFAULT_REQUIRED_PERMISSIONS = [
  'ads_management',
  'ads_read',
  'business_management',
  'catalog_management',
  'pages_manage_metadata',
  'pages_read_engagement',
  'leads_retrieval',
  'instagram_basic',
  'instagram_manage_messages',
] as const;

function clean(value?: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function getRequiredMetaPermissions() {
  const configured = clean(process.env.META_REQUIRED_PERMISSIONS);
  if (!configured) return [...DEFAULT_REQUIRED_PERMISSIONS];
  return [...new Set(configured.split(',').map((item) => item.trim()).filter(Boolean))].sort();
}

export function getMetaConnectionBootstrap() {
  const base = getMetaBusinessConfig();
  return {
    connectionName: clean(process.env.META_CONNECTION_NAME) ?? 'primary',
    appId: clean(process.env.META_APP_ID) ?? clean(process.env.FACEBOOK_CLIENT_ID),
    accessToken: base.accessToken,
    pageAccessToken: base.pageAccessToken,
    appSecret: base.appSecret,
    businessId: base.businessId,
    catalogId: base.catalogId,
    datasetId: base.datasetId,
    pixelId: base.pixelId,
    adAccountId: base.adAccountId,
    pageId: base.pageId,
    instagramAccountId: base.instagramActorId,
    graphApiVersion: base.graphApiVersion,
    tokenRef: clean(process.env.META_ACCESS_TOKEN_SECRET_REF) ?? (base.accessToken ? 'env:META_BUSINESS_ACCESS_TOKEN' : undefined),
    requiredPermissions: getRequiredMetaPermissions(),
  };
}

export type MetaConnectionBootstrap = ReturnType<typeof getMetaConnectionBootstrap>;
