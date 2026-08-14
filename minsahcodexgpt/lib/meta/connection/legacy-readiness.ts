import 'server-only';
import { META_BUSINESS_SDK_NPM_VERSION } from './sdk-version';
import { getMetaConnectionBootstrap, type MetaConnectionBootstrap } from './config';
import { createMetaGraphClient } from './client';
import { debugMetaAccessToken } from './token-debug';
import { checkMetaPermissions } from './permissions';
import { verifyMetaAssets } from './assets';
import { evaluateMetaVersionPolicy } from './version-policy';
import type { MetaAssetHealth, MetaAssetKey, MetaConnectionReadiness, MetaConnectionStatus } from './types';

type FetchLike = typeof fetch;

const ASSET_KEYS: MetaAssetKey[] = ['app', 'business', 'catalog', 'dataset', 'pixel', 'page', 'adAccount', 'instagramAccount'];

function emptyAssets(config: MetaConnectionBootstrap): Record<MetaAssetKey, MetaAssetHealth> {
  const ids: Record<MetaAssetKey, string | undefined> = {
    app: config.appId,
    business: config.businessId,
    catalog: config.catalogId,
    dataset: config.datasetId,
    pixel: config.pixelId,
    page: config.pageId,
    adAccount: config.adAccountId,
    instagramAccount: config.instagramAccountId,
  };
  return Object.fromEntries(ASSET_KEYS.map((key) => [key, {
    configured: Boolean(ids[key]), ok: !ids[key], status: ids[key] ? 'ERROR' : 'UNCONFIGURED', id: ids[key] ?? null,
  }])) as Record<MetaAssetKey, MetaAssetHealth>;
}

function daysUntil(value: string | null, now: Date) {
  if (!value) return null;
  return Math.ceil((Date.parse(value) - now.getTime()) / 86_400_000);
}

function aggregateStatus(input: {
  accessTokenConfigured: boolean;
  token: MetaConnectionReadiness['token'];
  permissions: MetaConnectionReadiness['permissions'];
  assets: MetaConnectionReadiness['assets'];
  version: MetaConnectionReadiness['versionPolicy'];
}): MetaConnectionStatus {
  if (!input.accessTokenConfigured) return 'UNCONFIGURED';
  if (input.token.verified && !input.token.valid) return 'INVALID_TOKEN';
  if (!input.token.verified) return 'DEGRADED';
  if (input.permissions.missing.length > 0) return 'MISSING_PERMISSION';
  const configuredAssets = Object.values(input.assets).filter((asset) => asset.configured);
  if (configuredAssets.some((asset) => asset.status === 'ASSET_NOT_FOUND')) return 'ASSET_NOT_FOUND';
  if (configuredAssets.some((asset) => !asset.ok)) return 'ERROR';
  if (input.version.status === 'ERROR') return 'ERROR';
  if (input.version.status === 'VERSION_WARNING') return 'VERSION_WARNING';
  if (!input.permissions.checked) return 'DEGRADED';
  return 'HEALTHY';
}

