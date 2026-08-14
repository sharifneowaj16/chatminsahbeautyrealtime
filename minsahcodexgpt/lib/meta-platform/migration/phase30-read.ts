import { executeMetaReadWithStaleFallback, type MetaReadCacheStore } from '../reliability/cache';
import { stableCatalogHash } from '../domains/catalog/normalization';
import { resolveMetaPhase30ReadCutover } from './phase30-cutover';

export async function executeMetaPhase30Read<T>(input: {
  readonly cache: MetaReadCacheStore;
  readonly cacheKey: string;
  readonly legacy: () => Promise<T>;
  readonly platform: () => Promise<T>;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly now?: Date;
}) {
  const cutover = resolveMetaPhase30ReadCutover(input.env);
  const loaded = await executeMetaReadWithStaleFallback({
    key: input.cacheKey, cache: input.cache, freshTtlMs: cutover.freshTtlMs, staleTtlMs: cutover.staleTtlMs, now: input.now,
    acceptFresh: (cached) => cached.mode === cutover.mode,
    load: async () => {
      if (cutover.mode === 'PLATFORM') return { value: await input.platform(), mode: cutover.mode, matched: null as boolean | null };
      if (cutover.mode === 'SHADOW') {
        const [legacy, platform] = await Promise.all([input.legacy(), input.platform()]);
        return { value: legacy, mode: cutover.mode, matched: stableCatalogHash(legacy) === stableCatalogHash(platform) };
      }
      return { value: await input.legacy(), mode: cutover.mode, matched: null as boolean | null };
    },
  });
  return Object.freeze({
    value: loaded.value.value,
    migration: Object.freeze({ mode: cutover.mode, source: loaded.source, stale: loaded.stale, shadowMatched: loaded.value.matched }),
  });
}
