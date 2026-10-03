export const DEBOUNCE_WINDOW_MS = 60_000;
export const CATALOG_FEED_CACHE_KEY = 'meta:catalog:feed:csv';

// In-memory debounce state (single process / worker node)
let debounceTimer: NodeJS.Timeout | null = null;
let pendingProductIds = new Set<string>();

/**
 * Invalidate Redis CSV feed cache immediately on mutation.
 */
export async function invalidateCatalogFeedCache(): Promise<boolean> {
  try {
    const { cacheDelete } = await import('@/lib/cache/redis');
    return await cacheDelete(CATALOG_FEED_CACHE_KEY);
  } catch (err) {
    return false;
  }
}

/**
 * Hook product/variant price, sale, stock, or status mutations.
 * Immediately invalidates the Redis feed cache and debounces an
 * inventory-mode catalog sync job over a 60-second window.
 */
export async function triggerEventDrivenCatalogSync(input: {
  productIds: string[];
  reason?: string;
  immediate?: boolean;
}): Promise<{ enqueued: boolean; invalidatedCache: boolean; count: number }> {
  const ids = Array.from(new Set(input.productIds.filter(Boolean)));
  if (ids.length === 0) {
    return { enqueued: false, invalidatedCache: false, count: 0 };
  }

  // 1. Immediately invalidate Redis catalog feed cache
  const invalidatedCache = await invalidateCatalogFeedCache();

  // 2. Accumulate affected product IDs
  for (const id of ids) {
    pendingProductIds.add(id);
  }

  // 3. Immediate flush override (for tests, CLI, or emergency syncs)
  if (input.immediate) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    const flushIds = Array.from(pendingProductIds);
    pendingProductIds.clear();
    await flushCatalogSyncJob(flushIds, input.reason || 'immediate_mutation');
    return { enqueued: true, invalidatedCache, count: flushIds.length };
  }

  // 4. Debounce with 60-second sliding window
  if (!debounceTimer) {
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      const flushIds = Array.from(pendingProductIds);
      pendingProductIds.clear();
      if (flushIds.length > 0) {
        await flushCatalogSyncJob(flushIds, 'debounced_mutation_window');
      }
    }, DEBOUNCE_WINDOW_MS);
    if (typeof debounceTimer.unref === 'function') {
      debounceTimer.unref();
    }
  }

  return { enqueued: true, invalidatedCache, count: ids.length };
}

/**
 * Direct Meta Graph API feed upload trigger.
 * Notifies Meta's Catalog engine immediately of an upload request.
 */
export async function triggerMetaCatalogFeedUpload(params?: {
  feedId?: string;
  accessToken?: string;
  graphApiVersion?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; uploadId?: string; skipped?: boolean; reason?: string }> {
  const feedId = params?.feedId ?? process.env.META_CATALOG_FEED_ID;
  const accessToken =
    params?.accessToken ??
    process.env.META_CAPI_ACCESS_TOKEN ??
    process.env.META_CATALOG_ACCESS_TOKEN;
  const version = params?.graphApiVersion ?? process.env.META_GRAPH_API_VERSION ?? 'v20.0';
  const fetchFn = params?.fetchImpl ?? globalThis.fetch;

  if (!feedId || !accessToken) {
    return { ok: true, skipped: true, reason: 'META_FEED_ID_OR_TOKEN_MISSING' };
  }

  try {
    const url = `https://graph.facebook.com/${version}/${feedId}/uploads`;
    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, reason: `HTTP_${response.status}: ${errorText}` };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, uploadId: data.id };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'UNKNOWN_FEED_UPLOAD_ERROR' };
  }
}

/**
 * Enqueue scoped inventory sync job via BullMQ.
 */
export async function flushCatalogSyncJob(productIds: string[], reason?: string): Promise<void> {
  if (productIds.length === 0) return;

  try {
    const { enqueueMetaCatalogSyncJob } = await import('@/lib/jobs/queues');
    const idempotencyKey = `catalog:sync:inventory:${Date.now()}:${productIds.slice(0, 3).join('-')}`;
    await enqueueMetaCatalogSyncJob({
      idempotencyKey,
      mode: 'inventory',
      productIds,
      requestedBy: reason || 'event_driven_mutation',
    });
  } catch (err) {
    // In test environment or offline, log warning
    console.warn('[EventSync] Failed to enqueue debounced catalog sync job:', err);
  }

  if (process.env.META_AUTO_FEED_PUSH_ENABLED === 'true' || reason === 'out_of_stock_critical') {
    void triggerMetaCatalogFeedUpload().catch((err) => {
      console.warn('[EventSync] Auto feed upload trigger failed:', err);
    });
  }
}

/**
 * Test helper to inspect and reset debounce state.
 */
export function getDebounceStateForTesting() {
  return {
    pendingCount: pendingProductIds.size,
    hasActiveTimer: debounceTimer !== null,
    pendingIds: Array.from(pendingProductIds),
    reset: () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      pendingProductIds.clear();
    },
  };
}
