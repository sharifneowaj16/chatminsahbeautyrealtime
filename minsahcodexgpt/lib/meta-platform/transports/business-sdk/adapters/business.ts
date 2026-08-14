import { createMetaBusinessSdkEntityAdapter } from './base';

export const metaBusinessSdkBusinessAdapter = createMetaBusinessSdkEntityAdapter(Object.freeze({
  id: 'business' as const,
  requiredExports: Object.freeze(['Business']),
}));
