import type { MetaBusinessSdkClient, MetaSdkEntity } from './types';

export function createMetaSdkEntity(
  client: MetaBusinessSdkClient,
  exportName: string,
  id: string,
): MetaSdkEntity {
  const Constructor = client.runtime[exportName];
  if (typeof Constructor !== 'function') {
    throw new Error(`META_BUSINESS_SDK_ENTITY_EXPORT_MISSING:${exportName}`);
  }
  if (!id.trim()) throw new TypeError('META_BUSINESS_SDK_ENTITY_ID_REQUIRED');
  return new (Constructor as new (
    id: string,
    data?: Record<string, unknown>,
    parentId?: string,
    api?: MetaBusinessSdkClient['api'],
  ) => MetaSdkEntity)(id.trim(), {}, undefined, client.api);
}

export async function callMetaSdkMethod(
  entity: MetaSdkEntity,
  method: string,
  ...args: unknown[]
): Promise<unknown> {
  const candidate = entity[method];
  if (typeof candidate !== 'function') {
    throw new Error(`META_BUSINESS_SDK_METHOD_UNAVAILABLE:${method}`);
  }
  return (candidate as (...methodArgs: unknown[]) => Promise<unknown>).apply(entity, args);
}
