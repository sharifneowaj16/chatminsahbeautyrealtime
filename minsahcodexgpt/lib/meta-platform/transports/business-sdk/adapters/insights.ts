import { callMetaSdkMethod, createMetaSdkEntity } from '../entity';
import { normalizeMetaBusinessSdkCursor, normalizeMetaBusinessSdkValue, type MetaBusinessSdkCursor } from '../normalization';
import type { MetaBusinessSdkClient } from '../types';
import { createMetaBusinessSdkEntityAdapter } from './base';

export const metaBusinessSdkInsightsAdapter = createMetaBusinessSdkEntityAdapter(Object.freeze({
  id: 'insights' as const,
  requiredExports: Object.freeze(['AdAccount']),
}));

export async function getMetaAdAccountInsights(
  client: MetaBusinessSdkClient,
  adAccountId: string,
  fields: readonly string[],
  params: Record<string, unknown>,
): Promise<MetaBusinessSdkCursor<Record<string, unknown>>> {
  const account = createMetaSdkEntity(client, 'AdAccount', adAccountId);
  const value = await callMetaSdkMethod(account, 'getInsights', [...fields], params);
  return normalizeMetaBusinessSdkCursor<Record<string, unknown>>(value);
}

export async function createMetaAdAccountAsyncInsightsReport(
  client: MetaBusinessSdkClient,
  adAccountId: string,
  fields: readonly string[],
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const account = createMetaSdkEntity(client, 'AdAccount', adAccountId);
  const value = await callMetaSdkMethod(account, 'getInsights', [...fields], { ...params, async: true });
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function getMetaAsyncInsightsReportStatus(
  client: MetaBusinessSdkClient,
  reportRunId: string,
): Promise<Record<string, unknown>> {
  if (!client.api.call) throw new Error('META_BUSINESS_SDK_API_CALL_UNAVAILABLE');
  const value = await client.api.call('GET', [reportRunId], { fields: 'id,async_status,async_percent_completion,date_start,date_stop' });
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function getMetaAsyncInsightsReportResults(
  client: MetaBusinessSdkClient,
  reportRunId: string,
  input: { readonly fields: readonly string[]; readonly limit?: number },
): Promise<MetaBusinessSdkCursor<Record<string, unknown>>> {
  if (!client.api.call) throw new Error('META_BUSINESS_SDK_API_CALL_UNAVAILABLE');
  const value = await client.api.call('GET', [reportRunId, 'insights'], { fields: input.fields.join(','), limit: Math.min(500, Math.max(1, input.limit ?? 100)) });
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const data = Array.isArray(record.data) ? record.data : [];
  const cursorLike = Object.assign(data, { paging: record.paging ?? null, summary: record.summary ?? null });
  return normalizeMetaBusinessSdkCursor<Record<string, unknown>>(cursorLike);
}
