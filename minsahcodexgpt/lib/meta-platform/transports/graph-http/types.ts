import type { MetaCapabilityId } from '../../types';
import type { MetaCredentialProvider } from '../../credentials/types';
import type { MetaCredentialRole } from '../../credentials/roles';
import type { MetaPlatformError } from '../../core/errors';
import type { MetaResult } from '../../core/result';

export type MetaGraphHttpMethod = 'GET' | 'POST' | 'DELETE';
export type MetaGraphPrimitive = string | number | boolean;
export type MetaGraphParameters = Readonly<Record<string, MetaGraphPrimitive | readonly MetaGraphPrimitive[] | null | undefined>>;
export type MetaGraphBodyEncoding = 'JSON' | 'FORM';

export interface MetaGraphHttpRequest<TBody = unknown> {
  readonly capability: MetaCapabilityId;
  readonly connectionKey: string;
  readonly credentialRole: Exclude<MetaCredentialRole, 'APP'>;
  readonly method: MetaGraphHttpMethod;
  readonly path: string;
  readonly graphApiVersion?: string;
  readonly query?: MetaGraphParameters;
  readonly body?: TBody;
  readonly bodyEncoding?: MetaGraphBodyEncoding;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  readonly correlationId?: string;
  readonly operation?: string;
  readonly maxResponseBytes?: number;
}

export interface MetaGraphHttpResponse<T = unknown> {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly data: T;
  readonly traceId?: string;
}

export interface MetaGraphHttpClientOptions {
  readonly credentialProvider: MetaCredentialProvider;
  readonly appCredentialProvider?: MetaCredentialProvider;
  readonly fetchImpl?: typeof fetch;
  readonly baseUrl?: string;
  readonly defaultTimeoutMs?: number;
  readonly defaultMaxResponseBytes?: number;
  readonly logger?: MetaGraphHttpLogger;
}

export interface MetaGraphHttpLogEntry {
  readonly phase: 'START' | 'SUCCESS' | 'FAILURE';
  readonly method: MetaGraphHttpMethod;
  readonly path: string;
  readonly capability: MetaCapabilityId;
  readonly connectionKey: string;
  readonly credentialRole: Exclude<MetaCredentialRole, 'APP'>;
  readonly graphApiVersion: string;
  readonly operation: string;
  readonly correlationId?: string;
  readonly credentialVersion?: string;
  readonly status?: number;
  readonly durationMs?: number;
  readonly error?: MetaPlatformError;
}

export type MetaGraphHttpLogger = (entry: MetaGraphHttpLogEntry) => void;

export interface MetaGraphPage<T> {
  readonly data: readonly T[];
  readonly paging?: {
    readonly cursors?: { readonly before?: string; readonly after?: string };
    readonly next?: string;
    readonly previous?: string;
  };
  readonly summary?: unknown;
}

export interface MetaGraphPaginationOptions {
  readonly maxPages?: number;
  readonly maxItems?: number;
  readonly pageSize?: number;
}

export interface MetaGraphPaginationResult<T> {
  readonly items: readonly T[];
  readonly pages: number;
  readonly truncated: boolean;
  readonly after: string | null;
}

export interface MetaGraphBatchOperation {
  readonly id: string;
  readonly method: MetaGraphHttpMethod;
  readonly relativePath: string;
  readonly query?: MetaGraphParameters;
  readonly body?: MetaGraphParameters;
  readonly dependsOn?: string;
  readonly omitResponseOnSuccess?: boolean;
}

export interface MetaGraphBatchItemResult<T = unknown> {
  readonly id: string;
  readonly status: number;
  readonly ok: boolean;
  readonly headers: Readonly<Record<string, string>>;
  readonly data: T | null;
  readonly error: MetaPlatformError | null;
}

export interface MetaGraphRequester {
  request<T = unknown, TBody = unknown>(input: MetaGraphHttpRequest<TBody>): Promise<MetaResult<MetaGraphHttpResponse<T>>>;
}
