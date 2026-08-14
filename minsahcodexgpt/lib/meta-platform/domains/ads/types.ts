import type { MetaBusinessSdkCursor } from '../../transports/business-sdk/normalization';

export type MetaPlatformAdsEntityType = 'CAMPAIGN' | 'ADSET' | 'CREATIVE' | 'AD';
export type MetaPlatformAdsRecord = Readonly<Record<string, unknown>>;
export type MetaPlatformAdsCursor = MetaBusinessSdkCursor<MetaPlatformAdsRecord>;

export interface MetaPlatformAdsConfig {
  readonly connectionKey: string;
  readonly graphApiVersion: string;
  readonly adAccountId: string;
  readonly pageId?: string;
  readonly instagramActorId?: string;
  readonly pixelId?: string;
}
