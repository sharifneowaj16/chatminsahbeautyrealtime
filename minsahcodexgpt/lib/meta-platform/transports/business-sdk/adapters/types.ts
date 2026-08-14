import type { MetaBusinessSdkClient, MetaSdkEntity } from '../types';

export interface MetaBusinessSdkAdapterDescriptor {
  readonly id: 'business' | 'ads' | 'insights' | 'audiences' | 'catalog' | 'pixels' | 'capi' | 'pages' | 'leads';
  readonly requiredExports: readonly string[];
}

export interface MetaBusinessSdkEntityAdapter {
  readonly descriptor: MetaBusinessSdkAdapterDescriptor;
  create(client: MetaBusinessSdkClient, entityType: string, id: string): MetaSdkEntity;
  invoke(entity: MetaSdkEntity, method: string, ...args: unknown[]): Promise<unknown>;
}
