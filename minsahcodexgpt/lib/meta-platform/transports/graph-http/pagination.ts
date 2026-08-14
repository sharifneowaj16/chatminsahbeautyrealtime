import { createMetaPlatformError } from '../../core/errors';
import { metaFailure, metaSuccess, type MetaResult } from '../../core/result';
import type { MetaGraphHttpRequest, MetaGraphHttpResponse, MetaGraphPage, MetaGraphPaginationOptions, MetaGraphPaginationResult, MetaGraphRequester } from './types';

function bounded(value: number | undefined, fallback: number, min: number, max: number) {
  return Math.min(Math.max(Number.isFinite(value) ? Math.floor(Number(value)) : fallback, min), max);
}

export async function collectMetaGraphPages<T>(input: {
  readonly client: MetaGraphRequester;
  readonly request: Omit<MetaGraphHttpRequest, 'method' | 'query'> & { readonly query?: MetaGraphHttpRequest['query'] };
  readonly options?: MetaGraphPaginationOptions;
}) {
  const maxPages = bounded(input.options?.maxPages, 25, 1, 100);
  const maxItems = bounded(input.options?.maxItems, 5_000, 1, 100_000);
  const pageSize = bounded(input.options?.pageSize, 100, 1, 500);
  const items: T[] = [];
  const seenCursors = new Set<string>();
  let pages = 0;
  let after: string | null = null;
  let truncated = false;

  while (pages < maxPages && items.length < maxItems) {
    const response: MetaResult<MetaGraphHttpResponse<MetaGraphPage<T>>> = await input.client.request<MetaGraphPage<T>>({
      ...input.request,
      method: 'GET',
      query: { ...input.request.query, limit: pageSize, ...(after ? { after } : {}) },
    });
    if (!response.ok) return response;
    const page: MetaGraphPage<T> = response.value.data;
    if (!page || !Array.isArray(page.data)) {
      return metaFailure(createMetaPlatformError({
        code: 'META_GRAPH_PAGE_INVALID',
        category: 'DEPENDENCY_UNAVAILABLE',
        message: 'The Meta Graph pagination response did not contain a data array.',
        retryable: false,
        correlationId: input.request.correlationId,
      }));
    }
    pages += 1;
    const room = maxItems - items.length;
    items.push(...page.data.slice(0, room));
    const next: string | null = typeof page.paging?.cursors?.after === 'string' && page.paging.cursors.after.trim()
      ? page.paging.cursors.after.trim()
      : null;
    if (page.data.length > room) { truncated = true; after = next; break; }
    if (!next || page.data.length === 0) { after = null; break; }
    if (seenCursors.has(next)) {
      return metaFailure(createMetaPlatformError({
        code: 'META_GRAPH_PAGINATION_CURSOR_LOOP',
        category: 'DEPENDENCY_UNAVAILABLE',
        message: 'Meta Graph returned a repeated pagination cursor.',
        retryable: false,
        safeDetails: { pages },
        correlationId: input.request.correlationId,
      }));
    }
    seenCursors.add(next);
    after = next;
  }
  if ((after && pages >= maxPages) || items.length >= maxItems) truncated = true;
  const value: MetaGraphPaginationResult<T> = Object.freeze({ items: Object.freeze(items), pages, truncated, after });
  return metaSuccess(value, input.request.correlationId);
}
