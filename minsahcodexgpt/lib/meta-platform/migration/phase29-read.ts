import { executeMetaReadWithStaleFallback, type MetaReadCacheStore } from '../reliability/cache';
import { compareMetaAdsCanonical } from '../domains/ads/normalization';
import type { MetaPhase29Domain } from './phase29-cutover';
import { resolveMetaPhase29ReadCutover } from './phase29-cutover';

export async function executeMetaPhase29Read<T>(input: {
  readonly domain: MetaPhase29Domain;
  readonly cache: MetaReadCacheStore;
  readonly cacheKey: string;
  readonly legacy: () => Promise<T>;
  readonly platform: () => Promise<T>;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly now?: Date;
}) {
  const cutover = resolveMetaPhase29ReadCutover(input.domain, input.env);
  const loaded = await executeMetaReadWithStaleFallback({
    key: input.cacheKey,
    cache: input.cache,
    freshTtlMs: cutover.freshTtlMs,
    staleTtlMs: cutover.staleTtlMs,
    now: input.now,
    acceptFresh: (cached) => cached.mode === cutover.mode,
    load: async () => {
      if (cutover.mode === 'PLATFORM') return { value: await input.platform(), differences: [] as readonly string[], mode: cutover.mode };
      if (cutover.mode === 'SHADOW') {
        const [legacy, platform] = await Promise.all([input.legacy(), input.platform()]);
        return { value: legacy, differences: compareMetaAdsCanonical(legacy, platform), mode: cutover.mode };
      }
      return { value: await input.legacy(), differences: [] as readonly string[], mode: cutover.mode };
    },
  });
  return Object.freeze({
    value: loaded.value.value,
    migration: Object.freeze({
      mode: cutover.mode,
      source: loaded.source,
      stale: loaded.stale,
      shadowDifferences: loaded.value.differences,
      shadowMatched: cutover.mode === 'SHADOW' ? loaded.value.differences.length === 0 : null,
    }),
  });
}
