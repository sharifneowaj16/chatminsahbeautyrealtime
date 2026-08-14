import 'server-only';

import * as businessSdkNamespace from 'facebook-nodejs-business-sdk';
import { META_BUSINESS_SDK_VERSION } from '../../versioning/registry';
import type { MetaBusinessSdkRuntime, MetaBusinessSdkRuntimeContract } from './types';

export const META_BUSINESS_SDK_EXPECTED_RUNTIME_VERSION = '24.0.0';

export const META_BUSINESS_SDK_REQUIRED_EXPORTS = Object.freeze([
  'FacebookAdsApi',
  'Business',
  'AdAccount',
  'Campaign',
  'AdSet',
  'AdCreative',
  'Ad',
  'CustomAudience',
  'ProductCatalog',
  'ProductFeed',
  'ProductSet',
  'AdsPixel',
  'Page',
  'LeadgenForm',
  'Content',
  'CustomData',
  'EventRequest',
  'ServerEvent',
  'UserData',
] as const);

let validatedRuntime: MetaBusinessSdkRuntime | null = null;
let runtimeContract: MetaBusinessSdkRuntimeContract | null = null;

function isConstructor(value: unknown): value is new (...args: never[]) => unknown {
  return typeof value === 'function';
}

export function validateMetaBusinessSdkRuntime(
  candidate: unknown = businessSdkNamespace,
): MetaBusinessSdkRuntimeContract {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('META_BUSINESS_SDK_NAMESPACE_INVALID');
  }

  const namespace = candidate as Record<string, unknown>;
  const missing = META_BUSINESS_SDK_REQUIRED_EXPORTS.filter((name) => !isConstructor(namespace[name]));
  if (missing.length > 0) {
    throw new Error(`META_BUSINESS_SDK_RUNTIME_EXPORT_MISSING:${missing.join(',')}`);
  }

  const api = namespace.FacebookAdsApi as MetaBusinessSdkRuntime['FacebookAdsApi'];
  const runtimeVersion = typeof api.SDK_VERSION === 'string' ? api.SDK_VERSION.trim() : '';
  if (!runtimeVersion) throw new Error('META_BUSINESS_SDK_RUNTIME_VERSION_MISSING');
  const runtimeLine = /^(\d+)\.(\d+)\.(\d+)$/.exec(runtimeVersion);
  const packageLine = /^(\d+)\.(\d+)\.(\d+)$/.exec(META_BUSINESS_SDK_VERSION);
  if (!runtimeLine || !packageLine || runtimeLine[1] !== packageLine[1] || runtimeLine[2] !== packageLine[2]) {
    throw new Error(`META_BUSINESS_SDK_RUNTIME_VERSION_MISMATCH:${runtimeVersion}:${META_BUSINESS_SDK_VERSION}`);
  }

  return Object.freeze({
    packageVersion: META_BUSINESS_SDK_VERSION,
    runtimeVersion,
    graphVersion: typeof api.VERSION === 'string' && api.VERSION.trim() ? api.VERSION.trim() : null,
    patchMetadataDrift: runtimeVersion !== META_BUSINESS_SDK_VERSION,
    requiredExports: META_BUSINESS_SDK_REQUIRED_EXPORTS,
    availableExports: Object.freeze(Object.keys(namespace).sort()),
  });
}

export function getMetaBusinessSdkRuntime(): MetaBusinessSdkRuntime {
  if (!validatedRuntime) {
    runtimeContract = validateMetaBusinessSdkRuntime();
    validatedRuntime = businessSdkNamespace as unknown as MetaBusinessSdkRuntime;
  }
  return validatedRuntime;
}

export function getMetaBusinessSdkRuntimeContract(): MetaBusinessSdkRuntimeContract {
  if (!runtimeContract) getMetaBusinessSdkRuntime();
  return runtimeContract as MetaBusinessSdkRuntimeContract;
}

export function getMetaBusinessSdkRuntimeVersion(): string {
  return getMetaBusinessSdkRuntimeContract().runtimeVersion;
}
