export { metaBusinessSdkBusinessAdapter } from './business';
export { metaBusinessSdkAdsAdapter } from './ads';
export { getMetaAdAccountInsights, metaBusinessSdkInsightsAdapter } from './insights';
export { metaBusinessSdkAudiencesAdapter } from './audiences';
export { metaBusinessSdkCatalogAdapter } from './catalog';
export { metaBusinessSdkPixelsAdapter } from './pixels';
export { createMetaCapiEventRequest, metaBusinessSdkCapiAdapter } from './capi';
export { metaBusinessSdkPagesAdapter } from './pages';
export { metaBusinessSdkLeadsAdapter } from './leads';
export { createMetaBusinessSdkEntityAdapter } from './base';
export type { MetaBusinessSdkAdapterDescriptor, MetaBusinessSdkEntityAdapter } from './types';

import { metaBusinessSdkBusinessAdapter } from './business';
import { metaBusinessSdkAdsAdapter } from './ads';
import { metaBusinessSdkInsightsAdapter } from './insights';
import { metaBusinessSdkAudiencesAdapter } from './audiences';
import { metaBusinessSdkCatalogAdapter } from './catalog';
import { metaBusinessSdkPixelsAdapter } from './pixels';
import { metaBusinessSdkCapiAdapter } from './capi';
import { metaBusinessSdkPagesAdapter } from './pages';
import { metaBusinessSdkLeadsAdapter } from './leads';

export const META_BUSINESS_SDK_ADAPTERS = Object.freeze([
  metaBusinessSdkBusinessAdapter,
  metaBusinessSdkAdsAdapter,
  metaBusinessSdkInsightsAdapter,
  metaBusinessSdkAudiencesAdapter,
  metaBusinessSdkCatalogAdapter,
  metaBusinessSdkPixelsAdapter,
  metaBusinessSdkCapiAdapter,
  metaBusinessSdkPagesAdapter,
  metaBusinessSdkLeadsAdapter,
]);
