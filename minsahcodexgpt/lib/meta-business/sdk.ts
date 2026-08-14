/* eslint-disable @typescript-eslint/no-explicit-any -- legacy compatibility facade over the unified transport. */
import 'server-only';

import { getMetaBusinessConfig, requireMetaConfig } from '@/lib/meta-business/config';
import {
  MetaBusinessApiError,
  cleanObject,
  configureMetaSdkAppSecretProof,
  createLegacyMetaApi,
  exportMetaCursor,
  exportMetaValue,
  metaSdk,
  runMetaRequest,
  toMetaMinorAmount,
} from '@/lib/meta-platform/transports/business-sdk/compatibility';

export {
  MetaBusinessApiError,
  cleanObject,
  configureMetaSdkAppSecretProof,
  exportMetaCursor,
  exportMetaValue,
  metaSdk,
  runMetaRequest,
  toMetaMinorAmount,
};

/** @deprecated Migrate callers to MetaBusinessSdkClientFactory with an explicit credential role. */
export function getMetaApi(accessToken?: string) {
  const config = getMetaBusinessConfig();
  const token = accessToken ?? requireMetaConfig('accessToken').accessToken;
  return createLegacyMetaApi({
    accessToken: token,
    appSecret: config.appSecret,
  }) as any;
}
