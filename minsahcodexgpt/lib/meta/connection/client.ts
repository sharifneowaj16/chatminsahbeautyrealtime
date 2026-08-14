import 'server-only';

import { createLegacyMetaGraphClient } from '@/lib/meta-platform/transports/graph-http';
import type { MetaPlatformError } from '@/lib/meta-platform/core/errors';
import { safeMetaConnectionError, type SafeMetaConnectionError } from './errors';

type FetchLike = typeof fetch;

export class MetaGraphConnectionError extends Error {
  code: string;
  subcode?: string | number;
  traceId?: string;
  httpStatus?: number;

  constructor(details: SafeMetaConnectionError) {
    super(details.message);
    this.name = 'MetaGraphConnectionError';
    this.code = details.code;
    this.subcode = details.subcode;
    this.traceId = details.traceId;
    this.httpStatus = details.httpStatus;
  }
}

export type MetaGraphClient = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>, tokenOverride?: string): Promise<T>;
  post<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>, tokenOverride?: string): Promise<T>;
  delete<T>(path: string, params?: Record<string, string | number | boolean | undefined>, tokenOverride?: string): Promise<T>;
};

function toLegacyError(error: unknown): MetaGraphConnectionError {
  const candidate = error as MetaPlatformError;
  const details = candidate?.safeDetails ?? {};
  return new MetaGraphConnectionError(safeMetaConnectionError({
    code: candidate?.code ?? 'META_GRAPH_REQUEST_FAILED',
    message: candidate?.message ?? 'Meta Graph request failed.',
    subcode: typeof details.providerSubcode === 'string' || typeof details.providerSubcode === 'number' ? details.providerSubcode : undefined,
    traceId: typeof details.traceId === 'string' ? details.traceId : undefined,
    httpStatus: typeof details.httpStatus === 'number' ? details.httpStatus : undefined,
  }));
}

export function createMetaGraphClient(input: {
  accessToken: string;
  appSecret?: string;
  graphApiVersion: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): MetaGraphClient {
  function clientFor(tokenOverride?: string) {
    return createLegacyMetaGraphClient({
      accessToken: tokenOverride?.trim() || input.accessToken.trim(),
      appSecret: input.appSecret,
      graphApiVersion: input.graphApiVersion,
      fetchImpl: input.fetchImpl,
      timeoutMs: input.timeoutMs,
    });
  }

  return Object.freeze({
    async get<T>(path: string, params = {}, tokenOverride?: string): Promise<T> {
      try { return await clientFor(tokenOverride).get<T>(path, params); }
      catch (error) { throw toLegacyError(error); }
    },
    async post<T>(path: string, body?: unknown, params = {}, tokenOverride?: string): Promise<T> {
      try { return await clientFor(tokenOverride).post<T>(path, body, params); }
      catch (error) { throw toLegacyError(error); }
    },
    async delete<T>(path: string, params = {}, tokenOverride?: string): Promise<T> {
      try { return await clientFor(tokenOverride).delete<T>(path, params); }
      catch (error) { throw toLegacyError(error); }
    },
  });
}
