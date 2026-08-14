import 'server-only';
import { debugMetaGraphAccessToken } from '@/lib/meta-platform/transports/graph-http';
import type { MetaTokenHealth } from './types';

function epochToIso(value?: number) {
  return typeof value === 'number' && value > 0 ? new Date(value * 1_000).toISOString() : null;
}

export async function debugMetaAccessToken(input: {
  accessToken?: string;
  appId?: string;
  appSecret?: string;
  graphApiVersion: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<MetaTokenHealth> {
  const accessToken = input.accessToken?.trim();
  const appId = input.appId?.trim();
  const appSecret = input.appSecret?.trim();
  if (!accessToken) {
    return { configured: false, verified: false, valid: false, appIdMatches: null, appId: null, type: null, expiresAt: null, dataAccessExpiresAt: null, scopes: [] };
  }
  if (!appId || !appSecret) {
    return {
      configured: true, verified: false, valid: false, appIdMatches: null, appId: null, type: null,
      expiresAt: null, dataAccessExpiresAt: null, scopes: [],
      error: { code: 'META_APP_CREDENTIALS_REQUIRED', message: 'META_APP_ID and META_APP_SECRET are required for token verification.' },
    };
  }

  const result = await debugMetaGraphAccessToken({
    accessToken,
    appId,
    appSecret,
    graphApiVersion: input.graphApiVersion,
    fetchImpl: input.fetchImpl,
    timeoutMs: input.timeoutMs,
  });
  if (!result.ok) {
    return {
      configured: true,
      verified: result.error.category !== 'TIMEOUT' && result.error.code !== 'META_GRAPH_TOKEN_DEBUG_NETWORK_ERROR',
      valid: false,
      appIdMatches: null,
      appId: null,
      type: null,
      expiresAt: null,
      dataAccessExpiresAt: null,
      scopes: [],
      error: { code: result.error.code, message: result.error.message },
    };
  }
  const data = result.value;
  const tokenAppId = data.app_id ?? null;
  const appIdMatches = tokenAppId === appId;
  return {
    configured: true,
    verified: true,
    valid: data.is_valid === true && appIdMatches,
    appIdMatches,
    appId: tokenAppId,
    type: data.type ?? null,
    expiresAt: epochToIso(data.expires_at),
    dataAccessExpiresAt: epochToIso(data.data_access_expires_at),
    scopes: [...new Set(data.scopes ?? [])].sort(),
    error: appIdMatches ? undefined : { code: 'META_TOKEN_APP_MISMATCH', message: 'The configured token belongs to a different Meta app.' },
  };
}
