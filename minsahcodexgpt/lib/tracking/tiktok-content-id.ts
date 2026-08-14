import {
  getAnalyticsItemId,
  getAnalyticsVariantId,
  type AnalyticsItemSource,
} from '@/lib/tracking/analytics-item-identity';

export type TikTokCatalogItemSource = AnalyticsItemSource;
export type TikTokContentType = 'product' | 'product_group';

export const getTikTokContentId = getAnalyticsItemId;

export function buildTikTokContentIds(items: TikTokCatalogItemSource[]) {
  return Array.from(new Set(items.map(getTikTokContentId).filter(Boolean)));
}

/** Preserves the existing TikTok behavior; Meta no longer controls this choice. */
export function getTikTokContentType(items: TikTokCatalogItemSource[]): TikTokContentType {
  return items.some((item) => Boolean(getAnalyticsVariantId(item))) ? 'product_group' : 'product';
}
