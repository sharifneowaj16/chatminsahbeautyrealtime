import 'server-only';

import { InMemoryMetaReadCacheStore } from '../reliability/cache';
import { MetaPlatformAdsService } from '../domains/ads/service';
import { MetaPlatformInsightsService } from '../domains/insights/service';
import type { MetaPlatformInsightInput } from '../domains/insights/types';
import { assertMetaPhase29WriteAllowed, resolveMetaPhase29ReadCutover, resolveMetaPhase29WriteCutover } from './phase29-cutover';
import { executeMetaPhase29Read } from './phase29-read';

const readCache = new InMemoryMetaReadCacheStore();

function services() {
  return { legacy: new MetaPlatformAdsService(), platform: new MetaPlatformAdsService() };
}
function insightServices() {
  return { legacy: new MetaPlatformInsightsService(), platform: new MetaPlatformInsightsService() };
}
function withCursorMigration<T extends { readonly data: readonly unknown[] }, M>(value: T, migration: M): Readonly<T & { readonly migration: M }> {
  return Object.freeze({ ...value, migration });
}
function withRecordMigration<T extends Record<string, unknown>, M>(value: T, migration: M): Readonly<T & { readonly migration: M }> {
  return Object.freeze({ ...value, migration });
}

export function getMetaPhase29AdsCutoverStatus(env: NodeJS.ProcessEnv = process.env) {
  return Object.freeze({
    reads: resolveMetaPhase29ReadCutover('ADS', env),
    writes: resolveMetaPhase29WriteCutover({ domain: 'ADS', env }),
  });
}

export async function getAdAccountThroughMetaPlatform() {
  const { legacy, platform } = services();
  const result = await executeMetaPhase29Read({ domain: 'ADS', cache: readCache, cacheKey: 'phase29:ads:account', legacy: () => legacy.getAccount(), platform: () => platform.getAccount() });
  return withRecordMigration(result.value, result.migration);
}

export async function listAdsEntitiesThroughMetaPlatform(entityType: 'CAMPAIGN' | 'ADSET' | 'CREATIVE' | 'AD', params: Record<string, unknown> = {}) {
  const { legacy, platform } = services();
  const cacheKey = `phase29:ads:list:${entityType}:${JSON.stringify(params)}`;
  const result = await executeMetaPhase29Read({ domain: 'ADS', cache: readCache, cacheKey, legacy: () => legacy.list(entityType, params), platform: () => platform.list(entityType, params) });
  return withCursorMigration(result.value, result.migration);
}

export async function getAdsEntityThroughMetaPlatform(entityType: 'CAMPAIGN' | 'ADSET' | 'CREATIVE' | 'AD', id: string) {
  const { legacy, platform } = services();
  const result = await executeMetaPhase29Read({ domain: 'ADS', cache: readCache, cacheKey: `phase29:ads:get:${entityType}:${id}`, legacy: () => legacy.get(entityType, id), platform: () => platform.get(entityType, id) });
  return withRecordMigration(result.value, result.migration);
}

export async function createAdsEntityThroughMetaPlatform(entityType: 'CAMPAIGN' | 'ADSET' | 'CREATIVE' | 'AD', input: Record<string, unknown>) {
  const service = new MetaPlatformAdsService();
  const assetId = process.env.META_AD_ACCOUNT_ID?.trim() ?? null;
  assertMetaPhase29WriteAllowed({ domain: 'ADS', assetId });
  return service.create(entityType, input);
}

export async function updateAdsEntityThroughMetaPlatform(entityType: 'CAMPAIGN' | 'ADSET' | 'CREATIVE' | 'AD', id: string, input: Record<string, unknown>) {
  const service = new MetaPlatformAdsService();
  assertMetaPhase29WriteAllowed({ domain: 'ADS', resourceId: id, assetId: process.env.META_AD_ACCOUNT_ID?.trim() ?? null });
  return service.update(entityType, id, input);
}

export async function getInsightsThroughMetaPlatform(input: MetaPlatformInsightInput) {
  const { legacy, platform } = insightServices();
  const cacheKey = `phase29:insights:${JSON.stringify(input)}`;
  const result = await executeMetaPhase29Read({ domain: 'ADS', cache: readCache, cacheKey, legacy: () => legacy.get(input), platform: () => platform.get(input) });
  return withCursorMigration(result.value, result.migration);
}

export async function startAsyncInsightsReportThroughMetaPlatform(input: MetaPlatformInsightInput) {
  assertMetaPhase29WriteAllowed({ domain: 'ADS', assetId: process.env.META_AD_ACCOUNT_ID?.trim() ?? null });
  return new MetaPlatformInsightsService().startAsyncReport(input);
}

export async function getAsyncInsightsReportStatusThroughMetaPlatform(reportRunId: string) {
  return new MetaPlatformInsightsService().getAsyncReportStatus(reportRunId);
}

export async function getAsyncInsightsReportResultsThroughMetaPlatform(reportRunId: string, limit = 100) {
  const service = new MetaPlatformInsightsService();
  const cutover = resolveMetaPhase29ReadCutover('ADS');
  const result = await executeMetaPhase29Read({ domain: 'ADS', cache: readCache, cacheKey: `phase29:insights:async:${reportRunId}:${limit}`, legacy: () => service.getAsyncReportResults(reportRunId, limit), platform: () => service.getAsyncReportResults(reportRunId, limit) });
  return withCursorMigration(result.value, { ...result.migration, configuredMode: cutover.mode });
}
