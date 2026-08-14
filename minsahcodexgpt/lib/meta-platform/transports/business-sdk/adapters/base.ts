import { callMetaSdkMethod, createMetaSdkEntity } from '../entity';
import type { MetaBusinessSdkClient, MetaSdkEntity } from '../types';
import type { MetaBusinessSdkAdapterDescriptor, MetaBusinessSdkEntityAdapter } from './types';

export function createMetaBusinessSdkEntityAdapter(
  descriptor: MetaBusinessSdkAdapterDescriptor,
): MetaBusinessSdkEntityAdapter {
  const allowed = new Set(descriptor.requiredExports);
  return Object.freeze({
    descriptor,
    create(client: MetaBusinessSdkClient, entityType: string, id: string): MetaSdkEntity {
      if (!allowed.has(entityType)) {
        throw new Error(`META_BUSINESS_SDK_ADAPTER_ENTITY_NOT_ALLOWED:${descriptor.id}:${entityType}`);
      }
      return createMetaSdkEntity(client, entityType, id);
    },
    invoke(entity: MetaSdkEntity, method: string, ...args: unknown[]): Promise<unknown> {
      return callMetaSdkMethod(entity, method, ...args);
    },
  });
}
