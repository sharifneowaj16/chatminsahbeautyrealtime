import 'server-only';

import { META_GRAPH_API_VERSION } from '@/lib/tracking/meta-schema';

function clean(value?: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeAdAccountId(value?: string) {
  if (!value) return undefined;
  return value.startsWith('act_') ? value : `act_${value}`;
}

export type MetaBusinessConfig = {
  appId?: string;
  accessToken?: string;
  pageAccessToken?: string;
  appSecret?: string;
  webhookVerifyToken?: string;
  businessId?: string;
  adAccountId?: string;
  pageId?: string;
  instagramActorId?: string;
  pixelId?: string;
  datasetId?: string;
  catalogId?: string;
  catalogFeedToken?: string;
  siteUrl?: string;
  graphApiVersion: string;
};

export function getMetaBusinessConfig(): MetaBusinessConfig {
  return {
    appId: clean(process.env.META_APP_ID) ?? clean(process.env.FACEBOOK_CLIENT_ID),
    accessToken: clean(process.env.META_BUSINESS_ACCESS_TOKEN) ?? clean(process.env.META_CAPI_ACCESS_TOKEN),
    pageAccessToken:
      clean(process.env.META_PAGE_ACCESS_TOKEN) ??
      clean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN) ??
      clean(process.env.META_BUSINESS_ACCESS_TOKEN) ??
      clean(process.env.META_CAPI_ACCESS_TOKEN),
    appSecret: clean(process.env.META_APP_SECRET) ?? clean(process.env.FACEBOOK_CLIENT_SECRET),
    webhookVerifyToken: clean(process.env.META_WEBHOOK_VERIFY_TOKEN),
    businessId: clean(process.env.META_BUSINESS_ID),
    adAccountId: normalizeAdAccountId(clean(process.env.META_AD_ACCOUNT_ID)),
    pageId: clean(process.env.META_PAGE_ID) ?? clean(process.env.FACEBOOK_PAGE_ID),
    instagramActorId: clean(process.env.META_INSTAGRAM_ACTOR_ID),
    pixelId:
      clean(process.env.META_PIXEL_ID) ??
      clean(process.env.NEXT_PUBLIC_META_PIXEL_ID) ??
      clean(process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID),
    datasetId: clean(process.env.META_DATASET_ID),
    catalogId: clean(process.env.META_CATALOG_ID),
    catalogFeedToken: clean(process.env.META_CATALOG_FEED_TOKEN),
    siteUrl:
      clean(process.env.NEXT_PUBLIC_SITE_URL) ??
      clean(process.env.SITE_URL) ??
      clean(process.env.NEXTAUTH_URL),
    graphApiVersion: META_GRAPH_API_VERSION,
  };
}

export type MetaConfigKey = Exclude<keyof MetaBusinessConfig, 'graphApiVersion'>;

export function requireMetaConfig(...keys: MetaConfigKey[]) {
  const config = getMetaBusinessConfig();
  const missing = keys.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing Meta configuration: ${missing.join(', ')}`);
  }
  return config as MetaBusinessConfig & Record<(typeof keys)[number], string>;
}

export function getMetaReadiness() {
  const config = getMetaBusinessConfig();
  return {
    graphApiVersion: config.graphApiVersion,
    businessSdkVersion: '24.0.1',
    appIdConfigured: Boolean(config.appId),
    accessTokenConfigured: Boolean(config.accessToken),
    pageAccessTokenConfigured: Boolean(config.pageAccessToken),
    appSecretConfigured: Boolean(config.appSecret),
    webhookVerifyTokenConfigured: Boolean(config.webhookVerifyToken),
    businessId: config.businessId ?? null,
    adAccountId: config.adAccountId ?? null,
    pageId: config.pageId ?? null,
    instagramActorId: config.instagramActorId ?? null,
    pixelId: config.pixelId ?? null,
    datasetId: config.datasetId ?? null,
    catalogId: config.catalogId ?? null,
    catalogFeedConfigured: Boolean(config.catalogFeedToken && config.siteUrl),
  };
}