export async function checkMetaConnectionReadiness(input: {
  config?: MetaConnectionBootstrap;
  fetchImpl?: FetchLike;
  now?: Date;
  persist?: boolean;
} = {}): Promise<MetaConnectionReadiness> {
  const config = input.config ?? getMetaConnectionBootstrap();
  const now = input.now ?? new Date();
  const versionPolicy = evaluateMetaVersionPolicy({
    configuredVersion: config.graphApiVersion,
    sdkVersion: META_BUSINESS_SDK_NPM_VERSION,
    now,
  });
  const token = await debugMetaAccessToken({
    accessToken: config.accessToken,
    appId: config.appId,
    appSecret: config.appSecret,
    graphApiVersion: config.graphApiVersion,
    fetchImpl: input.fetchImpl,
  });

  let permissions: MetaConnectionReadiness['permissions'] = {
    checked: false,
    required: config.requiredPermissions,
    granted: token.scopes,
    declined: [],
    missing: config.requiredPermissions.filter((permission) => !token.scopes.includes(permission)),
    ok: false,
  };
  let assets = emptyAssets(config);

  if (token.valid && config.accessToken) {
    const client = createMetaGraphClient({
      accessToken: config.accessToken,
      appSecret: config.appSecret,
      graphApiVersion: config.graphApiVersion,
      fetchImpl: input.fetchImpl,
    });
    [permissions, assets] = await Promise.all([
      checkMetaPermissions({ client, required: config.requiredPermissions, tokenScopes: token.scopes }),
      verifyMetaAssets({ client, config }),
    ]);
  }

  const warnings = [...versionPolicy.warnings];
  if (!config.appId) warnings.push('META_APP_ID_NOT_CONFIGURED');
  if (!config.appSecret) warnings.push('META_APP_SECRET_NOT_CONFIGURED');
  if (token.error) warnings.push(token.error.code);
  if (permissions.missing.length) warnings.push('META_REQUIRED_PERMISSION_MISSING');
  for (const [key, asset] of Object.entries(assets)) {
    if (asset.configured && !asset.ok) warnings.push(`META_${key.toUpperCase()}_UNHEALTHY`);
  }
  const tokenDays = daysUntil(token.expiresAt, now);
  const dataAccessDays = daysUntil(token.dataAccessExpiresAt, now);
  if (tokenDays !== null && tokenDays <= 30) warnings.push(tokenDays <= 7 ? 'META_TOKEN_EXPIRES_WITHIN_7_DAYS' : 'META_TOKEN_EXPIRES_WITHIN_30_DAYS');
  if (dataAccessDays !== null && dataAccessDays <= 30) warnings.push(dataAccessDays <= 7 ? 'META_DATA_ACCESS_EXPIRES_WITHIN_7_DAYS' : 'META_DATA_ACCESS_EXPIRES_WITHIN_30_DAYS');

  const status = aggregateStatus({ accessTokenConfigured: Boolean(config.accessToken), token, permissions, assets, version: versionPolicy });
  const firstAssetError = Object.values(assets).find((asset) => asset.error)?.error;
  const readiness: MetaConnectionReadiness = {
    connectionName: config.connectionName,
    checkedAt: now.toISOString(),
    status,
    graphApiVersion: config.graphApiVersion,
    sdkVersion: META_BUSINESS_SDK_NPM_VERSION,
    tokenRef: config.tokenRef ?? null,
    token,
    permissions,
    assets,
    versionPolicy,
    warnings: [...new Set(warnings)],
    lastError: token.error ?? permissions.error ?? (firstAssetError ? { code: firstAssetError.code, message: firstAssetError.message } : null),
  };

  if (input.persist !== false) {
    const { persistMetaConnectionReadiness } = await import('./repository');
    await persistMetaConnectionReadiness(readiness);
  }
  return readiness;
}

export function buildMetaConnectionBootstrapReadiness(now = new Date()): MetaConnectionReadiness {
  const config = getMetaConnectionBootstrap();
  const versionPolicy = evaluateMetaVersionPolicy({ configuredVersion: config.graphApiVersion, sdkVersion: META_BUSINESS_SDK_NPM_VERSION, now });
  const assets = emptyAssets(config);
  return {
    connectionName: config.connectionName,
    checkedAt: now.toISOString(),
    status: config.accessToken ? 'DEGRADED' : 'UNCONFIGURED',
    graphApiVersion: config.graphApiVersion,
    sdkVersion: META_BUSINESS_SDK_NPM_VERSION,
    tokenRef: config.tokenRef ?? null,
    token: { configured: Boolean(config.accessToken), verified: false, valid: false, appIdMatches: null, appId: null, type: null, expiresAt: null, dataAccessExpiresAt: null, scopes: [] },
    permissions: { checked: false, required: config.requiredPermissions, granted: [], declined: [], missing: config.requiredPermissions, ok: false },
    assets,
    versionPolicy,
    warnings: ['RUNTIME_API_VERIFICATION_REQUIRED', ...versionPolicy.warnings],
    lastError: null,
  };
}
