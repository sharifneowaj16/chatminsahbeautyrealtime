import { callMetaSdkMethod, createMetaSdkEntity } from '../entity';
import { normalizeMetaBusinessSdkCursor, normalizeMetaBusinessSdkValue, type MetaBusinessSdkCursor } from '../normalization';
import type { MetaBusinessSdkClient } from '../types';
import { createMetaBusinessSdkEntityAdapter } from './base';

export const metaBusinessSdkAdsAdapter = createMetaBusinessSdkEntityAdapter(Object.freeze({
  id: 'ads' as const,
  requiredExports: Object.freeze(['AdAccount', 'Campaign', 'AdSet', 'AdCreative', 'Ad']),
}));

export type MetaAdsSdkEntity = 'Campaign' | 'AdSet' | 'AdCreative' | 'Ad';
export type MetaAdsSdkAccountCollection = 'getCampaigns' | 'getAdSets' | 'getAdCreatives' | 'getAds';
export type MetaAdsSdkAccountCreate = 'createCampaign' | 'createAdSet' | 'createAdCreative' | 'createAd';

function account(client: MetaBusinessSdkClient, adAccountId: string) {
  return createMetaSdkEntity(client, 'AdAccount', adAccountId);
}

export async function getMetaAdAccount(
  client: MetaBusinessSdkClient,
  adAccountId: string,
  fields: readonly string[],
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(account(client, adAccountId), 'get', [...fields], {});
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function listMetaAdAccountEntities(
  client: MetaBusinessSdkClient,
  input: {
    readonly adAccountId: string;
    readonly method: MetaAdsSdkAccountCollection;
    readonly fields: readonly string[];
    readonly params?: Record<string, unknown>;
  },
): Promise<MetaBusinessSdkCursor<Record<string, unknown>>> {
  const value = await callMetaSdkMethod(account(client, input.adAccountId), input.method, [...input.fields], input.params ?? {});
  return normalizeMetaBusinessSdkCursor<Record<string, unknown>>(value);
}

export async function getMetaAdsEntity(
  client: MetaBusinessSdkClient,
  input: { readonly exportName: MetaAdsSdkEntity; readonly id: string; readonly fields: readonly string[] },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(createMetaSdkEntity(client, input.exportName, input.id), 'get', [...input.fields], {});
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function createMetaAdAccountEntity(
  client: MetaBusinessSdkClient,
  input: {
    readonly adAccountId: string;
    readonly method: MetaAdsSdkAccountCreate;
    readonly fields: readonly string[];
    readonly params: Record<string, unknown>;
  },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(account(client, input.adAccountId), input.method, [...input.fields], input.params);
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function updateMetaAdsEntity(
  client: MetaBusinessSdkClient,
  input: {
    readonly exportName: MetaAdsSdkEntity;
    readonly id: string;
    readonly fields: readonly string[];
    readonly params: Record<string, unknown>;
  },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(createMetaSdkEntity(client, input.exportName, input.id), 'update', [...input.fields], input.params);
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}
