/* eslint-disable @typescript-eslint/no-explicit-any -- compatibility boundary for generated Meta SDK entities. */
import 'server-only';

import { getMetaBusinessSdkRuntime } from './runtime';
import {
  normalizeMetaBusinessSdkCursor,
  normalizeMetaBusinessSdkError,
  normalizeMetaBusinessSdkValue,
} from './normalization';

export const metaSdk = new Proxy<Record<string, any>>(Object.create(null), {
  get(_target, property) {
    return (getMetaBusinessSdkRuntime() as unknown as Record<PropertyKey, any>)[property];
  },
  has(_target, property) {
    return property in (getMetaBusinessSdkRuntime() as unknown as Record<PropertyKey, any>);
  },
  ownKeys() {
    return Reflect.ownKeys(getMetaBusinessSdkRuntime());
  },
  getOwnPropertyDescriptor(_target, property) {
    const runtime = getMetaBusinessSdkRuntime() as unknown as Record<PropertyKey, any>;
    if (!(property in runtime)) return undefined;
    return { configurable: true, enumerable: true, value: runtime[property], writable: false };
  },
});

export class MetaBusinessApiError extends Error {
  status?: number;
  code?: string | number;
  subcode?: string | number;
  traceId?: string;
  raw?: unknown;

  constructor(message: string, details: Partial<MetaBusinessApiError> = {}) {
    super(message);
    this.name = 'MetaBusinessApiError';
    Object.assign(this, details);
  }
}

export function configureMetaSdkAppSecretProof(api: any, appSecret?: string) {
  if (!appSecret?.trim()) return { enabled: false as const, reason: 'APP_SECRET_NOT_CONFIGURED' };
  if (typeof api?.setAppSecret === 'function') {
    api.setAppSecret(appSecret);
    return { enabled: true as const, method: 'setAppSecret' };
  }
  return { enabled: false as const, reason: 'SDK_APP_SECRET_METHOD_UNAVAILABLE' };
}

export function createLegacyMetaApi(input: {
  readonly accessToken: string;
  readonly appSecret?: string;
  readonly locale?: string;
  readonly debug?: boolean;
}) {
  const api = new metaSdk.FacebookAdsApi(
    input.accessToken,
    input.locale ?? 'en_US',
    false,
  ) as any;
  if (input.debug === true && typeof api.setDebug === 'function') api.setDebug(true);
  configureMetaSdkAppSecretProof(api, input.appSecret);
  return api;
}

export function exportMetaValue(value: unknown): unknown {
  return normalizeMetaBusinessSdkValue(value);
}

export function exportMetaCursor(value: unknown) {
  return normalizeMetaBusinessSdkCursor(value);
}

export async function runMetaRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const normalized = normalizeMetaBusinessSdkError(error, { operation: 'legacy-sdk-request' });
    const safe = normalized.safeDetails ?? {};
    throw new MetaBusinessApiError(normalized.message, {
      status: typeof safe.status === 'number' ? safe.status : undefined,
      code: safe.providerCode as string | number | undefined,
      subcode: safe.providerSubcode as string | number | undefined,
      traceId: typeof safe.traceId === 'string' ? safe.traceId : undefined,
      raw: error,
    });
  }
}

export function toMetaMinorAmount(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Budget/bid amount must be a non-negative number');
  }
  return Math.round(value * 100);
}

export function cleanObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as T;
}
