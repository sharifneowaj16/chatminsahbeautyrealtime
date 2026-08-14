import type { MetaReadCacheEntry } from './types';

export type { MetaReadCacheEntry } from './types';

export interface MetaReadCacheStore {
  get<T>(key: string): Promise<MetaReadCacheEntry<T> | null>;
  set<T>(key: string, entry: MetaReadCacheEntry<T>): Promise<void>;
  delete(key: string): Promise<void>;
}

export class InMemoryMetaReadCacheStore implements MetaReadCacheStore {
  private readonly values = new Map<string, MetaReadCacheEntry<unknown>>();

  async get<T>(key: string): Promise<MetaReadCacheEntry<T> | null> {
    return (this.values.get(key) as MetaReadCacheEntry<T> | undefined) ?? null;
  }

  async set<T>(key: string, entry: MetaReadCacheEntry<T>): Promise<void> {
    this.values.set(key, Object.freeze({ ...entry }));
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

export async function executeMetaReadWithStaleFallback<T>(input: {
  readonly key: string;
  readonly cache: MetaReadCacheStore;
  readonly freshTtlMs: number;
  readonly staleTtlMs: number;
  readonly now?: Date;
  readonly load: () => Promise<T>;
  readonly acceptFresh?: (value: T) => boolean;
}): Promise<{ readonly value: T; readonly stale: boolean; readonly source: 'CACHE' | 'PROVIDER' | 'STALE_FALLBACK' }> {
  const now = input.now ?? new Date();
  const cached = await input.cache.get<T>(input.key);
  if (cached && new Date(cached.freshUntil).getTime() > now.getTime()
    && (input.acceptFresh?.(cached.value) ?? true)) {
    return Object.freeze({ value: cached.value, stale: false, source: 'CACHE' as const });
  }
  try {
    const value = await input.load();
    const updatedAt = now.toISOString();
    await input.cache.set(input.key, Object.freeze({
      value,
      updatedAt,
      freshUntil: new Date(now.getTime() + Math.max(1_000, input.freshTtlMs)).toISOString(),
      staleUntil: new Date(now.getTime() + Math.max(input.freshTtlMs, input.staleTtlMs)).toISOString(),
    }));
    return Object.freeze({ value, stale: false, source: 'PROVIDER' as const });
  } catch (error) {
    if (cached && new Date(cached.staleUntil).getTime() > now.getTime()) {
      return Object.freeze({ value: cached.value, stale: true, source: 'STALE_FALLBACK' as const });
    }
    throw error;
  }
}
