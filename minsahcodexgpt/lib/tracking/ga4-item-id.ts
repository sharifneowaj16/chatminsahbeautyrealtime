import {
  buildAnalyticsCatalogContents,
  getAnalyticsItemId,
  type AnalyticsItemSource,
} from '@/lib/tracking/analytics-item-identity';

export type Ga4ItemSource = AnalyticsItemSource;
export const getGa4ItemId = getAnalyticsItemId;
export const buildGa4CatalogContents = buildAnalyticsCatalogContents;
