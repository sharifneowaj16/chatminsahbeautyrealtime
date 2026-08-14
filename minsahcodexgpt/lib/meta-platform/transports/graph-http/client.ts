import 'server-only';

import { authorizeMetaCapability } from '../../capabilities/governance';
import { buildMetaAppSecretProof } from '../../credentials/appsecret-proof';
import { MetaCredentialResolutionError } from '../../credentials/provider';
import { createMetaPlatformError } from '../../core/errors';
import { metaFailure, metaSuccess } from '../../core/result';
import { DEFAULT_META_GRAPH_API_VERSION, META_BUSINESS_SDK_VERSION } from '../../versioning/registry';
import { extractMetaGraphTraceId, normalizeMetaGraphError } from './normalization';
import { assertMetaGraphBaseUrl, buildMetaGraphUrl } from './url-policy';
import type { MetaGraphHttpClientOptions, MetaGraphHttpRequest, MetaGraphHttpResponse } from './types';

const DEFAULT_BASE_URL = 'https://graph.facebook.com';
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? Number(value) : fallback, min), max);
}

function mergeSignals(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('META_GRAPH_TIMEOUT')), timeoutMs);
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    },
  };
}

function encodeBody(body: unknown, encoding: 'JSON' | 'FORM'): { body?: BodyInit; contentType?: string } {
  if (body === undefined) return {};
  if (encoding === 'FORM') {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TypeError('META_GRAPH_FORM_BODY_INVALID');
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (value === undefined || value === null) continue;
      params.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    return { body: params, contentType: 'application/x-www-form-urlencoded;charset=UTF-8' };
  }
  return { body: JSON.stringify(body), contentType: 'application/json' };
}

async function readBoundedResponse(response: Response, maxBytes: number): Promise<{ payload: unknown; text: string }> {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error('META_GRAPH_RESPONSE_TOO_LARGE');
  if (!response.body) return { payload: null, text: '' };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel('META_GRAPH_RESPONSE_TOO_LARGE').catch(() => undefined);
      throw new Error('META_GRAPH_RESPONSE_TOO_LARGE');
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  if (!text) return { payload: null, text };
  try { return { payload: JSON.parse(text), text }; } catch { return { payload: text, text }; }
}

function safeHeaders(headers: Headers): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const name of ['content-type', 'x-fb-trace-id', 'x-fb-request-id', 'retry-after', 'x-business-use-case-usage', 'x-app-usage', 'x-page-usage', 'x-ad-account-usage']) {
    const value = headers.get(name);
    if (value) result[name] = value.slice(0, 2_000);
  }
  return Object.freeze(result);
}

export class MetaGraphHttpClient {
  readonly #options: Required<Pick<MetaGraphHttpClientOptions, 'credentialProvider' | 'fetchImpl'>> & MetaGraphHttpClientOptions;
  readonly #baseUrl: URL;

  constructor(options: MetaGraphHttpClientOptions) {
    this.#options = Object.freeze({ ...options, fetchImpl: options.fetchImpl ?? fetch });
    this.#baseUrl = assertMetaGraphBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
  }

