import { createMetaBusinessSdkEntityAdapter } from './base';

export const metaBusinessSdkPagesAdapter = createMetaBusinessSdkEntityAdapter(Object.freeze({
  id: 'pages' as const,
  requiredExports: Object.freeze(['Page']),
}));
