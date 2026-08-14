import { createMetaPlatformError } from '../../core/errors';
import { metaFailure, metaSuccess } from '../../core/result';
import { normalizeMetaGraphError } from './normalization';
import { assertMetaGraphRelativeBatchPath } from './url-policy';
import type { MetaGraphBatchItemResult, MetaGraphBatchOperation, MetaGraphHttpRequest, MetaGraphRequester } from './types';

interface RawBatchItem { code?: unknown; headers?: unknown; body?: unknown }

function headersFrom(value: unknown): Readonly<Record<string, string>> {
  if (!Array.isArray(value)) return Object.freeze({});
  const result: Record<string, string> = {};
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { name?: unknown; value?: unknown };
    if (typeof row.name === 'string' && typeof row.value === 'string') result[row.name.toLowerCase()] = row.value.slice(0, 2_000);
  }
  return Object.freeze(result);
}

function serializeRelativeUrl(operation: MetaGraphBatchOperation): string {
  const path = assertMetaGraphRelativeBatchPath(operation.relativePath);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(operation.query ?? {})) {
    if (value === undefined || value === null) continue;
    query.set(key, Array.isArray(value) ? value.map(String).join(',') : String(value));
  }
  return query.size ? `${path}?${query}` : path;
}

export async function executeMetaGraphBatch(input: {
  readonly client: MetaGraphRequester;
  readonly request: Omit<MetaGraphHttpRequest, 'method' | 'path' | 'body' | 'bodyEncoding'>;
  readonly operations: readonly MetaGraphBatchOperation[];
}) {
  if (input.operations.length < 1 || input.operations.length > 50) {
    return metaFailure(createMetaPlatformError({ code: 'META_GRAPH_BATCH_SIZE_INVALID', category: 'VALIDATION', message: 'Meta Graph batch requests require 1 to 50 operations.', retryable: false, correlationId: input.request.correlationId }));
  }
  const ids = new Set<string>();
  const batch = input.operations.map((operation) => {
    if (!/^[A-Za-z0-9_.:-]{1,64}$/.test(operation.id) || ids.has(operation.id)) throw new TypeError('META_GRAPH_BATCH_OPERATION_ID_INVALID');
    ids.add(operation.id);
    if (operation.dependsOn && !ids.has(operation.dependsOn)) throw new TypeError('META_GRAPH_BATCH_DEPENDENCY_INVALID');
    return {
      name: operation.id,
      method: operation.method,
      relative_url: serializeRelativeUrl(operation),
      ...(operation.body ? { body: new URLSearchParams(Object.fromEntries(Object.entries(operation.body).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, Array.isArray(value) ? value.map(String).join(',') : String(value)]))).toString() } : {}),
      ...(operation.dependsOn ? { depends_on: operation.dependsOn } : {}),
      ...(operation.omitResponseOnSuccess ? { omit_response_on_success: true } : {}),
    };
  });
  const response = await input.client.request<RawBatchItem[]>({
    ...input.request,
    method: 'POST',
    path: '/',
    bodyEncoding: 'FORM',
    body: { include_headers: true, batch },
  });
  if (!response.ok) return response;
  if (!Array.isArray(response.value.data) || response.value.data.length !== input.operations.length) {
    return metaFailure(createMetaPlatformError({ code: 'META_GRAPH_BATCH_RESPONSE_INVALID', category: 'DEPENDENCY_UNAVAILABLE', message: 'Meta Graph returned an invalid batch response.', retryable: false, correlationId: input.request.correlationId }));
  }
  const results: MetaGraphBatchItemResult[] = response.value.data.map((raw, index) => {
    const operation = input.operations[index];
    const status = Number(raw?.code);
    let data: unknown = null;
    if (typeof raw?.body === 'string' && raw.body) {
      try { data = JSON.parse(raw.body); } catch { data = raw.body.slice(0, 10_000); }
    }
    const ok = Number.isInteger(status) && status >= 200 && status < 300 && !(data && typeof data === 'object' && 'error' in data);
    return Object.freeze({
      id: operation.id,
      status: Number.isInteger(status) ? status : 0,
      ok,
      headers: headersFrom(raw?.headers),
      data: ok ? data : null,
      error: ok ? null : normalizeMetaGraphError({ payload: data, status: Number.isInteger(status) ? status : undefined, correlationId: input.request.correlationId, fallbackCode: 'META_GRAPH_BATCH_ITEM_FAILED' }),
    });
  });
  return metaSuccess(Object.freeze(results), input.request.correlationId);
}
