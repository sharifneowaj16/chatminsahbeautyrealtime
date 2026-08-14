import { createMetaBusinessSdkEntityAdapter } from './base';

export const metaBusinessSdkLeadsAdapter = createMetaBusinessSdkEntityAdapter(Object.freeze({
  id: 'leads' as const,
  requiredExports: Object.freeze(['LeadgenForm', 'Page']),
}));