  async request<T = unknown, TBody = unknown>(input: MetaGraphHttpRequest<TBody>) {
    const startedAt = Date.now();
    const graphApiVersion = input.graphApiVersion ?? DEFAULT_META_GRAPH_API_VERSION;
    const operation = input.operation?.trim() || `${input.method} ${input.path}`;
    const logBase = {
      method: input.method,
      path: input.path.replace(/^\/+/, '').slice(0, 500),
      capability: input.capability,
      connectionKey: input.connectionKey,
      credentialRole: input.credentialRole,
      graphApiVersion,
      operation: operation.slice(0, 200),
      correlationId: input.correlationId,
    } as const;
    this.#options.logger?.({ phase: 'START', ...logBase });

    const authorization = await authorizeMetaCapability({
      capability: input.capability,
      connectionKey: input.connectionKey,
      credentialRole: input.credentialRole,
      credentialProvider: this.#options.credentialProvider,
      graphApiVersion,
      sdkVersion: META_BUSINESS_SDK_VERSION,
      correlationId: input.correlationId,
    });
    if (!authorization.ok || !authorization.value.credential) {
      const error = authorization.ok
        ? createMetaPlatformError({ code: 'META_GRAPH_CREDENTIAL_REQUIRED', category: 'AUTHENTICATION', message: 'A Meta Graph credential is required.', retryable: false, correlationId: input.correlationId })
        : authorization.error;
      this.#options.logger?.({ phase: 'FAILURE', ...logBase, durationMs: Date.now() - startedAt, error });
      return metaFailure(error);
    }

    try {
      const credential = authorization.value.credential;
      const query: Record<string, string | number | boolean | readonly (string | number | boolean)[] | null | undefined> = { ...input.query };
      const appProvider = this.#options.appCredentialProvider ?? this.#options.credentialProvider;
      try {
        const appCredential = await appProvider.resolve({ connectionKey: input.connectionKey, role: 'APP' });
        query.appsecret_proof = buildMetaAppSecretProof({ accessCredential: credential, appCredential });
      } catch (error) {
        if (!(error instanceof MetaCredentialResolutionError && error.code === 'META_CREDENTIAL_NOT_CONFIGURED')) throw error;
      }
      const url = buildMetaGraphUrl({ baseUrl: this.#baseUrl, graphApiVersion, path: input.path, query });
      const timeoutMs = clamp(input.timeoutMs, this.#options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);
      const maxBytes = clamp(input.maxResponseBytes, this.#options.defaultMaxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES, 1_024, 100 * 1024 * 1024);
      const deadline = mergeSignals(input.signal, timeoutMs);
      const encoded = encodeBody(input.body, input.bodyEncoding ?? 'JSON');
      let response: Response;
      try {
        response = await this.#options.fetchImpl(url, {
          method: input.method,
          headers: {
            Authorization: `Bearer ${credential.readAccessToken()}`,
            Accept: 'application/json',
            ...(encoded.contentType ? { 'Content-Type': encoded.contentType } : {}),
          },
          body: input.method === 'GET' || input.method === 'DELETE' ? undefined : encoded.body,
          cache: 'no-store',
          redirect: 'error',
          signal: deadline.signal,
        });
      } finally {
        deadline.cleanup();
      }
      const { payload } = await readBoundedResponse(response, maxBytes);
      const providerError = payload && typeof payload === 'object' && 'error' in payload;
      if (!response.ok || providerError) {
        const error = normalizeMetaGraphError({ payload, status: response.status, headers: safeHeaders(response.headers), correlationId: input.correlationId });
        this.#options.logger?.({ phase: 'FAILURE', ...logBase, credentialVersion: credential.metadata.credentialVersion, status: response.status, durationMs: Date.now() - startedAt, error });
        return metaFailure(error);
      }
      const value: MetaGraphHttpResponse<T> = Object.freeze({
        status: response.status,
        headers: safeHeaders(response.headers),
        data: payload as T,
        ...(extractMetaGraphTraceId(payload, response.headers) ? { traceId: extractMetaGraphTraceId(payload, response.headers) } : {}),
      });
      this.#options.logger?.({ phase: 'SUCCESS', ...logBase, credentialVersion: credential.metadata.credentialVersion, status: response.status, durationMs: Date.now() - startedAt });
      return metaSuccess(value, input.correlationId);
    } catch (cause) {
      const aborted = cause instanceof Error && (cause.name === 'AbortError' || cause.message === 'META_GRAPH_TIMEOUT');
      const tooLarge = cause instanceof Error && cause.message === 'META_GRAPH_RESPONSE_TOO_LARGE';
      const error = aborted
        ? createMetaPlatformError({ code: 'META_GRAPH_TIMEOUT', category: 'TIMEOUT', message: 'The Meta Graph request timed out.', retryable: true, correlationId: input.correlationId })
        : tooLarge
          ? createMetaPlatformError({ code: 'META_GRAPH_RESPONSE_TOO_LARGE', category: 'VALIDATION', message: 'The Meta Graph response exceeded the configured size limit.', retryable: false, correlationId: input.correlationId })
          : normalizeMetaGraphError({ cause, correlationId: input.correlationId, fallbackCode: 'META_GRAPH_NETWORK_ERROR' });
      this.#options.logger?.({ phase: 'FAILURE', ...logBase, durationMs: Date.now() - startedAt, error });
      return metaFailure(error);
    }
  }
}
