import 'server-only';

import { InMemoryMetaReadCacheStore } from '../reliability/cache';
import { MetaPlatformAudiencesService } from '../domains/audiences/service';
import type { MetaAudienceHashedBatch, MetaAudienceMemberMode } from '../domains/audiences/types';
import { assertMetaPhase29WriteAllowed, resolveMetaPhase29ReadCutover, resolveMetaPhase29WriteCutover } from './phase29-cutover';
import { executeMetaPhase29Read } from './phase29-read';

const readCache = new InMemoryMetaReadCacheStore();

function services() {
  return { legacy: new MetaPlatformAudiencesService(), platform: new MetaPlatformAudiencesService() };
}

export function getMetaPhase29AudienceCutoverStatus(env: NodeJS.ProcessEnv = process.env) {
  return Object.freeze({
    reads: resolveMetaPhase29ReadCutover('AUDIENCES', env),
    writes: resolveMetaPhase29WriteCutover({ domain: 'AUDIENCES', env }),
  });
}

export async function listAudiencesThroughMetaPlatform(params: Record<string, unknown> = {}) {
  const { legacy, platform } = services();
  const result = await executeMetaPhase29Read({ domain: 'AUDIENCES', cache: readCache, cacheKey: `phase29:audiences:list:${JSON.stringify(params)}`, legacy: () => legacy.list(params), platform: () => platform.list(params) });
  return Object.freeze({ ...result.value, migration: result.migration });
}

export async function getAudienceThroughMetaPlatform(audienceId: string) {
  const { legacy, platform } = services();
  const result = await executeMetaPhase29Read({ domain: 'AUDIENCES', cache: readCache, cacheKey: `phase29:audiences:get:${audienceId}`, legacy: () => legacy.get(audienceId), platform: () => platform.get(audienceId) });
  return Object.freeze({ ...result.value, migration: result.migration });
}

export async function createCustomerFileAudienceThroughMetaPlatform(input: Parameters<MetaPlatformAudiencesService['createCustomerFile']>[0]) {
  assertMetaPhase29WriteAllowed({ domain: 'AUDIENCES', assetId: process.env.META_AD_ACCOUNT_ID?.trim() ?? null });
  return new MetaPlatformAudiencesService().createCustomerFile(input);
}

export async function createLookalikeAudienceThroughMetaPlatform(input: Parameters<MetaPlatformAudiencesService['createLookalike']>[0]) {
  assertMetaPhase29WriteAllowed({ domain: 'AUDIENCES', resourceId: input.originAudienceId, assetId: process.env.META_AD_ACCOUNT_ID?.trim() ?? null });
  return new MetaPlatformAudiencesService().createLookalike(input);
}

export async function createWebsiteAudienceThroughMetaPlatform(input: Parameters<MetaPlatformAudiencesService['createWebsite']>[0]) {
  assertMetaPhase29WriteAllowed({ domain: 'AUDIENCES', assetId: process.env.META_AD_ACCOUNT_ID?.trim() ?? null });
  return new MetaPlatformAudiencesService().createWebsite(input);
}

export async function updateAudienceThroughMetaPlatform(audienceId: string, input: Record<string, unknown>) {
  assertMetaPhase29WriteAllowed({ domain: 'AUDIENCES', resourceId: audienceId, assetId: process.env.META_AD_ACCOUNT_ID?.trim() ?? null });
  return new MetaPlatformAudiencesService().update(audienceId, input);
}

export async function syncHashedAudienceMembersThroughMetaPlatform(input: { readonly audienceId: string; readonly batch: MetaAudienceHashedBatch; readonly mode?: MetaAudienceMemberMode }) {
  assertMetaPhase29WriteAllowed({ domain: 'AUDIENCES', resourceId: input.audienceId, assetId: process.env.META_AD_ACCOUNT_ID?.trim() ?? null });
  return new MetaPlatformAudiencesService().syncHashed(input);
}
