import 'server-only';
import {
  listProviderProductSetsThroughMetaPlatform,
  upsertProviderProductSetThroughMetaPlatform,
} from '@/lib/meta-platform/migration/phase30-catalog-facade';

export const listProviderProductSets = listProviderProductSetsThroughMetaPlatform;
export const upsertProviderProductSet = upsertProviderProductSetThroughMetaPlatform;
