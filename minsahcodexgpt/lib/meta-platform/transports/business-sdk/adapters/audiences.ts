import { callMetaSdkMethod, createMetaSdkEntity } from '../entity';
import { normalizeMetaBusinessSdkCursor, normalizeMetaBusinessSdkValue, type MetaBusinessSdkCursor } from '../normalization';
import type { MetaBusinessSdkClient } from '../types';
import { createMetaBusinessSdkEntityAdapter } from './base';

export const metaBusinessSdkAudiencesAdapter = createMetaBusinessSdkEntityAdapter(Object.freeze({
  id: 'audiences' as const,
  requiredExports: Object.freeze(['AdAccount', 'CustomAudience']),
}));

function account(client: MetaBusinessSdkClient, adAccountId: string) {
  return createMetaSdkEntity(client, 'AdAccount', adAccountId);
}

export async function listMetaCustomAudiences(
  client: MetaBusinessSdkClient,
  input: { readonly adAccountId: string; readonly fields: readonly string[]; readonly params?: Record<string, unknown> },
): Promise<MetaBusinessSdkCursor<Record<string, unknown>>> {
  const value = await callMetaSdkMethod(account(client, input.adAccountId), 'getCustomAudiences', [...input.fields], input.params ?? {});
  return normalizeMetaBusinessSdkCursor<Record<string, unknown>>(value);
}

export async function getMetaCustomAudience(
  client: MetaBusinessSdkClient,
  input: { readonly audienceId: string; readonly fields: readonly string[] },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(createMetaSdkEntity(client, 'CustomAudience', input.audienceId), 'get', [...input.fields], {});
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function createMetaCustomAudience(
  client: MetaBusinessSdkClient,
  input: { readonly adAccountId: string; readonly fields: readonly string[]; readonly params: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(account(client, input.adAccountId), 'createCustomAudience', [...input.fields], input.params);
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function updateMetaCustomAudience(
  client: MetaBusinessSdkClient,
  input: { readonly audienceId: string; readonly fields: readonly string[]; readonly params: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(createMetaSdkEntity(client, 'CustomAudience', input.audienceId), 'update', [...input.fields], input.params);
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function mutateMetaCustomAudienceUsers(
  client: MetaBusinessSdkClient,
  input: {
    readonly audienceId: string;
    readonly mode: 'add' | 'remove' | 'replace';
    readonly payload: { readonly schema: readonly string[]; readonly data: readonly (readonly (string | number)[])[] };
    readonly session: Record<string, unknown>;
  },
): Promise<Record<string, unknown>> {
  const audience = createMetaSdkEntity(client, 'CustomAudience', input.audienceId);
  const value = input.mode === 'remove'
    ? await callMetaSdkMethod(audience, 'deleteUsers', { payload: input.payload })
    : input.mode === 'replace'
      ? await callMetaSdkMethod(audience, 'createUsersReplace', [], { payload: input.payload, session: input.session })
      : await callMetaSdkMethod(audience, 'createUser', [], { payload: input.payload, session: input.session });
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}
