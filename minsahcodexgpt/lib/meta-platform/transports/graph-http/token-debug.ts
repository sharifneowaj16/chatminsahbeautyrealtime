import 'server-only';

import { createMetaPlatformError } from '../../core/errors';
import { metaFailure, metaSuccess } from '../../core/result';
import { normalizeMetaGraphError } from './normalization';
import { assertMetaGraphBaseUrl, buildMetaGraphUrl } from './url-policy';

export interface MetaGraphTokenDebugData {
  readonly app_id?: string;
  readonly application?: string;
  readonly is_valid?: boolean;
  readonly type?: string;
  readonly expires_at?: number;
  readonly data_access_expires_at?: number;
  readonly scopes?: string[];
}

export async function debugMetaGraphAccessToken(input: {
  readonly accessToken: string;
  readonly appId: string;
  readonly appSecret: string;
  readonly graphApiVersion: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly correlationId?: string;
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('META_GRAPH_TOKEN_DEBUG_TIMEOUT')), Math.min(Math.max(input.timeoutMs ?? 15_000, 1_000), 120_000));
  try {
    const url = buildMetaGraphUrl({
      baseUrl: assertMetaGraphBaseUrl('https://graph.facebook.com'),
      graphApiVersion: input.graphApiVersion,
      path: 'debug_token',
      query: { input_token: input.accessToken },
    });
    const response = await (input.fetchImpl ?? fetch)(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${input.appId}|${input.appSecret}`, Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as { data?: MetaGraphTokenDebugData; error?: unknown } | null;
    if (!response.ok || payload?.error || !payload?.data) {
      return metaFailure(normalizeMetaGraphError({ payload, status: response.status, correlationId: input.correlationId, fallbackCode: 'META_GRAPH_TOKEN_DEBUG_FAILED' }));
    }
    return metaSuccess(Object.freeze({ ...payload.data, scopes: Object.freeze([...(payload.data.scopes ?? [])]) }), input.correlationId);
  } catch (cause) {
    const timedOut = cause instanceof Error && (cause.name === 'AbortError' || cause.message === 'META_GRAPH_TOKEN_DEBUG_TIMEOUT');
    return metaFailure(timedOut
      ? createMetaPlatformError({ code: 'META_GRAPH_TOKEN_DEBUG_TIMEOUT', category: 'TIMEOUT', message: 'Meta token debug timed out.', retryable: true, correlationId: input.correlationId })
      : normalizeMetaGraphError({ cause, correlationId: input.correlationId, fallbackCode: 'META_GRAPH_TOKEN_DEBUG_NETWORK_ERROR' }));
  } finally {
    clearTimeout(timer);
  }
}
