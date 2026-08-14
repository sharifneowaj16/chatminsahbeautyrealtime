import 'server-only';

import { createHash } from 'node:crypto';
import { InMemoryMetaCredentialProvider } from '../../credentials/provider';
import { MetaGraphHttpClient } from './client';
import type { MetaGraphHttpMethod, MetaGraphParameters } from './types';

function legacyConnectionKey(accessToken: string): string {
  return `legacy-graph:${createHash('sha256').update(accessToken).digest('hex').slice(0, 24)}`;
}

export interface LegacyMetaGraphClient {
  get<T>(path: string, params?: MetaGraphParameters): Promise<T>;
  post<T>(path: string, body?: unknown, params?: MetaGraphParameters): Promise<T>;
  delete<T>(path: string, params?: MetaGraphParameters): Promise<T>;
}

export function createLegacyMetaGraphClient(input: {
  readonly accessToken: string;
  readonly appSecret?: string;
  readonly graphApiVersion: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}): LegacyMetaGraphClient {
  const accessToken = input.accessToken.trim();
  if (!accessToken) throw new TypeError('META_ACCESS_TOKEN_REQUIRED');
  const connectionKey = legacyConnectionKey(accessToken);
  const credentials = [
    {
      connectionKey,
      role: 'BUSINESS_SYSTEM_USER' as const,
      secretRef: 'legacy:in-memory-access-token',
      accessToken,
      permissions: [],
    },
    ...(input.appSecret?.trim() ? [{
      connectionKey,
      role: 'APP' as const,
      secretRef: 'legacy:in-memory-app-secret',
      appSecret: input.appSecret.trim(),
    }] : []),
  ];
  const provider = new InMemoryMetaCredentialProvider(credentials);
  const client = new MetaGraphHttpClient({ credentialProvider: provider, fetchImpl: input.fetchImpl, defaultTimeoutMs: input.timeoutMs });

  async function request<T>(method: MetaGraphHttpMethod, path: string, body?: unknown, query?: MetaGraphParameters): Promise<T> {
    const result = await client.request<T>({
      capability: 'graph-media-boundary',
      connectionKey,
      credentialRole: 'BUSINESS_SYSTEM_USER',
      graphApiVersion: input.graphApiVersion,
      method,
      path,
      query,
      body,
      operation: `legacy-compat:${method}:${path}`,
    });
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  return Object.freeze({
    get: <T>(path: string, params?: MetaGraphParameters) => request<T>('GET', path, undefined, params),
    post: <T>(path: string, body?: unknown, params?: MetaGraphParameters) => request<T>('POST', path, body, params),
    delete: <T>(path: string, params?: MetaGraphParameters) => request<T>('DELETE', path, undefined, params),
  });
}

export function buildLegacyMetaGraphRedirectUrl(input: {
  readonly path: string;
  readonly graphApiVersion: string;
  readonly accessToken: string;
  readonly query?: MetaGraphParameters;
}): string {
  const path = input.path.replace(/^\/+/, '');
  if (!path || path.includes('..') || path.includes('?') || path.includes('#') || /^[a-z][a-z\d+.-]*:/i.test(path)) {
    throw new TypeError('META_GRAPH_PATH_INVALID');
  }
  const url = new URL(`https://graph.facebook.com/${input.graphApiVersion}/${path}`);
  for (const [key, value] of Object.entries(input.query ?? {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, Array.isArray(value) ? value.map(String).join(',') : String(value));
  }
  url.searchParams.set('access_token', input.accessToken);
  return url.toString();
}
