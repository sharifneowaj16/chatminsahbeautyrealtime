import { createMetaBusinessSdkEntityAdapter } from './base';

export const metaBusinessSdkPixelsAdapter = createMetaBusinessSdkEntityAdapter(Object.freeze({
  id: 'pixels' as const,
  requiredExports: Object.freeze(['AdsPixel']),
}));
